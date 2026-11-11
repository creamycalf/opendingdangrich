"""Extract the v1.26 hidden character alone, and execute its original unlock and inventory slices."""
from pathlib import Path
import hashlib
import json
import struct
import sys

from extract_assets import archive, decompress, pcx, png, sprite

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools/_deps"))
import capstone
import pefile
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_ESP, UC_X86_REG_EIP

SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("D:/Game/old/Doraemon/Doraemon")
OUT = ROOT / "research/v126-yellow"
OUT.mkdir(exist_ok=True)
binary = (SOURCE / "Doraemon.exe").read_bytes()
digest = hashlib.sha256(binary).hexdigest()
assert digest == "b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1"
memory = pefile.PE(data=binary).get_memory_mapped_image()
vm = Uc(UC_ARCH_X86, UC_MODE_32)
vm.mem_map(0x400000, 0x100000)
vm.mem_write(0x400000, memory)
vm.mem_map(0x200000, 0x10000)

def put(address, value):
    vm.mem_write(address, struct.pack("<I", value))

def run(start, stop):
    vm.reg_write(UC_X86_REG_ESP, 0x208000)
    vm.reg_write(UC_X86_REG_EBP, 0x207000)
    vm.emu_start(start, stop, count=2000)
    assert vm.reg_read(UC_X86_REG_EIP) == stop

# Stub only the two show/hide renderer calls in the successful branch.
vm.mem_write(0x487966, bytes.fromhex("c20800"))
unlock_cases = []
for records, flags, expected in [
    ([0]*6, 0, False), ([1]*6, 0, True), ([1,1,1,1,1,2], 0, False),
    ([0,2,1,1,1,1], 0, False), ([1,2,3,4,5,3], 0, True), ([0]*6, 0x10, True),
    ([0]*6, 8, False)
]:
    for i, value in enumerate(records):
        put(0x4cd798 + 4*i, value)
    put(0x4cae08, flags)
    run(0x467eed, 0x467f9d)
    mask = int.from_bytes(vm.mem_read(0x4cd8f4,4), "little")
    assert mask == (0x80 if expected else 0x88)
    unlock_cases.append(dict(records=records, flags=flags, selectionMask=mask))

player = 0x201000
for loading in (0,1):
    put(0x207000-0x18, player)
    put(0x4cda00, loading)
    vm.mem_write(player+0x44, bytes([0])*168)
    run(0x4519e3, 0x451a2a)
    assert struct.unpack("<ff", vm.mem_read(player+0x28,8)) == (1000,1000)
    assert list(struct.unpack("<42I", vm.mem_read(player+0x44,168))) == [1-loading]*42

# Constructor contains immediate resource indices stored to fixed offsets.
asm = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_32)
asm.detail = True
poses = {}
for inst in asm.disasm(memory[0x514e7:0x5195f], 0x4514e7):
    if inst.mnemonic == "mov" and inst.operands[0].type == capstone.x86.X86_OP_MEM and inst.operands[1].type == capstone.x86.X86_OP_IMM:
        offset = inst.operands[0].mem.disp - 0x148
        size, local = divmod(offset, 0xd0)
        pose, direction = divmod(local, 16)
        assert 0 <= offset < 0x1a0
        poses.setdefault(size, {}).setdefault(pose, [None]*4)[direction//4] = inst.operands[1].imm
animations, images = {}, {}
assets = {f: (SOURCE/f).read_bytes() for f in ("bitmaps.dat","sprite1.dat","anime.dat")}
bitmaps, sprites, anime = [archive(assets[f]) for f in ("bitmaps.dat","sprite1.dat","anime.dat")]
board_palette = pcx(decompress(bitmaps[1,]))[3]
selection_palette = pcx(decompress(bitmaps[54,]))[3]
for index in range(47,51):
    width,height,rgba,_ = pcx(decompress(bitmaps[index,]))
    png(OUT/f"hud-{index}.png",width,height,rgba)
for index in range(104,108):
    width,height,rgba,_ = pcx(decompress(bitmaps[index,]))
    png(OUT/f"portrait-{index}.png",width,height,rgba)
indices = {i for sizes in poses.values() for row in sizes.values() for i in row}
assert None not in indices
for index in sorted(indices | {337}):
    data = decompress(anime[index,])
    offset,frames,rate,_,count = struct.unpack_from("<5I", data)
    ids = list(struct.unpack_from(f"<{count}I",data,20))
    commands = []
    for pos in range(offset,len(data)-13,14):
        command = struct.unpack_from("<HHhhHHH",data,pos)
        if command[1]==65535:
            break
        commands.append(command)
    animations[index] = dict(frames=frames,rate=rate,sprites=ids,commands=commands)
    # 337 serves both the selection pedestal and the south-facing idle pose.
    # Each scene uses its own palette, so retain both decoded variants.
    for group in (["board", "selection"] if index==337 else ["board"]):
        for item in ids:
            key = f"{group}/{item}"
            if key in images:
                continue
            w,h,hx,hy,rgba = sprite(decompress(sprites[item,]),selection_palette if group=="selection" else board_palette)
            png(OUT/(key+".png"),w,h,rgba)
            images[key] = dict(w=w,h=h,hx=hx,hy=hy)
table = memory[0xc1074+4*16:0xc1074+5*16].strip(b"\0")
keys = {0x22:'G',0x18:'O',3:'2',0x23:'H',0x17:'I',0x20:'D',0x12:'E',0x31:'N',0x2e:'C',0x1e:'A',0x13:'R'}
cheat = ''.join(keys[k] for k in table)
assert cheat == "GO2HIDDENCHAR"
result = dict(exeSHA256=digest,resourceSHA256={f:hashlib.sha256(d).hexdigest() for f,d in assets.items()},
              characterId=6,selectionSlot=3,selectionAnime=337,startingCash=1000,startingDeposit=1000,
              newGameEachItemQuantity=1,hudFirst=47,portraitFirst=104,unlockCases=unlock_cases,
              alternateKeyboardSequence=cheat,poses=poses,animations=animations,images=images)
(OUT/'catalog.json').write_text(json.dumps(result,separators=(',',':')),encoding="utf-8")
print(f"{len(indices)} board animations, {len(images)} sprite images, 7 unlock cases and two inventory slices verified.")
