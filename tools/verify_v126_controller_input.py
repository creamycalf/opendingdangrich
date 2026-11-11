"""Original 0x44efd8 player input / 0x40773b keyboard poll, mocked Win32 keys."""
import sys,struct,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/_deps'))
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EIP,UC_X86_REG_ESP,UC_X86_REG_ECX,UC_X86_REG_EAX
source=(ROOT/'work/new-pc-v121/Doraemon.exe').read_bytes()
sha=hashlib.sha256(source).hexdigest()
assert sha=='b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1'
vm=Uc(UC_ARCH_X86,UC_MODE_32);vm.mem_map(0x400000,0x100000);vm.mem_write(0x400000,pefile.PE(data=source).get_memory_mapped_image())
vm.mem_map(0x200000,0x20000);vm.mem_map(0x300000,0x1000)
put=lambda at,*n:vm.mem_write(at,struct.pack('<'+'I'*len(n),*n))
get=lambda at:struct.unpack('<I',vm.mem_read(at,4))[0]
put(0x4b9214,0x300000)
down=set();queries=[]
def key(_vm,address,size,context):
    sp=vm.reg_read(UC_X86_REG_ESP);vk=get(sp+4);queries.append(vk)
    vm.reg_write(UC_X86_REG_EAX,0x8000 if vk in down else 0)
    vm.reg_write(UC_X86_REG_EIP,get(sp));vm.reg_write(UC_X86_REG_ESP,sp+8)
vm.hook_add(UC_HOOK_CODE,key,begin=0x300000,end=0x300000)
player=0x201000;controller=0x202000;output=0x203000;stack=0x210000;end=0x300100
put(player+0x10c,controller);put(controller,0x4b9384)
rows=[];groups=[]
for group in range(3):
    keys=struct.unpack('<6H',vm.mem_read(0x4c1284+group*12,12));groups.append(list(keys))
    vm.mem_write(controller+0x20,struct.pack('<6H',*keys));put(controller+0x1c,group)
    for mask in range(64):
        for previous_direction,previous_buttons in [(0,0),(15,0),(0,3),(15,3)]:
            down={vk for i,vk in enumerate(keys) if mask&(1<<i)};queries.clear()
            put(controller+4,previous_direction,0,previous_buttons,0)
            put(stack,end,output);vm.reg_write(UC_X86_REG_ESP,stack);vm.reg_write(UC_X86_REG_ECX,player)
            vm.emu_start(0x44efd8,end,count=2000);assert vm.reg_read(UC_X86_REG_EIP)==end
            values=list(struct.unpack('<4I',vm.mem_read(output,16)))
            direction=mask&15;buttons=mask>>4
            assert values==[direction,direction&~previous_direction,buttons,buttons&~previous_buttons]
            assert queries==list(keys)
            rows.append(dict(group=group,mask=mask,previousDirection=previous_direction,previousButtons=previous_buttons,values=values))
report=dict(sha256=sha,entry='0x44efd8',keyboardPoll='0x40773b',keysTable='0x4c1284',scope='Original x86 player/controller methods. Only GetAsyncKeyState is replaced; no game process, UI or timing validation.',groups=groups,rows=rows)
(ROOT/'tests/fixtures/pc-v126-controller-input.json').write_text(json.dumps(report,separators=(',',':')),encoding='utf8')
print(len(rows),'original controller combinations passed')
