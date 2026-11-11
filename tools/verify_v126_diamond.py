"""Execute new-PC diamond consumption/redirection helper with explicit world predicates.
Original x86 owns branch ordering, removal and returned target. Only object lookup,
eligibility result, presentation and destructors are fixture stubs.
"""
from pathlib import Path
import sys,json,hashlib,struct
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'tools/_deps'))
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
b=(R/'work/new-pc-v121/Doraemon.exe').read_bytes();sha=hashlib.sha256(b).hexdigest();assert sha=='b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x100000);u.mem_write(0x400000,pefile.PE(data=b).get_memory_mapped_image());u.mem_map(0x200000,0x20000)
actor,target,item,event,iv,ev=0x201000,0x202000,0x203000,0x204000,0x205000,0x206000
def put(a,*v):u.mem_write(a,struct.pack('<'+'I'*len(v),*v))
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
put(item,iv);put(event,ev);put(iv+0x18,0x20f000);put(iv+0x24,0x20f010);put(ev+0x28,0x20f020)
s={}
def hook(u,a,z,_):
 pops={0x43a604:4,0x417f60:0,0x43a659:4,0x454c90:0,0x480800:4,0x4390fe:0,0x20f000:4,0x20f010:4,0x20f020:4,0x48f40c:0,0x44fe9b:0,0x43b358:0,0x44eec1:4}
 if a not in pops:return
 sp=u.reg_read(UC_X86_REG_ESP);value=0
 if a==0x43a604:value=int(s['hasDiamond'])
 elif a==0x417f60:value=int(s['good'])
 elif a==0x43a659:value=item
 elif a==0x454c90:value=target
 elif a==0x480800:s['removed']=True
 elif a==0x4390fe:value=int(s['alive'])
 elif a==0x20f020:value=int(s['eligible']);s['eligibilityCalled']=True
 elif a==0x20f000:s['destroyed']=True
 u.reg_write(UC_X86_REG_EAX,value);u.reg_write(UC_X86_REG_EIP,get(sp));u.reg_write(UC_X86_REG_ESP,sp+4+pops[a])
u.hook_add(UC_HOOK_CODE,hook);rows=[]
for has in [False,True]:
 for good in [False,True]:
  for alive in [False,True]:
   for eligible in [False,True]:
    s=dict(hasDiamond=has,good=good,alive=alive,eligible=eligible,removed=False,destroyed=False,eligibilityCalled=False)
    put(0x218000,0x20ff00,event);u.reg_write(UC_X86_REG_ESP,0x218000);u.reg_write(UC_X86_REG_ECX,actor);u.emu_start(0x43a78d,0x20ff00,count=10000);assert u.reg_read(UC_X86_REG_EIP)==0x20ff00
    rows.append(dict(**s,redirected=u.reg_read(UC_X86_REG_EAX)==target))
(R/'tests/fixtures/v126-diamond.json').write_text(json.dumps(dict(sourceSha256=sha,entry='0x43a78d',scope=__doc__,rows=rows),indent=2),'utf8');print(len(rows),'native diamond helper cases')
