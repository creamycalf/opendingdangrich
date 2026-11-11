from extract_assets import *
from PIL import Image,ImageDraw
entries=archive((SOURCE/'sprite2.dat').read_bytes());pal=bytes(json.loads((OUT/'palettes.json').read_text())[1]['rgb'])
out=BASE/'research/original-ui'; records=[]
for key,b in entries.items():
    try:
        w,h,hx,hy,rgba=sprite(decompress(b),pal);name='s2-'+'-'.join(map(str,key))
        Image.frombytes('RGBA',(w,h),bytes(rgba)).save(out/f'{name}.png');records.append(dict(id=name,w=w,h=h))
    except (ValueError,AssertionError,IndexError,struct.error):pass
for page in range((len(records)+79)//80):
    batch=records[page*80:(page+1)*80];sheet=Image.new('RGB',(1200,10*105),'#6c797f');d=ImageDraw.Draw(sheet)
    for i,r in enumerate(batch):
        im=Image.open(out/(r['id']+'.png'));im.thumbnail((145,80));x=i%8*150;y=i//8*105;sheet.paste(im,(x,y),im);d.text((x,y+83),r['id'],fill='white')
    sheet.save(out/f'sprites-{page}.png')
(out/'sprites-index.json').write_text(json.dumps(records,indent=2));print(len(records))
