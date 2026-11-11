"""New PC 0x43c8eb: sprite2[2,75..78] endpoint markers (not dice faces)."""
from extract_assets import *
src=Path('D:/Game/old/Doraemon/Doraemon')
out=OUT/'pc-roll';out.mkdir(exist_ok=True)
bm=archive((src/'bitmaps.dat').read_bytes())
_,_,_,pal=pcx(decompress(bm[(1,)]))
sp=archive((src/'sprite2.dat').read_bytes())
catalog={}
for n in [2,75,76,77,78]:
 w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal)
 png(out/f'{n}.png',w,h,rgba)
 catalog[n]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/pc-roll/{n}.png')
(out/'catalog.json').write_text(json.dumps(catalog),'utf8')
