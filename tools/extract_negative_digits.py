"""v1.26 numeric widget 0x485650 selects sprite2 IDs 539..548 for debt."""
from extract_assets import archive, decompress, pcx, sprite, png, OUT
from pathlib import Path
source=Path("D:/Game/old/Doraemon/Doraemon")
bitmaps=archive((source/"bitmaps.dat").read_bytes())
_,_,_,palette=pcx(decompress(bitmaps[(1,)]))
sprites=archive((source/"sprite2.dat").read_bytes())
for number in range(539,549):
    w,h,hx,hy,rgba=sprite(decompress(sprites[(number,)]),palette)
    png(OUT/"ui"/f"{number}.png",w,h,rgba)
print("Exported ten original negative-cash glyphs")
