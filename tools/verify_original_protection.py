"""Execute original defensive ability masks, conflict queries and rent gates.

Factory, mask callback and conflict tables run original x86. For queries, only
the active-item linked-list iterator is replaced by a one-element fixture.
Rent gate stops at the original exempt/non-exempt branch, before presentation.
Clock samples reuse the existing isolated real turn-clock harness.
"""
import json
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE
from verify_original_effect_clock import sample
from unicorn.x86_const import *


class ProtectionOracle(Oracle):
    def __init__(self):
        super().__init__(json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8')))
        self.old=0;self.list_owner=self.player
        def iterator(u,address,size,_):
            sp=u.reg_read(UC_X86_REG_ESP)
            u.reg_write(UC_X86_REG_EAX,self.old if address==0x41d010 and u.reg_read(UC_X86_REG_ECX)==self.list_owner+0xec else 0)
            u.reg_write(UC_X86_REG_EIP,self.get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
        for address in [0x41d010,0x454e40]:self.uc.hook_add(UC_HOOK_CODE,iterator,begin=address,end=address)
        self.items={id:self.call(0x48be40,0,id) for id in [1,4,9,10,11,15,16,18,19,20,22,23,25,27,28,29,31,36]}
        self.new_items={id:self.call(0x48be40,0,id) for id in [1,4,5,9,10,11,15,16,18,19,20,22,23,25,27,28,29,30,31,33,36]}
        self.rent_exempt=False
        def rent_branch(u,address,size,_):
            self.rent_exempt=True;u.emu_stop()
        self.uc.hook_add(UC_HOOK_CODE,rent_branch,begin=0x4439d0,end=0x4439d0)
        def shop_skip(u,address,size,_):
            self.shop_allowed=False;u.emu_stop()
        self.uc.hook_add(UC_HOOK_CODE,shop_skip,begin=0x4a3c46,end=0x4a3c46)

    def call(self,address,ecx,*args):
        sp,end=0x20ff000,0x10ff020
        self.put(sp,end,*args);self.uc.reg_write(UC_X86_REG_ESP,sp);self.uc.reg_write(UC_X86_REG_ECX,ecx)
        self.uc.emu_start(address,end,count=100000)
        assert self.uc.reg_read(UC_X86_REG_EIP)==end
        return self.uc.reg_read(UC_X86_REG_EAX)

    def capabilities(self,id,base):
        self.put(self.result,base);self.call(0x48db23,self.items[id],self.result)
        return self.get(self.result)

    def exempt(self,flags):
        frame=0x20fe000;self.put(frame-0x24,flags)
        self.uc.reg_write(UC_X86_REG_EBP,frame);self.uc.reg_write(UC_X86_REG_ESP,frame-0x100)
        self.rent_exempt=False;self.uc.emu_start(0x4439c6,0x4439e1,count=100)
        return self.rent_exempt

    def conflict(self,old_id,new_id,same_source,attack):
        self.list_owner=self.player
        self.old=self.items[old_id];new=self.new_items[new_id]
        self.put(self.old+0x10c,self.player);self.put(new+0x10c,self.player if same_source else self.other)
        result=self.call(0x43904b,self.player,new,self.result,int(attack))
        return dict(result=result,selectedOld=self.get(self.result)==self.old)

    def target(self,id,alive,nobita,shizuka,attack_id=36):
        self.list_owner=self.other;self.old=0 if id is None else self.items[id]
        if self.old:self.put(self.old+0x10c,self.player)
        self.put(self.player+0x2f8,0x420|(0x10000000 if nobita else 0));self.put(self.player+0x2fc,0)
        self.put(self.other+0x2f8,0x420|(0x20000000 if shizuka else 0));self.put(self.other+0x2fc,0 if alive else 0x80000000)
        self.put(self.new_items[attack_id]+0x10c,self.player)
        return bool(self.call(0x48d927,self.new_items[attack_id],self.other))

    def shop(self,item,restricted):
        frame=0x20fe000;self.put(frame-0x10,0x4000000 if restricted else 0);self.put(frame-0x14,item)
        self.uc.reg_write(UC_X86_REG_EBP,frame);self.uc.reg_write(UC_X86_REG_ESP,frame-0x100)
        self.shop_allowed=True;self.uc.emu_start(0x4a3c70,0x4a3c91,count=100)
        return self.shop_allowed


def main():
    o=ProtectionOracle();masks=[];conflicts=[]
    for id in o.items:
        for base in [0,0xffffffff,0x420,*[1<<bit for bit in range(32)]]:
            value=o.capabilities(id,base)
            masks.append(dict(item=id,base=base,after=value,rentExempt=o.exempt(value)))
    for old in o.items:
        for new in o.new_items:
            for source in [False,True]:
                for attack in [False,True]:conflicts.append(dict(old=old,new=new,sameSource=source,attack=attack,**o.conflict(old,new,source,attack)))
    clocks=[sample(id,remaining,True,['begin','begin','end','begin','end','begin','end','begin','end','begin']) for id in [1,4,10,11,15,16,18,19,20,22,23,25,27,29,31] for remaining in [1,3,5]]
    targets=[dict(item=id,attack=attack_id,alive=alive,nobita=nobita,shizuka=shizuka,allowed=o.target(id,alive,nobita,shizuka,attack_id)) for id in [None,*o.items] for attack_id in [4,15,25,27,30,33,36] for alive in [False,True] for nobita in [False,True] for shizuka in [False,True]]
    shop=[dict(item=id,restricted=restricted,allowed=o.shop(id,restricted)) for id in range(42) for restricted in [False,True]]
    result=dict(sourceSha256=SHA,scope=__doc__,masks=masks,conflicts=conflicts,clocks=clocks,targets=targets,shop=shop,
                constructor={str(id):dict(duration=o.get(obj+0x70),mask=o.get(obj+0x74),value=o.get(obj+0x78)) for id,obj in o.items.items()})
    (ROOT/'tests/fixtures/original-protection.json').write_text(json.dumps(result,indent=2),'utf8')
    print(f'{len(masks)} capability/rent cases, {len(conflicts)} conflict cases, {len(clocks)} clock traces, {len(targets)} attack target cases')
    tables={kind:[[o.uc.mem_read(address+old*79+new,1)[0] for new in range(44)] for old in range(44)] for kind,address in [('self',0x4c0b9c),('attack',0x4c2400)]}
    (ROOT/'app/src/original-effect-tables.mjs').write_text('// Generated from original wa.exe conflict tables; tools/verify_original_protection.py.\nexport const EFFECT_CONFLICTS='+json.dumps(tables,separators=(',',':'))+';\n','utf8')


if __name__=='__main__':main()
