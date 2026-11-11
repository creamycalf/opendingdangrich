"""Original MGame04 player updates, including release-edge and guard inputs."""
from verify_original_minigame6 import MiniOracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
import json,struct

class PlayerOracle(MiniOracle):
    def __init__(self):
        super().__init__(4)
        self.uc.hook_add(UC_HOOK_CODE,self.keys,begin=0x426ffd,end=0x426ffd)
    def keys(self,u,address,size,_):
        sp=u.reg_read(UC_X86_REG_ESP);u.reg_write(UC_X86_REG_EAX,self.input);u.reg_write(UC_X86_REG_ESP,sp+16);u.reg_write(UC_X86_REG_EIP,self.get(sp))
    def setup_player(self):
        p=self.player;self.heap=0x1100000;self.seed=123;self.draws=[];self.uc.mem_write(p,bytes(0x100))
        self.put(p,120,226);self.put(p+0x18,16);self.put(p+0x24,8850);self.call(0x4269d7,p,1)
        return self.player_state()
    def player_state(self):
        p=self.player;a=self.get(p+0x3c);signed=lambda o:struct.unpack('<i',self.uc.mem_read(p+o,4))[0]
        return dict(y=signed(4),sway=signed(8),score=self.get(p+12),bonus=self.get(p+16),clock=self.get(p+20),rankSpeed=self.get(p+24),speed=self.get(p+28),strokes=int.from_bytes(self.uc.mem_read(p+32,2),'little'),mode=self.uc.mem_read(p+35,1)[0],world=signed(36),armed=self.get(p+44),finished=bool(self.get(p+52)),animation=self.get(a+0x23c),age=self.get(a+0x28))
def main():
    o=PlayerOracle();traces=[]
    for pattern in ['repeat','release','guard','hit']:
        initial=o.setup_player();rows=[]
        for t in range(120):
            o.input=1 if pattern=='repeat' else t%2 if pattern in ['release','hit'] else [0,1,2,2,0][t%5]
            if pattern=='hit' and t==30:o.call(0x4269d7,o.player,16)
            before=len(o.draws);o.call(0x426bb6,o.player,8624,900-t,120,0,0)
            rows.append(dict(input=o.input,hit=pattern=='hit' and t==30,draws=o.draws[before:],state=o.player_state()))
        traces.append(dict(pattern=pattern,initial=initial,rows=rows))
    (ROOT/'tests/fixtures/original-minigame4-player.json').write_text(json.dumps(dict(sourceSha256=SHA,traces=traces),separators=(',',':')),'utf8')
    print(json.dumps([dict(pattern=t['pattern'],last=t['rows'][-1]['state']) for t in traces]))
if __name__=='__main__':main()
