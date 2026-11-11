"""Disassemble original EXE from an exact known instruction boundary."""
import argparse
from verify_original_economy import pe
from capstone import Cs, CS_ARCH_X86, CS_MODE_32
parser=argparse.ArgumentParser()
parser.add_argument('start',type=lambda s:int(s,0))
parser.add_argument('end',type=lambda s:int(s,0))
args=parser.parse_args()
assert 0x400000<=args.start<args.end<=0x4b6000
for i in Cs(CS_ARCH_X86,CS_MODE_32).disasm(pe.get_data(args.start-0x400000,args.end-args.start),args.start):
    print(f'{i.address:08x} {i.mnemonic} {i.op_str}')
