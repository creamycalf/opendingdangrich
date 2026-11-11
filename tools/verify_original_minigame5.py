"""MGame05 real parent/choices/animation bytecode; synthetic human keys and UI.

Base drawing 0x418d25 ticks the registered animation list once after update.
No original process is launched. Graphics, sound, list membership and archive
reads are substituted; state transitions and animation end flags run x86.
"""
from verify_original_minigame6 import MiniOracle,ROOT,SHA,UC_HOOK_CODE
from verify_original_economy import pe
from unicorn.x86_const import *
import json,struct

class RpsOracle(MiniOracle):
    def __init__(self):
        super().__init__(5)
        self.uc.mem_map(0x1200000,0x800000)
        self.parent=0x10d6000;self.clock=0x10e4000;self.message=0x10e5000;self.inputs=[0]*4;self.done=False
        self.members=[0x10d0000+i*0x1000 for i in range(4)]
        self.targets=[p+0x100 for p in self.members];self.feedback=[p+0x200 for p in self.members];self.selectors=[p+0x300 for p in self.members]
        for a in [0x428f82,0x428abb,0x428ae9,0x41cad4,0x41a7c4,0x432156]:self.uc.hook_add(UC_HOOK_CODE,self.ui,begin=a,end=a)
    def primitive(self,u,a,size,context):
        if a not in [0x48b3a1,0x4a9ab4]:return super().primitive(u,a,size,context)
        sp=u.reg_read(UC_X86_REG_ESP);count=self.get(sp+4);assert 0<count<100000
        result=self.heap;self.heap+=(count+15)&~15;assert self.heap<0x1a00000
        u.mem_write(result,bytes(count));u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_EIP,self.get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
    def ui(self,u,a,size,_):
        sp=u.reg_read(UC_X86_REG_ESP);result=0;pop=4
        if a==0x428f82:result=self.inputs[self.members.index(u.reg_read(UC_X86_REG_ECX))];pop=0
        elif a==0x41a7c4:self.done=True
        elif a==0x432156:pop=0
        u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_ESP,sp+4+pop);u.reg_write(UC_X86_REG_EIP,self.get(sp))
    def setup(self,ai=False):
        self.heap=0x1100000;self.seed=123;self.draws=[];self.done=False
        self.uc.mem_write(self.parent,bytes(0x400));self.uc.mem_write(self.clock,bytes(0x200));self.put(self.message,0,0,0)
        self.put(self.parent+0x30,self.clock);self.call(0x41bbe4,self.clock,1350)
        for i,p in enumerate(self.members):
            self.uc.mem_write(p,bytes(0x400))
            self.put(p,0x4b6d10,i,2,2,28,0,82+i*128,147,i+4,0,0,0,0,0,int(ai),i,*[(3,4),(5,5),(1,1),(4,2)][i])
            self.call(0x4290fa,self.targets[i],i,0,0,0)
            self.call(0x42928f,self.feedback[i],i,0,0,0)
            self.call(0x42952e,self.selectors[i],i,0,0,0)
            for offset,ptr in [(0x120,self.targets[i]),(0x130,p),(0x140,self.feedback[i]),(0x150,self.selectors[i])]:self.put(self.parent+offset+4*i,ptr)
            self.put(self.parent+0xdc+4*i,1)
        self.uc.mem_write(0x4c54bc,struct.pack('<f',1));return self.state()
    def object_state(self,p):
        a=self.get(p+0x24)
        return dict(mode=self.get(p+8),choice=self.get(p+12),clock=self.get(p+20),animation=self.get(p+16) if a else -1,age=self.get(a+0x28) if a else 0,ended=int((self.get(a+0x3c)&0x7fff)==101) if a else 0)
    def state(self):
        return dict(remaining=self.get(self.clock+0x20),phase=self.get(self.parent+0x104),done=self.done,players=[dict(score=self.get(self.parent+0x38+4*i),wins=self.get(p+0x34),actor=self.object_state(p),target=self.object_state(self.targets[i]),feedback=self.object_state(self.feedback[i]),selector=self.object_state(self.selectors[i])) for i,p in enumerate(self.members)])
    def tick(self):
        self.call(0x427f0a,self.parent,self.message)
        for p in self.members+self.targets+self.feedback+self.selectors:
            a=self.get(p+0x24)
            if a:self.call(0x401ccc,a)
        return self.state()

def main():
    o=RpsOracle();traces=[]
    for pattern in ['none','confirm','mixed','correct','ai']:
        initial=o.setup(pattern=='ai');rows=[]
        for t in range(1352):
            state=o.state()
            o.inputs=[0]*4 if pattern in ['none','ai'] else [1]*4 if pattern=='confirm' else [1 if t%3==0 else 2,1,2,0] if pattern=='mixed' else [1 if (p['selector']['choice']-p['target']['choice'])%3==1 else 2 for p in state['players']]
            before=len(o.draws);state=o.tick();rows.append(dict(inputs=o.inputs,draws=o.draws[before:],state=state))
            if o.done:break
        traces.append(dict(pattern=pattern,initial=initial,rows=rows))
    multiplier=struct.unpack('<f',pe.get_data(0x4b6d0c-0x400000,4))[0]
    (ROOT/'tests/fixtures/original-minigame5.json').write_text(json.dumps(dict(sourceSha256=SHA,multiplier=multiplier,traces=traces),separators=(',',':')),'utf8')
    print(json.dumps(dict(multiplier=multiplier,traces=[dict(pattern=t['pattern'],ticks=len(t['rows']),rewards=[p['score'] for p in t['rows'][-1]['state']['players']]) for t in traces])))
if __name__=='__main__':main()
