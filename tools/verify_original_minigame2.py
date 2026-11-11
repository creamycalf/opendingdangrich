"""Original MGame02 complete parent updates, player physics and animation ticks.

Synthetic key input, deterministic supplied RNG; no OS, graphics or sound.
"""
from verify_original_minigame6 import MiniOracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
import json,struct

class RaceOracle(MiniOracle):
    def __init__(self):
        super().__init__(2)
        self.parent=0x10d6000;self.clock=0x10e4000;self.message=0x10e5000;self.inputs=[0]*4
        self.members=[0x10d0000+i*0x1000 for i in range(4)]
        for address in [0x423895,0x41cad4,0x432da3]:self.uc.hook_add(UC_HOOK_CODE,self.race_stub,begin=address,end=address)
    def race_stub(self,u,address,size,_):
        sp=u.reg_read(UC_X86_REG_ESP);value=0;pop=0
        if address==0x423895:value=self.inputs[self.members.index(u.reg_read(UC_X86_REG_ECX))]
        elif address==0x41cad4:pop=4
        u.reg_write(UC_X86_REG_EAX,value);u.reg_write(UC_X86_REG_ESP,sp+4+pop);u.reg_write(UC_X86_REG_EIP,self.get(sp))
    def setup_race(self):
        self.heap=0x1100000;self.seed=123;self.draws=[]
        self.uc.mem_write(self.parent,bytes(0x400));self.uc.mem_write(self.clock,bytes(0x200));self.put(self.message,0,0)
        self.put(self.parent+4,4);self.put(self.parent+0x104,8624);self.put(self.parent+0x118,99,99,99,99)
        self.put(self.parent+0x30,self.clock);self.call(0x41bbe4,self.clock,900)
        for i,p in enumerate(self.members):
            self.uc.mem_write(p,bytes(0x100));self.put(p,100+i*120,226);self.put(p+0x1c,16);self.put(p+0x24,8850);self.put(p+0x2c,1)
            self.uc.mem_write(p+0x22,bytes([i,4]));self.call(0x4233c5,p,1)
            self.put(self.parent+0x17c+4*i,p);self.put(self.parent+0xdc+4*i,1)
        self.uc.mem_write(0x4c54bc,struct.pack('<f',1));return self.race_state()
    def race_state(self):
        members=[]
        for p in self.members:
            a=self.get(p+0x38);signed=lambda o:struct.unpack('<i',self.uc.mem_read(p+o,4))[0]
            members.append(dict(y=signed(4),sway=signed(8),score=self.get(p+12),bonus=self.get(p+16),animationClock=self.get(p+20),speed=self.get(p+24),rankSpeed=self.get(p+28),strokes=int.from_bytes(self.uc.mem_read(p+32,2),'little'),mode=self.uc.mem_read(p+35,1)[0],world=signed(36),armed=self.get(p+44),finished=bool(self.get(p+48)),animation=self.get(a+0x23c),age=self.get(a+0x28)))
        return dict(camera=self.get(self.parent+0x104),remaining=self.get(self.clock+0x20),finishOrder=[self.get(self.parent+0x118+i*4) for i in range(self.get(self.parent+0x114))],players=members,done=self.uc.mem_read(self.parent+4,1)[0]!=4,rewards=[self.get(self.parent+0x38+i*4) for i in range(4)])

def main():
    o=RaceOracle();traces=[]
    for pattern in ['mixed','fast','none']:
        initial=o.setup_race();rows=[]
        for t in range(900):
            o.inputs=([1+t%2]*4 if pattern=='fast' else [0]*4 if pattern=='none' else [1+t%2,(1+(t//3)%2) if t%3==0 else 0,2,1 if t%20==0 else 2 if t%20==1 else 0])
            before=len(o.draws);o.call(0x422b4b,o.parent,o.message);state=o.race_state()
            rows.append(dict(inputs=o.inputs,draws=o.draws[before:],state=state))
            if state['done']:break
        traces.append(dict(pattern=pattern,initial=initial,rows=rows))
    (ROOT/'tests/fixtures/original-minigame2.json').write_text(json.dumps(dict(sourceSha256=SHA,update='0x422b4b',physics='0x423535',traces=traces),separators=(',',':')),'utf8')
    print(json.dumps([dict(pattern=t['pattern'],ticks=len(t['rows']),last=t['rows'][-1]['state']) for t in traces]))
if __name__=='__main__':main()
