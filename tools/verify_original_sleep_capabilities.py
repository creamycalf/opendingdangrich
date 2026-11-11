"""Original 0x43a2ad sleep mask and 0x4955fa dwarf activation.
Replace only sprite animation callbacks; mask writes and composition run x86.
"""
import json
from verify_original_protection import ProtectionOracle
from verify_original_economy import ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
o=ProtectionOracle();dwarf=o.call(0x48be40,0,14)
def visuals(u,a,size,_):
 sp=u.reg_read(UC_X86_REG_ESP);cleanup={0x404796:16,0x4065f0:0,0x405322:4,0x40639b:0}[a]
 u.reg_write(UC_X86_REG_EAX,0);u.reg_write(UC_X86_REG_EIP,o.get(sp));u.reg_write(UC_X86_REG_ESP,sp+4+cleanup)
for a in [0x404796,0x4065f0,0x405322,0x40639b]:o.uc.hook_add(UC_HOOK_CODE,visuals,begin=a,end=a)
msg=0x10e8000;o.put(msg,0,1,0,0);o.call(0x4955fa,dwarf,msg)
rows=[]
for active in [False,True]:
 o.old=dwarf if active else 0;o.list_owner=o.player
 for sleep in [False,True]:
  o.put(o.player+0x114,int(sleep));o.put(o.player+0x2fc,0)
  for base in [0,0xfff,0xffffffff,0x420,0x18000,0x24000]:
   o.put(o.player+0x2f8,base);rows.append(dict(active=active,sleep=sleep,base=base,after=o.call(0x43a2ad,o.player)))
(ROOT/'tests/fixtures/original-sleep-capabilities.json').write_text(json.dumps(dict(sourceSha256=SHA,scope=__doc__,mask=o.get(dwarf+0x74),value=o.get(dwarf+0x78),cases=rows),indent=2),'utf8');print(len(rows),'original sleep/dwarf capability cases')
