"""Read-only comparison against upstream patcher-v0.5.3 executable gates."""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools/_deps'))
import pefile

source = next((ROOT / 'work').glob('*/Dora/wa.exe'))
data = source.read_bytes()
pe = pefile.PE(data=data)
sections = {s.Name.rstrip(b'\0').decode(): {
    'va': pe.OPTIONAL_HEADER.ImageBase + s.VirtualAddress,
    'raw': s.PointerToRawData,
    'size': s.SizeOfRawData,
} for s in pe.sections}
cseg = sections.get('CSEG', {})
canonical_layout = cseg.get('va') == 0x4d1000 and cseg.get('raw') == 0xcc000
alternate_layout = cseg.get('va') == 0x4ce000 and cseg.get('raw') == 0xc9000
canonical = canonical_layout and data[0x2cc11:0x2cc18] in (
    bytes.fromhex('33c0e935020000'), bytes.fromhex('c745f400000000'))
alternate = alternate_layout and data[0x3721a:0x37222] == bytes.fromhex('837dec00740733c0') and data[0x83da3:0x83da8] == bytes.fromhex('8b55088955')
fingerprints = json.loads((ROOT / 'research/upstream-v053/base-fingerprints.json').read_text())['files']
resources = []
for name, expected in fingerprints.items():
    path = source if name == 'Doraemon.exe' else source.parent / name
    actual = hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
    resources.append({'name': name, 'actualSha256': actual, 'canonicalMatch': actual == expected})
report = {
    'source': str(source), 'upstreamTag': 'patcher-v0.5.3',
    'sections': sections, 'canonicalGate': canonical, 'alternateGate': alternate,
    'hasPortableSection': '.port' in sections,
    'bytesAtRegistryGates': {hex(p): data[p:p+7].hex() for p in (0x2cc11, 0x2cb31)},
    'resources': resources,
    'note': 'Static gate comparison only; does not execute or patch the game. Resource layout support is not identical to executable support.'
}
output = ROOT / 'research/upstream-compatibility.json'
output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
