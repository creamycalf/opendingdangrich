"""Run original starting-inventory loops, substituting ONLY random draws.

Graphics/character construction is outside these instruction slices. The
25-entry pool and duplicate rejection are read/executed from the original EXE.
Also execute the accepted shop increment to check quantities above twelve;
this last slice does not test purchase eligibility or surrounding UI.
"""
import json
from verify_original_economy import Oracle, ROOT, SHA, UC_HOOK_CODE
from unicorn.x86_const import *


class InventoryOracle(Oracle):
    def __init__(self):
        super().__init__(dict(width=1,height=1,cells=[dict(layer=0,object=65535,flags=128,terrain=0,price=0,event=0)]))
        self.draws=[]
        self.used=[]
        def random(u,address,size,_):
            sp=u.reg_read(UC_X86_REG_ESP)
            assert self.get(sp+4)==25
            value=self.draws[len(self.used)]
            assert 0<=value<25
            self.used.append(value)
            u.reg_write(UC_X86_REG_EAX,value)
            u.reg_write(UC_X86_REG_EIP,self.get(sp))
            u.reg_write(UC_X86_REG_ESP,sp+4)
        self.uc.hook_add(UC_HOOK_CODE,random,begin=0x4821a0,end=0x4821a0)

    def slice(self,start,end):
        self.uc.reg_write(UC_X86_REG_EBP,0x20fe000)
        self.uc.reg_write(UC_X86_REG_ESP,0x20fd000)
        self.uc.emu_start(start,end,count=100000)
        assert self.uc.reg_read(UC_X86_REG_EIP)==end

    def starting(self,character,draws,loading=False):
        self.draws=draws;self.used=[]
        self.uc.mem_write(self.player+0x44,bytes(42*4))
        self.put(0x20fe000-0x1c,self.player)
        self.put(0x4ca664,int(loading))
        self.slice(*(dict(doraemon=(0x451018,0x451071),dorami=(0x4531a8,0x453201))[character]))
        counts=[self.get(self.player+0x44+4*i) for i in range(42)]
        return dict(character=character,loading=loading,draws=draws,used=len(self.used),counts=counts)


def main():
    o=InventoryOracle()
    pool=[o.get(0x4c3c64+4*i) for i in range(25)]
    sequences=[list(range(25)),list(reversed(range(25))),[i for i in range(25) for _ in range(3)]]
    # Every cyclic offset and a coprime stride exercise omission of each pool entry.
    sequences.extend([[(offset+i*7)%25 for i in range(25)] for offset in range(25)])
    cases=[o.starting(character,draws) for character in ['doraemon','dorami'] for draws in sequences]
    cases.extend(o.starting(character,[],True) for character in ['doraemon','dorami'])
    increments=[]
    for item in range(42):
        for count in [0,11,12,22,99,1000]:
            o.put(0x20fe000-0x40,item)
            o.put(0x20fe000-0x3c,o.player+0x44)
            o.put(o.player+0x44+item*4,count)
            o.slice(0x4a46f1,0x4a4706)
            increments.append(dict(item=item,before=count,after=o.get(o.player+0x44+item*4)))
    result=dict(sourceSha256=SHA,scope=__doc__,pool=pool,starting=cases,increments=increments)
    (ROOT/'tests/fixtures/original-inventory.json').write_text(json.dumps(result,indent=2),'utf8')
    print(f'{len(cases)} starting inventories, {len(increments)} accepted purchase increments')


if __name__=='__main__':main()
