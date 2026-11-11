from extract_assets import *

def main():
    src=BASE/'work/vm-original-verified';out=OUT/'victory-scenes'
    bm=archive((src/'bitmaps.dat').read_bytes());sp1=archive((src/'sprite1.dat').read_bytes());sp2=archive((src/'sprite2.dat').read_bytes());an=archive((src/'Interface.dat').read_bytes())
    result={'source':{n:hashlib.sha256((src/n).read_bytes()).hexdigest() for n in ['bitmaps.dat','sprite1.dat','sprite2.dat','Interface.dat']},'backgrounds':{},'animations':{},'images':{},'static':{}}
    for group,bitmap,indices in [('victory',123,range(50,57)),('afterword',172,[66])]:
        w,h,rgba,pal=pcx(decompress(bm[(bitmap,)]));png(out/f'{group}.png',w,h,rgba);result['backgrounds'][group]=dict(w=w,h=h,url=f'assets/victory-scenes/{group}.png')
        for n in indices:
            b=decompress(an[n,]);offset,frames,rate,_,count=struct.unpack_from('<5I',b);ids=list(struct.unpack_from('<'+'I'*count,b,20));commands=[]
            for p in range(offset,len(b)-13,14):
                row=struct.unpack_from('<HHhhHHH',b,p)
                if row[1]==65535:break
                commands.append(row)
            result['animations'][n]=dict(frames=frames,rate=rate,sprites=ids,commands=commands,group=group)
            for sprite_id in ids:
                key=f'{group}-{sprite_id}'
                if key in result['images']:continue
                w,h,hx,hy,rgba=sprite(decompress(sp1[sprite_id,]),pal);png(out/f'{key}.png',w,h,rgba);result['images'][key]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/victory-scenes/{key}.png')
        if group=='victory':
            for n in [*range(400,407),*range(567,619)]:
                w,h,hx,hy,rgba=sprite(decompress(sp2[n,]),pal);png(out/f'static-{n}.png',w,h,rgba);result['static'][n]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/victory-scenes/static-{n}.png')
    (out/'catalog.json').write_text(json.dumps(result,separators=(',',':')),'utf8');print('victory/afterword:',len(result['animations']),'animations',len(result['images']),'sprites')

if __name__=='__main__':main()
