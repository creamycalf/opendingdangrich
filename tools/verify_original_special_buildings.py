"""Execute x86 construction gates and impact, missile eligibility and sale quote.
Actual factories/map/list/masks and arithmetic run unchanged. Rendering, world
actor insertion and land-list lookup are substituted; no OS/GUI is executed.
Missile flight and camera animation are reviewed separately, not emulated here.
"""
import json,itertools,struct
from verify_original_land_items import LandOracle
from verify_original_protection import ProtectionOracle
from verify_original_economy import ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *

class Buildings(LandOracle):
 def __init__(self,b):
  super().__init__(b)
  for i in [40,41]:self.items[i]=self.call(0x48be40,0,i)
  def stub(u,a,z,d):
   sp=u.reg_read(UC_X86_REG_ESP);pop=8 if a==0x47d85d else 4
   u.reg_write(UC_X86_REG_EAX,0x10e6000 if a==0x47d85d else 0)
   u.reg_write(UC_X86_REG_EIP,self.get(sp));u.reg_write(UC_X86_REG_ESP,sp+4+pop)
  for a in [0x47d85d,0x47f19c]:self.uc.hook_add(UC_HOOK_CODE,stub,begin=a,end=a)
 def allowed(self,i):
  self.uc.mem_write(self.player+0x118,struct.pack('<ff',1,1))
  return bool(self.call(0x4a14fa if i==40 else 0x4a230c,self.items[i],self.player))
 def build(self,i):
  obj=self.items[i];self.put(obj+0x10c,self.player)
  for a,v in zip([0x4ca8ac,0x4ca850] if i==40 else [0x4ca888,0x4ca8b0],[1,0]):self.put(a,v)
  self.put(self.owners+16,self.player,0,0,0);self.put(self.record+0x14,0,0)
  self.put(0x10e1000,0,0,0,0);self.uc.mem_write(0x10e6000,bytes(64))
  self.call(0x4a15c9 if i==40 else 0x4a23db,obj,0x10e1000)
  return dict(level=self.get(self.owners+20),kind=self.get(self.owners+24),listKind=self.get(self.record+0x14),listLevel=self.get(self.record+0x18),actorInserted=self.get(0x10e6010)==obj)

def main():
 b=dict(width=3,height=3,cells=[dict(x=i%3,y=i//3,layer=0,object=65535,flags=128,terrain=0,price=101,event=0) for i in range(9)])
 o=Buildings(b);gates=[]
 for mask,owner,level,item in itertools.product(range(16),[-1,0,1],range(5),[40,41]):
  for bit,lot in enumerate([1,7,3,5]):
   o.uc.mem_write(o.cells+lot*16+4,struct.pack('<H',0 if mask&(1<<bit) else 128))
   o.put(o.owners+lot*16,0 if owner<0 else o.player if owner==0 else o.other,level,0,0)
  gates.append(dict(mask=mask,owner=owner,level=level,item=item,allowed=o.allowed(item)))
 mutations=[dict(item=i,**o.build(i)) for i in [40,41]]
 sales=[dict(kind=k,level=l,amount=o.transaction_price(1,l,101,'sale')) for k in [2,3] for l in [1]]
 p=ProtectionOracle();targets=[]
 for alive,protected,nobita,shizuka,sleep in itertools.product([False,True],repeat=5):
  p.old=0;p.put(p.player+0x2f8,0xfff|(0x10000000 if nobita else 0));p.put(p.player+0x2fc,0);p.put(p.player+0x114,0)
  p.put(p.other+0x2f8,(0xfff&~0x400 if protected else 0xfff)|(0x20000000 if shizuka else 0));p.put(p.other+0x2fc,0 if alive else 0x80000000);p.put(p.other+0x114,int(sleep))
  targets.append(dict(alive=alive,protected=protected,nobita=nobita,shizuka=shizuka,sleep=sleep,allowed=bool(p.call(0x44ea0d,p.player,p.other))))
 result=dict(sourceSha256=SHA,scope=__doc__,construction=gates,mutations=mutations,sales=sales,targets=targets)
 (ROOT/'tests/fixtures/original-special-buildings.json').write_text(json.dumps(result,indent=2),'utf8');print(len(gates),'construction gates,',len(mutations),'impacts,',len(targets),'missile target cases;',sales)
if __name__=='__main__':main()
