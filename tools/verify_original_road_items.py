"""Execute original door/cannon placement and door random destinations.

Real map/navigation queries; synthetic actor/road-item/bell occupancy. Only RNG
is substituted; there is no Windows launch or rendering.
"""
import json
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *

def main():
    placements=[];traces=[]
    for number in range(8):
        board=json.loads((ROOT/f'app/public/assets/maps/{number}.json').read_text('utf8'));o=Oracle(board);u=o.uc
        u.mem_map(0x3000000,0x100000);o.put(o.actor+0x228,0x3000000)
        u.mem_write(o.actor+0xe4,bytes.fromhex(board['rawConfig']))
        def call(address,ecx,*args):
            sp,end=0x20ff000,0x10ff020;o.put(sp,end,*args);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_ECX,ecx)
            u.emu_start(address,end,count=2000000);assert u.reg_read(UC_X86_REG_EIP)==end,hex(u.reg_read(UC_X86_REG_EIP));return u.reg_read(UC_X86_REG_EAX)
        for c in board['cells']:
            if not c['flags']&128 or c['flags']&64:continue
            at=c['y']*board['width']+c['x'];row={'map':number,'at':at,'empty':[call(f,0,c['x'],c['y']) for f in [0x49f020,0x4949fe]]}
            # Any actor, road item or bell occupying the selected square blocks it.
            blocked=[]
            for offset in [0,4,8,12,16,48]:
                o.put(0x3000000+at*52+offset,1);blocked.append([call(f,0,c['x'],c['y']) for f in [0x49f020,0x4949fe]]);o.put(0x3000000+at*52+offset,0)
            row['occupied']=blocked
            # A neighboring road object changes which orientation is legal.
            neighbor=[]
            for dx,dy in [(0,-1),(0,1),(-1,0),(1,0)]:
                n=(c['y']+dy)*board['width']+c['x']+dx
                if 0<=n<len(board['cells']):
                    o.put(0x3000000+n*52+16,1);neighbor.append(call(0x49f020,0,c['x'],c['y']));o.put(0x3000000+n*52+16,0)
                else:neighbor.append(None)
            row['neighbor']=neighbor;placements.append(row)
        seed=1;draws=[]
        def rng(uc,address,size,_):
            nonlocal seed
            sp=uc.reg_read(UC_X86_REG_ESP);n=o.get(sp+4);seed=(seed*1664525+1013904223)&0xffffffff;value=(seed*n)>>32;draws.append([n,value]);uc.reg_write(UC_X86_REG_EAX,value);uc.reg_write(UC_X86_REG_EIP,o.get(sp));uc.reg_write(UC_X86_REG_ESP,sp+4)
        u.hook_add(UC_HOOK_CODE,rng,begin=0x4821a0,end=0x4821a0)
        for start in board['starts']:
            for initial in [1,72,12345]:
                for occupied in [[],[p['at'] for p in placements if p['map']==number and p['empty'][0]][::3]]:
                    for at in occupied:o.put(0x3000000+at*52+16,1)
                    seed=initial;draws=[];o.put(o.result+0x114,start['x'],start['y']);call(0x49fed7,o.result)
                    traces.append(dict(map=number,start=start,seed=initial,occupied=occupied,draws=draws,x=o.get(o.result+0x134),y=o.get(o.result+0x138),direction=o.get(o.result+0x130)))
                    for at in occupied:o.put(0x3000000+at*52+16,0)
    (ROOT/'tests/fixtures/original-road-items.json').write_text(json.dumps(dict(sourceSha256=SHA,placements=placements,traces=traces),separators=(',',':')),'utf8')
    print(len(placements),'placement rows;',len(traces),'door destination traces')

if __name__=='__main__':main()
