"""Decode original Events.dat0..10 and referenced Sprite1.dat records; no redraw."""
from extract_assets import *
src=Path('D:/Game/old/Doraemon/Doraemon');out=OUT/'pc-hermit';out.mkdir(parents=True,exist_ok=True)
names=['events.dat','Sprite1.dat','sprite2.dat','bitmaps.dat','strings.dat'];source={name:{'path':str(src/name),'sha256':hashlib.sha256((src/name).read_bytes()).hexdigest()} for name in names}
bm=archive((src/'bitmaps.dat').read_bytes());_,_,_,pal=pcx(decompress(bm[(1,)]));sp=archive((src/'Sprite1.dat').read_bytes());an=archive((src/'events.dat').read_bytes())
result={'source':source,'sourceExeSha256':'b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1','evidence':'research/rc21-hermit-rea.json:415d50,4166fd; resource globals resolved455888','animations':{},'images':{}}
for index in range(18):
 b=decompress(an[(index,)]);offset,frames,rate,_,count=struct.unpack_from('<5I',b);ids=list(struct.unpack_from('<'+'I'*count,b,20));commands=[]
 for p in range(offset,len(b)-13,14):
  row=struct.unpack_from('<HHhhHHH',b,p)
  if row[1]==65535:break
  commands.append(row)
 result['animations'][index]={'frames':frames,'rate':rate,'sprites':ids,'commands':commands}
 for n in ids:
  if n in result['images']:continue
  w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal);png(out/f'{n}.png',w,h,rgba);result['images'][n]={'w':w,'h':h,'hx':hx,'hy':hy,'url':f'assets/pc-hermit/{n}.png','rgbaSha256':hashlib.sha256(bytes(rgba)).hexdigest()}
ctors=json.loads((BASE/'research/rc22-hermit-all-ctors-rea.json').read_text('utf8'))['normalized_result']['items']
sp2=archive((src/'sprite2.dat').read_bytes());result['events']={}
import re
for event,row in enumerate(ctors):
 text=row['pseudocode'];fields={int(k,0):int(v,0) for k,v in re.findall(r'param_1\[([0-9a-fx]+)\] = (0x[0-9a-f]+|[0-9]+);',text)}
 record={'good':bool(fields[7]),'duration':fields[4],'hasStatus':'FUN_0040b364' in text,'ctor':row['address']}
 if record['hasStatus']:
  n=fields[9];w,h,hx,hy,rgba=sprite(decompress(sp2[(n,)]),pal);png(out/f'status-{n}.png',w,h,rgba)
  record['icon']={'id':n,'w':w,'h':h,'hx':hx,'hy':hy,'url':f'assets/pc-hermit/status-{n}.png','rgbaSha256':hashlib.sha256(bytes(rgba)).hexdigest()}
 result['events'][event]=record
strings=archive((src/'strings.dat').read_bytes());old=json.loads((BASE/'research/original-strings.json').read_text('utf8'))
result['dialogue']={}
for key,index in [('greeting',8),('instruction',9)]:
 record=next(r for r in old['records'] if r['id']==f'000/{index:03}')
 raw=decompress(strings[(0,index)])
 assert raw.hex()==record['rawHex'], 'New PC dialogue differs; do not reuse old decode'
 result['dialogue'][key]=record['text']
(out/'catalog.json').write_text(json.dumps(result,separators=(',',':')),'utf8');print('Extracted',len(result['animations']),'animations and',len(result['images']),'original sprites; two dialogue bytes verified')
