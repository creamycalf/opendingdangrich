"""Original bell spawn and weighted item selector, using real map queries and
x86 arithmetic. Substitute renderer/actor list insertion and RNG only. Bell
constructor's decorative random delay is consumed explicitly by the stub.
"""
import json
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
def main():
 traces=[];items=[]
 for number in range(8):
  m=json.loads((ROOT/f'app/public/assets/maps/{number}.json').read_text('utf8'));o=Oracle(m);u=o.uc;u.mem_map(0x3000000,0x100000);o.put(o.actor+0x228,0x3000000);u.mem_write(o.actor+0xe4,bytes.fromhex(m['rawConfig']))
  seed=1;draws=[];locations=[];forced=None
  def draw(n):
   nonlocal seed
   seed=(seed*1664525+1013904223)&0xffffffff;v=(seed*n)>>32 if forced is None else forced;draws.append([n,v]);return v
  def stub(uc,a,z,d):
   sp=uc.reg_read(UC_X86_REG_ESP);pop=0;result=0
   if a==0x4821a0:result=draw(o.get(sp+4))
   if a==0x4a64f0:locations.append([o.get(sp+4),o.get(sp+8)]);draw(20);result=uc.reg_read(UC_X86_REG_ECX);pop=12
   if a==0x47f290:pop=4
   uc.reg_write(UC_X86_REG_EAX,result);uc.reg_write(UC_X86_REG_EIP,o.get(sp));uc.reg_write(UC_X86_REG_ESP,sp+4+pop)
  for a in [0x4821a0,0x4a64f0,0x47f290]:u.hook_add(UC_HOOK_CODE,stub,begin=a,end=a)
  def call(address,ecx,*args):
   sp,end=0x20ff000,0x10ff020;o.put(sp,end,*args);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_ECX,ecx);u.emu_start(address,end,count=2000000);assert u.reg_read(UC_X86_REG_EIP)==end;return u.reg_read(UC_X86_REG_EAX)
  call(0x47f31a,o.actor,0);traces.append(dict(map=number,seed=1,locations=locations[:],draws=draws[:]))
  if number==0:
   for forced in range(1000):items.append(call(0x4a665e,0))
 (ROOT/'tests/fixtures/original-bells.json').write_text(json.dumps(dict(sourceSha256=SHA,scope=__doc__,traces=traces,items=items),separators=(',',':')),'utf8');print(len(traces),'original map spawn traces;',len(items),'weighted rewards')
if __name__=='__main__':main()
