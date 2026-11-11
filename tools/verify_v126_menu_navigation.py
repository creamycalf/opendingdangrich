"""Execute original menu navigation; stub only non-navigational sound/tooltip calls."""
import sys, struct, json, hashlib, random
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools/_deps'))
import pefile
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EIP, UC_X86_REG_ESP, UC_X86_REG_ECX, UC_X86_REG_EAX
source = (ROOT / 'work/new-pc-v121/Doraemon.exe').read_bytes()
sha = hashlib.sha256(source).hexdigest()
assert sha == 'b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1'
vm = Uc(UC_ARCH_X86, UC_MODE_32)
vm.mem_map(0x400000, 0x100000)
vm.mem_write(0x400000, pefile.PE(data=source).get_memory_mapped_image())
vm.mem_map(0x200000, 0x20000)
vm.mem_map(0x300000, 0x1000)
put = lambda at, *n: vm.mem_write(at, struct.pack('<' + 'I' * len(n), *(x & 0xffffffff for x in n)))
get = lambda at: struct.unpack('<I', vm.mem_read(at, 4))[0]
def ancillary(_vm, address, size, context):
    sp = vm.reg_read(UC_X86_REG_ESP)
    vm.reg_write(UC_X86_REG_EAX, 0xffffffff if address == 0x4896d9 else 0)
    vm.reg_write(UC_X86_REG_EIP, get(sp))
    vm.reg_write(UC_X86_REG_ESP, sp + 4)
for address in (0x4896d9, 0x43389f):
    vm.hook_add(UC_HOOK_CODE, ancillary, begin=address, end=address)
menu, controller, items, edges, stack, end = 0x201000, 0x202000, 0x204000, 0x205000, 0x210000, 0x300100
rng = random.Random(12643497)
layouts = [
    [(248, 168 + i * 32) for i in range(5)],
    [(0, 0), (-1, 10), (10, 10), (-10, 10), (10, -10), (20, 0)],
    [(x * 40 + 100, y * 32 + 100) for y in range(3) for x in range(4)],
]
for _ in range(24):
    layouts.append([(rng.randrange(640), rng.randrange(480)) for _ in range(rng.randrange(2, 15))])
rows = []
for layout_id, points in enumerate(layouts):
    for explicit in (False, True):
        neighbors = [[rng.randrange(-1, len(points)) for _ in range(4)] for _ in points] if explicit else None
        # Restrict explicit links to enabled destinations; adapter deliberately
        # rejects corrupt/disabled edges even if the original would follow one.
        if neighbors:
            neighbors = [[n if n < 0 or points[n][0] >= 0 else -1 for n in row] for row in neighbors]
        for selected in range(len(points)):
            if points[selected][0] < 0: continue
            for direction in range(4):
                vm.mem_write(menu, bytes(0x100))
                vm.mem_write(items, bytes(len(points) * 0x34))
                put(menu + 0x30, len(points), items, selected)
                put(menu + 0x58, controller)
                put(menu + 0x64, 1, edges if explicit else 0)
                put(controller, 0x4b93f4, 1 << direction, 1 << direction, 0, 0)
                for i, (x, y) in enumerate(points): put(items + i * 0x34, x, y, 23, 15)
                if neighbors:
                    for i, row in enumerate(neighbors): put(edges + i * 16, *row)
                put(stack, end)
                vm.reg_write(UC_X86_REG_ESP, stack)
                vm.reg_write(UC_X86_REG_ECX, menu)
                vm.emu_start(0x43497d, end, count=10000)
                assert vm.reg_read(UC_X86_REG_EIP) == end
                rows.append(dict(layout=layout_id, points=points, neighbors=neighbors, selected=selected,
                                 direction=direction, result=get(menu + 0x38)))
report = dict(sha256=sha, entry='0x43497d', scope='Original x86 directional menu navigation. Sound-slot allocation returns -1; tooltip clear is stubbed; callbacks absent. No UI/timing assertion.', rows=rows)
(ROOT / 'tests/fixtures/pc-v126-menu-navigation.json').write_text(json.dumps(report, separators=(',', ':')), encoding='utf8')
print(len(rows), 'original menu navigation combinations executed')
