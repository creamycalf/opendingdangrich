"""Read-only v1.26 selection voice-table/archive audit; no game execution."""
import sys, struct, json, hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'_deps'))
import pefile
from extract_assets import archive, decompress
exe=Path('work/new-pc-v121/Doraemon.exe')
pe=pefile.PE(str(exe))
table=struct.unpack('<7i',pe.get_data(0x4c88fc-pe.OPTIONAL_HEADER.ImageBase,28))
report={'exe':str(exe),'sha256':hashlib.sha256(exe.read_bytes()).hexdigest(),'tableVA':'0x4c88fc','selectionIndexToVoiceCharacter':table,'archives':[]}
sources=[Path('D:/Game/old/Doraemon/Doraemon/voice.dat')]
for source in sources:
 data=source.read_bytes();entries=archive(data);rows=[]
 for character in range(7):
  entry=entries.get((character,0,59));raw=decompress(entry) if entry and entry!=b'#' else None
  rows.append({'character':character,'entryExists':entry is not None,'emptySentinel':entry==b'#','waveSha256':hashlib.sha256(raw).hexdigest() if raw else None})
 report['archives'].append({'path':str(source),'sha256':hashlib.sha256(data).hexdigest(),'bank0clip59':rows})
Path('research/audio-selection-v126-table.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,indent=2))
