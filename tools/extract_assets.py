"""GameOne extraction for the touch prototype; only reads the workspace copy.
Format research: lhuthng/doraemon-monopoly-localization (see docs/RICH4-REFERENCE.md).
Independent Python implementation of archive, fixed 14-bit LZW and sprite scanlines.
"""
import struct, json, zlib, hashlib
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]
SOURCE=next((BASE/'work').glob('*/Dora'))
OUT=BASE/'app/public/assets'
SIG=b'\0\0GameOne Systems Limited\nWritten by Samme NG\0'
def u16(b,p=0): return struct.unpack_from('<H',b,p)[0]
def i16(b,p=0): return struct.unpack_from('<h',b,p)[0]
def u32(b,p=0): return struct.unpack_from('<I',b,p)[0]
def archive(b,path=()):
    assert b.startswith(SIG)
    n=u32(b,0x42)
    assert n<100000 and 0x66+4*(n+1)<=len(b)
    offsets=struct.unpack_from('<'+'I'*(n+1),b,0x66)
    assert offsets[-1]==len(b)
    out={}
    for i,(a,z) in enumerate(zip(offsets,offsets[1:])):
        assert 0x66+4*(n+1)<=a<z<=len(b)
        child=b[a:z]; key=path+(i,)
        if child.startswith(SIG): out.update(archive(child,key))
        else: out[key]=child
    return out
def decompress(b):
    size=u32(b)
    if not 0<size<=16*1024*1024: raise ValueError('invalid expanded size')
    pos=4; bits=0; count=0
    def read():
        nonlocal pos,bits,count
        while count<14:
            if pos>=len(b): raise ValueError('truncated LZW')
            bits=(bits<<8)|b[pos]; pos+=1; count+=8
        count-=14
        code=(bits>>count)&16383
        bits &= (1<<count)-1
        return code
    table=[bytes([i]) for i in range(256)]
    first=read()
    if first>255: raise ValueError('invalid initial code')
    prev=table[first]; out=bytearray(prev)
    while True:
        c=read()
        if c==16383: break
        if c<len(table): word=table[c]
        elif c==len(table): word=prev+prev[:1]
        else: raise ValueError('invalid dictionary index')
        out.extend(word)
        if len(out)>size: raise ValueError('output overflow')
        if len(table)<16383: table.append(prev+word[:1])
        prev=word
    if len(out)!=size: raise ValueError('output size mismatch')
    return out
def png(p,w,h,rgba):
    def chunk(t,b): return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
    raw=b''.join(b'\0'+rgba[y*w*4:(y+1)*w*4] for y in range(h))
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
def sprite(b,pal,key=False):
    magic,w,h=struct.unpack_from('<HHH',b)
    assert magic&0x8002==0x8002 and 0<w<=2048 and 0<h<=2048
    head=10 if magic&1 else 6
    hx,hy=(i16(b,6),i16(b,8)) if head==10 else (0,0)
    rgba=bytearray(w*h*4); wrap=0; last=-1
    for y in range(h):
        off=u16(b,head+y*2)
        if off<=last: wrap+=65536
        last=off; pos=head+off+wrap; end=pos+2+u16(b,pos); pos+=2; x=0
        assert end<=len(b)
        while pos+2<=end and x<w:
            run=i16(b,pos); pos+=2
            if run==0: break
            if run<0: x-=run
            else:
                assert pos+run<=end and x+run<=w
                for v in b[pos:pos+run]:
                    if not(key and v==255): rgba[(y*w+x)*4:(y*w+x)*4+4]=pal[v*3:v*3+3]+b'\xff'
                    x+=1
                pos+=run
    return w,h,hx,hy,rgba
