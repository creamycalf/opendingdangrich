"""Regenerate the bounded RNG fixture from the v1.26 PE (no host EXE launch).

Use PYTHONPATH=tools/_deps; the input is the verified workspace copy.
"""
import hashlib
import json
import struct
from pathlib import Path

import pefile
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_ESP

root = Path(__file__).resolve().parents[1]
source = (root / "work/new-pc-v121/Doraemon.exe").read_bytes()
sha = hashlib.sha256(source).hexdigest()
if sha != "b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1":
    raise ValueError("This fixture requires the v1.26 executable")
vm = Uc(UC_ARCH_X86, UC_MODE_32)
vm.mem_map(0x400000, 0x100000)
vm.mem_write(0x400000, pefile.PE(data=source).get_memory_mapped_image())
vm.mem_map(0x200000, 0x10000)
rows = []
seeds = [0, 1, 0xffffffff, 123456789]
# Choose inputs that hit the first and last two possible 15-bit outputs.
seeds += [((v << 16) - 2531011) * pow(214013, -1, 2**32) % 2**32
          for v in (0, 1, 32766, 32767)]
for seed in seeds:
    for n in [1, 3, 4, 6, 8, 12, 22, 25, 100, 3500]:
        vm.mem_write(0x4ca2a4, struct.pack("<I", seed))
        vm.mem_write(0x208000, struct.pack("<II", 0x200000, n))
        vm.reg_write(UC_X86_REG_ESP, 0x208000)
        vm.emu_start(0x483100, 0x200000, count=200)
        rows.append([seed, n, vm.reg_read(UC_X86_REG_EAX),
                     int.from_bytes(vm.mem_read(0x4ca2a4, 4), "little")])
(root / "tests/fixtures/pc-v126-random.json").write_text(json.dumps(
    dict(sha256=sha, entry="0x483100", rows=rows)), encoding="utf-8")
