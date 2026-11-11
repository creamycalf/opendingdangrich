from extract_assets import *
from PIL import Image,ImageDraw
es=archive((SOURCE/'Sprite1.dat').read_bytes())
ps=json.loads((OUT/'palettes.json').read_text());pal=bytes(ps[1]['rgb'])
keys=list(es)[::100]
sheet=Image.new('RGBA',(1000,((len(keys)+9)//10)*100),(55,70,80,255));draw=ImageDraw.Draw(sheet)
for i,k in enumerate(keys):
    try:
        w,h,hx,hy,rgba=sprite(decompress(es[k]),pal)
        im=Image.frombytes('RGBA',(w,h),bytes(rgba));im.thumbnail((90,75))
        x=i%10*100;y=i//10*100;sheet.alpha_composite(im,(x,y));draw.text((x,y+78),str(k[0]),fill='white')
    except Exception: pass
sheet.save(BASE/'research/characters-labelled.png')
