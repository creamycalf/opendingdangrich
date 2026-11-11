"""Read-only PE instruction matching for the fourteen middle item implementations.
Absolute image references and relative call/jump displacement are masked only for
locating candidates; full operands and target addresses are retained for review.
"""
from pathlib import Path
import sys,json,hashlib,re,struct
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools/_deps'))
import pefile
from capstone import Cs,CS_ARCH_X86,CS_MODE_32
old=next((ROOT/'work').glob('*/Dora/wa.exe')).read_bytes();new=(ROOT/'work/new-pc-v121/Doraemon.exe').read_bytes()
images=[pefile.PE(data=b).get_memory_mapped_image() for b in (old,new)]
md=Cs(CS_ARCH_X86,CS_MODE_32);md.detail=True
def instructions(image,address,size=160):return list(md.disasm(image[address-0x400000:address-0x400000+size],address))
def pattern(address):
 data=bytearray();mask=[]
 for i in instructions(images[0],address):
  start=len(data);data.extend(i.bytes);mask.extend([True]*i.size)
  if i.imm_size and (i.mnemonic.startswith('j') or i.mnemonic=='call' or any(0x400000<=o.imm<0x500000 for o in i.operands if o.type==2)):
   for k in range(i.imm_offset,i.imm_offset+i.imm_size):mask[start+k]=False
  if i.disp_size and 0x400000<=i.disp<0x500000:
   for k in range(i.disp_offset,i.disp_offset+i.disp_size):mask[start+k]=False
  if len(data)>=70 or i.mnemonic.startswith('ret'):break
 return b''.join(re.escape(bytes([b])) if m else b'.' for b,m in zip(data,mask))
def match(address):
 hits=[0x400000+m.start() for m in re.finditer(pattern(address),images[1],re.S)]
 return hits
catalog=json.loads((ROOT/'research/original-item-constructors.json').read_text('utf8'))['items']
addresses={0x48be40,0x48dadf,0x48db23,0x438af6,0x438cf9,0x4438fb,0x4548a0,0x48d927,0x41652d,0x49a664,0x49a1ae}
for item in catalog[14:28]:addresses.update(int(a,16) for a in item['virtualMethods'].values())
rows=[]
for a in sorted(addresses):
 hits=match(a);row=dict(old=hex(a),candidates=[hex(x) for x in hits]);
 if len(hits)==1:
  row['oldInstructions']=[f'{i.address:x}: {i.mnemonic} {i.op_str}' for i in instructions(images[0],a,500)]
  row['newInstructions']=[f'{i.address:x}: {i.mnemonic} {i.op_str}' for i in instructions(images[1],hits[0],500)]
 rows.append(row)
