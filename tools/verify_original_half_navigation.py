"""Original 0x439ac4 float navigation wrapper over the real map query.
Jail-rectangle resource lookup is substituted with an out-of-map rectangle.
"""
import json,struct
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
o=Oracle(json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8')))
def region(u,a,size,_):
 sp=u.reg_read(UC_X86_REG_ESP);out=o.get(sp+8);o.put(out,1000,1000,0,1001,1001)
 u.reg_write(UC_X86_REG_EIP,o.get(sp));u.reg_write(UC_X86_REG_ESP,sp+12)
o.uc.hook_add(UC_HOOK_CODE,region,begin=0x47e794,end=0x47e794)
def bits(f):return struct.unpack('<I',struct.pack('<f',f))[0]
out=[]
for c in o.board['cells']:
 if not c['flags']&128 or c['flags']&64:continue
 for d in range(4):
  x=c['x']+(.5 if d>=2 else 0);y=c['y']+(.5 if d<2 else 0);sp=0x20ff000
  o.put(sp,0x10ff020,bits(x),bits(y),d,bits(.5),bits(1));o.uc.reg_write(UC_X86_REG_ESP,sp);o.uc.reg_write(UC_X86_REG_ECX,o.player)
  o.uc.emu_start(0x439ac4,0x10ff020,count=10000);assert o.uc.reg_read(UC_X86_REG_EIP)==0x10ff020
  out.append(dict(x=x,y=y,direction=d,mask=o.uc.reg_read(UC_X86_REG_EAX)))
(ROOT/'tests/fixtures/original-half-navigation.json').write_text(json.dumps(dict(sourceSha256=SHA,scope=__doc__,cases=out),separators=(',',':')),'utf8');print(len(out),'half-grid original direction cases')
