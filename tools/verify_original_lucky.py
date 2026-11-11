"""Original lucky-gun branch 0x49446c..0x494616, cosmetic UI calls stubbed."""
import json
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
o=Oracle(json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8')));draw=0
def hook(u,a,size,_):
 sp=u.reg_read(UC_X86_REG_ESP);cleanup={0x4821a0:0,0x4801b6:20,0x401cb6:4,0x485ac3:12,0x47fe57:20}[a]
 u.reg_write(UC_X86_REG_EAX,draw if a==0x4821a0 else 0);u.reg_write(UC_X86_REG_EIP,o.get(sp));u.reg_write(UC_X86_REG_ESP,sp+4+cleanup)
for a in [0x4821a0,0x4801b6,0x401cb6,0x485ac3,0x47fe57]:o.uc.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
out=[]
for draw in range(1000):
 frame=0x20fe000;obj=0x10e0000;o.put(frame-0x48,obj);o.put(obj+0x78,0);o.put(obj+0x108,0);o.heap=0x1100000
 o.uc.reg_write(UC_X86_REG_EBP,frame);o.uc.reg_write(UC_X86_REG_ESP,frame-0x100)
 o.uc.emu_start(0x49446c,0x494616,count=10000);assert o.uc.reg_read(UC_X86_REG_EIP)==0x494616
 out.append(dict(draw=draw,value=o.get(obj+0x78),good=bool(o.get(obj+0x108)&8)))
(ROOT/'tests/fixtures/original-lucky.json').write_text(json.dumps(dict(sourceSha256=SHA,scope=__doc__,cases=out),indent=2),'utf8')
print('Original lucky gun:',sum(r['good'] for r in out),'good;',sum(not r['good'] for r in out),'bad')
