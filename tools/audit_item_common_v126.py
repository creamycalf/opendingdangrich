"""Execute new-PC item conflict/target callbacks in isolated x86 memory.

No Windows process is launched. Only alloc/free/debug and a one-item linked
list enumerator are substituted. Constructors, query branches, target checks
and capability callbacks run the supplied executable's actual instructions.
This covers single prior effects, not arbitrary multi-effect scheduling.
"""
from pathlib import Path
import sys, json, hashlib, struct, re
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/_deps'))
import pefile, capstone
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
source=ROOT/'work/new-pc-v121/Doraemon.exe'
oldsource=next((ROOT/'work').glob('*/Dora/wa.exe'))
SHA='b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1'
assert hashlib.sha256(source.read_bytes()).hexdigest()==SHA
old=pefile.PE(str(oldsource)).get_memory_mapped_image()
new=pefile.PE(str(source)).get_memory_mapped_image()
md=capstone.Cs(capstone.CS_ARCH_X86,capstone.CS_MODE_32);md.detail=True
mapped={}
def locate(address):
    if address in mapped:return mapped[address]
    for size in [80,60,40,24]:
        data=old[address-0x400000:address-0x400000+size];mask=list(data)
        for ins in md.disasm(data,address):
            for off,n in [(ins.imm_offset,ins.imm_size),(ins.disp_offset,ins.disp_size)]:
                value=int.from_bytes(ins.bytes[off:off+n],'little')
                if n==4 and (ins.mnemonic=='call' or 0x400000<=value<0x500000):
                    for j in range(ins.address-address+off,ins.address-address+off+n):mask[j]=None
        pattern=b''.join(b'.' if b is None else re.escape(bytes([b])) for b in mask)
        hits=[m.start()+0x400000 for m in re.finditer(pattern,new,re.S)]
        if len(hits)==1:mapped[address]=hits[0];return hits[0]
    raise ValueError(f'Cannot uniquely map {address:x}')

u=Uc(UC_ARCH_X86,UC_MODE_32)
for base,size in [(0,0x1000),(0x400000,0x100000),(0x1000000,0x200000),(0x2000000,0x100000)]:u.mem_map(base,size)
u.mem_write(0x400000,new)
def put(a,*values):u.mem_write(a,struct.pack('<'+'I'*len(values),*values))
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
heap=0x1100000;player=0x10d0000;other=0x10d1000;result=0x10d2000
active=0;list_owner=player
alloc=[locate(a) for a in [0x48b3a1,0x4a9ab4]]
free=[locate(a) for a in [0x48b46c,0x4a914e,0x4a9a62]]
first,next_item=[locate(a) for a in [0x41d010,0x454e40]]
def hook(uc,a,size,_):
    global heap
    sp=uc.reg_read(UC_X86_REG_ESP);value=0
    if a in alloc:
        count=get(sp+4);assert 0<count<100000
        value=heap;heap+=(count+15)&~15;assert heap<0x1200000;uc.mem_write(value,bytes(count))
    elif a==first and uc.reg_read(UC_X86_REG_ECX)==list_owner+0xec:value=active
    uc.reg_write(UC_X86_REG_EAX,value);uc.reg_write(UC_X86_REG_EIP,get(sp));uc.reg_write(UC_X86_REG_ESP,sp+4)
for a in alloc+free+[first,next_item]:u.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
def call(a,obj,*args):
    put(0x20ff000,0x10ff020,*args);u.reg_write(UC_X86_REG_ESP,0x20ff000);u.reg_write(UC_X86_REG_ECX,obj)
    u.emu_start(a,0x10ff020,count=100000)
    assert u.reg_read(UC_X86_REG_EIP)==0x10ff020,(hex(a),hex(u.reg_read(UC_X86_REG_EIP)))
    return u.reg_read(UC_X86_REG_EAX)
factory=locate(0x48be40);query=locate(0x43904b);target=locate(0x48d927)
before={i:call(factory,0,i) for i in range(44)}
after={i:call(factory,0,i) for i in range(44)}
constructors=[dict(id=i,duration=get(obj+0x70),mask=get(obj+0x74),value=get(obj+0x78)) for i,obj in before.items()]
conflicts=[]
for old_id,active in before.items():
    for new_id,item in after.items():
        for same in [False,True]:
            for attack in [False,True]:
                put(active+0x10c,player);put(item+0x10c,player if same else other);put(result,0)
                value=call(query,player,item,result,int(attack))
                conflicts.append(dict(old=old_id,new=new_id,sameSource=same,attack=attack,result=value,selectedOld=get(result)==active))
print('Native conflicts',len(conflicts),flush=True)
# The bases below are direct LEA operands at 0x4391b8/0x4391d7 in the
# newly mapped query. Verify the instruction before reading the table.
tables={};table_info={}
for kind,address,base,lea in [('self',0x4c0b9c,0x4c3bac,0x4391b8),('attack',0x4c2400,0x4c5410,0x4391d7)]:
    data=old[address-0x400000:address-0x400000+79*79]
    ins=next(md.disasm(new[lea-0x400000:lea-0x400000+8],lea))
    assert ins.mnemonic=='lea' and ins.operands[1].mem.disp==base
    start=base-0x400000
    tables[kind]=[[new[start+i*79+j] for j in range(44)] for i in range(44)]
    actual=new[start:start+79*79]
    differences=[dict(oldId=i,newId=j,old=data[i*79+j],new=actual[i*79+j]) for i in range(79) for j in range(79) if data[i*79+j]!=actual[i*79+j]]
    table_info[kind]=dict(old=hex(address),new=hex(base),lea=hex(lea),bytes=len(actual),sha256=hashlib.sha256(actual).hexdigest(),differences=differences)
targets=[];list_owner=other
for old_id in [None,*range(44)]:
    active=0 if old_id is None else before[old_id]
    if active:put(active+0x10c,player)
    for attack in [3,4,7,15,17,25,26,27,30,33,35,36,39]:
        for alive in [False,True]:
            for nobita in [False,True]:
                for shizuka in [False,True]:
                    put(player+0x2f8,0x420|(0x10000000 if nobita else 0));put(player+0x2fc,0)
                    put(other+0x2f8,0x420|(0x20000000 if shizuka else 0));put(other+0x2fc,0 if alive else 0x80000000)
                    put(after[attack]+0x10c,player)
                    allowed=bool(call(target,after[attack],other))
                    targets.append(dict(old=old_id,attack=attack,alive=alive,nobita=nobita,shizuka=shizuka,allowed=allowed))
print('Native common target checks',len(targets),flush=True)
out=dict(sourceSha256=SHA,scope=__doc__,entry=dict(factory=hex(factory),conflict=hex(query),target=hex(target)),substitutions=dict(allocation=list(map(hex,alloc)),freeDebug=list(map(hex,free)),singleEffectIterator=list(map(hex,[first,next_item]))),constructors=constructors,tables=tables,tableBytes=table_info,conflicts=conflicts,targets=targets)
(ROOT/'tests/fixtures/v126-item-common.json').write_text(json.dumps(out,separators=(',',':')),'utf8')
