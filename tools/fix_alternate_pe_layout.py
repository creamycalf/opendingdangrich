"""Repair the virtual-section gap emitted by patcher v0.5.3 for this EXE.

Only the isolated Chinese test build is accepted. Original patcher output is
retained. No game instructions or resources are changed by this repair.
"""
from pathlib import Path
import hashlib
import json
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools/_deps'))
import pefile

target = ROOT / 'work/compat-v053/Doraemon.exe'
data = target.read_bytes()
digest = hashlib.sha256(data).hexdigest()
assert digest == 'd8802cc779a66dcb8a88ab98d44629360d1c3f0d59a79b0e0ff38538e229869f', 'Unexpected input; refusing to patch'
pe = pefile.PE(data=data)
rsrc, port = pe.sections[-2:]
assert rsrc.Name.rstrip(b'\0') == b'.rsrc'
assert port.Name.rstrip(b'\0') == b'.port'
assert (rsrc.VirtualAddress, rsrc.Misc_VirtualSize, port.VirtualAddress) == (0xd0000, 0x2230, 0xd6000)
offset = rsrc.get_file_offset() + 8
output = bytearray(data)
# Extend only the zero-filled virtual resource section tail to the next section.
struct.pack_into('<I', output, offset, port.VirtualAddress - rsrc.VirtualAddress)
reparsed = pefile.PE(data=output)
for a, b in zip(reparsed.sections, reparsed.sections[1:]):
    end = a.VirtualAddress + max(a.Misc_VirtualSize, a.SizeOfRawData)
    aligned = (end + 0xfff) & ~0xfff
    assert aligned == b.VirtualAddress, (a.Name, hex(aligned), hex(b.VirtualAddress))
backup = target.with_name('Doraemon-patcher-output.exe.bak')
assert not backup.exists(), 'Backup already exists'
backup.write_bytes(data)
target.write_bytes(output)
report = {'before': digest, 'after': hashlib.sha256(output).hexdigest(),
          'headerOffset': hex(offset), 'oldVirtualSize': '0x2230',
          'newVirtualSize': '0x6000', 'backup': str(backup),
          'runtimeValidated': False}
(ROOT / 'research/pe-layout-repair.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