def pcx(b):
    assert b[0]==10 and b[2]==1 and b[3]==8 and b[65]==1 and b[-769]==12
    w=u16(b,8)-u16(b,4)+1; h=u16(b,10)-u16(b,6)+1; stride=u16(b,66)
    pixels=bytearray(); pos=128
    while len(pixels)<stride*h:
        v=b[pos];pos+=1;n=1
        if v&192==192: n=v&63;v=b[pos];pos+=1
        pixels.extend(bytes([v])*n)
    pal=b[-768:]; rgba=b''.join(pal[v*3:v*3+3]+b'\xff' for y in range(h) for v in pixels[y*stride:y*stride+w])
    return w,h,rgba,pal
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={'source':str(SOURCE),'maps':[],'spriteSamples':[]}
    # Start with the real Doraemon Town map; preserve raw rule fields.
    m=archive((SOURCE/'map0004.dat').read_bytes()); head=m[(0,)];w=u32(head,4);h=u32(head,8)
    cells=[]
    for i in range(w*h):
        at=80+16*i
        cells.append(dict(x=i%w,y=i//w,layer=u16(head,at),object=u16(head,at+2),flags=u16(head,at+4),terrain=u16(head,at+6),price=u32(head,at+8),event=head[at+12]))
    conf=m[(2,)]; starts=[dict(x=struct.unpack_from('<i',conf,4+12*i)[0],y=struct.unpack_from('<i',conf,8+12*i)[0],direction=u32(conf,52+4*i)) for i in range(4)]
    entries=archive((SOURCE/'mapElem0004.dat').read_bytes()); rawpal=entries[(5,)]; assert len(rawpal)==768
    pal=bytes(round(v*255/63) for v in rawpal)
    art={}; failures=[]
    for path,packed in entries.items():
        if path[0] not in (0,2,3): continue
        try:
            data=decompress(packed);iw,ih,hx,hy,rgba=sprite(data,pal,path[0]==0)
            name='-'.join(map(str,path)); png(OUT/'town'/f'{name}.png',iw,ih,rgba)
            art[name]=dict(w=iw,h=ih,hx=hx,hy=hy,url=f'assets/town/{name}.png')
        except (ValueError,AssertionError,IndexError,struct.error) as e: failures.append([list(path),str(e)])
    shop_data=m[(3,)];shops=[]
    for i in range(u32(shop_data)):
        offset=4+i*348;x,y,z=struct.unpack_from('<iii',shop_data,offset)
        shops.append(dict(x=x,y=y,z=z,rawParameters=list(struct.unpack_from('<84I',shop_data,offset+12))))
    result=dict(id=4,name='大雄的小镇',width=w,height=h,cells=cells,starts=starts,shops=shops,art=art,rawConfig=conf.hex())
    (OUT/'town.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf8')
    report['maps'].append(dict(id=4,cells=len(cells),art=len(art),failures=failures,starts=starts))
    # Export the first frames from each top-level sprite group for identification.
    bitmaps=archive((SOURCE/'bitmaps.dat').read_bytes()); palettes=[]
    for key,b in bitmaps.items():
        try:
            decoded=decompress(b);iw,ih,rgba,bp=pcx(decoded); palettes.append((key,bp))
        except (ValueError,AssertionError,IndexError,struct.error): continue
    (OUT/'palettes.json').write_text(json.dumps([dict(id=list(k),rgb=list(p)) for k,p in palettes]),encoding='utf8')
    report['palettes']=len(palettes)
    sprites=archive((SOURCE/'Sprite1.dat').read_bytes())
    samplepal=palettes[1][1] if len(palettes)>1 else pal
    for key,b in sprites.items():
        # first few frames per nested group, capped to keep the prototype modest
        if key[-1]>64 and not 3195<=key[-1]<=3210: continue
        try:
            iw,ih,hx,hy,rgba=sprite(decompress(b),samplepal)
            name='-'.join(map(str,key));png(OUT/'characters'/f'{name}.png',iw,ih,rgba)
            report['spriteSamples'].append(dict(id=list(key),w=iw,h=ih,hx=hx,hy=hy,url=f'assets/characters/{name}.png'))
        except (ValueError,AssertionError,IndexError,struct.error): continue
    report['archiveSha256']=hashlib.sha256((BASE/'originals/dlamdff_111915.rar').read_bytes()).hexdigest()
    (OUT/'extraction.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({**report,'spriteSamples':len(report['spriteSamples'])},ensure_ascii=False,indent=2))
if __name__=='__main__': main()
