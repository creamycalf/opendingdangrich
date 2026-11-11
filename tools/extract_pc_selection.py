"""Scene-specific palette from bitmaps[54], per v1.26 callback 0x46772d."""
from extract_assets import *
src=Path('D:/Game/old/Doraemon/Doraemon');out=OUT/'pc-selection'
bm=archive((src/'bitmaps.dat').read_bytes());sp=archive((src/'sprite2.dat').read_bytes())
w,h,rgba,pal=pcx(decompress(bm[(54,)]));png(out/'background.png',w,h,rgba)
for n in range(88,116):
 w,h,rgba,_=pcx(decompress(bm[(n,)]));png(out/f'portrait-{n}.png',w,h,rgba)
for n in range(400,406):
 w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal);png(out/f'character-{n}.png',w,h,rgba)
print('Selection background, 28 portraits and six candidate sprites extracted')
