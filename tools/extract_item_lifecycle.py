"""Read verified PC resources for item removal; no original code execution."""
from extract_assets import *
SOURCE=BASE/'work/vm-original-verified'
bm=archive((SOURCE/'bitmaps.dat').read_bytes());_,_,_,pal=pcx(decompress(bm[(1,)]))
sp=archive((SOURCE/'Sprite1.dat').read_bytes());an=archive((SOURCE/'Tools.dat').read_bytes())
# New PC constructors 491320/49492e/496ded/499d8c: +13c directional exit table.
exits={'1':1,'8':92,'14':109,'23':126}
indices={33,42,53,54,181}|set(range(29,33))|set(range(121,125))
for n in exits.values():indices.update(range(n,n+4))
result=dict(sourceSha256=hashlib.sha256((SOURCE/'Tools.dat').read_bytes()).hexdigest(),companions=exits,animations={},images={})
for index in sorted(indices):
 b=decompress(an[(index,)]);offset,frames,rate,_,count=struct.unpack_from('<5I',b);ids=list(struct.unpack_from('<'+'I'*count,b,20));commands=[]
 for p in range(offset,len(b)-13,14):
  row=struct.unpack_from('<HHhhHHH',b,p)
  if row[1]==65535:break
  commands.append(row)
 result['animations'][index]=dict(frames=frames,rate=rate,sprites=ids,commands=commands)
 for n in ids:
  if n in result['images']:continue
  w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal);png(OUT/'item-lifecycle'/f'{n}.png',w,h,rgba)
  result['images'][n]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/item-lifecycle/{n}.png')
(OUT/'item-lifecycle/catalog.json').write_text(json.dumps(result,separators=(',',':')),'utf8')
print(json.dumps({k:{'frames':v['frames'],'rate':v['rate'],'events':[c for c in v['commands'] if c[1]>=len(v['sprites'])]} for k,v in result['animations'].items()}))
