"""MGame04 complete active-parent routine, synthetic keys and original animation calls."""
from verify_original_minigame4_player import PlayerOracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
import json,struct

class ObstacleRaceOracle(PlayerOracle):
    def __init__(self):
        super().__init__();self.parent=0x10d6000;self.clock=0x10e4000;self.message=0x10e5000;self.obstacle=0x10d8000
        self.members=[0x10d0000+i*0x1000 for i in range(4)];self.inputs=[0]*4
        for a in [0x41cad4,0x432da3,0x432156,0x48826f]:self.uc.hook_add(UC_HOOK_CODE,self.ui,begin=a,end=a)
    def ui(self,u,a,size,_):
        sp=u.reg_read(UC_X86_REG_ESP);u.reg_write(UC_X86_REG_EAX,0xffffffff if a==0x48826f else 0);u.reg_write(UC_X86_REG_ESP,sp+4+(4 if a==0x41cad4 else 0));u.reg_write(UC_X86_REG_EIP,self.get(sp))
    def keys(self,u,a,size,_):
        self.input=self.inputs[self.members.index(u.reg_read(UC_X86_REG_ECX))];super().keys(u,a,size,_)
    def setup_race(self):
        self.heap=0x1100000;self.seed=123;self.draws=[];self.uc.mem_write(self.parent,bytes(0x400));self.uc.mem_write(self.clock,bytes(0x200));self.put(self.message,0,0,0)
        self.put(self.parent+4,4);self.put(self.parent+0x104,8624);self.put(self.parent+0x118,99,99,99,99);self.put(self.parent+0x30,self.clock);self.call(0x41bbe4,self.clock,900)
        for i,p in enumerate(self.members):
            self.uc.mem_write(p,bytes(0x100));self.put(p,100+i*120,226);self.put(p+0x18,12);self.put(p+0x24,8850);self.put(p+0x38,0x10e7000)
            self.uc.mem_write(p+0x22,bytes([i,4]));self.call(0x4269d7,p,1);self.put(self.parent+0x1a0+4*i,p);self.put(self.parent+0xdc+4*i,1)
        o=self.obstacle;self.uc.mem_write(o,bytes(0x100));self.put(o+0x40,0x10e6000);self.uc.mem_write(0x10e6000,struct.pack('<H',629));self.call(0x42728a,o);self.put(o+0x20,1);self.put(self.parent+0x1b0,o)
        self.uc.mem_write(0x4c54bc,struct.pack('<f',1));return self.race_state()
    def race_state(self):
        players=[]
        for p in self.members:self.player=p;players.append(self.player_state())
        o=self.obstacle;signed=lambda a:struct.unpack('<i',self.uc.mem_read(a,4))[0]
        obstacles=dict(mode=self.get(o+0x20),width=629,y=[signed(o+i*4) for i in range(4)],speed=[signed(o+0x10+i*4) for i in range(4)],delay=signed(o+0x24),x=signed(o+0x28),horizontalSpeed=signed(o+0x2c),good=[self.get(o+0x30+i*4) for i in range(4)])
        return dict(camera=self.get(self.parent+0x104),remaining=self.get(self.clock+0x20),finishOrder=[self.get(self.parent+0x118+i*4) for i in range(self.get(self.parent+0x114))],obstacles=obstacles,players=players,done=self.uc.mem_read(self.parent+4,1)[0]!=4,rewards=[self.get(self.parent+0x38+i*4) for i in range(4)])
def main():
    o=ObstacleRaceOracle();traces=[]
    for pattern in ['fast','guard','none']:
        initial=o.setup_race();rows=[]
        for t in range(900):
            o.inputs=[t%2]*4 if pattern=='fast' else [t%2,2,1,0] if pattern=='guard' else [0]*4
            before=len(o.draws);o.call(0x425fcc,o.parent,o.message)
            done=o.uc.mem_read(o.parent+4,1)[0]!=4
            for p in o.members:o.call(0x426ed8,p,0 if done else 1)
            state=o.race_state();rows.append(dict(inputs=o.inputs,draws=o.draws[before:],state=state))
            if state['done']:break
        traces.append(dict(pattern=pattern,initial=initial,rows=rows))
    (ROOT/'tests/fixtures/original-minigame4.json').write_text(json.dumps(dict(sourceSha256=SHA,traces=traces),separators=(',',':')),'utf8')
    print(json.dumps([dict(pattern=t['pattern'],ticks=len(t['rows']),last=t['rows'][-1]['state']) for t in traces]))
if __name__=='__main__':main()
