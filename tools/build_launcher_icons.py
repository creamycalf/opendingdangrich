"""Resize the generated master into Android launcher resources (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / 'app/android/app/src/main/res'
source = Image.open(ROOT / 'docs/design/launcher-icon-source.png').convert('RGBA')

def legacy(size, rounded=False):
    im = source.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new('L', (size, size)); draw = ImageDraw.Draw(mask)
    if rounded:
        draw.ellipse((0, 0, size-1, size-1), fill=255)
    else:
        draw.rounded_rectangle((0, 0, size-1, size-1), radius=size*.21, fill=255)
    im.putalpha(mask)
    return im

for density, size, factor in [('mdpi',48,1),('hdpi',72,1.5),('xhdpi',96,2),('xxhdpi',144,3),('xxxhdpi',192,4)]:
    folder = RES / ('mipmap-' + density)
    legacy(size).save(folder / 'ic_launcher.png')
    legacy(size, True).save(folder / 'ic_launcher_round.png')
    full = round(108*factor); inset = round(18*factor); art = round(72*factor)
    foreground = Image.new('RGBA',(full,full))
    foreground.alpha_composite(source.resize((art,art),Image.Resampling.LANCZOS),(inset,inset))
    foreground.save(folder / 'ic_launcher_foreground.png')

for name in ['ic_launcher.xml', 'ic_launcher_round.xml']:
    (RES/'mipmap-anydpi-v26'/name).write_text('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
''', encoding='utf8')
(RES/'values/ic_launcher_background.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources><color name="ic_launcher_background">#08BBDD</color></resources>
''', encoding='utf8')
legacy(512).save(ROOT/'docs/design/launcher-icon-preview.png')
preview = Image.new('RGB',(640,320),'#e9eff5')
for x, round_icon in [(16,False),(280,True)]:
    im=legacy(256,round_icon); preview.paste(im,(x,16),im)
for y,size in [(20,48),(96,72),(192,96)]:
    im=legacy(size,True);preview.paste(im,(540,y),im)
preview.save(ROOT/'docs/design/launcher-icon-masks.png')
print('Generated 15 launcher PNGs, adaptive XML and previews.')
