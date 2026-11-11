"""MGame07 active parent and real spring/jump/collect animation routines.
Only I/O, input, graphics and allocations are substituted, never launch wa.exe.
"""
from verify_original_minigame6 import MiniOracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
import json,struct

class JumpOracle(MiniOracle):
    def __init__(self):
        super().__init__(7);self.parent=0x10d6000;self.clock=0x10e4000;self.message=0x10e5000;self.inputs=[0]*4;self.done=False;self.ai=False
        self.members=[0x10d0000+i*0x1000 for i in range(4)]
        for a in [0x42c910,0x41cad4,0x41a7c4,0x432156,0x42ca77,0x413e40]:self.uc.hook_add(UC_HOOK_CODE,self.ui,begin=a,end=a)
    def ui(self,u,a,size,_):
        sp=u.reg_read(UC_X86_REG_ESP);result=0;pop=4
        if a==0x42c910:
            if self.ai:return
            result=self.inputs[self.members.index(u.reg_read(UC_X86_REG_ECX))]
        elif a==0x413e40:result=int(self.ai);pop=0
        elif a==0x41a7c4:self.done=True
        elif a==0x432156:pop=0
        u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_ESP,sp+4+pop);u.reg_write(UC_X86_REG_EIP,self.get(sp))
    def setup_jump(self,ai=False):
        self.ai=ai
        self.heap=0x1100000;self.seed=123;self.draws=[];self.done=False;self.inputs=[0]*4
        self.uc.mem_write(self.parent,bytes(0x400));self.uc.mem_write(self.clock,bytes(0x200));self.put(self.message,0,0,0)
        self.put(self.parent+0x30,self.clock);self.call(0x41bbe4,self.clock,1350)
        self.put(self.parent+0x128,0x10e6000);self.uc.mem_write(0x10e6000,struct.pack('<HH',126,334))
        self.food=[self.call(0x4821a0,0,6) for _ in range(10)];self.uc.mem_write(self.parent+0x10c,struct.pack('<10h',*self.food))
        for i,p in enumerate(self.members):
            self.uc.mem_write(p,bytes(0x100));self.call(0x42bed8,p,i,0,0,0);self.call(0x42c130,p);self.call(0x42c480,p,336)
            self.put(self.parent+0x174+i*4,p);self.put(self.parent+0xdc+i*4,1)
        self.uc.mem_write(0x4c54bc,struct.pack('<f',1));return self.state()
    def anim(self,a):
        return dict(animation=self.get(a+0x23c),age=self.get(a+0x28),ended=int((self.get(a+0x3c)&0x7fff)==101)) if a else None
    def state(self):
        players=[]
        for i,p in enumerate(self.members):
            players.append(dict(slot=i,score=self.get(self.parent+0x38+i*4),maxHeight=self.get(p+0x10),collected=self.get(p+0x14),height=self.get(p+0x18),speed=self.get(p+0x1c),power=self.get(p+0x20),mode=self.uc.mem_read(p+0x26,1)[0],grabbing=self.get(p+0x2c),armed=self.get(p+0x30),actor=self.anim(self.get(p+0x34)),spring=self.anim(self.get(p+0x38))))
        return dict(remaining=self.get(self.clock+0x20),food=self.food,foodIndex=list(struct.unpack('<4h',self.uc.mem_read(self.parent+0x120,8))),done=self.done,players=players)
    def tick(self):self.call(0x42bad7,self.parent,self.message);return self.state()

def main():
    o=JumpOracle();traces=[]
    for pattern in ['none','charge','alternate','timed','ai']:
        initial=o.setup_jump(pattern=='ai');rows=[]
        for t in range(1350):
            state=o.state()
            o.inputs=[0]*4 if pattern=='none' else [1]*4 if pattern=='charge' else [1+t%2,2,1,0] if pattern=='alternate' else [1 if p['mode']==8 and 10<=p['spring']['age']<12 else 2 if p['mode'] in [1,4] else 0 for p in state['players']]
            before=len(o.draws);state=o.tick();rows.append(dict(inputs=o.inputs,draws=o.draws[before:],state=state))
            if o.done:break
        traces.append(dict(pattern=pattern,initial=initial,rows=rows))
    (ROOT/'tests/fixtures/original-minigame7.json').write_text(json.dumps(dict(sourceSha256=SHA,traces=traces),separators=(',',':')),'utf8')
    print(json.dumps([dict(pattern=t['pattern'],ticks=len(t['rows']),food=t['initial']['food'],initial=t['initial']['players'][0],last=t['rows'][-1]['state']['players'][0]) for t in traces]))
if __name__=='__main__':main()
