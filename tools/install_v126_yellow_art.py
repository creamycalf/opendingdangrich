"""Install only the verified yellow actor into the existing board catalog."""
import filecmp
import json
import shutil
from pathlib import Path

from extract_assets import archive, decompress, pcx, sprite
from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / "app/public/assets"
yellow = root / "research/v126-yellow"
catalog_file = assets / "character-poses/catalog.json"
catalog = json.loads(catalog_file.read_bytes())
source = json.loads((yellow/"catalog.json").read_bytes())
catalog["characters"]["yellow"] = source["poses"]
for index, animation in source["animations"].items():
    assert index not in catalog["animations"] or catalog["animations"][index] == animation
    catalog["animations"][index] = animation
    for n in animation["sprites"]:
        url = f"assets/character-poses/{n}.png"
        target = assets.parent / url
        decoded = yellow / f"board/{n}.png"
        if target.exists():
            assert filecmp.cmp(decoded,target,shallow=False)
        else:
            shutil.copyfile(decoded,target)
        meta = dict(source["images"][f"board/{n}"], url=url)
        assert str(n) not in catalog["images"] or catalog["images"][str(n)] == meta
        catalog["images"][str(n)] = meta
catalog_file.write_text(json.dumps(catalog,separators=(",",":")),encoding="utf8")
for index in range(47,51):
    shutil.copyfile(yellow/f"hud-{index}.png", assets/f"ui/portrait-{index}.png")

# Rebuild the locked center pedestal strip with original background and overlay.
# Then use the same frame-zero positioning as the other six candidates.
game = Path("D:/Game/old/Doraemon/Doraemon")
def load(name):
    return archive((game/name).read_bytes())
w,h,rgba,palette = pcx(decompress(load("bitmaps.dat")[54,]))
scene = Image.frombytes("RGBA",(w,h),rgba)
w,h,hx,hy,rgba = sprite(decompress(load("sprite2.dat")[498,]),palette)
scene.alpha_composite(Image.frombytes("RGBA",(w,h),bytes(rgba)),(5+hx,7+hy))
anim = source["animations"]["337"]
for frame,index,x,y,layer,mx,my in sorted(anim["commands"],key=lambda cmd:-cmd[4]):
    if frame or index >= len(anim["sprites"]):
        continue
    n = anim["sprites"][index]
    meta = source["images"][f"selection/{n}"]
    scene.alpha_composite(Image.open(yellow/f"selection/{n}.png"),(280+x+meta["hx"],278+y+meta["hy"]))
patch = scene.crop((280,220,360,326))
patch.save(assets/"pc-selection/yellow-pedestal.png")
print("Board catalog and unlocked pedestal installed.")
