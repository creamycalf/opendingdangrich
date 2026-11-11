"""Read the v1.26 title dispatcher and execute the unmodified control/reset and animation-option blocks."""
import hashlib, json, struct, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools/_deps"))
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP, UC_X86_REG_EBP, UC_X86_REG_EDX
import pefile, capstone

src=(ROOT/"work/new-pc-v121/Doraemon.exe").read_bytes()
sha=hashlib.sha256(src).hexdigest()
assert sha=="b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1"
pe=pefile.PE(data=src)
vm=Uc(UC_ARCH_X86,UC_MODE_32)
vm.mem_map(0x400000,0x100000)
vm.mem_write(0x400000,pe.get_memory_mapped_image())
vm.mem_map(0x200000,0x10000)
def put(addr,value):
    vm.mem_write(addr,struct.pack('<I',value))
def get(addr):
    return int.from_bytes(vm.mem_read(addr,4),'little')
def run(start,end):
    vm.reg_write(UC_X86_REG_EBP,0x208000)
    vm.reg_write(UC_X86_REG_ESP,0x207000)
    vm.emu_start(start,end,count=200)
rows=[]
for count in range(5):
    put(0x4cc74c,count)
    run(0x460b47,0x460cdc)
    choices=[get(0x4cd630+i*4) for i in range(4+count)]
    run(0x461d81,0x461e79)
    assignments=[get(0x4cd360+i*4) for i in range(4)]
    rows.append(dict(pads=count,choices=choices,reset=assignments))
toggles=[]
for choice in (0,1):
    put(0x4cda34,0xa4 | (1-choice))
    vm.reg_write(UC_X86_REG_EDX,choice)
    run(0x48bb06,0x48bb3b)
    toggles.append(dict(selected=choice,flags=get(0x4cda34),tickStride=get(0x4c85fc)))
assert [r['flags'] for r in toggles]==[0xa4,0xa5]
def instructions(start,end):
    m=capstone.Cs(capstone.CS_ARCH_X86,capstone.CS_MODE_32)
    return [f'{i.address:08x}  {i.bytes.hex()}  {i.mnemonic} {i.op_str}' for i in m.disasm(pe.get_data(start-0x400000,end-start),start)]
result=dict(sha256=sha,titleResource=414,titleState=130,titleCallback='0x460ae4',rows=rows,animationToggle=toggles,
    note='The primary title controller setup and the board animation switch are separate handlers. Mouse/keyboard/gamepads were not connected during block execution.',
    instructions=[instructions(a,b) for a,b in [(0x4570f1,0x457108),(0x460b47,0x460b95),(0x461d81,0x461ea0),(0x48bb06,0x48bb3b),(0x4773a6,0x4773b0),(0x43c953,0x43c996)]])
(ROOT/'tests/fixtures/pc-v126-controller-settings.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(rows,toggles)
