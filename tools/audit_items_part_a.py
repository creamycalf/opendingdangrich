import sys,json,re,hashlib,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools/_deps'))
import pefile,capstone
from unicorn import *
from unicorn.x86_const import *
oldfile=next((ROOT/'work').glob('*/Dora/wa.exe'));newfile=ROOT/'work/new-pc-v121/Doraemon.exe';old=pefile.PE(str(oldfile)).get_memory_mapped_image();new=pefile.PE(str(newfile)).get_memory_mapped_image();md=capstone.Cs(3,4);md.detail=True
cache={}
def mask(data,addr):
 out=list(data)
 for ins in md.disasm(data,addr):
  for off,size in [(ins.imm_offset,ins.imm_size),(ins.disp_offset,ins.disp_size)]:
   val=int.from_bytes(ins.bytes[off:off+size],'little')
   if size==4 and (ins.mnemonic=='call' or 0x400000<=val<0x500000):
    for j in range(ins.address-addr+off,ins.address-addr+off+size):out[j]=None
 return out
def locate(addr):
 if addr in cache:return cache[addr]
 for size in [60,40,24]:
  pat=b''.join(b'.' if x is None else re.escape(bytes([x])) for x in mask(old[addr-0x400000:addr-0x400000+size],addr))
  hits=[m.start()+0x400000 for m in re.finditer(pat,new,re.S)]
  if len(hits)==1:cache[addr]=hits[0];return hits[0]
 return None
# Constructor execution on new image; only allocation/free/debug CRT are substituted.
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0,0x1000);u.mem_map(0x400000,0x100000);u.mem_write(0x400000,new);u.mem_map(0x1000000,0x200000);u.mem_map(0x2000000,0x100000)
heap=0x1100000
rd=lambda a:struct.unpack('<I',u.mem_read(a,4))[0]
def put(a,*v):u.mem_write(a,struct.pack('<'+'I'*len(v),*v))
alloc=[locate(a) for a in [0x48b3a1,0x4a9ab4]];others=[locate(a) for a in [0x48b46c,0x4a914e,0x4a9a62]]
print('primitives',alloc,others)
def hook(uc,a,size,data):
 global heap
 sp=uc.reg_read(UC_X86_REG_ESP);result=0
 if a in alloc:
  n=rd(sp+4);assert 0<n<100000;result=heap;heap+=(n+15)&~15;uc.mem_write(result,bytes(n))
 uc.reg_write(UC_X86_REG_EAX,result);uc.reg_write(UC_X86_REG_EIP,rd(sp));uc.reg_write(UC_X86_REG_ESP,sp+4)
for a in alloc+others:
 assert a;u.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
rows=[];ctors=json.loads((ROOT/'research/original-item-constructors.json').read_text('utf8'))['items']
for id in range(0,14):
 heap=0x1100000;sp=0x20ff000;put(sp,0x10ff020,id);u.reg_write(UC_X86_REG_ESP,sp);u.emu_start(locate(0x48be40),0x10ff020,count=100000)
 assert u.reg_read(UC_X86_REG_EIP)==0x10ff020
 obj=u.reg_read(UC_X86_REG_EAX);vt=rd(obj);fields={hex(o):rd(obj+o) for o in [0x68,0x6c,0x70,0x74,0x78]};methods=[]
 for off,oldAddr in ctors[id]['virtualMethods'].items():
  oa=int(oldAddr,16);na=rd(vt+int(off,16));candidate=locate(oa)
  methods.append({'offset':off,'old':hex(oa),'new':hex(na),'prefixRelocationMatch':candidate==na})
 rows.append({'id':id,'vtable':hex(vt),'fields':fields,'virtualMethods':methods})
files=['research/itemsFlightSmallGhost.json','research/specialPropertyRules.json','research/attackRedirect.json','research/cloneGates.json','research/resumed-rentFull.json','rea-analysis/wa.exe-ec35d2f7d4b2e39f/evidence/economic-item-details.json']
refs=[]
def walk(v,file):
 if isinstance(v,dict):
  if 'pseudocode' in v and 'address'in v:
   oa=int(v['address'],16);na=locate(oa);refs.append({'file':file,'old':hex(oa),'new':hex(na) if na else None,'prefixOnly':True})
  else:
   for q in v.values():walk(q,file)
 elif isinstance(v,list):
  for q in v:walk(q,file)
for f in files:
 if (ROOT/f).exists():walk(json.loads((ROOT/f).read_text('utf8')),f)
result={'sourceSha256':hashlib.sha256(newfile.read_bytes()).hexdigest(),'oldSha256':hashlib.sha256(oldfile.read_bytes()).hexdigest(),'nativeFactory':hex(locate(0x48be40)),'substitutions':{'allocation':list(map(hex,alloc)),'freeDebug':list(map(hex,others))},'items':rows,'evidenceMappings':refs,'limitations':'Prefix relocation match establishes entry correspondence only, not whole-function semantic equivalence.'}
(ROOT/'docs/audits/items-2026-11-07-part-a-native.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf8')
print('native constructors',len(rows),'mappings',len(refs),'unmapped',sum(x['new']is None for x in refs));print([(r['id'],r['fields']) for r in rows])

# Execute the native compare-and-branch for every RNG output, no substituted branch.
ins=list(md.disasm(new[0x495b30-0x400000:0x496092-0x400000],0x495b30))
cmp=next(i for i in ins if i.mnemonic=='cmp' and i.op_str=='eax, 0xfa');j=next(i for i in ins if i.address==cmp.address+cmp.size)
assert j.mnemonic=='jle'
target=int(j.op_str,16);fall=j.address+j.size;samples=[]
for draw in range(1000):
 u.reg_write(UC_X86_REG_EAX,draw);u.emu_start(cmp.address,0,count=2);end=u.reg_read(UC_X86_REG_EIP)
 assert end in [target,fall];samples.append({'draw':draw,'lucky':end==fall})
assert sum(r['lucky'] for r in samples)==749
result['luckyShot']={'compare':hex(cmp.address),'jump':hex(j.address),'goodTarget':hex(fall),'badTarget':hex(target),'samples':samples,'scope':'exact native cmp/jle; RNG output injected EAX; visual code not executed'}
(ROOT/'docs/audits/items-2026-11-07-part-a-native.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf8')
print('native lucky shot: 749 good / 251 bad')
