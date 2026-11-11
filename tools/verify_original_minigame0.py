"""MGame00 full falling-object parent, input, original AI and animation ticks.
I/O, render/list bookkeeping and keys are substituted; no native process runs.
"""
from verify_original_minigame5 import RpsOracle,ROOT,SHA,UC_HOOK_CODE,pe
from verify_original_minigame6 import MiniOracle
from unicorn.x86_const import *
import struct,json

class CatchOracle(RpsOracle):
    def __init__(self):
        MiniOracle.__init__(self,0);self.uc.mem_map(0x1200000,0x800000)
        self.parent=0x10d6000;self.clock=0x10e4000;self.message=0x10e5000;self.inputs=[0]*4;self.done=False;self.ai=False
        self.members=[0x10d0000+i*0x1000 for i in range(4)];self.drops=[0x10d8000+i*0x100 for i in range(8)]
        for a in [0x41e6af,0x41e106,0x41e178,0x41ef8e,0x41f000,0x41cad4,0x41cbc0,0x41a7c4,0x432156,0x48826f,0x487e94,0x48834a,0x41f540]:self.uc.hook_add(UC_HOOK_CODE,self.ui,begin=a,end=a)
    def ui(self,u,a,size,_):
        sp=u.reg_read(UC_X86_REG_ESP);result=0;pop=4
        if a==0x41e6af:
            p=u.reg_read(UC_X86_REG_ECX)
            if self.ai:
                context=0x10e7000;out=0x10e7100;stub=0x10ff100
                self.put(context,self.members.index(p),self.get(p),self.get(p+4));u.mem_write(context+12,bytes(u.mem_read(p+0x13,1)))
                code=b'\x68'+struct.pack('<I',context)+b'\x68'+struct.pack('<I',self.get(sp+4))+b'\x68'+struct.pack('<I',out)
                code+=b'\xe8'+struct.pack('<i',0x41e846-(stub+len(code)+5))+b'\xa1'+struct.pack('<I',out)+b'\xc2\x04\x00'
                u.mem_write(stub,code);u.reg_write(UC_X86_REG_EIP,stub);return
            result=self.inputs[self.members.index(p)]
        elif a==0x41a7c4:self.done=True
        elif a==0x41cbc0:pop=12
        elif a==0x432156:pop=0
        elif a==0x48826f:result=0xffffffff;pop=0
        elif a==0x487e94:pop=12
        u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_ESP,sp+4+pop);u.reg_write(UC_X86_REG_EIP,self.get(sp))
    def setup_catch(self,ai=False):
        self.ai=ai;self.heap=0x1100000;self.seed=123;self.draws=[];self.done=False
        self.uc.mem_write(self.parent,bytes(0x400));self.uc.mem_write(self.clock,bytes(0x200));self.put(self.message,0,0,0)
        self.put(self.parent+0x100,4);self.put(self.parent+0x30,self.clock);self.call(0x41bbe4,self.clock,1350)
        for i,p in enumerate(self.members):
            self.uc.mem_write(p,bytes(0x100));self.put(p,100+i*100,196,10+i,0);self.uc.mem_write(p+0x10,bytes([0,i,64,1]));self.call(0x41e19d,p,1)
            self.put(self.parent+0x118+4*i,p);self.put(self.parent+0xdc+4*i,1)
        for i,p in enumerate(self.drops):
            self.uc.mem_write(p,bytes(0x100));self.call(0x41eddd,p,0,0,0,i);self.put(self.parent+0x128+4*i,p)
        self.uc.mem_write(0x4c54bc,struct.pack('<f',1));return self.state()
    def animation(self,p):
        a=self.get(p+0x1c);return dict(animation=self.get(a+0x23c),age=self.get(a+0x28),ended=int((self.get(a+0x3c)&0x7fff)==101))
    def state(self):
        signed=lambda a:struct.unpack('<i',self.uc.mem_read(a,4))[0]
        return dict(remaining=self.get(self.clock+0x20),done=self.done,players=[dict(slot=i,x=self.get(p),y=self.get(p+4),clock=self.get(p+0xc),score=self.uc.mem_read(p+0x10,1)[0],mode=self.uc.mem_read(p+0x12,1)[0],direction=self.uc.mem_read(p+0x13,1)[0],**self.animation(p)) for i,p in enumerate(self.members)],drops=[dict(slot=i,x=self.get(p+4),y=signed(p+8),speed=self.uc.mem_read(p+0x18,1)[0],kind=self.uc.mem_read(p+0x19,1)[0],mode=self.uc.mem_read(p+0x1a,1)[0],counter=self.uc.mem_read(p+0x1b,1)[0],**self.animation(p)) for i,p in enumerate(self.drops)],rewards=[self.get(self.parent+0x38+4*i) for i in range(4)])
    def tick(self):
        self.call(0x41d77d,self.parent,self.message)
        if not self.done:
            for p in self.members+self.drops:self.call(0x401ccc,self.get(p+0x1c))
        return self.state()

def main():
    o=CatchOracle();traces=[]
    for pattern in ['none','sweep','mixed','ai']:
        initial=o.setup_catch(pattern=='ai');setup=o.draws.copy();rows=[]
        for t in range(1351):
            o.inputs=[0]*4 if pattern in ['none','ai'] else [4 if t%200<100 else 8]*4 if pattern=='sweep' else [4 if t%160<80 else 8,8,4,0]
            before=len(o.draws);state=o.tick();rows.append(dict(inputs=o.inputs,draws=o.draws[before:],state=state))
            if o.done:break
        traces.append(dict(pattern=pattern,setup=setup,initial=initial,rows=rows))
    multiplier=struct.unpack('<f',pe.get_data(0x4b6bc8-0x400000,4))[0]
    (ROOT/'tests/fixtures/original-minigame0.json').write_text(json.dumps(dict(sourceSha256=SHA,multiplier=multiplier,traces=traces),separators=(',',':')),'utf8')
    print(json.dumps(dict(multiplier=multiplier,traces=[dict(pattern=t['pattern'],ticks=len(t['rows']),scores=[p['score'] for p in t['rows'][-1]['state']['players']],rewards=t['rows'][-1]['state']['rewards']) for t in traces])))
if __name__=='__main__':main()
