"""Run original monthly calculation and daily interest with UI calls stubbed.
Original real property list traversal/map lookup, eligibility, reset, floats run x86.
No original application or OS imports execute.
"""
import json,struct
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *

class MonthlyOracle(Oracle):
 def __init__(self):
  super().__init__(json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8')))
  self.ps=[self.player,self.other,0x10d3000,0x10d4000];self.dialog=0x10e0000
  self.sprite=0x10e1000;self.put(self.sprite,self.sprite+0x100);self.put(self.sprite+0x100,640)
  self.put(0x10e2008,0x10fe000);self.uc.mem_write(0x10fe000,b'\x31\xc0\xc3')
  self.put(0x4ca668,*self.ps)
  for i,p in enumerate(self.ps):self.put(p,0x10e2000);self.put(p+0x1c,i)
  # Presentation calls: cdecl cleanup stays with caller, thiscall with callee.
  stubs={0x4853bb:(4,0),0x485382:(4,0),0x4853e3:(0,0),0x432118:(0,self.sprite),0x485ac3:(16,0),0x4332e4:(0,0),0x431d25:(0,self.sprite),0x4321d5:(0,0),0x432da3:(0,0),0x432156:(0,0),0x4333f0:(0,0),0x432745:(0,0),0x44ed49:(0,0),0x44eeec:(0,0)}
  def ui(u,a,size,_):
   n,result=stubs[a];sp=u.reg_read(UC_X86_REG_ESP)
   if a==0x485382:self.put(self.dialog+8,self.get(sp+4))
   u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_EIP,self.get(sp));u.reg_write(UC_X86_REG_ESP,sp+4+n)
  for a in stubs:self.uc.hook_add(UC_HOOK_CODE,ui,begin=a,end=a)
 def fl(self,a,v):self.uc.mem_write(a,struct.pack('<f',v))
 def rd(self,a):return struct.unpack('<f',self.uc.mem_read(a,4))[0]
 def call(self,a,p,*args):
  sp=0x20ff000;self.put(sp,0x10ff020,*args);self.uc.reg_write(UC_X86_REG_ESP,sp);self.uc.reg_write(UC_X86_REG_ECX,p);self.uc.reg_write(UC_X86_REG_FPCW,0x37f)
  self.uc.emu_start(a,0x10ff020,count=500000);assert self.uc.reg_read(UC_X86_REG_EIP)==0x10ff020
 def setup(self,rows,multiplier,converter):
  self.uc.mem_write(self.dialog,bytes(0x178));self.fl(0x4c54bc,multiplier)
  for i,(p,row) in enumerate(zip(self.ps,rows)):
   self.put(p+0x2fc,(0x80000000 if row['eliminated'] else 0)|(0x80 if row['claimed'] else 0))
   for off,key in [(0x28,'cash'),(0x2c,'bank'),(0x30,'interest'),(0x120,'steps')]:self.fl(p+off,row[key])
   nodes=0x10e4000+i*0x1000;self.put(p+0x2e8,nodes if row['lots'] else 0,0,0)
   for n,(lot,level,kind) in enumerate(row['lots']):
    c=self.board['cells'][lot];self.put(nodes+n*0x20,nodes+(n+1)*0x20 if n+1<len(row['lots']) else 0,0,c['x'],c['y'],0,kind,level)
  self.call(0x482348,self.dialog,0 if converter<0 else self.ps[converter])
  return dict(rewards=[self.rd(self.dialog+300+i*4) for i in range(4)],steps=[self.rd(p+0x120) for p in self.ps])

def main():
 o=MonthlyOracle();cases=[];interest=[];inflation=[]
 lots=[i for i,c in enumerate(o.board['cells']) if c['event']==1][:12]
 for multiplier in [1,1.2,1.49,3.7]:
  for converter in [-1,0,2]:
   for claimed in [False,True]:
    rows=[dict(cash=1000+i*71,bank=1200+i*109,interest=21.375+i/3,steps=12.5+i*3.75,claimed=claimed and i%2==0,eliminated=i==3,lots=[[lot,(i+n)%5,n%3] for n,lot in enumerate(lots[i:i+7])]) for i in range(4)]
    result=o.setup(rows,multiplier,converter);cases.append(dict(multiplier=o.rd(0x4c54bc),converter=converter,players=rows,**result))
 for rate in [0,1.2,2.4]:
  o.fl(0x4c54c0,rate)
  for bank in [0,1,1000,12345.375]:
   o.fl(o.player+0x2c,bank);o.fl(o.player+0x30,0);trace=[]
   for day in range(32):o.call(0x438262,o.player);trace.append(o.rd(o.player+0x30))
   interest.append(dict(rate=o.rd(0x4c54c0),bank=bank,trace=trace))
 for before in [1,1.2,3.7]:
  for draw in range(10):
   frame=0x20fe000;o.fl(0x4c54bc,before);o.uc.reg_write(UC_X86_REG_EBP,frame);o.uc.reg_write(UC_X86_REG_EAX,draw)
   o.uc.emu_start(0x474cff,0x474d20,count=100)
   inflation.append(dict(before=struct.unpack('<f',struct.pack('<f',before))[0],draw=draw,after=o.rd(0x4c54bc)))
 out=dict(sourceSha256=SHA,scope=__doc__,substitutions='sprite/UI calls only; original lists, price lookup, float arithmetic and flags',cases=cases,interest=interest,inflation=inflation)
 (ROOT/'tests/fixtures/original-monthly.json').write_text(json.dumps(out,indent=2),'utf8');print(len(cases),'monthly cases,',len(interest),'interest traces,',len(inflation),'inflation cases')
if __name__=='__main__':main()
