"""Execute original hermit constructors, masks and counters in isolated x86.
Only resource text, sprite allocation, item-name presentation and random draws
are substituted. No application, OS imports or gameplay UI is executed.
"""
import json,struct
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE,pe
from unicorn.x86_const import *
class HermitOracle(Oracle):
 def __init__(self):
  super().__init__(json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8')))
  self.draw=0;self.draws=[];self.text=0x10e1000;self.dummy=0x10e2000;self.vtable=0x10e2100
  self.uc.mem_write(self.text,b'x\0');self.put(self.dummy,self.vtable)
  self.put(self.vtable+0x58,0x10fe100);self.put(self.vtable+0x18,0x10fe110)
  self.uc.mem_write(0x10fe100,b'\xb8'+struct.pack('<I',self.text)+b'\xc3')
  self.uc.mem_write(0x10fe110,b'\x31\xc0\xc2\x04\x00')
  def stubs(u,a,size,_):
   sp=u.reg_read(UC_X86_REG_ESP);result=0;cleanup=0
   if a==0x4821a0:
    n=self.get(sp+4);self.draws.append(n);result=self.draw%n
   if a==0x40871f:result=self.text;cleanup=4
   if a==0x48be40:result=self.dummy
   if a==0x438cf9:self.put(u.reg_read(UC_X86_REG_ECX)+0x114,0)
   if a==0x4389da:cleanup=4;self.put(u.reg_read(UC_X86_REG_ECX)+0x124,self.get(sp+4))
   u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_EIP,self.get(sp));u.reg_write(UC_X86_REG_ESP,sp+4+cleanup)
  for a in [0x4821a0,0x40871f,0x48be40,0x40b114,0x438cf9,0x4389da]:self.uc.hook_add(UC_HOOK_CODE,stubs,begin=a,end=a)
 def call(self,a,p,*args):
  sp=0x20ff000;self.put(sp,0x10ff020,*args);self.uc.reg_write(UC_X86_REG_ESP,sp);self.uc.reg_write(UC_X86_REG_ECX,p);self.uc.reg_write(UC_X86_REG_FPCW,0x37f)
  self.uc.emu_start(a,0x10ff020,count=100000);assert self.uc.reg_read(UC_X86_REG_EIP)==0x10ff020,hex(self.uc.reg_read(UC_X86_REG_EIP))
  return self.uc.reg_read(UC_X86_REG_EAX)
def main():
 o=HermitOracle();rows=json.loads((ROOT/'research/hermit-vtables.json').read_text('utf8'));out=[];o.uc.mem_write(0x4c54c0,struct.pack('<f',1.2));o.uc.mem_write(0x4c54bc,struct.pack('<f',1.2))
 for row in rows:
  for draw in [0,500,501,666,667,999]:
   p=0x10e0000;o.uc.mem_write(p,bytes(0x100));o.draw=draw;o.draws=[];o.heap=0x1100000;o.call(int(row['ctor'],16),p)
   r=dict(id=row['id'],draw=draw,draws=o.draws[:],duration=o.get(p+0x10),remaining=o.get(p+0x14),good=bool(o.get(p+0x1c)),mask=o.get(p+0x28),value=o.get(p+0x2c),all=bool(o.get(p+0x3c)),compensation=struct.unpack('<f',o.uc.mem_read(p+0x38,4))[0])
   if row['id']==0:r['item']=o.get(p+0x4c)
   if row['id'] in [9,28]:r['rate']=struct.unpack('<f',o.uc.mem_read(p+0x4c,4))[0]
   r['capabilities']=[]
   for base in [0,0xfff,0xffffffff,0x420,0x18000,0x24000]:o.put(o.result,base);o.call(0x40b011,p,o.result);r['capabilities'].append(dict(base=base,value=o.get(o.result)))
   if r['duration']:
    o.put(p+0x20,o.player);r['ticks']=[]
    for n in range(r['duration']):r['ticks'].append(dict(alive=bool(o.call(int(row['methods'][0],16),p)),remaining=o.get(p+0x14)))
   out.append(r)
 dest=ROOT/'tests/fixtures/original-hermit.json';dest.write_text(json.dumps(dict(sourceSha256=SHA,scope=__doc__,constructors=out,cashConstants={hex(a):struct.unpack('<f',pe.get_data(a-0x400000,4))[0] for a in [0x4b65dc,0x4b6944]}),indent=2),'utf8')
 print(len(out),'constructor scenarios; masks and expiry callbacks verified')
if __name__=='__main__':main()
