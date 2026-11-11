"""Run original factory; read the following actor's direction tables (+0x12c).
0x48ed31 passes this exact table into actor construction (0x404494).
"""
import json
from verify_original_economy import Oracle,ROOT,SHA
from unicorn.x86_const import UC_X86_REG_EAX,UC_X86_REG_ESP
board=json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8'));rows=[]
for id in [1,8,14,23,35]:
 o=Oracle(board);sp=0x20ff000;o.put(sp,0x10ff020,id);o.uc.reg_write(UC_X86_REG_ESP,sp);o.uc.emu_start(0x48be40,0x10ff020,count=100000);obj=o.uc.reg_read(UC_X86_REG_EAX)
 rows.append(dict(id=id,initialDirections=[o.get(obj+0x12c+i*4) for i in range(4)],raw13c=[o.get(obj+0x13c+i*4) for i in range(4)]))
(ROOT/'research/companion-tables26.json').write_text(json.dumps(dict(sourceSha256=SHA,rows=rows),indent=2),'utf8')
print(rows)
