from verify_original_economy import pe
from capstone import Cs,CS_ARCH_X86,CS_MODE_32
from collections import deque
import sys
value=int(sys.argv[1],0);needle='push '+(hex(value) if value>9 else str(value));md=Cs(CS_ARCH_X86,CS_MODE_32);md.skipdata=True
for section in pe.sections:
 if not section.Characteristics&0x20000000:continue
 prev=deque(maxlen=6)
 for ins in md.disasm(section.get_data(),0x400000+section.VirtualAddress):
  prev.append(f'{ins.address:x} {ins.mnemonic} {ins.op_str}')
  if ins.mnemonic=='call' and ins.op_str in ['0x43a4d4','0x43a529','0x43a57c'] and any(x.endswith(needle) for x in prev):print('\n'.join(prev))
