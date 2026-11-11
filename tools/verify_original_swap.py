"""Original situation-exchange asset/inventory/list transfers; sprite writes stubbed."""
import json
from verify_original_monthly import MonthlyOracle
from verify_original_economy import ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *
o=MonthlyOracle();u=o.uc
def sprite(u,a,size,_):
 sp=u.reg_read(UC_X86_REG_ESP);u.reg_write(UC_X86_REG_EIP,o.get(sp));u.reg_write(UC_X86_REG_ESP,sp+16)
u.hook_add(UC_HOOK_CODE,sprite,begin=0x47e8bc,end=0x47e8bc)
lots=[i for i,c in enumerate(o.board['cells']) if c['event']==1][:12]
rows=[]
for n in range(4):
 p=o.ps[n];owned=lots[n*3:n*3+3];head=0x10e4000+n*0x1000
 o.put(p+0x2e8,head,head+0x40,0,3)
 for k,lot in enumerate(owned):
  c=o.board['cells'][lot];o.put(head+k*0x20,head+(k+1)*0x20 if k<2 else 0,head+(k-1)*0x20 if k else 0,c['x'],c['y'],0,0,(n+k)%5,0)
  o.put(o.owners+lot*16,p,(n+k)%5)
 o.fl(p+0x28,1000+n*93.25);o.fl(p+0x2c,2000+n*23.75);o.fl(p+0x30,30+n/8);o.fl(p+0x120,99+n/4)
# Inventory location verified by 0x413c10 instructions, not assumed here.
o.call(0x413c10,o.ps[0]);inv0=u.reg_read(UC_X86_REG_EAX)
o.call(0x413c10,o.ps[1]);inv1=u.reg_read(UC_X86_REG_EAX)
for i in range(42):o.put(inv0+4*i,i%4);o.put(inv1+4*i,(i+2)%5)
def snapshot():
 return dict(players=[dict(cash=o.rd(p+0x28),bank=o.rd(p+0x2c),interest=o.rd(p+0x30),walkPoints=o.rd(p+0x120)) for p in o.ps],inventory=[[o.get(inv+4*i) for i in range(42)] for inv in [inv0,inv1]],owners=[o.ps.index(o.get(o.owners+i*16)) for i in lots])
before=snapshot();item,msg=0x10e3000,0x10e3500;o.put(item+0x10c,o.ps[0],o.ps[1]);o.put(msg,0,0,0)
o.call(0x49d146,item,msg);after=snapshot()
assert after['players'][:2]==before['players'][1::-1]
assert after['inventory']==before['inventory'][::-1]
assert after['owners']==[1,1,1,0,0,0,2,2,2,3,3,3]
out=dict(sourceSha256=SHA,scope=__doc__,lots=lots,before=before,after=after)
(ROOT/'tests/fixtures/original-swap.json').write_text(json.dumps(out,indent=2),'utf8');print('Original complete asset transfer, 84 inventory slots and 12 land owners verified')
