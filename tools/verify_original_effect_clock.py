"""Run original turn-clock instruction paths and real item tick callbacks.

Only UI refresh, list enumeration and expired-object cleanup are substituted.
The flag test/clear, counter decrement and air-gun wake callback run original
instructions. Does not establish target eligibility or attack interactions.
"""
import json
from verify_original_economy import Oracle, ROOT, SHA, UC_HOOK_CODE
from unicorn.x86_const import *


def sample(item_id, remaining, pending, repeats):
    board=json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8'))
    oracle=Oracle(board);u=oracle.uc;stack,end=0x20ff000,0x10ff020
    oracle.put(stack,end,item_id);u.reg_write(UC_X86_REG_ESP,stack)
    u.emu_start(0x48be40,end,count=100000)
    item=u.reg_read(UC_X86_REG_EAX)
    oracle.put(item+0x70,remaining);oracle.put(item+0x110,oracle.player)
    oracle.put(oracle.player+0x2fc,0x10 if pending else 0)
    events=[];expired=False
    def hook(uc,address,size,_):
        nonlocal expired
        if address==0x43a03e:
            expired=True;events.append('expired');uc.reg_write(UC_X86_REG_EIP,0x43a0a4);return
        sp=uc.reg_read(UC_X86_REG_ESP);ecx=uc.reg_read(UC_X86_REG_ECX)
        result=0
        if address==0x41d010 and ecx==oracle.player+0xec and not expired:result=item
        if address==0x438cf9:events.append('wake')
        uc.reg_write(UC_X86_REG_EAX,result)
        uc.reg_write(UC_X86_REG_EIP,oracle.get(sp));uc.reg_write(UC_X86_REG_ESP,sp+4)
    for address in [0x41d010,0x454e40,0x48df6c,0x438cf9,0x43a03e]:
        u.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
    results=[]
    for action in repeats:
        frame=0x20fe000;oracle.put(frame-0x20,oracle.player)
        u.reg_write(UC_X86_REG_EBP,frame);u.reg_write(UC_X86_REG_ESP,frame-0x100)
        if action=='end':
            # The exact flag-setting instruction sequence used by normal end-turn.
            u.reg_write(UC_X86_REG_ECX,oracle.player)
            u.emu_start(0x438960,0x43896a,count=100)
        else:
            u.emu_start(0x439fea,0x43a16f,count=10000)
        results.append(dict(action=action,remaining=oracle.get(item+0x70),pending=bool(oracle.get(oracle.player+0x2fc)&0x10),expired=expired,events=list(events)))
    return dict(item=item_id,remaining=remaining,pending=pending,sequence=results)


def main():
    cases=[]
    for item in [28,36]:
        for remaining in [1,2,3,5,8,10,0xffffffff]:
            for pending in [False,True]:
                cases.append(sample(item,remaining,pending,['begin','begin','end','begin','begin','end','begin']))
    oracle=Oracle(json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8')))
    u=oracle.uc;frame=0x20fe000;item=0x10e0000;shots=[];attachments=[]
    random_value=0;random_calls=0
    def primitive(uc,address,size,_):
        nonlocal random_calls
        sp=uc.reg_read(UC_X86_REG_ESP)
        if address==0x4821a0:random_calls+=1;result=random_value
        else:result=oracle.get(uc.reg_read(UC_X86_REG_ECX)+0x2f8)
        uc.reg_write(UC_X86_REG_EAX,result);uc.reg_write(UC_X86_REG_EIP,oracle.get(sp));uc.reg_write(UC_X86_REG_ESP,sp+4)
    for address in [0x4821a0,0x43a2ad]:u.hook_add(UC_HOOK_CODE,primitive,begin=address,end=address)
    oracle.put(item+0x10c,oracle.player);oracle.put(frame-0x18,item)
    for expert in [False,True]:
        oracle.put(oracle.player+0x2f8,0x1000000 if expert else 0)
        for random_value in range(1000):
            random_calls=0;u.reg_write(UC_X86_REG_EBP,frame);u.reg_write(UC_X86_REG_ESP,frame-0x100)
            u.emu_start(0x49e3de,0x49e434,count=1000)
            shots.append(dict(expert=expert,random=random_value,hit=oracle.get(item+0x128)==0,randomCalls=random_calls))
    for flags in [0,0x10,0x2000,0x4000,0x4010,0x6000,0x6010]:
        oracle.put(oracle.player+0x2fc,flags);oracle.put(item+0x70,3)
        oracle.put(frame-0x24,oracle.player);oracle.put(frame+8,item)
        u.reg_write(UC_X86_REG_EBP,frame);u.reg_write(UC_X86_REG_ESP,frame-0x100)
        u.emu_start(0x43adf3,0x43ae1f,count=1000)
        attachments.append(dict(flags=flags,initial=3,remaining=oracle.get(item+0x70)))
    conflicts=[]
    for number in [28,36]:
        for same_source in [False,True]:
            o=Oracle(json.loads((ROOT/'app/public/assets/maps/4.json').read_text('utf8')));v=o.uc
            stack,end=0x20ff000,0x10ff020;objects=[]
            for _ in range(2):
                o.put(stack,end,number);v.reg_write(UC_X86_REG_ESP,stack);v.emu_start(0x48be40,end,count=100000);objects.append(v.reg_read(UC_X86_REG_EAX))
            old,new=objects;o.put(old+0x10c,o.player);o.put(new+0x10c,o.player if same_source else o.other)
            def iterator(uc,address,size,_):
                sp=uc.reg_read(UC_X86_REG_ESP);uc.reg_write(UC_X86_REG_EAX,old if address==0x41d010 else 0)
                uc.reg_write(UC_X86_REG_EIP,o.get(sp));uc.reg_write(UC_X86_REG_ESP,sp+4)
            for address in [0x41d010,0x454e40]:v.hook_add(UC_HOOK_CODE,iterator,begin=address,end=address)
            o.put(stack,end,new,o.result,1);v.reg_write(UC_X86_REG_ESP,stack);v.reg_write(UC_X86_REG_ECX,o.player)
            v.emu_start(0x43904b,end,count=10000)
            conflicts.append(dict(item=number,sameSource=same_source,result=v.reg_read(UC_X86_REG_EAX)))
    result=dict(sourceSha256=SHA,scope=__doc__,cases=cases,shots=shots,attachments=attachments,conflicts=conflicts,
                sameItemConflict={str(i):list(u.mem_read(0x4c2400+i*79+i,1)) for i in [28,36]})
    (ROOT/'tests/fixtures/original-effect-clock.json').write_text(json.dumps(result,indent=2),'utf8')
    print(f'{len(cases)} clock traces, {len(shots)} shot outcomes, {len(attachments)} attachment flag combinations; same-item attack table: {result["sameItemConflict"]}')


if __name__=='__main__':main()
