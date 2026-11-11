"""Run original 0x405785 follower-position helper against all eight maps.
Only the RNG is substituted. Map queries and direction/position reads execute
unchanged x86. This verifies placement, not graphical following or landing UI.
"""
import json,struct
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
def main():
 rows=[]
 for number in range(8):
  m=json.loads((ROOT/f'app/public/assets/maps/{number}.json').read_text('utf8'));o=Oracle(m);u=o.uc
  u.mem_map(0x3000000,0x100000);o.put(o.actor+0x228,0x3000000);u.mem_write(o.actor+0xe4,bytes.fromhex(m['rawConfig']));actor=0x10e0000;o.put(actor+0x2c,o.actor)
  seed=1;draws=[]
  def rng(uc,a,z,d):
   nonlocal seed
   sp=uc.reg_read(UC_X86_REG_ESP);limit=o.get(sp+4);seed=(seed*1664525+1013904223)&0xffffffff;v=(seed*limit)>>32;draws.append([limit,v]);uc.reg_write(UC_X86_REG_EAX,v);uc.reg_write(UC_X86_REG_EIP,o.get(sp));uc.reg_write(UC_X86_REG_ESP,sp+4)
  u.hook_add(UC_HOOK_CODE,rng,begin=0x4821a0,end=0x4821a0)
  for at,c in enumerate(m['cells']):
   if not c['flags']&128 or c['flags']&64:continue
   for direction in range(4):
    seed=1;draws=[];u.mem_write(actor+0x24,struct.pack('<ff',c['x'],c['y']));o.put(actor+0x68,direction)
    sp,end=0x20ff000,0x10ff020;o.put(sp,end,o.result,o.result+8);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_ECX,actor);u.reg_write(UC_X86_REG_FPCW,0x37f);u.emu_start(0x405785,end,count=100000);assert u.reg_read(UC_X86_REG_EIP)==end
    allowed=bool(u.reg_read(UC_X86_REG_EAX));x,y=struct.unpack('<ff',u.mem_read(o.result,8))
    rows.append(dict(map=number,at=at,direction=direction,allowed=allowed,x=x if allowed else None,y=y if allowed else None,heading=o.get(o.result+8) if allowed else None,draws=draws))
 (ROOT/'tests/fixtures/original-clone-placement.json').write_text(json.dumps(dict(sourceSha256=SHA,scope=__doc__,cases=rows),separators=(',',':')),'utf8');print(len(rows),'original follower position cases')
if __name__=='__main__':main()

