from verify_original_economy import pe
from capstone import Cs,CS_ARCH_X86,CS_MODE_32,CS_OP_IMM
import sys
value=int(sys.argv[1],0);md=Cs(CS_ARCH_X86,CS_MODE_32);md.detail=True;md.skipdata=True
for section in pe.sections:
 if not section.Characteristics&0x20000000:continue
 for ins in md.disasm(section.get_data(),0x400000+section.VirtualAddress):
  if ins.id and any(o.type==CS_OP_IMM and o.imm==value for o in ins.operands):print(hex(ins.address),ins.mnemonic,ins.op_str)
