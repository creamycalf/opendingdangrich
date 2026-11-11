"""Unchanged x86 tunnel placement predicate on all eight maps, synthetic empty
and occupied cells. No render or OS calls. Shrink traversal is statically traced
in original 0x43d7c2 and is not covered by this predicate-only fixture.
"""
import json
from verify_original_protection import ProtectionOracle
from verify_original_economy import Oracle,ROOT,SHA
from unicorn.x86_const import *
def main():
 rows=[]
 for number in range(8):
  m=json.loads((ROOT/f'app/public/assets/maps/{number}.json').read_text('utf8'));o=Oracle(m);u=o.uc
  u.mem_map(0x3000000,0x100000);o.put(o.actor+0x228,0x3000000);u.mem_write(o.actor+0xe4,bytes.fromhex(m['rawConfig']))
  def call(x,y):
   sp,end=0x20ff000,0x10ff020;o.put(sp,end,x,y);u.reg_write(UC_X86_REG_ESP,sp);u.emu_start(0x491a8c,end,count=100000);assert u.reg_read(UC_X86_REG_EIP)==end;return bool(u.reg_read(UC_X86_REG_EAX))
  for i,c in enumerate(m['cells']):
   if c['flags']&128 and not c['flags']&64:
    empty=call(c['x'],c['y']);o.put(0x3000000+i*52+16,1);occupied=call(c['x'],c['y']);o.put(0x3000000+i*52+16,0)
    rows.append(dict(map=number,at=i,empty=empty,occupied=occupied))
 p=ProtectionOracle();obj=p.call(0x48be40,0,43);constructor={k:p.get(obj+offset) for k,offset in [('duration',0x70),('mask',0x74),('value',0x78)]}
 (ROOT/'tests/fixtures/original-tunnel.json').write_text(json.dumps(dict(sourceSha256=SHA,scope=__doc__,placements=rows,constructor=constructor),separators=(',',':')),'utf8');print(len(rows),'tunnel placements;',constructor)
if __name__=='__main__':main()
