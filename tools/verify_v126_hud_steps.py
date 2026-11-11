"""Verify the original bell-side HUD field and actual decimal glyph selection."""
import hashlib
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/"tools/_deps"))
import capstone
import pefile
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP, UC_X86_REG_ECX

source = (ROOT/"work/new-pc-v121/Doraemon.exe").read_bytes()
sha = hashlib.sha256(source).hexdigest()
assert sha == "b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1"
pe = pefile.PE(data=source)
vm = Uc(UC_ARCH_X86, UC_MODE_32)
vm.mem_map(0x400000,0x100000)
vm.mem_write(0x400000,pe.get_memory_mapped_image())
vm.mem_map(0x200000,0x10000)
player, widget, glyphs, stack, stop = 0x201000,0x202000,0x203000,0x208000,0x200000
def put(addr,value):
    vm.mem_write(addr,struct.pack("<I",value))
def get(addr):
    return int.from_bytes(vm.mem_read(addr,4),"little")
put(0x4cda8c,widget)
put(widget+0x2a8,2)
put(widget+0x2b4,3)
for digit in range(10):
    put(widget+0x244+digit*4,glyphs+digit*16)
    put(glyphs+digit*16,8)
    put(widget+0x26c+digit*4,glyphs+(digit+10)*16)
    put(glyphs+(digit+10)*16,8)
# Keep the field loader, MSVC float-to-int conversion and full digit formatter
# native. Stub only framebuffer clear/copy/bounds and refresh callbacks.
for addr in (0x432c54,0x4322a5,0x432e73,0x4333b4):
    vm.mem_write(addr,b"\xc3")
digits=[]
passed=[]
def trace(uc,addr,size,_):
    if addr==0x4858af:
        passed.append(get(uc.reg_read(UC_X86_REG_ESP)+4))
    if addr==0x432e73:
        pointer=get(uc.reg_read(UC_X86_REG_ESP)+4)
        digits.append((pointer-glyphs)//16)
vm.hook_add(UC_HOOK_CODE,trace)
rows=[]
for points in (0,0.5,1,1.5,9.75,10,123.5,999.5,1000,10000):
    digits.clear()
    passed.clear()
    vm.mem_write(player+0x120,struct.pack("<f",points))
    # Deliberately unrelated adjacent fields cannot influence the read.
    put(player+0x124,1)
    put(player+0x128,6)
    put(stack,stop)
    vm.reg_write(UC_X86_REG_ESP,stack)
    vm.reg_write(UC_X86_REG_ECX,player)
    vm.emu_start(0x44f251,stop,count=2000)
    assert len(digits)==3
    assert passed==[int(points)], (points,passed)
    assert digits==[int(c) for c in str(min(999,int(points))).zfill(3)], (points,digits)
    rows.append(dict(walkPoints=points,formatterInput=passed[0],digits=digits.copy()))

cash_rows=[]
put(widget+0x2b4,6)
for amount in (-1000001,-999999,-12345,-1,0,1,999999,1000001):
    digits.clear()
    vm.mem_write(stack,struct.pack("<IiI",stop,amount,2))
    vm.reg_write(UC_X86_REG_ESP,stack)
    vm.reg_write(UC_X86_REG_ECX,widget)
    vm.emu_start(0x4858af,stop,count=2000)
    expected=[int(d)+(10 if amount<0 else 0) for d in str(min(999999,abs(amount))).zfill(6)]
    assert digits==expected,(amount,digits)
    cash_rows.append(dict(amount=amount,digits=digits.copy(),base=539 if amount<0 else 145))
decoder=capstone.Cs(capstone.CS_ARCH_X86,capstone.CS_MODE_32)
ranges=[(0x44f251,0x44f281),(0x4748b1,0x47491f),(0x43e42a,0x43e45f),(0x4856ba,0x4856ff),(0x485922,0x485a05)]
assembly=[]
for start,end in ranges:
    assembly.append(dict(start=hex(start),end=hex(end),instructions=[
        dict(address=hex(i.address),bytes=i.bytes.hex(),text=i.mnemonic+" "+i.op_str)
        for i in decoder.disasm(pe.get_data(start-0x400000,end-start),start)]))
result=dict(sha256=sha,field="player+0x120 float32",widgetGlobal="0x4cda8c",
            position=dict(x=412,y=438),digitCount=3,
            boundary="Original field loader, __ftol and digit selection executed. Rendering callbacks stubbed.",
            rows=rows,cashRows=cash_rows,assembly=assembly)
path=ROOT/"tests/fixtures/pc-v126-hud-steps.json"
path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print("verified",len(rows),"walk-point inputs:",[r["digits"] for r in rows])
