"""Original item 0/2 eligibility, neighboring-cell selection and land mutation.

Original map lookup and eligibility instructions run unchanged. Synthetic tests
use a 3x3 single-layer map, no dynamic occupants. Mutation runs the human item
update with the animation fixed at its impact frame. Graphics and the owner's
land-list lookup/removal are substituted; monetary behavior is not inferred.
"""
import json, struct
from verify_original_economy import Oracle, ROOT, SHA, UC_HOOK_CODE
from unicorn.x86_const import *


class LandOracle(Oracle):
    def __init__(self, board):
        super().__init__(board)
        self.record=0x10e2000
        self.removed=False
        def primitive(u,address,size,_):
            sp=u.reg_read(UC_X86_REG_ESP)
            values={0x413e40:(1,0), # AI flag suppresses error speech only
                    0x401fe0:(1,0),0x401ff6:(0x6f,0), # animation impact
                    0x413bf0:(0,0),0x47e0eb:(0,8), # render identity/orientation
                    0x47e8bc:(0,12),0x4795bf:(0,4), # rendering only
                    0x442b9d:(self.record,8),0x442bf1:(0,8)}
            result,pop=values[address]
            if address==0x442bf1:self.removed=True
            u.reg_write(UC_X86_REG_EAX,result)
            u.reg_write(UC_X86_REG_EIP,self.get(sp));u.reg_write(UC_X86_REG_ESP,sp+4+pop)
        for address in [0x413e40,0x401fe0,0x401ff6,0x413bf0,0x47e0eb,0x47e8bc,0x4795bf,0x442b9d,0x442bf1]:
            self.uc.hook_add(UC_HOOK_CODE,primitive,begin=address,end=address)
        self.items={}
        for number in [0,2]:
            self.items[number]=self.call(0x48be40,0,number)

    def call(self,address,ecx,*args):
        sp,end=0x20ff000,0x10ff020
        self.put(sp,end,*[a&0xffffffff for a in args]);u=self.uc
        u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_ECX,ecx)
        u.emu_start(address,end,count=100000)
        assert u.reg_read(UC_X86_REG_EIP)==end
        return u.reg_read(UC_X86_REG_EAX)

    def neighbor(self,x,y):
        found=self.call(0x47d913,self.actor,x,y,self.result,self.result+4,1)
        if not found:return None
        tx,ty=self.get(self.result),self.get(self.result+4)
        if tx>=self.board['width'] or ty>=self.board['height']:return None
        return ty*self.board['width']+tx

    def eligible(self,number,x,y):
        self.uc.mem_write(self.player+0x118,struct.pack('<ff',x,y))
        return bool(self.call(0x48f83c if number==0 else 0x490336,self.items[number],self.player))

    def mutate(self,number,lot,level):
        item=self.items[number];c=self.board['cells'][lot]
        self.put(self.owners+lot*16,self.other,level,1,0)
        self.put(self.record+0x14,1,level)
        self.removed=False;message=0x10e1000;self.put(message,0,0,0,0)
        for addr,value in zip([0x4ca858,0x4ca8f0] if number==0 else [0x4ca8c8,0x4ca8dc],[c['x'],c['y']]):self.put(addr,value)
        self.call(0x48f2cb if number==0 else 0x48ff3c,item,message)
        return dict(owned=bool(self.get(self.owners+lot*16)),level=self.get(self.owners+lot*16+4),kind=self.get(self.owners+lot*16+8),listRemoved=self.removed,listLevel=self.get(self.record+0x18))


def main():
    neighbors=[]
    for number in range(8):
        board=json.loads((ROOT/f'app/public/assets/maps/{number}.json').read_text('utf8'))
        oracle=LandOracle(board)
        for at,c in enumerate(board['cells']):
            if c['flags']&128 and not c['flags']&64:
                neighbors.append(dict(map=number,at=at,lot=oracle.neighbor(c['x'],c['y'])))
    board=dict(width=3,height=3,cells=[dict(x=i%3,y=i//3,layer=0,object=65535,flags=128,terrain=0,price=100,event=0) for i in range(9)])
    o=LandOracle(board);eligibility=[]
    for mask in range(16):
        for bit,lot in enumerate([1,7,3,5]):
            o.uc.mem_write(o.cells+lot*16+4,struct.pack('<H',0 if mask&(1<<bit) else 128))
        for owner in [-1,0,1]:
            for level in range(5):
                for lot in [1,7,3,5]:o.put(o.owners+lot*16,0 if owner==-1 else o.player if owner==0 else o.other,level,1,0)
                for item in [0,2]:eligibility.append(dict(mask=mask,owner=owner,level=level,item=item,allowed=o.eligible(item,1,1)))
    mutations=[dict(item=item,initialLevel=level,result=o.mutate(item,1,level)) for item in [0,2] for level in range(5)]
    result=dict(sourceSha256=SHA,scope=__doc__,neighbors=neighbors,eligibility=eligibility,mutations=mutations)
    (ROOT/'tests/fixtures/original-land-items.json').write_text(json.dumps(result,indent=2),'utf8')
    print(f'{len(neighbors)} map targets, {len(eligibility)} eligibility cases, {len(mutations)} original mutations')


if __name__=='__main__':main()
