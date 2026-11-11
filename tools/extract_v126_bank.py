from pathlib import Path
from extract_assets import archive,decompress,pcx,png
root=Path(__file__).resolve().parents[1]
source=Path('D:/Game/old/Doraemon/Doraemon/bitmaps.dat')
bitmaps=archive(source.read_bytes())
for index,name in [(124,'panel'),(125,'handle')]:
 w,h,rgba,palette=pcx(decompress(bitmaps[index,]))
 rgba=bytearray(rgba)
 transparent=palette[255*3:256*3]
 for at in range(0,len(rgba),4):
  if rgba[at:at+3]==transparent:rgba[at+3]=0
 png(root/f'app/public/assets/pc-bank/{name}.png',w,h,rgba)
 print(index,w,h)
