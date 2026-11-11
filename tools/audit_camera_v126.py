"""New-PC actual selection callbacks with explicit UI/camera notification stubs.
Runs native factories, capability aggregation, conflict and attack gates.
"""
from pathlib import Path
exec((Path(__file__).with_name('audit_item_common_v126.py')).read_text('utf8').split('conflicts=[]')[0].replace('alloc+free+[first,next_item]','alloc+free'))
third=0x10d3000;selected=other;camera=call(factory,0,7);consumed=False
for p in [player,other,third]:put(p,0x10e4000);put(p+0x2f8,0xfff);put(p+0x2fc,0)
put(0x10e4000+8,0x10fe400);u.mem_write(0x10fe400,b'\x31\xc0\xc3')
addresses={}
for oldaddr in [0x44dfea,0x43a4d4,0x43a529,0x48d454,0x48da1c,0x43b0c9,0x4821a0]:
 try:addresses[oldaddr]=locate(oldaddr)
 except ValueError:print('UNMAPPED',hex(oldaddr))
print({hex(a):hex(b) for a,b in addresses.items()})
for id in [3,4,7,15,17,25,26,27,30,33,35,36,39]:print(id,hex(get(get(after[id]))))

addresses[0x48da1c]=0x48f40c
rev={v:k for k,v in addresses.items()};effects={};cursors={}
def stub(uc,a,size,data):
 global consumed
 sp=uc.reg_read(UC_X86_REG_ESP);ecx=uc.reg_read(UC_X86_REG_ECX);value=0;cleanup=0;k=rev.get(a)
 if a in [first,next_item]:
  seq=effects.get(ecx-0xec,[])
  if a==first:cursors[ecx]=0
  else:cursors[ecx]=cursors.get(ecx,0)+1
  index=cursors[ecx];value=seq[index] if index<len(seq) else 0
 elif k==0x44dfea:
  cleanup=16
  if get(sp+4)==0:put(get(sp+8),selected);value=1
 elif k==0x43a4d4:cleanup=4;value=int(ecx==selected and get(sp+4)==7)
 elif k==0x43a529:cleanup=4;value=camera
 elif k==0x48d454:cleanup=4
 elif k==0x43b0c9:cleanup=4;consumed=True
 elif k==0x4821a0:value=999
 uc.reg_write(UC_X86_REG_EAX,value);uc.reg_write(UC_X86_REG_EIP,get(sp));uc.reg_write(UC_X86_REG_ESP,sp+4+cleanup)
for a in list(rev)+[first,next_item]:u.hook_add(UC_HOOK_CODE,stub,begin=a,end=a)
rows=[]
ids=[3,4,7,15,17,25,26,27,30,33,35,36,39]
for id in ids:
 for statuses in [[],[1],[19],[7],[35],[39],[8,19],[19,8],[7,35],[35,7]]:
  for same in [False,True]:
   for dest in [0,1,2]:
    for same_donor in ([False,True] if id==26 else [False]):
     for p in [player,other,third]:put(p+0x2f8,0xfff);put(p+0x2fc,0);put(p+0x114,0)
     destination=[player,other,third][dest];obj=after[id];consumed=False;cursors={};effects={destination:[before[x]for x in statuses]}
     for x in statuses:put(before[x]+0x10c,player if same else other)
     put(camera+0x110,destination);put(camera+0x10c,player if same and dest==1 and 7 in statuses else other);effects[selected]=[camera if x==before[7] else x for x in effects.get(selected,[])];
     if camera not in effects[selected]:effects[selected].append(camera)
     put(obj+0x10c,player);put(obj+0x124,1,destination if same_donor else 0x10d4000);put(obj+0x110,0);put(obj+0x12c,0)
     msg=0x10e5000;put(msg,0,0,0,0)
     call(get(get(obj)),obj,msg)
     actual=get(obj+(0x12c if id==26 else 0x110))
     rows.append(dict(id=id,statuses=statuses,sameSource=same,destination=dest,sameDonor=same_donor,consumed=consumed,actual=[player,other,third].index(actual) if actual in [player,other,third] else hex(actual)))
print('native reflection',len(rows))
out={'sourceSha256':SHA,'scope':__doc__,'substitutions':{hex(a):hex(b)for a,b in addresses.items()},'rows':rows}
(ROOT/'tests/fixtures/v126-camera.json').write_text(json.dumps(out,separators=(',',':')),'utf8')

for a in [0x445824,0x44ea0d]:
 try:print('missile',hex(a),hex(locate(a)))
 except ValueError:print('unmapped missile',hex(a))

missiles=[];put(0x10e4000+0x84,0x44ed7e)
for dest in [0,1,2]:
 for alive in [False,True]:
  for statuses in [[],[19],[7],[1,7],[7,19]]:
   for nobita in [False,True]:
    for shizuka in [False,True]:
     destination=[player,other,third][dest];consumed=False;cursors={}
     effects={destination:[before[x]for x in statuses]}
     effects[selected]=[camera if x==before[7] else x for x in effects.get(selected,[])]
     if camera not in effects[selected]:effects[selected].append(camera)
     for p in [player,other,third]:put(p+0x2f8,0xfff);put(p+0x2fc,0);put(p+0x114,0)
     put(destination+0x2fc,0 if alive else 0x80000000)
     put(player+0x2f8,0xfff|(0x10000000 if nobita else 0));put(destination+0x2f8,get(destination+0x2f8)|(0x20000000 if shizuka else 0))
     put(camera+0x110,destination);put(camera+0x10c,other)
     put(msg,0,0,0,0);put(0x20ff000,0x10ff020,msg);u.reg_write(UC_X86_REG_ESP,0x20ff000);u.reg_write(UC_X86_REG_ECX,player)
     u.emu_start(0x445ae6,0x445bf8,count=100000);assert u.reg_read(UC_X86_REG_EIP)==0x445bf8
     actual=get(u.reg_read(UC_X86_REG_EBP)-4)
     missiles.append(dict(destination=dest,alive=alive,statuses=statuses,nobita=nobita,shizuka=shizuka,actual=[player,other,third].index(actual),consumed=consumed))
out['missiles']=missiles;out['missileRange']=['0x445ae6','0x445bf8'];out['missileGate']='0x44ed7e'
(ROOT/'tests/fixtures/v126-camera.json').write_text(json.dumps(out,separators=(',',':')),'utf8');print('native missile',len(missiles))
