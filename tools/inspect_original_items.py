"""Execute the original item factory and constructors, preserving raw fields.

Field names are deliberately not guessed. This is a research index for tracing
item behavior, not proof that any gameplay effect has been reimplemented.
"""
import json
from verify_original_economy import Oracle, ROOT, SHA
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_EIP, UC_X86_REG_ESP


def main():
    board = json.loads((ROOT / 'app/public/assets/maps/4.json').read_text('utf8'))
    catalog = json.loads((ROOT / 'research/original-item-catalog.json').read_text('utf8'))['items']
    rows = []
    for number in range(44):
        oracle = Oracle(board)
        stack, end = 0x20ff000, 0x10ff020
        oracle.put(stack, end, number)
        oracle.uc.reg_write(UC_X86_REG_ESP, stack)
        oracle.uc.emu_start(0x48be40, end, count=100000)
        assert oracle.uc.reg_read(UC_X86_REG_EIP) == end
        obj = oracle.uc.reg_read(UC_X86_REG_EAX)
        assert 0x1100000 <= obj < oracle.heap
        vtable = oracle.get(obj)
        rows.append(dict(id=number, name=catalog[number]['name'] if number<42 else 'internal/unidentified',
                         objectAndBuffersBytes=oracle.heap-obj, vtable=hex(vtable),
                         rawFields={hex(offset):hex(oracle.get(obj+offset)) for offset in range(0, 0x80, 4)},
                         virtualMethods={hex(offset):hex(oracle.get(vtable+offset)) for offset in range(0, 0x74, 4)}))
    (ROOT/'research/original-item-constructors.json').write_text(json.dumps(dict(sourceSha256=SHA, factory='0x48be40',items=rows),ensure_ascii=False,indent=2),'utf8')
    print('Executed all 44 original factory branches and constructors; raw fields and vtables saved.')


if __name__=='__main__':
    main()
