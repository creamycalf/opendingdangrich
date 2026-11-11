"""Read-only local executable startup evidence. Does not patch or execute files."""
from pathlib import Path
import sys, json, re
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/_deps'))
import pefile
from capstone import Cs, CS_ARCH_X86, CS_MODE_32
source=next((ROOT/'work').glob('*/Dora/wa.exe'))
pe=pefile.PE(str(source)); data=source.read_bytes(); base=pe.OPTIONAL_HEADER.ImageBase
md=Cs(CS_ARCH_X86,CS_MODE_32)
md.skipdata=True
imports={}
for entry in pe.DIRECTORY_ENTRY_IMPORT:
    for f in entry.imports:
        if f.name: imports[f.address]=f.name.decode()
interesting={a:n for a,n in imports.items() if re.search('Reg|File|Directory|ExitProcess|MessageBox|CreateWindow|DirectDraw',n)}
strings=[]
for m in re.finditer(rb'[\x20-\x7e]{5,}',data):
    s=m.group().decode()
    if re.search(r'Gameone|Dora|Application|\.dat|\.exe|registry|error|DirectDraw',s,re.I):
        try: va=base+pe.get_rva_from_offset(m.start())
        except Exception: continue
        strings.append({'va':hex(va),'text':s})
refs=[]
for sec in pe.sections:
    if not sec.Characteristics&0x20000000: continue
    instructions=list(md.disasm(sec.get_data(),base+sec.VirtualAddress))
    for i,ins in enumerate(instructions):
        targets=[n for a,n in interesting.items() if hex(a) in ins.op_str]
        if targets:
            refs.append({'api':targets,'at':hex(ins.address),'context':[f'{x.address:08x} {x.mnemonic} {x.op_str}' for x in instructions[max(0,i-5):i+5]]})
entry=base+pe.OPTIONAL_HEADER.AddressOfEntryPoint
report={'source':str(source),'entry':hex(entry),'entryDisassembly':[f'{i.address:08x} {i.mnemonic} {i.op_str}' for i in md.disasm(pe.get_data(entry-base,240),entry)],'imports':{hex(k):v for k,v in interesting.items()},'strings':strings,'references':refs}
report['winMainDisassembly']=[f'{i.address:08x} {i.mnemonic} {i.op_str}' for i in md.disasm(pe.get_data(0x455468-base,0x380),0x455468)]
out=ROOT/'research/startup-audit.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'entry':hex(entry),'strings':strings,'referenceCount':len(refs),'report':str(out)},ensure_ascii=False,indent=2))
