"""Export original PC bitmap UI for visual comparison, never synthesize artwork."""
from extract_assets import *
from PIL import Image,ImageDraw
entries=archive((SOURCE/'bitmaps.dat').read_bytes())
records=[]
out=BASE/'research/original-ui';out.mkdir(parents=True,exist_ok=True)
for key,b in entries.items():
    try:
        w,h,rgba,pal=pcx(decompress(b))
        name='-'.join(map(str,key));im=Image.frombytes('RGBA',(w,h),rgba)
        im.save(out/f'{name}.png');records.append(dict(id=name,w=w,h=h))
    except (ValueError,AssertionError,IndexError,struct.error):pass
for page in range((len(records)+23)//24):
    batch=records[page*24:(page+1)*24];sheet=Image.new('RGB',(1200,6*160),'#283540');d=ImageDraw.Draw(sheet)
    for i,r in enumerate(batch):
        im=Image.open(out/(r['id']+'.png'));im.thumbnail((290,130));x=i%4*300;y=i//4*160;sheet.paste(im,(x,y));d.text((x,y+135),f"{r['id']} / {r['w']} x {r['h']}",fill='white')
    sheet.save(out/f'catalog-{page}.png')
(out/'index.json').write_text(json.dumps(records,indent=2))
print('exported',len(records),'original UI bitmaps')
