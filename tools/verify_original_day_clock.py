"""Execute original daily-cycle gate and clock expiry; replace only UI/daily hooks.
Also runs the original friendship attack check with a one-effect caster list.
"""
import json
from verify_original_protection import ProtectionOracle
from verify_original_economy import ROOT,SHA,UC_HOOK_CODE
from unicorn.x86_const import *

def main():
    o=ProtectionOracle();u=o.uc;daily=[];friends=[]
    def skip(u,address,size,_):
        sp=u.reg_read(UC_X86_REG_ESP);u.reg_write(UC_X86_REG_EIP,o.get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
    for address in [0x438262,0x47f087]:u.hook_add(UC_HOOK_CODE,skip,begin=address,end=address)
    for days in range(6):
        for cycle in range(2 if days else 1):
            o.put(0x4c54b8,2 if days else 1);o.put(0x4ca688,days);o.put(0x4ca238,cycle);o.put(0x4c9430,100)
            o.put(0x4ca6a8,0,0);u.reg_write(UC_X86_REG_EBP,0x20fe000);u.reg_write(UC_X86_REG_ESP,0x20fd000)
            def end(u,address,size,_):u.emu_stop()
            hook=u.hook_add(UC_HOOK_CODE,end,begin=0x474d85,end=0x474d85)
            u.emu_start(0x474754,0x474826,count=1000);u.hook_del(hook)
            daily.append(dict(days=days,cycle=cycle,afterDays=o.get(0x4ca688),afterCycle=o.get(0x4ca238),afterRound=o.get(0x4c9430),cyclesPerDay=o.get(0x4c54b8)))
    for attack in [4,15,25,27,30,33,36]:
        for linked in [False,True]:
            o.list_owner=o.player;o.old=o.items[27];o.put(o.old+0x10c,o.other if linked else o.result)
            o.put(o.player+0x2f8,0x420);o.put(o.player+0x2fc,0);o.put(o.other+0x2f8,0x420);o.put(o.other+0x2fc,0)
            o.put(o.new_items[attack]+0x10c,o.player)
            friends.append(dict(attack=attack,linked=linked,allowed=bool(o.call(0x48d927,o.new_items[attack],o.other))))
    result=dict(sourceSha256=SHA,scope=__doc__,daily=daily,friends=friends)
    (ROOT/'tests/fixtures/original-day-clock.json').write_text(json.dumps(result,indent=2),'utf8')
    print(len(daily),'cycle cases,',len(friends),'friendship target cases')

if __name__=='__main__':main()
