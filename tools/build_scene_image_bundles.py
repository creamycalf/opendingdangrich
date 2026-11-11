"""Concatenate original PNG bytes without re-encoding; keep files as fallback."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]/'app/public'
for folder in ['victory-scenes','pc-hermit']:
 directory=root/'assets'/folder
 files=sorted(directory.glob('*.png'))
 entries={};data=bytearray()
 for file in files:
  raw=file.read_bytes();assert raw.startswith(b'\x89PNG\r\n\x1a\n')
  entries[file.relative_to(root).as_posix()]={'offset':len(data),'length':len(raw),'sha256':hashlib.sha256(raw).hexdigest()};data.extend(raw)
 (directory/'images.bundle.bin').write_bytes(data)
 manifest={'version':1,'bundle':'images.bundle.bin','length':len(data),'sha256':hashlib.sha256(data).hexdigest(),'entries':entries}
 (directory/'images.bundle.json').write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8')
 print(folder,len(entries),len(data))
