"""Export original minigame PCX, scanline sprites and animation instructions."""
from extract_assets import *

def main():
    catalog={}
    for number in range(8):
        prefix=f'MGame{number:02d}'
        entries=archive((SOURCE/(prefix+'.SPR')).read_bytes())
        bg=SOURCE/(prefix+'.BG')
        palettes=list(archive(bg.read_bytes()).values()) if bg.exists() else list(entries.values())
        first=next(b for b in palettes if b[0]==10 and b[2:4]==bytes([1,8]))
        _,_,_,pal=pcx(first);images={};animations={}
        for (index,),b in entries.items():
            if b[:4]==bytes([10,5,1,8]):w,h,rgba,_=pcx(b);hx=hy=0
            else:w,h,hx,hy,rgba=sprite(b,pal)
            path=f'minigames/{number}/{index}.png';png(OUT/path,w,h,rgba)
            images[index]=dict(w=w,h=h,hx=hx,hy=hy,url='assets/'+path)
        bg=SOURCE/(prefix+'.BG');backgrounds=[]
        if bg.exists():
            for (index,),b in archive(bg.read_bytes()).items():
                w,h,rgba,_=pcx(b);path=f'minigames/{number}/bg-{index}.png';png(OUT/path,w,h,rgba)
                backgrounds.append(dict(w=w,h=h,url='assets/'+path))
        for (index,),b in archive((SOURCE/(prefix+'.DAT')).read_bytes()).items():
            offset,frames,rate,_,count=struct.unpack_from('<5I',b)
            sprites=list(struct.unpack_from('<'+'I'*count,b,20));commands=[]
            for p in range(offset,len(b)-13,14):
                tick,op,x,y,color,flags,z=struct.unpack_from('<HHhhHHH',b,p)
                if op==65535:break
                commands.append([tick,op,x,y,color,flags,z])
            animations[index]=dict(frames=frames,rate=rate,sprites=sprites,commands=commands)
        catalog[number]=dict(images=images,backgrounds=backgrounds,animations=animations)
        print(prefix,len(images),'images',len(animations),'animations')
    (OUT/'minigames/catalog.json').write_text(json.dumps(catalog,separators=(',',':')),'utf8')

if __name__=='__main__':main()
