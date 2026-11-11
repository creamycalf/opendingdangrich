"""Run the original certificate grade block, including zero-day x87 division."""
import hashlib,json,struct,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/_deps'))
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_EBP,UC_X86_REG_ESP,UC_X86_REG_FPCW
source=(ROOT/'work/new-pc-v121/Doraemon.exe').read_bytes()
sha=hashlib.sha256(source).hexdigest()
assert sha=='b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1'
vm=Uc(UC_ARCH_X86,UC_MODE_32)
vm.mem_map(0x400000,0x100000)
vm.mem_write(0x400000,pefile.PE(data=source).get_memory_mapped_image())
vm.mem_map(0x200000,0x10000)
rows=[]
for days in [0,1,2,365]:
    for score in [-10000,-1,-0.5,0,299.999,300,399.999,400,499.999,500,599.999,600,899.999,900,10000]:
        assets=struct.unpack('<f',struct.pack('<f',score*max(1,days)))[0]
        vm.mem_write(0x4ccd38,struct.pack('<f',assets))
        vm.mem_write(0x4cc7b0,struct.pack('<I',days))
        vm.reg_write(UC_X86_REG_EBP,0x208000)
        vm.reg_write(UC_X86_REG_ESP,0x207000)
        vm.reg_write(UC_X86_REG_FPCW,0x37f)
        vm.emu_start(0x46ff0a,0x46ffd1,count=200)
        grade=int.from_bytes(vm.mem_read(0x4cd690,4),'little')-612
        rows.append(dict(assets=assets,days=days,grade='SABCDE'[grade]))
out=dict(sha256=sha,entry='0x46ff0a..0x46ffd1',rows=rows)
(ROOT/'tests/fixtures/pc-v126-certificate.json').write_text(json.dumps(out,indent=2),encoding='utf8')
print(len(rows),'original grade cases verified')
