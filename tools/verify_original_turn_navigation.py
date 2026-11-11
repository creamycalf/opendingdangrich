"""Run original 0x439ac4 with real eight-map roads and region-3 rectangles.
Only rectangle-copy primitive is replaced with raw map config bytes.
The direction builder, turn-distance filter and runtime jail flag run x86.
"""
import json,struct
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
def bits(f):return struct.unpack('<I',struct.pack('<f',f))[0]
rows=[]
for number in range(8):
 board=json.loads((ROOT/f'app/public/assets/maps/{number}.json').read_text('utf8'));o=Oracle(board)
 rect=bytes.fromhex(board['rawConfig'])[0x68+3*24:0x68+4*24]
 def region(u,a,size,_):
  sp=u.reg_read(UC_X86_REG_ESP);assert o.get(sp+4)==3
  u.mem_write(o.get(sp+8),rect);u.reg_write(UC_X86_REG_EIP,o.get(sp));u.reg_write(UC_X86_REG_ESP,sp+12)
 o.uc.hook_add(UC_HOOK_CODE,region,begin=0x47e794,end=0x47e794)
 for at,c in enumerate(board['cells']):
  if not c['flags']&128 or c['flags']&64:continue
  for d in range(4):
   for distance in [0,.5,1]:
    for jailed in [False,True]:
     o.put(o.player+0x2fc,0x400 if jailed else 0);sp=0x20ff000
     o.put(sp,0x10ff020,bits(c['x']),bits(c['y']),d,bits(1),bits(distance))
     o.uc.reg_write(UC_X86_REG_ESP,sp);o.uc.reg_write(UC_X86_REG_ECX,o.player)
     o.uc.emu_start(0x439ac4,0x10ff020,count=10000);assert o.uc.reg_read(UC_X86_REG_EIP)==0x10ff020
     rows.append([number,at,d,distance,jailed,o.uc.reg_read(UC_X86_REG_EAX)])
 print(number,len(rows),flush=True)
(ROOT/'tests/fixtures/original-turn-navigation.json').write_text(json.dumps(dict(sourceSha256=SHA,scope=__doc__,rows=rows),separators=(',',':')),'utf8')
