"""Run original MGame06 update + animation bytecode, with isolated input/RNG.

No OS/EXE process is started. Rendering, sound and archive I/O are substituted;
the player transition, ring buffer, animation timing and score are original x86.
"""
import json,struct
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE
from extract_assets import archive,SOURCE
from unicorn.x86_const import *

class MiniOracle(Oracle):
    def __init__(self,game=6):
        super().__init__(json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8')))
        self.input=0;self.draws=[];self.draw_index=0;self.seed=1
        self.dat={}
        pointer=0x1050000
        for (index,),raw in archive((SOURCE/f'MGame{game:02d}.DAT').read_bytes()).items():
            self.uc.mem_write(pointer,raw);self.dat[index]=pointer;pointer+=(len(raw)+15)&~15
        for address in [0x40871f,0x4821a0,0x42ae33,0x431d25,0x431e56]:
            self.uc.hook_add(UC_HOOK_CODE,self.stub,begin=address,end=address)

    def stub(self,u,address,size,_):
        sp=u.reg_read(UC_X86_REG_ESP);result=0;pop=0
        if address==0x40871f:result=self.dat[self.get(sp+4)];pop=4
        elif address==0x4821a0:
            n=self.get(sp+4);self.seed=(1664525*self.seed+1013904223)&0xffffffff
            result=(self.seed*n)>>32;self.draws.append([n,result])
        elif address==0x42ae33:result=self.input
        elif address==0x431d25:result=0x10e0000
        u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_ESP,sp+4+pop);u.reg_write(UC_X86_REG_EIP,self.get(sp))

    def call(self,address,ecx,*args):
        sp,end=0x20ff000,0x10ff020;self.put(sp,end,*args)
        self.uc.reg_write(UC_X86_REG_ESP,sp);self.uc.reg_write(UC_X86_REG_ECX,ecx)
        try:self.uc.emu_start(address,end,count=100000)
        except Exception as e:raise RuntimeError(f'{e} at {self.uc.reg_read(UC_X86_REG_EIP):x}') from e
        assert self.uc.reg_read(UC_X86_REG_EIP)==end
        return self.uc.reg_read(UC_X86_REG_EAX)

    def state(self):
        b=bytes(self.uc.mem_read(self.player,0xd0))
        return dict(start=b[0x14],target=b[0x15],previous=b[0x16],scroll=b[0x17],mode=b[0x19],
                    offset=struct.unpack_from('<i',b,8)[0],score=self.get(self.player+12),side=self.get(self.player+0xc8),
                    ring=list(b[0x1a:0x28]),animation=self.get(self.get(self.player+0x28)+0x23c),frame=self.get(self.get(self.player+0x28)+0xc))

    def setup(self,side=0,target=6,start=0):
        self.uc.mem_write(self.player,bytes(0xd0));self.heap=0x1100000;self.seed=123;self.draws=[]
        ring=[(i*7+1)%16 for i in range(14)]
        self.uc.mem_write(self.player+0x14,bytes([start,target,0,0,0,0]+ring));self.put(self.player+0xc8,side)
        self.call(0x42a6a5,self.player,1)
        return self.state()

def main():
    o=MiniOracle();traces=[]
    for side in [0,1]:
        for target in [6,7]:
            for key in [4,8]:
                initial=o.setup(side,target);rows=[]
                for tick in range(65):
                    o.input=key if tick==0 else 0
                    before=len(o.draws);o.call(0x42a910,o.player)
                    rows.append(dict(tick=tick,input=o.input,draws=o.draws[before:],state=o.state()))
                traces.append(dict(initial=initial,rows=rows))
    dest=ROOT/'tests/fixtures/original-minigame6.json'
    dest.write_text(json.dumps(dict(sourceSha256=SHA,update='0x42a910',transition='0x42a6a5',animationTick='0x401ccc',traces=traces),separators=(',',':')),'utf8')
    print(json.dumps({'traces':len(traces),'states':sum(len(t['rows']) for t in traces),'first':traces[0]['rows'][:15]}))

if __name__=='__main__':main()
