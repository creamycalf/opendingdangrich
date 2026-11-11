"""Extract v1.2.1 PE / Version 1.26 title resources selected by REA 0x455888/0x458e79."""
from extract_assets import *
src=Path('D:/Game/old/Doraemon/Doraemon')
out=OUT/'pc-front';out.mkdir(parents=True,exist_ok=True)
bm=archive((src/'bitmaps.dat').read_bytes());_,_,_,pal=pcx(decompress(bm[(53,)]))
sp=archive((src/'Sprite1.dat').read_bytes());s2=archive((src/'sprite2.dat').read_bytes());an=archive((src/'interface.dat').read_bytes())
result={'animations':{},'images':{},'static':{}}
for index in [18,19,20,21,57]:
 b=decompress(an[(index,)]);offset,frames,rate,_,count=struct.unpack_from('<5I',b);ids=list(struct.unpack_from('<'+'I'*count,b,20));commands=[]
 for p in range(offset,len(b)-13,14):
  row=struct.unpack_from('<HHhhHHH',b,p)
  if row[1]==65535:break
  commands.append(row)
 result['animations'][index]=dict(frames=frames,rate=rate,sprites=ids,commands=commands)
 for n in ids:
  if n in result['images']:continue
  w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal);png(out/f'{n}.png',w,h,rgba)
  result['images'][n]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/pc-front/{n}.png')
for n in [319,558,559]:
 w,h,hx,hy,rgba=sprite(decompress(s2[(n,)]),pal);png(out/f's2-{n}.png',w,h,rgba)
 result['static'][n]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/pc-front/s2-{n}.png')
w,h,rgba,_=pcx(decompress(bm[(53,)]));png(out/'title.png',w,h,rgba)
(out/'catalog.json').write_text(json.dumps(result,separators=(',',':')),'utf8')
print(json.dumps({k:{'frames':v['frames'],'rate':v['rate'],'sprites':v['sprites'],'last':v['commands'][-5:]} for k,v in result['animations'].items()}))
