"""Execute original bomb destination sampler on all eight maps, before animation.

Map header/cells/configuration are real; runtime placed-object slots are empty.
Only RNG is supplied. Original map queries and four-heading navigation run x86.
"""
import json,struct
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *

def main():
    rows=[]
    for number in range(8):
        board=json.loads((ROOT/f'app/public/assets/maps/{number}.json').read_text('utf8'));o=Oracle(board);u=o.uc
        u.mem_write(o.actor+0xe4,bytes.fromhex(board['rawConfig']));o.put(o.actor+0x228,0x1080000)
        seed=1;draws=[]
        def rng(uc,address,size,_):
            nonlocal seed
            sp=uc.reg_read(UC_X86_REG_ESP);n=o.get(sp+4);seed=(seed*1664525+1013904223)&0xffffffff;result=(seed*n)>>32;draws.append([n,result])
            uc.reg_write(UC_X86_REG_EAX,result);uc.reg_write(UC_X86_REG_EIP,o.get(sp));uc.reg_write(UC_X86_REG_ESP,sp+4)
        u.hook_add(UC_HOOK_CODE,rng,begin=0x4821a0,end=0x4821a0)
        # Graphics actor getter does not affect the destination, but returns a
        # linked animation pointer that is only used after our stop boundary.
        def graphics(uc,address,size,_):
            sp=uc.reg_read(UC_X86_REG_ESP);uc.reg_write(UC_X86_REG_EAX,0);uc.reg_write(UC_X86_REG_EIP,o.get(sp));uc.reg_write(UC_X86_REG_ESP,sp+4)
        u.hook_add(UC_HOOK_CODE,graphics,begin=0x438471,end=0x438471)
        for start in board['starts']:
            for initial_seed in [1,72,12345]:
                seed=initial_seed;draws=[];o.put(o.player+0x38,start['x'],start['y']);sp=0x20ff000;o.put(sp,0x10ff020)
                u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_ECX,o.player)
                u.emu_start(0x43b271,0x43b63b,count=2000000)
                assert u.reg_read(UC_X86_REG_EIP)==0x43b63b,hex(u.reg_read(UC_X86_REG_EIP))
                frame=u.reg_read(UC_X86_REG_EBP)
                rows.append(dict(map=number,start=start,seed=initial_seed,draws=draws,x=o.get(frame-0x2c),y=o.get(frame-0x34),direction=o.get(frame-0x78)))
    (ROOT/'tests/fixtures/original-bomb.json').write_text(json.dumps(dict(sourceSha256=SHA,routine='0x43b271..0x43b63b',rows=rows),separators=(',',':')),'utf8')
    print(len(rows),'original bomb sampling traces,',sum(len(r['draws']) for r in rows),'RNG draws')
if __name__=='__main__':main()
