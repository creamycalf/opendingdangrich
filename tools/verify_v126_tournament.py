"""v1.26 original per-event arithmetic, podium and tournament result stage, no rendering."""
import hashlib, json, struct, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools/_deps"))
import pefile
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP, UC_X86_REG_EBP, UC_X86_REG_EIP
src = (ROOT/"work/new-pc-v121/Doraemon.exe").read_bytes()
sha = hashlib.sha256(src).hexdigest()
assert sha == 'b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1'
pe=pefile.PE(data=src)
u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x100000)
u.mem_write(0x400000,pe.get_memory_mapped_image())
u.mem_map(0x200000,0x10000)
parent,bp = 0x202000,0x208000
def put(a,v): u.mem_write(a,struct.pack('<I',v))
def get(a): return int.from_bytes(u.mem_read(a,4),'little')
def run(start,end):
    u.reg_write(UC_X86_REG_EBP,bp)
    u.reg_write(UC_X86_REG_ESP,bp-0x1000)
    u.emu_start(start,end,count=5000)
    assert u.reg_read(UC_X86_REG_EIP)==end
run(0x458ecf,0x458ed9)
assert get(0x4c84d0)==0x3f800000
cases=[(0x41dfa3,0x41dfca,0x54,0x28),(0x42051a,0x420541,0x14,8),
       (0x4230eb,0x42314d,0x30,0x24),(0x424664,0x42468b,0x10,4),
       (0x426703,0x426765,0x30,0x24),(0x428722,0x428749,0x10,4),
       (0x42a3c2,0x42a3e9,8,4),(0x42beb8,0x42bf06,0x10,8)]
rows=[]
for game,(start,end,ptr,slot) in enumerate(cases):
    players=[]
    u.mem_write(parent,bytes(0x300))
    put(bp-ptr,parent)
    for i in range(4):
        score=[0,2,5,9][i]
        raw=[0,19,200,723][i] if game in (2,4) else [0,1,3,8][i] if game==7 else 0
        put(parent+0x38+4*i,score)
        put(parent+0x48+4*i,raw)
        put(parent+0xdc+4*i,1)
        put(bp-slot,i)
        run(start,end)
        p=dict(score=score)
        if game in (2,4): p['bonus']=raw
        if game==7: p['collected']=raw
        players.append(p)
    session=dict(id=game,players=players)
    if game in (2,4):
        session['finishOrder']=[2,1,3]
        for i,seat in enumerate(session['finishOrder']): put(parent+0x118+4*i,seat)
        begin,finish=(0x423176,0x4231e6) if game==2 else (0x42678e,0x4267ee)
        run(begin,finish)
    put(bp-0x88,parent)
    put(parent+0xec,1)
    run(0x419fe8,0x41a05e)
    rows.append(dict(session=session,points=[get(parent+0x38+4*i)+get(parent+0x48+4*i) for i in range(4)]))
result=dict(sha256=sha,boundary="Runs unmodified conversion, race podium and common result arithmetic on synthetic player scores. No graphics or OS.",blocks=[[hex(a),hex(b)] for a,b,_,_ in cases],rows=rows)
(ROOT/'tests/fixtures/pc-v126-tournament.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print([r['points'] for r in rows])
