"""Run v1.26 47edd1 and its real road query 47b800, without OS stubs."""
import hashlib,json,struct,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/_deps'))
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import *
raw=(ROOT/'work/new-pc-v121/Doraemon.exe').read_bytes();pe=pefile.PE(data=raw)
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x100000);u.mem_write(0x400000,pe.get_memory_mapped_image());u.mem_map(0x1000000,0x200000)
def put(at,*values):u.mem_write(at,struct.pack('<'+'I'*len(values),*values))
actor,header,layers,layer,cells,slots,stack,stop=0x1000000,0x1001000,0x1002000,0x1003000,0x1010000,0x1050000,0x11f0000,0x11ff000
put(actor+0x20,header);put(header+0x10,layers);put(layers,layer);put(layer+4,cells,slots)
rows=[]
for mid in range(8):
 b=json.loads((ROOT/f'app/public/assets/maps-v126/{mid}.json').read_bytes());put(header+4,b['width'],b['height'])
 for i,c in enumerate(b['cells']):u.mem_write(cells+i*16,struct.pack('<HHHHIB3x',c['layer'],c['object'],c['flags'],c['terrain'],c['price'],c['event']))
 for i,c in enumerate(b['cells']):
  if c['event']!=1:continue
  put(stack,stop,c['x'],c['y']);u.reg_write(UC_X86_REG_ESP,stack);u.reg_write(UC_X86_REG_ECX,actor)
  u.emu_start(0x47edd1,stop,count=100000)
  assert u.reg_read(UC_X86_REG_EIP)==stop
  rows.append(dict(map=mid,lot=i,direction=u.reg_read(UC_X86_REG_EAX)))
result=dict(sha256=hashlib.sha256(raw).hexdigest(),function='0x47edd1',roadQuery='0x47b800',rows=rows)
(ROOT/'tests/fixtures/original-property-art.json').write_text(json.dumps(result,separators=(',',':')))
print(json.dumps(dict(lots=len(rows),directions=sorted({r['direction'] for r in rows}),sha256=result['sha256'])))
