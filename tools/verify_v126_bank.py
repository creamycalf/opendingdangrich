"""Execute the original bank percentage calculation before its text rendering."""
from pathlib import Path
import sys,struct,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/_deps'))
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ECX,UC_X86_REG_EIP
binary=(ROOT/'work/new-pc-v121/Doraemon.exe').read_bytes()
sha=hashlib.sha256(binary).hexdigest()
assert sha=='b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1'
image=pefile.PE(data=binary).get_memory_mapped_image()
vm=Uc(UC_ARCH_X86,UC_MODE_32);vm.mem_map(0x400000,0x100000);vm.mem_write(0x400000,image);vm.mem_map(0x200000,0x10000)
rows=[]
for cash,bank in [(1000,1000),(1000.25,301.75),(0,2000),(500,0),(999999,0.5)]:
 for position in range(101):
  for offset,value in [(0x14c,cash),(0x150,bank),(0x144,position)]:vm.mem_write(0x201000+offset,struct.pack('<f',value))
  vm.reg_write(UC_X86_REG_ESP,0x208000);vm.reg_write(UC_X86_REG_ECX,0x201000)
  vm.emu_start(0x403d7a,0x403e48,count=1000);assert vm.reg_read(UC_X86_REG_EIP)==0x403e48
  after=struct.unpack('<ff',vm.mem_read(0x20112c,8));rows.append([cash,bank,position,*after])
output={'sha256':sha,'entry':'0x403d7a','stop':'0x403e48','rows':rows}
(ROOT/'tests/fixtures/pc-v126-bank.json').write_text(json.dumps(output,separators=(',',':')),encoding='utf8')
print(len(rows),'original bank balances verified')
