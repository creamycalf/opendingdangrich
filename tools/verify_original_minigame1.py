"""MGame01 parent, fake/real leader actions, elimination, AI and actual render flags.
No native process: source x86 in Unicorn; external I/O and synthetic keys only.
"""
from verify_original_minigame5 import RpsOracle,ROOT,SHA,UC_HOOK_CODE,pe
from verify_original_minigame6 import MiniOracle
from unicorn.x86_const import *
import json,struct

class PoseOracle(RpsOracle):
    def __init__(self):
        MiniOracle.__init__(self,1);self.uc.mem_map(0x1200000,0x800000)
        self.parent=0x10d6000;self.clock=0x10e4000;self.message=0x10e5000;self.inputs=[0]*4;self.done=False
        self.members=[0x10d0000+i*0x1000 for i in range(4)];self.gates=[p+0x100 for p in self.members];self.leader=0x10d8000
        for a in [0x420fdc,0x420a00,0x420a2e,0x41cad4,0x41a7c4,0x432156,0x432da3,0x48826f]:self.uc.hook_add(UC_HOOK_CODE,self.ui,begin=a,end=a)
    def ui(self,u,a,size,_):
        sp=u.reg_read(UC_X86_REG_ESP);result=0;pop=4
        if a==0x420fdc:result=self.inputs[self.members.index(u.reg_read(UC_X86_REG_ECX))];pop=0
        elif a==0x41a7c4:self.done=True
        elif a in [0x432156,0x432da3]:pop=0
        elif a==0x48826f:result=0xffffffff;pop=0
        u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_ESP,sp+4+pop);u.reg_write(UC_X86_REG_EIP,self.get(sp))
    def setup_pose(self,ai=False):
        self.heap=0x1100000;self.seed=123;self.draws=[];self.done=False;self.inputs=[0]*4
        self.uc.mem_write(self.parent,bytes(0x400));self.uc.mem_write(self.clock,bytes(0x200));self.put(self.message,0,0,0)
        self.put(self.parent+0x30,self.clock);self.call(0x41bbe4,self.clock,1800)
        self.put(0x4be684,0);self.put(0x4c7ae8,0,0)
        self.uc.mem_write(self.leader,bytes(0x100));self.call(0x4213e8,self.leader,0,0,0);self.put(self.parent+0x124,self.leader)
        for i,p in enumerate(self.members):
            self.uc.mem_write(p,bytes(0x200));self.put(p,0x4b6c04,0,0,i,30+i*145,170,i+6,0,0,0,0,i,0,170,int(ai),i,*[(3,4),(5,5),(1,1),(4,2)][i])
            a=self.heap;self.heap+=0x240;self.call(0x401000,a,0,0,i,0,1);self.call(0x401ccc,a);self.put(p+0x1c,a)
            self.call(0x4218b5,self.gates[i],i,0,0,0);self.call(0x421ab1,self.gates[i],0,0)
            self.put(self.parent+0x128+4*i,p);self.put(self.parent+0x138+4*i,self.gates[i]);self.put(self.parent+0xdc+4*i,1)
        self.uc.mem_write(0x4c54bc,struct.pack('<f',1));return self.state()
    def object(self,p):
        a=self.get(p+0x1c)
        return dict(mode=self.get(p+4),pose=self.get(p+8),animation=self.get(p+12) if a else -1,age=self.get(a+0x28) if a else 0,event=(self.get(a+0x3c)&0x7fff) if a else 0,forward=self.get(a+0x200) if a else 1,once=int((self.get(a+12)&0x7fff)==1) if a else 1)
    def state(self):
        l=self.leader
        return dict(remaining=self.get(self.clock+0x20),phase=self.get(self.parent+0x108),elapsed=self.get(self.parent+0x110),ready=self.get(0x4c7ae8),delay=self.get(0x4be684),attempts=self.get(self.parent+0x114),done=self.done,
            leader=dict(**self.object(l),wait=self.get(l+0x2c),hold=self.get(l+0x30),real=self.get(l+0x34)),
            players=[dict(slot=i,score=self.get(self.parent+0x38+4*i),wins=self.get(p+0x30),fallY=self.get(p+0x34),**self.object(p),gate=self.object(self.gates[i])) for i,p in enumerate(self.members)])
    def tick(self):
        self.call(0x41fe66,self.parent,self.message)
        if not self.done:
            for p in [self.leader]+self.gates+self.members:
                a=self.get(p+0x1c)
                if a:self.call(0x4017e4,a,1);self.call(0x401ccc,a)
        return self.state()

def main():
    o=PoseOracle();traces=[]
    for pattern in ['none','left','alternate','follow','ai']:
        initial=o.setup_pose(pattern=='ai');rows=[]
        for t in range(2000):
            state=o.state();target=state['leader']['pose']
            o.inputs=[0]*4 if pattern in ['none','ai'] else [4]*4 if pattern=='left' else [4 if t%20<10 else 8]*4 if pattern=='alternate' else [0 if p['pose']==target else 4 if p['pose']^1==target else 8 for p in state['players']]
            before=len(o.draws);state=o.tick();rows.append(dict(inputs=o.inputs,draws=o.draws[before:],state=state))
            if o.done:break
        assert o.done
        traces.append(dict(pattern=pattern,initial=initial,rows=rows))
    (ROOT/'tests/fixtures/original-minigame1.json').write_text(json.dumps(dict(sourceSha256=SHA,multiplier=20,traces=traces),separators=(',',':')),'utf8')
    print(json.dumps([dict(pattern=t['pattern'],ticks=len(t['rows']),rewards=[p['score'] for p in t['rows'][-1]['state']['players']],last=t['rows'][-1]['state']['leader']) for t in traces]))
if __name__=='__main__':main()
