"""Losslessly pack animation PNGs; verify every packed pixel against its source."""
from pathlib import Path
import json
import argparse
from PIL import Image
root=Path(__file__).resolve().parents[1]/'app/public'
out=root/'assets/sprite-atlas';out.mkdir(exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument('--maps-only',action='store_true',help='Update map sheets without rebuilding unchanged character and item art')
args=parser.parse_args()
index=json.loads((out/'index.json').read_bytes()) if args.maps_only else {}
sheets=0
groups=[] if args.maps_only else [(name,list((root/'assets'/name).glob('*.png'))) for name in ('character-poses','item-animations','road-items','characters')]
for map_id in range(8):
    data=json.loads((root/f'assets/maps/{map_id}.json').read_bytes())
    groups.append((f'map-{map_id}',[root/meta['url'] for meta in data['art'].values()]))
for group,paths in groups:
    sizes=[]
    for p in paths:
        with Image.open(p) as im:sizes.append((p,im.width,im.height))
    sizes.sort(key=lambda v:(-v[2],-v[1],v[0].name))
    sheet=Image.new('RGBA',(2048,2048));x=y=row=0;entries=[];part=0
    def flush():
        global sheet,x,y,row,entries,part,sheets
        if not entries:return
        name=f'{group}-{part}.png';file=out/name
        sheet.crop((0,0,2048,y+row)).save(file,optimize=True)
        with Image.open(file) as packed:
            for p,sx,sy,w,h in entries:
                with Image.open(p) as original:
                    assert packed.crop((sx,sy,sx+w,sy+h)).tobytes()==original.convert('RGBA').tobytes(),p
                index[p.relative_to(root).as_posix()]={'url':'assets/sprite-atlas/'+name,'x':sx,'y':sy,'w':w,'h':h}
        sheets+=1;part+=1;sheet=Image.new('RGBA',(2048,2048));x=y=row=0;entries=[]
    for p,w,h in sizes:
        assert w<=2048 and h<=2048,p
        if x+w>2048:x=0;y+=row;row=0
        if y+h>2048:flush()
        with Image.open(p) as im:sheet.paste(im.convert('RGBA'),(x,y))
        entries.append((p,x,y,w,h));x+=w;row=max(row,h)
    flush()
(out/'index.json').write_text(json.dumps(index,separators=(',',':')),encoding='utf8')
print(json.dumps({'spritesVerified':len(index),'sheets':sheets,'bytes':sum(p.stat().st_size for p in out.iterdir())}))
