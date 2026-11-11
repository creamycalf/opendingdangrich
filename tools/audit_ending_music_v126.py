"""Execute verified new-PC music call slices, trapping audio API before playback."""
import sys,json,hashlib,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools/_deps'))
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
b=(ROOT/'work/new-pc-v121/Doraemon.exe').read_bytes();sha=hashlib.sha256(b).hexdigest();assert sha=='b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x100000);u.mem_write(0x400000,pefile.PE(data=b).get_memory_mapped_image());u.mem_map(0x200000,0x10000);rows=[];args=[]
def trap(uc,a,size,data):
 global args
 sp=uc.reg_read(UC_X86_REG_ESP);args=list(struct.unpack('<II',uc.mem_read(sp+4,8)));uc.emu_stop()
u.hook_add(UC_HOOK_CODE,trap,begin=0x403f80,end=0x403f80)
for scene,address,expected in [('humanCertificate',0x46f12e,[4,2]),('noHumanWinner',0x473cd5,[6,0]),('minigameResult',0x419e30,[11,0]),('title',0x458f0a,[2,2]),('monthlyResults',0x484987,[10,2])]:
 args=[];u.reg_write(UC_X86_REG_ESP,0x208000);u.emu_start(address,0x403f81,count=10);assert args==expected,(scene,args);rows.append({'scene':scene,'address':hex(address),'track':args[0],'flags':args[1]})
out={'sourceSha256':sha,'scope':__doc__,'rows':rows,'limitations':'Native push/call argument slices only, not full scene execution. Stage identity supported by accompanying Ghidra evidence.'}
(ROOT/'tests/fixtures/v126-ending-music.json').write_text(json.dumps(out,indent=2),'utf8');print(rows)
