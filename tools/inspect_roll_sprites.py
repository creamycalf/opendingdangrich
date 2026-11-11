from extract_assets import *
import sys
sys.path.insert(0,str(BASE/'tools/_deps'))
from PIL import Image,ImageDraw
src=Path('D:/Game/old/Doraemon/Doraemon')
bm=archive((src/'bitmaps.dat').read_bytes())
_,_,_,pal=pcx(decompress(bm[(1,)]))
sp=archive((src/'sprite2.dat').read_bytes())
im=Image.new('RGBA',(600,240),'#aac5b5');d=ImageDraw.Draw(im)
for i,n in enumerate([2,75,76,77,78]):
 w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal)
 tile=Image.frombytes('RGBA',(w,h),bytes(rgba));im.alpha_composite(tile,(i*120,60));d.text((i*120,10),f'{n}: {w}x{h}\n{hx},{hy}',fill='black')
im.save(BASE/'research/roll-route-sprites.png')
