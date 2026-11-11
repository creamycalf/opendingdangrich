"""Preserve legacy maps and export new PC rules with a distinct save identity."""
from extract_assets import *
src=Path('D:/Game/old/Doraemon/Doraemon')
dest=OUT/'maps-v126';dest.mkdir(exist_ok=True)
report=[]
for n in range(8):
 old=json.loads((OUT/'maps'/f'{n}.json').read_text('utf8'))
 # Art archives must be byte-identical before reusing existing URLs/animations.
 assert (SOURCE/f'mapElem{n:04d}.dat').read_bytes()==(src/f'mapElem{n:04d}.dat').read_bytes()
 raw=(src/f'map{n:04d}.dat').read_bytes();records=archive(raw);head=records[(0,)];conf=records[(2,)];shops=records[(3,)]
 assert (u32(head,4),u32(head,8))==(old['width'],old['height'])
 cells=[]
 for i in range(old['width']*old['height']):
  at=80+i*16
  cells.append(dict(x=i%old['width'],y=i//old['width'],layer=u16(head,at),object=u16(head,at+2),flags=u16(head,at+4),terrain=u16(head,at+6),price=u32(head,at+8),event=head[at+12],reserved=list(head[at+13:at+16])))
 changes=sum(a!=b for a,b in zip(old['cells'],cells))
 old.update(cells=cells,revision='pc-v126',sourceSha256=hashlib.sha256(raw).hexdigest(),rawConfig=conf.hex(),
  starts=[dict(x=i32,y=j32,z=z32,direction=u32(conf,52+i*4)) for i in range(4) for i32,j32,z32 in [struct.unpack_from('<iii',conf,4+i*12)]],
  jail=dict(x=u32(conf,0x44),y=u32(conf,0x48),direction=u32(conf,0x4c)),
  shops=[dict(x=x,y=y,z=z,rawParameters=list(struct.unpack_from('<84I',shops,16+i*348))) for i in range(u32(shops)) for x,y,z in [struct.unpack_from('<iii',shops,4+i*348)]])
 (dest/f'{n}.json').write_text(json.dumps(old,ensure_ascii=False),'utf8')
 w,h,rgba,_=pcx(records[(1,)])
 png(dest/f'{n}-preview.png',w,h,rgba)
 report.append(dict(map=n,changedCells=changes,sourceSha256=old['sourceSha256']))
(BASE/'research/v126-map-export.json').write_text(json.dumps(report,indent=2),'utf8')
print(json.dumps(report))
