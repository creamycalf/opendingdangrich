"""Cash effects selected by new-PC 0x44f7ca/0x44442d; no invented sprites."""
from extract_assets import *

def main():
    source=BASE/'work/vm-original-verified'
    if not (source/'Anime.dat').exists():
        source=SOURCE
    bm=archive((source/'bitmaps.dat').read_bytes());_,_,_,pal=pcx(decompress(bm[(1,)]))
    sp=archive((source/'Sprite1.dat').read_bytes());an=archive((source/'Anime.dat').read_bytes())
    result=dict(source={name:hashlib.sha256((source/name).read_bytes()).hexdigest() for name in ['Anime.dat','Sprite1.dat','bitmaps.dat']},animations={},images={})
    for index in [48,49,50,*range(55,79)]:
        b=decompress(an[(index,)]);offset,frames,rate,_,count=struct.unpack_from('<5I',b);ids=list(struct.unpack_from('<'+'I'*count,b,20));commands=[]
        for p in range(offset,len(b)-13,14):
            row=struct.unpack_from('<HHhhHHH',b,p)
            if row[1]==65535:break
            commands.append(row)
        result['animations'][index]=dict(frames=frames,rate=rate,sprites=ids,commands=commands)
        for n in ids:
            if n in result['images']:continue
            w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal);png(OUT/'cash-animations'/f'{n}.png',w,h,rgba)
            result['images'][n]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/cash-animations/{n}.png')
    (OUT/'cash-animations/catalog.json').write_text(json.dumps(result,separators=(',',':')),'utf8')
    print(len(result['animations']),'animations',len(result['images']),'sprites; source',source)

if __name__=='__main__':main()
