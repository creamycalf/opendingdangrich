"""Record the user-provided distribution, without launching or changing it."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
source=Path('D:/Game/old/Doraemon/Doraemon')
files=[]
for p in sorted(source.rglob('*')):
 if p.is_file():
  files.append(dict(path=p.relative_to(source).as_posix(),bytes=p.stat().st_size,sha256=hashlib.file_digest(p.open('rb'),'sha256').hexdigest()))
result=dict(source=str(source),screen=dict(width=640,height=480),executed=False,files=files)
(root/'runtime-touch/original-manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf8')
print(f'{len(files)} files recorded; no executable launched')
