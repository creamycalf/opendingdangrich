"""Read the v1.26 certificate BMPs selected by 0x46e5d1 and orient for phones."""
import hashlib,io,json
from PIL import Image
from extract_assets import archive,decompress,BASE
source=BASE/'work/new-pc-v121/bitmaps.dat'
if not source.exists():source=__import__('pathlib').Path('D:/Game/old/Doraemon/Doraemon/bitmaps.dat')
raw=source.read_bytes();items=archive(raw)
out=BASE/'app/public/assets/pc-certificate';out.mkdir(exist_ok=True)
for n in range(141,171):
    image=Image.open(io.BytesIO(decompress(items[n,])))
    image.transpose(Image.Transpose.ROTATE_90).save(out/f'{n}.png')
(out/'source.json').write_text(json.dumps({'sha256':hashlib.sha256(raw).hexdigest(),'bitmapIds':[141,170],'rotation':'90 degrees counterclockwise; pixels preserved','selector':'0x46e5d1: 141 + character*4 + seat; rank A..E=165..169, S=170'}),encoding='utf8')
print('30 original certificate images extracted')
