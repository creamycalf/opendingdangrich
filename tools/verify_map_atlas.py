"""Read-only pixel verification for all eight maps in the packaged atlas index."""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
assets=root/'app/dist'
index=json.loads((assets/'assets/sprite-atlas/index.json').read_bytes())
checks=[]
for map_id in range(8):
    board=json.loads((assets/f'assets/maps-v126/{map_id}.json').read_bytes())
    sheets={};count=0
    for meta in board['art'].values():
        url=meta['url'];entry=index[url]
        sheet=sheets.setdefault(entry['url'],None)
        if sheet is None:
            sheet=Image.open(assets/entry['url']).convert('RGBA');sheets[entry['url']]=sheet
        x,y,w,h=[entry[k] for k in ('x','y','w','h')]
        with Image.open(assets/url) as original:
            assert sheet.crop((x,y,x+w,y+h)).tobytes()==original.convert('RGBA').tobytes(),url
        count+=1
    checks.append(dict(map=map_id,spritesVerified=count,sheets=len(sheets)))
    for sheet in sheets.values():sheet.close()
report=dict(checks=checks,totalSprites=sum(r['spritesVerified'] for r in checks),totalSheets=sum(r['sheets'] for r in checks))
(root/'test-results/rc11-map-atlas-pixels.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report))
