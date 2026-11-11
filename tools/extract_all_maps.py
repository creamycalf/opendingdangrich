"""Lossless rule fields and decoded artwork for all eight owned PC maps.

Unknown configuration and shop parameters remain raw, never invented rules.
"""
from extract_assets import *

def main():
    catalogue=[]
    for number in range(8):
        source=SOURCE/f'map{number:04d}.dat'
        records=archive(source.read_bytes());head=records[(0,)]
        width,height=u32(head,4),u32(head,8)
        assert u32(head,0x34)==1, 'Unsupported layer count'
        cells=[]
        for i in range(width*height):
            at=80+i*16
            cells.append(dict(x=i%width,y=i//width,layer=u16(head,at),object=u16(head,at+2),flags=u16(head,at+4),terrain=u16(head,at+6),price=u32(head,at+8),event=head[at+12],reserved=list(head[at+13:at+16])))
        conf=records[(2,)];assert len(conf)==0x118
        starts=[dict(x=struct.unpack_from('<i',conf,4+i*12)[0],y=struct.unpack_from('<i',conf,8+i*12)[0],z=struct.unpack_from('<i',conf,12+i*12)[0],direction=u32(conf,52+4*i)) for i in range(4)]
        jail=dict(x=u32(conf,0x44),y=u32(conf,0x48),direction=u32(conf,0x4c))
        shop_data=records[(3,)];count=u32(shop_data);assert len(shop_data)==4+count*348
        shops=[]
        for i in range(count):
            offset=4+i*348
            x,y,z=struct.unpack_from('<iii',shop_data,offset)
            assert cells[y*width+x]['event']==5
            shops.append(dict(x=x,y=y,z=z,rawParameters=list(struct.unpack_from('<84I',shop_data,offset+12))))
        entries=archive((SOURCE/f'mapElem{number:04d}.dat').read_bytes())
        palette=entries[(5,)];assert len(palette)==768
        palette=bytes(round(v*255/63) for v in palette)
        art={};animations={}
        for key,packed in entries.items():
            if key[0]==4:
                animations['-'.join(map(str,key))]=packed.hex()
            if key[0] not in (0,1,2,3):continue
            raw=decompress(packed)
            if key[0]==1:
                iw,ih=struct.unpack_from('<HH',raw)
                assert (iw,ih)==(80,60) and len(raw)==4+iw*ih
                hx,hy=0,0
                rgba=b''.join(palette[v*3:v*3+3]+b'\xff' for v in raw[4:])
            else:iw,ih,hx,hy,rgba=sprite(raw,palette,key[0]==0)
            name='-'.join(map(str,key));dest=OUT/'maps'/str(number)/f'{name}.png'
            png(dest,iw,ih,rgba)
            art[name]=dict(w=iw,h=ih,hx=hx,hy=hy,url=f'assets/maps/{number}/{name}.png')
        iw,ih,rgba,_=pcx(records[(1,)])
        png(OUT/'maps'/str(number)/'preview.png',iw,ih,rgba)
        board=dict(id=number,width=width,height=height,cells=cells,starts=starts,jail=jail,shops=shops,art=art,rawConfig=conf.hex(),rawAnimations=animations)
        target=OUT/'maps'/f'{number}.json';target.write_text(json.dumps(board,ensure_ascii=False),encoding='utf8')
        catalogue.append(dict(id=number,url=f'assets/maps/{number}.json',preview=f'assets/maps/{number}/preview.png',width=width,height=height,artCount=len(art),shops=count,sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest()))
        print(f'Map {number}: {width}x{height}, {len(art)} images, {count} shops',flush=True)
    (OUT/'maps/index.json').write_text(json.dumps(catalogue,indent=2),encoding='utf8')

if __name__=='__main__':main()
