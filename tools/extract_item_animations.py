"""Export Tools.dat visuals without inventing animation indices.
Primary indices come from original factory +0x10; exceptional sequences are
identified in REA itemVisualSpecific26 and itemVisual26 evidence.
"""
from extract_assets import *

bm=archive((SOURCE/'bitmaps.dat').read_bytes());_,_,_,pal=pcx(decompress(bm[(1,)]))
sp=archive((SOURCE/'Sprite1.dat').read_bytes());an=archive((SOURCE/'Tools.dat').read_bytes())
constructors=json.loads((BASE/'research/original-item-constructors.json').read_text('utf8'))['items']
primary={str(r['id']):int(r['rawFields']['0x10'],16) for r in constructors if r['id']<42}
# Idle/moving callbacks 48fdbf,49368e,4957a0,498126 and 49d8bb.
companions={'1':dict(idle=17,walk=13),'8':dict(idle=96,walk=100),'14':dict(idle=113,walk=117),'23':dict(idle=130,walk=134),'35':dict(idle=275,walk=279)}
indices=set(primary.values())|set(range(21,25))|set(range(47,49))|{35,61,62,63,64,65,66,67,68,69,75,80,81,88,89,146,267}
for poses in companions.values():
 for first in poses.values():indices.update(range(first,first+4))
result=dict(primary=primary,companions=companions,animations={},images={})
for index in sorted(indices):
 b=decompress(an[(index,)]);offset,frames,rate,_,count=struct.unpack_from('<5I',b);ids=list(struct.unpack_from('<'+'I'*count,b,20));commands=[]
 for p in range(offset,len(b)-13,14):
  row=struct.unpack_from('<HHhhHHH',b,p)
  if row[1]==65535:break
  commands.append(row)
 result['animations'][index]=dict(frames=frames,rate=rate,sprites=ids,commands=commands)
 for n in ids:
  if n in result['images']:continue
  w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal);png(OUT/'item-animations'/f'{n}.png',w,h,rgba)
  result['images'][n]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/item-animations/{n}.png')
(OUT/'item-animations/catalog.json').write_text(json.dumps(result,separators=(',',':')),'utf8')
print(len(result['animations']),'animations,',len(result['images']),'sprites')
