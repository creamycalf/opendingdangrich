import json,struct
from verify_original_economy import Oracle,ROOT
from unicorn.x86_const import *
o=Oracle(json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8')));out=[]
for id in range(43):
 sp=0x20ff000;o.put(sp,0x10ff020,id);o.uc.reg_write(UC_X86_REG_ESP,sp);o.uc.emu_start(0x48be40,0x10ff020,count=100000);obj=o.uc.reg_read(UC_X86_REG_EAX)
 row=dict(id=id,mask=hex(o.get(obj+0x74)),value=hex(o.get(obj+0x78)),duration=o.get(obj+0x70),vtable=hex(o.get(obj)),methods=[hex(o.get(o.get(obj)+i*4)) for i in range(32)])
 out.append(row)
(ROOT/'research/all-item-metadata.json').write_text(json.dumps(out,indent=2),'utf8')
for r in out:print(r['id'],r['duration'],r['mask'],r['value'])
