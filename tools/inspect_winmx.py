"""Record supplied WINMX imports and native CD-wrapper entry points without execution."""
from pathlib import Path
import hashlib
import json
import pefile
import capstone

root = Path(__file__).resolve().parents[1]
source = Path('D:/Game/old/Doraemon/Doraemon/winmx.dll')
data = source.read_bytes()
pe = pefile.PE(data=data)
decoder = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_32)
names = {b'auxGetNumDevs', b'auxGetDevCapsA', b'mciSendCommandA', b'timeBeginPeriod'}
report = {
    'sha256': hashlib.sha256(data).hexdigest(),
    'imageBase': hex(pe.OPTIONAL_HEADER.ImageBase),
    'executed': False,
    'imports': {entry.dll.decode(): [symbol.name.decode() if symbol.name else symbol.ordinal
                for symbol in entry.imports] for entry in pe.DIRECTORY_ENTRY_IMPORT},
    'exports': {},
    'finding': 'WINMX contains native virtual-CD logic and Vorbis dependencies; it is not a pure WINMM alias.',
    'limit': 'Static entry-point evidence only; complete playback behavior remains unverified.',
}
for symbol in pe.DIRECTORY_ENTRY_EXPORT.symbols:
    if symbol.name in names:
        report['exports'][symbol.name.decode()] = [
            {'address': hex(ins.address), 'instruction': ins.mnemonic + ' ' + ins.op_str}
            for ins in decoder.disasm(pe.get_data(symbol.address, 128), pe.OPTIONAL_HEADER.ImageBase + symbol.address)
        ]
(root / 'research/winmx-native-evidence.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
