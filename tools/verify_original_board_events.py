"""Original event table, reward cycling, fine amounts and rent-pool ledger."""
import json,struct
from verify_original_economy import Oracle,ROOT,SHA,UC_HOOK_CODE,pe
from unicorn.x86_const import *

def main():
    o=Oracle(json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8')));u=o.uc;frame=0x20fe000
    value=0;flags=0;exempt=False
    def stub(uc,address,size,_):
        nonlocal exempt
        if address==0x44483a:exempt=True;uc.emu_stop();return
        sp=uc.reg_read(UC_X86_REG_ESP);result=value if address==0x4821a0 else flags
        uc.reg_write(UC_X86_REG_EAX,result);uc.reg_write(UC_X86_REG_ESP,sp+4);uc.reg_write(UC_X86_REG_EIP,o.get(sp))
    for a in [0x413c80,0x43a2ad,0x4821a0,0x44483a]:u.hook_add(UC_HOOK_CODE,stub,begin=a,end=a)
    def run(start,end):
        u.reg_write(UC_X86_REG_EBP,frame);u.reg_write(UC_X86_REG_ESP,frame-0x200);o.put(frame-0xf0,o.player)
        u.emu_start(start,end,count=10000)
    def fput(a,v):u.mem_write(a,struct.pack('<f',v))
    def fget(a):return struct.unpack('<f',u.mem_read(a,4))[0]
    rewards=[];fines=[];rents=[]
    for next_reward in range(50,451,50):
        for flags in [0,0x800]:
            o.put(0x4c55dc,next_reward);fput(o.player+0x28,1000.25);run(0x4442dc,0x444350)
            rewards.append(dict(next=next_reward,triple=bool(flags),cash=fget(o.player+0x28),after=o.get(0x4c55dc)))
    for value in range(75):
        for flags in [0,0x80000]:
            for multiplier in [1,1.2,3.7]:
                exempt=False;fput(0x4c54bc,multiplier);fput(0x4ca6a4,123.5);fput(o.player+0x28,1000.25);run(0x444595,0x4445f3)
                fines.append(dict(draw=value,multiplier=fget(0x4c54bc),protected=bool(flags),cash=fget(o.player+0x28),pool=fget(0x4ca6a4),exempt=exempt))
    for amount in [0,1,12.5,75.9375,500,-12.5]:
        o.put(frame-0x14,o.player);o.put(frame-0x1c,o.other);fput(frame-0x2c,amount);fput(0x4ca6a0,123.5);fput(o.player+0x28,1000.25);fput(o.other+0x28,500.5)
        run(0x443baa,0x443bfa);rents.append(dict(amount=amount,payer=fget(o.player+0x28),owner=fget(o.other+0x28),pool=fget(0x4ca6a0)))
    events=dict(zip(range(7,16),[hex(v) for v in struct.unpack('<9I',pe.get_data(0x4450a7-0x400000,36))]))
    (ROOT/'tests/fixtures/original-board-events.json').write_text(json.dumps(dict(sourceSha256=SHA,events=events,rewards=rewards,fines=fines,rents=rents),separators=(',',':')),'utf8')
    print(len(rewards),'reward cases;',len(fines),'fine cases;',len(rents),'rent pool cases')
if __name__=='__main__':main()
