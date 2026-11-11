"""Execute original x86 navigation AND cell query in an isolated CPU emulator.

No Windows/game UI is launched. Town has one layer; runtime occupancy is zero.
The emitted oracle is independent of the JavaScript implementation.
"""
from pathlib import Path
import hashlib, json, struct, sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools/_deps'))
import pefile
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_ECX, UC_X86_REG_ESP

source = next((ROOT / 'work').glob('*/Dora/wa.exe'))
data = source.read_bytes()
sha = hashlib.sha256(data).hexdigest()
assert sha == 'f190b35370d3efe3024b5105a90f85abf07f5915e7b7a431d93b756de03f65f3'
pe = pefile.PE(data=data)
assert pe.get_data(0x7db4d, 9) == bytes.fromhex('558bec81ec80000000')
map_number=int(sys.argv[1]) if len(sys.argv)>1 else None
board_path=ROOT / ('app/public/assets/town.json' if map_number is None else f'app/public/assets/maps/{map_number}.json')
board = json.loads(board_path.read_text(encoding='utf8'))
assert all(c['layer'] & 255 == 0 for c in board['cells'])
uc = Uc(UC_ARCH_X86, UC_MODE_32)
uc.mem_map(0x400000, 0xe0000)
uc.mem_write(0x400000, pe.get_memory_mapped_image())
uc.mem_map(0x1000000, 0x80000)
uc.mem_map(0x2000000, 0x10000)
def put(address, *values): uc.mem_write(address, struct.pack('<'+'I'*len(values), *values))
actor, header, layers, layer, cells, slots = 0x1000000, 0x1001000, 0x1002000, 0x1003000, 0x1010000, 0x1050000
put(actor+0x20, header)
put(header+4, board['width'], board['height'])
put(header+0x10, layers)
put(layers, layer)
put(layer+4, cells, slots)
for i, c in enumerate(board['cells']):
    uc.mem_write(cells+i*16, struct.pack('<HHHHIB3x', c['layer'], c['object'], c['flags'], c['terrain'], c['price'], c['event']))
rows = []
for i, c in enumerate(board['cells']):
    if not c['flags'] & 128 or c['flags'] & 64: continue
    masks=[]
    for direction in range(4):
        stack=0x200f000
        put(stack, 0x400000, direction, c['x'], c['y'])
        uc.reg_write(UC_X86_REG_ESP, stack)
        uc.reg_write(UC_X86_REG_ECX, actor)
        uc.emu_start(0x47db4d, 0x400000, count=10000)
        assert uc.reg_read(UC_X86_REG_ESP) == stack+16
        masks.append(uc.reg_read(UC_X86_REG_EAX))
    rows.append([i, *masks])
result={'sourceSha256':sha,'routine':'0x47db4d','cellQuery':'0x47ab39',
        'map':board['id'], 'scope':'Single layer, zero runtime occupancy, all walkable cells and four headings',
        'rows':rows}
dest=ROOT/('tests/fixtures/original-town-navigation.json' if map_number is None else f'tests/fixtures/original-map-{map_number}-navigation.json')
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(result,separators=(',',':')),encoding='utf8')
print(json.dumps({'map':board['id'],'cases':len(rows)*4,'fixture':str(dest)}))
