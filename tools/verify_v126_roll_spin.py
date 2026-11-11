"""Execute the v1.26 roll handler, sampling the face after each update message."""
from pathlib import Path
import hashlib
import json
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools/_deps"))
import pefile
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_ECX, UC_X86_REG_EAX

SHA = "b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1"
PLAYER, MESSAGE, OUTPUT, STACK, STOP = 0x201000, 0x202000, 0x203000, 0x208000, 0x200000
ENTRY, FACE = 0x43c8eb, 0x4cc418


def run_case(image, limit, draw, start_direction=0, ranges=None, animated=True):
    vm = Uc(UC_ARCH_X86, UC_MODE_32)
    vm.mem_map(0x400000, 0x100000)
    vm.mem_write(0x400000, image)
    vm.mem_map(0x200000, 0x10000)
    def put(address, value):
        vm.mem_write(address, struct.pack("<I", value))
    def get(address):
        return int.from_bytes(vm.mem_read(address, 4), "little")
    # Return values and thiscall cleanup for external callbacks. List traversal
    # supplies no markers to render. A range of zero means no route.
    for addr, value, cleanup in [(0x413f30, 0, 0), (0x439744, 0, 28), (0x4551f0, 1, 0),
                                 (0x480c60, 0, 0), (0x4896d9, -1, 0), (0x47a286, 0, 4),
                                 (0x4382ef, 0, 4)]:
        vm.mem_write(addr, b"\xb8"+struct.pack("<I", value & 0xffffffff)+b"\xc2"+struct.pack("<H", cleanup))
    if ranges is not None:
        # Read the *actual* endpoint-enumerator call arguments, then feed its
        # subsequent list-size query. The engine handles both reversals itself.
        valid = False
        def enumerate_endpoint(uc, addr, size, data):
            nonlocal valid
            sp = uc.reg_read(UC_X86_REG_ESP)
            valid = get(sp+16) <= ranges[get(sp+12)]
        def count_endpoints(uc, addr, size, data):
            uc.reg_write(UC_X86_REG_EAX, int(valid))
        vm.mem_write(0x4551f0, b"\xc3")
        vm.hook_add(UC_HOOK_CODE, enumerate_endpoint, begin=0x439744, end=0x439744)
        vm.hook_add(UC_HOOK_CODE, count_endpoints, begin=0x4551f0, end=0x4551f0)
    def invoke(end):
        vm.mem_write(STACK, struct.pack("<II", STOP, MESSAGE))
        vm.reg_write(UC_X86_REG_ESP, STACK)
        vm.reg_write(UC_X86_REG_ECX, PLAYER)
        vm.emu_start(ENTRY, end, count=5000)
        assert vm.reg_read(UC_X86_REG_EIP)==end
    # Choose a real RNG seed with the requested bounded output; handler
    # executes its own 0x483100, including state advance.
    bound = 12 if animated else limit
    bounded = (draw*32767 + bound-1)//bound
    put(0x4ca2a4, ((bounded<<16)-2531011)*pow(214013,-1,2**32)%(2**32))
    put(PLAYER+0x128, limit)
    put(PLAYER+0x13c, start_direction)
    put(MESSAGE+4, 1)
    put(MESSAGE+0x18, OUTPUT)
    put(0x4cda34, int(animated))
    put(0x4cae08, 0)
    invoke(0x43c996)  # remainder of init only obtains resources / prepares scene
    put(MESSAGE+4, 0)
    faces, directions = [], []
    for _ in range(80):
        invoke(STOP)
        faces.append(get(FACE))
        directions.append(get(PLAYER+0x13c))
        if animated and len(faces)==1:
            assert get(0x4cc498)==3+draw
        if get(MESSAGE+8)==1:
            assert get(OUTPUT)==faces[-1]
            row = dict(limit=limit, draw=draw, faces=faces, result=get(OUTPUT))
            if ranges is not None:
                row.update(startDirection=start_direction, ranges=ranges, directions=directions,
                           direction=directions[-1], nextMessage=get(MESSAGE+12))
            return row
    raise ValueError("roll did not finish")


def main():
    source=(ROOT/"work/new-pc-v121/Doraemon.exe").read_bytes()
    assert hashlib.sha256(source).hexdigest()==SHA
    image=pefile.PE(data=source).get_memory_mapped_image()
    rows=[run_case(image,limit,draw) for limit in (3,4,6) for draw in range(12)]
    restricted=[run_case(image,limit,draw,direction,ranges) for limit,draw,direction,ranges in [
        (6,0,0,[0,6,0,0]), (4,5,3,[0,0,4,0]), (3,8,2,[0,0,0,0]),
        (4,0,1,[0,1,0,0]), (6,9,0,[2,0,0,0])]]
    instant=[run_case(image,limit,draw,direction,ranges,False)
             for limit in (3,4,6) for draw in range(limit)
             for direction,ranges in [(0,[6,6,6,6]),(1,[0,2,0,0]),(3,[0,0,0,0])]]
    out=dict(sha256=SHA,entry=hex(ENTRY),clock="One original handler update per entry; includes the final result message.",
             boundary="Original options bit 0 set/clear, no debug key; endpoint availability supplied, rendering and audio stubbed.",rows=rows,restricted=restricted,instant=instant)
    path=ROOT/"tests/fixtures/pc-v126-roll-spin.json"
    path.write_text(json.dumps(out,separators=(",",":"))+"\n",encoding="utf-8")
    print(len(rows), "trajectories", path)


if __name__=="__main__":
    main()
