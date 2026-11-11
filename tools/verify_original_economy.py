"""Execute original property calculations with synthetic ownership and real maps.

Only allocation/free and debug sprintf are substituted. Map lookup, connected
property traversal, list operations, arithmetic and float conversion run x86.
This does not emulate the surrounding turn/event/transaction UI.
"""
from pathlib import Path
import hashlib, json, struct, sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools/_deps'))
import pefile
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import *

SOURCE = next((ROOT / 'work').glob('*/Dora/wa.exe'))
SHA = 'f190b35370d3efe3024b5105a90f85abf07f5915e7b7a431d93b756de03f65f3'
data = SOURCE.read_bytes()
assert hashlib.sha256(data).hexdigest() == SHA
pe = pefile.PE(data=data)


class Oracle:
    def __init__(self, board):
        self.board = board
        self.uc = u = Uc(UC_ARCH_X86, UC_MODE_32)
        u.mem_map(0, 0x1000)  # FS:[0] exception-chain storage; no OS execution.
        u.mem_map(0x400000, 0xe0000)
        u.mem_write(0x400000, pe.get_memory_mapped_image())
        u.mem_map(0x1000000, 0x200000)
        u.mem_map(0x2000000, 0x100000)
        self.actor, header, layers, layer = 0x1000000, 0x1001000, 0x1002000, 0x1003000
        self.cells, slots, self.owners = 0x1010000, 0x1050000, 0x1090000
        self.player, self.other, self.result = 0x10d0000, 0x10d1000, 0x10d2000
        self.put(self.actor+0x20, header)
        self.put(self.actor+0x224, self.owners)
        self.put(0x4ca680, self.actor)
        self.put(header+4, board['width'], board['height'])
        self.put(header+0x10, layers)
        self.put(layers, layer)
        self.put(layer+4, self.cells, slots)
        for i, c in enumerate(board['cells']):
            u.mem_write(self.cells+i*16, struct.pack('<HHHHIB3x', c['layer'], c['object'], c['flags'], c['terrain'], c['price'], c['event']))
        # Store the original x87 return as float32, exactly as the caller does.
        u.mem_write(0x10ff000, b'\xd9\x1d'+struct.pack('<I', self.result))
        self.heap = 0x1100000
        for va in [0x48b3a1, 0x4a9ab4, 0x48b46c, 0x4a914e, 0x4a9a62]:
            u.hook_add(UC_HOOK_CODE, self.primitive, begin=va, end=va)

    def put(self, address, *values):
        self.uc.mem_write(address, struct.pack('<'+'I'*len(values), *values))

    def get(self, address):
        return struct.unpack('<I', self.uc.mem_read(address, 4))[0]

    def primitive(self, uc, address, size, _):
        sp = uc.reg_read(UC_X86_REG_ESP)
        result = 0
        if address in [0x48b3a1, 0x4a9ab4]:
            count = self.get(sp+4)
            assert 0 < count < 100000
            result = self.heap
            self.heap += (count+15)&~15
            assert self.heap < 0x1200000
            uc.mem_write(result, bytes(count))
        uc.reg_write(UC_X86_REG_EAX, result)
        uc.reg_write(UC_X86_REG_EIP, self.get(sp))
        uc.reg_write(UC_X86_REG_ESP, sp+4)

    def rent(self, lot, ownership, multiplier=1):
        self.uc.mem_write(self.owners, bytes(len(self.board['cells'])*16))
        for i, level, who in ownership:
            self.put(self.owners+16*i, self.player if who==0 else self.other, level)
        self.uc.mem_write(0x4c54bc, struct.pack('<f', multiplier))
        self.put(self.result, 0, 0)
        c = self.board['cells'][lot]
        self.heap = 0x1100000
        sp = 0x20ff000
        self.put(sp, 0x10ff000, c['x'], c['y'], self.result+4)
        self.uc.reg_write(UC_X86_REG_ESP, sp)
        self.uc.reg_write(UC_X86_REG_ECX, self.player)
        self.uc.reg_write(UC_X86_REG_FPCW, 0x37f)
        self.uc.emu_start(0x44ef1c, 0x10ff006, count=1000000)
        assert self.uc.reg_read(UC_X86_REG_EIP) == 0x10ff006
        assert self.uc.reg_read(UC_X86_REG_ESP) == sp+16
        return struct.unpack('<f', self.uc.mem_read(self.result, 4))[0], self.get(self.result+4)

    def transaction_price(self, lot, level, base, kind):
        c=self.board['cells'][lot]
        self.put(self.owners+16*lot, self.player, level)
        message,payload=0x10e0000,0x10e0100
        self.put(message,0,1,0,0,0,0,payload)
        self.put(payload,0,c['x'],c['y'],base)
        sp=0x20ff000
        self.put(sp,0x10ff020,message)
        self.uc.reg_write(UC_X86_REG_ESP,sp)
        self.uc.reg_write(UC_X86_REG_ECX,self.player)
        self.uc.reg_write(UC_X86_REG_FPCW,0x37f)
        entry,output=(0x442d48,0x4c909c) if kind=='upgrade' else (0x443372,0x4c9164)
        self.uc.emu_start(entry,0x10ff020,count=10000)
        assert self.uc.reg_read(UC_X86_REG_EIP)==0x10ff020
        assert self.uc.reg_read(UC_X86_REG_ESP)==sp+8
        return self.get(output)


def main():
    rows=[];transactions=[]
    for number in range(8):
        board=json.loads((ROOT/f'app/public/assets/maps/{number}.json').read_text(encoding='utf8'))
        oracle=Oracle(board)
        lots=[i for i,c in enumerate(board['cells']) if c['event']==1 and 0<c['x']<board['width']-1 and 0<c['y']<board['height']-1]
        for lot in lots:
            for level in range(5):
                ownership=[[lot,level,0]]
                value,count=oracle.rent(lot,ownership)
                rows.append(dict(map=number,lot=lot,ownership=ownership,multiplier=1,value=value,count=count))
                base=board['cells'][lot]['price']
                transactions.append(dict(map=number,lot=lot,base=base,level=level,
                    sale=oracle.transaction_price(lot,level,base,'sale'),
                    upgrade=oracle.transaction_price(lot,level,base,'upgrade') if level<4 else None))
        # Mixed levels, a different owner and cycles exercise the original flood fill.
        for lot in lots[:20]:
            ownership=[[i,j%5,int(j%7==6)] for j,i in enumerate(lots)]
            ownership= [entry if entry[0]!=lot else [lot,3,0] for entry in ownership]
            for multiplier in [1,1.2,1.44]:
                value,count=oracle.rent(lot,ownership,multiplier)
                rows.append(dict(map=number,lot=lot,ownership=ownership,multiplier=multiplier,value=value,count=count))
        print(json.dumps({'map':number,'cases':len(rows)}),flush=True)
    output={'sourceSha256':SHA,'routine':'0x44ef1c','connectedTraversal':'0x4394bb',
            'scope':'Base property charge before caller status effects; synthetic ownership on original maps',
            'substitutions':['allocator','free','debug sprintf'],'rows':rows,
            'transactionRoutines':{'upgrade':'0x442d48','sale':'0x443372'},'transactions':transactions}
    path=ROOT/'tests/fixtures/original-property-charge.json'
    path.write_text(json.dumps(output,separators=(',',':')),encoding='utf8')
    print(json.dumps({'cases':len(rows),'fixture':str(path)}))


if __name__=='__main__':main()