out=dict(oldSha256=hashlib.sha256(old).hexdigest(),newSha256=hashlib.sha256(new).hexdigest(),scope=__doc__,items=catalog[14:28],matches=rows)
if __name__=='__main__':
 from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
 from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_ECX
 vm=Uc(UC_ARCH_X86,UC_MODE_32);vm.mem_map(0,0x1000);vm.mem_map(0x400000,0x100000);vm.mem_write(0x400000,images[1]);vm.mem_map(0x1000000,0x200000);vm.mem_map(0x2000000,0x100000)
 heap=[0x1100000]
 def get(a):return struct.unpack('<I',vm.mem_read(a,4))[0]
 def put(a,*v):vm.mem_write(a,struct.pack('<'+'I'*len(v),*v))
 def primitive(u,a,size,_):
  sp=getreg=vm.reg_read(UC_X86_REG_ESP);result=0
  if a in [0x48cd91,0x4ac674]:
   count=get(sp+4);assert 0<count<100000;result=heap[0];heap[0]+=(count+15)&~15;vm.mem_write(result,bytes(count))
  vm.reg_write(UC_X86_REG_EAX,result);vm.reg_write(UC_X86_REG_EIP,get(sp));vm.reg_write(UC_X86_REG_ESP,sp+4)
 for a in [0x48cd91,0x4ac674,0x48ce5c,0x4abd0e,0x4ac622]:vm.hook_add(UC_HOOK_CODE,primitive,begin=a,end=a)
 def call(a,obj,*args):
  put(0x20ff000,0x10ff020,*args);vm.reg_write(UC_X86_REG_ESP,0x20ff000);vm.reg_write(UC_X86_REG_ECX,obj);vm.emu_start(a,0x10ff020,count=100000);assert vm.reg_read(UC_X86_REG_EIP)==0x10ff020;return vm.reg_read(UC_X86_REG_EAX)
 native=[]
 for number in range(14,28):
  obj=call(0x48d830,0,number);vt=get(obj);methods={hex(o):hex(get(vt+o)) for o in range(0,0x74,4)}
  masks=[]
  for base in [0,0xfff,0xffffffff,*[1<<b for b in range(32)]]:
   put(0x10fe000,base);call(int(methods['0x38'],16),obj,0x10fe000);masks.append(dict(base=base,after=get(0x10fe000)))
  native.append(dict(id=number,vtable=hex(vt),duration=get(obj+0x70),mask=hex(get(obj+0x74)),value=hex(get(obj+0x78)),methods=methods,masks=masks))
 out['newFactoryExecution']=native
 state={};donors=[]
 def query(u,a,size,_):
  sp=u.reg_read(UC_X86_REG_ESP)
  result=state[{0x4390fe:'alive',0x413fd0:'sleep',0x413f30:'flags'}[a]]
  u.reg_write(UC_X86_REG_EAX,result);u.reg_write(UC_X86_REG_EIP,get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
 for a in [0x4390fe,0x413fd0,0x413f30]:vm.hook_add(UC_HOOK_CODE,query,begin=a,end=a)
 obj=call(0x48d830,0,26);put(obj+0x124,0)
 for alive in [0,1]:
  for sleep in [0,1]:
   for dwarf in [0,1]:
    for nobita in [0,1]:
     for shizuka in [0,1]:
      state.update(alive=alive,sleep=sleep,flags=0x1000 if dwarf else 0)
      # stage 0 has no capability calls; character bits cannot influence it.
      put(obj+0x10c,0x10d0000);put(0x10d0000+0x2f8,0x10000000 if nobita else 0);put(0x10d1000+0x2f8,0x20000000 if shizuka else 0)
      donors.append(dict(alive=bool(alive),sleep=bool(sleep),dwarf=bool(dwarf),nobita=bool(nobita),shizuka=bool(shizuka),allowed=bool(call(0x49c8b4,obj,0x10d1000))))
 out['newSleepDonorExecution']=donors
 method_pairs={}
 for olditem,newitem in zip(catalog[14:28],native):
  for slot,olda in olditem['virtualMethods'].items():method_pairs[int(olda,16)]=int(newitem['methods'][slot],16)
 def body(image,a):
  result=[]
  for i in instructions(image,a,8000):
   result.append(i)
   if i.mnemonic.startswith('ret'):break
  return result
 def normalized(i):return i.mnemonic+' '+re.sub(r'0x[0-9a-f]+',lambda m:'IMAGE' if 0x400000<=int(m[0],16)<0x500000 else m[0],i.op_str)
 comparisons=[]
 for olda,newa in sorted(method_pairs.items()):
  oi,ni=body(images[0],olda),body(images[1],newa)
  comparisons.append(dict(old=hex(olda),new=hex(newa),scope='linear entry through first return, not a complete CFG',sameInstructionShape=[normalized(i) for i in oi]==[normalized(i) for i in ni],oldInstructions=[f'{i.address:x}: {i.mnemonic} {i.op_str}' for i in oi],newInstructions=[f'{i.address:x}: {i.mnemonic} {i.op_str}' for i in ni]))
 out['vtableVerifiedComparisons']=comparisons
 (ROOT/'research/items-b-native-match-20261107.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),'utf8')
 print(json.dumps([{k:v for k,v in r.items() if k not in ['methods','masks']} for r in native]))
