"""Original sleep-gun target predicate and camera selection callbacks.
Run x86 with real factories, masks, item/event conflict logic and eligibility.
Substitute UI selection, camera lookup, removal notification and visuals only.
No GUI process or operating-system imports are executed.
"""
import json,itertools
from verify_original_protection import ProtectionOracle
from verify_original_economy import ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *

class TargetOracle(ProtectionOracle):
 def __init__(self):
  super().__init__();self.third=self.other+0x3000;self.selected=self.other;self.consumed=False
  self.items_all={i:self.call(0x48be40,0,i) for i in [3,4,7,15,17,25,26,27,30,33,35,36,39]}
  self.camera=self.call(0x48be40,0,7);self.put(self.camera+0x110,self.third)
  self.put(0x10e4000+8,0x10fe400);self.uc.mem_write(0x10fe400,b'\x31\xc0\xc3')
  for p in [self.player,self.other,self.third]:self.put(p,0x10e4000);self.put(p+0x2f8,0xfff);self.put(p+0x2fc,0)
  def stub(u,a,size,_):
   sp=u.reg_read(UC_X86_REG_ESP);result=0;cleanup=0
   if a==0x44dfea:
    cleanup=16
    if self.get(sp+4)==0:self.put(self.get(sp+8),self.selected);result=1
   if a==0x43a4d4:cleanup=4;result=int(u.reg_read(UC_X86_REG_ECX)==self.selected and self.get(sp+4)==7)
   if a==0x43a529:cleanup=4;result=self.camera
   if a==0x48d454:cleanup=4
   if a==0x43b0c9:cleanup=4;self.consumed=True
   if a==0x4821a0:result=999
   u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_EIP,self.get(sp));u.reg_write(UC_X86_REG_ESP,sp+4+cleanup)
  for a in [0x44dfea,0x43a4d4,0x43a529,0x48d454,0x48da1c,0x43b0c9,0x4821a0]:self.uc.hook_add(UC_HOOK_CODE,stub,begin=a,end=a)
 def sleep(self,stage,sleep,army,alive,protected,nobita,shizuka,donor):
  obj=self.items_all[26];self.put(obj+0x10c,self.player);self.put(obj+0x124,stage,self.other if donor else self.third)
  self.put(self.player+0x2f8,0xfff|(0x10000000 if nobita else 0));self.put(self.other+0x2f8,(0xfff&~0x400 if protected else 0xfff)|(0x20000000 if shizuka else 0))
  self.put(self.other+0x2fc,(0 if alive else 0x80000000)|(0x1000 if army else 0));self.put(self.other+0x114,int(sleep));self.old=0
  return bool(self.call(0x49a664,obj,self.other))
 def reflect(self,id,alive,protected,same_donor=False):
  obj=self.items_all[id];self.old=0;self.consumed=False
  for p in [self.player,self.other,self.third]:self.put(p+0x2f8,0xfff);self.put(p+0x2fc,0);self.put(p+0x114,0)
  self.put(self.third+0x2fc,0 if alive else 0x80000000);self.put(self.third+0x2f8,0xfff&~0x400 if protected else 0xfff)
  self.put(obj+0x10c,self.player);self.put(obj+0x124,1,self.third if same_donor else self.player)
  msg=0x10e5000;self.put(msg,0,0,0,0)
  trace=[]
  hook=self.uc.hook_add(UC_HOOK_CODE,lambda u,a,z,d:trace.append(hex(a)))
  try:self.call(self.get(self.get(obj)),obj,msg)
  except Exception:
   print('trace',trace[-35:]);print('reflection error',id,alive,protected,'obj',hex(obj),'regs',[(x,hex(self.uc.reg_read(y))) for x,y in [('ip',UC_X86_REG_EIP),('ax',UC_X86_REG_EAX),('cx',UC_X86_REG_ECX),('dx',UC_X86_REG_EDX),('sp',UC_X86_REG_ESP)]]);raise
  finally:self.uc.hook_del(hook)
  return dict(consumed=self.consumed,redirected=self.get(obj+(0x12c if id==26 else 0x110))==self.third)

def main():
 o=TargetOracle();sleep=[];reflection=[]
 for vals in itertools.product([0,1],repeat=8):
  stage,asleep,army,alive,protected,nobita,shizuka,donor=vals
  sleep.append(dict(stage=stage,sleep=bool(asleep),army=bool(army),alive=bool(alive),protected=bool(protected),nobita=bool(nobita),shizuka=bool(shizuka),sameDonor=bool(donor),allowed=o.sleep(*vals)))
 for id in o.items_all:
  for alive,protected in itertools.product([False,True],repeat=2):reflection.append(dict(id=id,alive=alive,protected=protected,**o.reflect(id,alive,protected)))
 result=dict(sourceSha256=SHA,scope=__doc__,sleep=sleep,reflection=reflection)
 (ROOT/'tests/fixtures/original-targets.json').write_text(json.dumps(result,indent=2),'utf8');print(len(sleep),'sleep target cases;',len(reflection),'camera selection cases')
if __name__=='__main__':main()

