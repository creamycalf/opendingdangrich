from verify_original_economy import ROOT,pe
from capstone import Cs,CS_ARCH_X86,CS_MODE_32
import json
md=Cs(CS_ARCH_X86,CS_MODE_32)
for address in json.loads((ROOT/'research/capability-calls.json').read_text()):
 a=int(address,16)+5
 print(address, '; '.join(f'{i.address:x} {i.mnemonic} {i.op_str}' for i in list(md.disasm(pe.get_data(a-0x400000,36),a))[:7]))
