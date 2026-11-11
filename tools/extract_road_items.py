"""Export original Tools.dat door animations and referenced Sprite1 art."""
from extract_assets import *
def main():
    bm=archive((SOURCE/'bitmaps.dat').read_bytes());_,_,_,pal=pcx(decompress(bm[(1,)]))
    sp=archive((SOURCE/'Sprite1.dat').read_bytes());an=archive((SOURCE/'Tools.dat').read_bytes());result={'animations':{},'images':{}}
    for index in [*range(21,33),*range(47,55),*range(113,125),274]:
        b=decompress(an[(index,)]);offset,frames,rate,_,count=struct.unpack_from('<5I',b);ids=list(struct.unpack_from('<'+'I'*count,b,20));commands=[]
        for p in range(offset,len(b)-13,14):
            tick,op,x,y,color,flags,z=struct.unpack_from('<HHhhHHH',b,p)
            if op==65535:break
            commands.append([tick,op,x,y,color,flags,z])
        result['animations'][index]=dict(frames=frames,rate=rate,sprites=ids,commands=commands)
        for n in ids:
            if n in result['images']:continue
            w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal);png(OUT/'road-items'/f'{n}.png',w,h,rgba)
            result['images'][n]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/road-items/{n}.png')
    (OUT/'road-items/catalog.json').write_text(json.dumps(result,separators=(',',':')),'utf8');print(len(result['images']),'original door sprites')
if __name__=='__main__':main()
