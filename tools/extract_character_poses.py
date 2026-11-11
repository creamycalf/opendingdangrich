"""Export all animation references written by the original six character constructors.
REA decompiled immediate assignments identify pose/direction indices; raw anime
commands, sprite offsets and frame counts are retained losslessly.
"""
from extract_assets import *
import re

def main():
 v=json.loads((BASE/'research/characterTables26.json').read_text('utf8'))
 items=v['normalized_result']['items']+json.loads((BASE/'research/characterFactory26.json').read_text('utf8'))['normalized_result']['items'][1:]
 names={'0x450aa8':'doraemon','0x451735':'nobita','0x451d57':'shizuka','0x452658':'suneo','0x452c52':'dorami','0x45328d':'gian'}
 bm=archive((SOURCE/'bitmaps.dat').read_bytes());_,_,_,pal=pcx(decompress(bm[(1,)]));sp=archive((SOURCE/'Sprite1.dat').read_bytes());an=archive((SOURCE/'anime.dat').read_bytes())
 out={'characters':{},'animations':{},'images':{}}
 for item in items:
  name=names.get(item['procedure']['address'])
  if not name:continue
  table={}
  for off,val in re.findall(r'\*\(undefined4 \*\)\(\(int\)this \+ (0x[0-9a-f]+|[0-9]+)\) = (0x[0-9a-f]+|[0-9]+);',item['pseudocode']):
   off=int(off,0);val=int(val,0)
   if 0x148<=off<0x2e8:
    size=(off-0x148)//0xd0;pose=((off-0x148)%0xd0)//16;direction=((off-0x148)%16)//4
    table.setdefault(str(size),{}).setdefault(str(pose),[None]*4)[direction]=val
  out['characters'][name]=table
  for size in table.values():
   for directions in size.values():
    assert all(n is not None for n in directions)
    for index in directions:
     if index in out['animations']:continue
     b=decompress(an[(index,)]);offset,frames,rate,_,count=struct.unpack_from('<5I',b);ids=list(struct.unpack_from('<'+'I'*count,b,20));commands=[]
     for p in range(offset,len(b)-13,14):
      row=struct.unpack_from('<HHhhHHH',b,p)
      if row[1]==65535:break
      commands.append(row)
     out['animations'][index]=dict(frames=frames,rate=rate,sprites=ids,commands=commands)
     for n in ids:
      if n in out['images']:continue
      w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal);png(OUT/'character-poses'/f'{n}.png',w,h,rgba)
      out['images'][n]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/character-poses/{n}.png')
 (OUT/'character-poses/catalog.json').write_text(json.dumps(out,separators=(',',':')),'utf8')
 print(len(out['characters']),'characters,',len(out['animations']),'animations,',len(out['images']),'sprites')
if __name__=='__main__':main()
