"""MGame03 parent, alternating input, AI, growth and payout in original x86.

Rendering list membership/UI and human keys are substituted. Animation objects
are real; their autonomous render ticks are omitted (growth uses explicit frames).
"""
from verify_original_minigame6 import MiniOracle,ROOT,SHA,UC_HOOK_CODE
from verify_original_economy import pe
from unicorn.x86_const import *
import json,struct

class GrowOracle(MiniOracle):
    def __init__(self):
        super().__init__(3)
        self.parent=0x10d6000;self.clock=0x10e4000;self.message=0x10e5000;self.inputs=[0]*4;self.done=False
        self.members=[0x10d0000+i*0x1000 for i in range(4)]
        self.beams=[0x10d0400+i*0x1000 for i in range(4)]
        for a in [0x424ddd,0x4248d3,0x424901,0x41cad4,0x41a7c4]:self.uc.hook_add(UC_HOOK_CODE,self.grow_stub,begin=a,end=a)
    def grow_stub(self,u,a,size,_):
        sp=u.reg_read(UC_X86_REG_ESP);result=0;pop=4
        if a==0x424ddd:result=self.inputs[self.members.index(u.reg_read(UC_X86_REG_ECX))];pop=0
        elif a==0x41a7c4:self.done=True
        u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_ESP,sp+4+pop);u.reg_write(UC_X86_REG_EIP,self.get(sp))
    def setup_grow(self,ai):
        self.heap=0x1100000;self.seed=123;self.draws=[];self.done=False
        self.uc.mem_write(self.parent,bytes(0x400));self.uc.mem_write(self.clock,bytes(0x200));self.put(self.message,0,0,0)
        self.put(self.parent+0x30,self.clock);self.call(0x41bbe4,self.clock,450)
        for i,p in enumerate(self.members):
            self.uc.mem_write(p,bytes(0x100));self.put(p+8,2);self.put(p+0x28,i,int(ai),i,[3,5,1,4][i],0,0)
            a=self.heap;self.heap+=0x240;self.call(0x401000,a,0,0,2+i,0,1);self.put(p+0x18,a);self.call(0x424f1c,p)
            b=self.beams[i];self.uc.mem_write(b,bytes(0x100));self.call(0x4251e2,b,0,0)
            self.put(self.parent+0x128+4*i,p);self.put(self.parent+0x138+4*i,b);self.put(self.parent+0xdc+4*i,1)
        self.uc.mem_write(0x4c54bc,struct.pack('<f',1));return self.grow_state()
    def grow_state(self):
        return dict(remaining=self.get(self.clock+0x20),phase=self.get(self.parent+0x104),done=self.done,
            players=[dict(mode=self.get(p+4),last=self.get(p+0x38),strokes=self.get(p+0x3c),growth=self.get(self.get(p+0x18)+0x28),score=self.get(self.parent+0x38+4*i)) for i,p in enumerate(self.members)])

def main():
    o=GrowOracle();traces=[]
    for pattern in ['fast','mixed','none','ai']:
        initial=o.setup_grow(pattern=='ai');rows=[]
        for t in range(455):
            o.inputs=[1+t%2]*4 if pattern=='fast' else [1+t%2,1,2,0] if pattern=='mixed' else [0]*4
            before=len(o.draws);o.call(0x424250,o.parent,o.message);state=o.grow_state()
            rows.append(dict(inputs=o.inputs,draws=o.draws[before:],state=state))
            if state['done']:break
        traces.append(dict(pattern=pattern,initial=initial,rows=rows))
    multiplier=struct.unpack('<f',pe.get_data(0x4b6c8c-0x400000,4))[0]
    (ROOT/'tests/fixtures/original-minigame3.json').write_text(json.dumps(dict(sourceSha256=SHA,update='0x424250',input='0x424d15',ai='0x424e2c',multiplier=multiplier,traces=traces),separators=(',',':')),'utf8')
    print(json.dumps(dict(multiplier=multiplier,traces=[dict(pattern=t['pattern'],ticks=len(t['rows']),last=t['rows'][-1]['state']) for t in traces])))
if __name__=='__main__':main()
