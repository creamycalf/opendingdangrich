"""Export the original inventory/shop artwork, sprite2 records 30..71.

The contiguous sequence matches the 42-item factory/catalog order. The second
sequence (94..135) contains the same artwork in small inventory slots; use the
unframed originals so touch selection does not scale an embedded grey square.
"""
from extract_assets import *

source = SOURCE / 'sprite2.dat'
sprites = archive(source.read_bytes())
bitmaps = archive((SOURCE / 'bitmaps.dat').read_bytes())
_, _, _, palette = pcx(decompress(bitmaps[(1,)]))
items = json.loads((BASE / 'research/original-item-catalog.json').read_text('utf8'))['items']
result = {'source': str(source.relative_to(BASE)), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'items': []}
for item in items:
    record = item['id'] + 30
    width, height, _, _, rgba = sprite(decompress(sprites[(record,)]), palette)
    png(OUT / 'pc-shop' / f'{item["id"]}.png', width, height, rgba)
    result['items'].append({'id': item['id'], 'name': item['name'], 'record': record, 'width': width, 'height': height})
(OUT / 'pc-shop' / 'source.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), 'utf8')
print('Exported', len(result['items']), 'original shop item images')
