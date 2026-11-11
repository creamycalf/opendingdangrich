"""Original month-start dispatch and character inventory mutations.

Runs 0x439fcd..0x439fea with each original player vtable, day and intra-day
cycle globals. The called virtual methods and flag changes run unchanged.
UI refresh preceding this slice and effect ticking following it are excluded.
Also executes the original date advance without the surrounding month-end UI.
This is Unicorn evidence, not output from a REA provider.
"""
import json
from verify_original_inventory import InventoryOracle
from verify_original_economy import ROOT,SHA

VTABLES=dict(doraemon=0x4b6e90,nobita=0x4b6fa8,shizuka=0x4b7034,
             suneo=0x4b70c0,dorami=0x4b714c,gian=0x4b71d8)


def main():
    o=InventoryOracle();cases=[]
    for character,vtable in VTABLES.items():
        for day in [1,2,15,31]:
            for cycle in [0,1,2]:
                for flags in [0,0x80,0x90]:
                    for count in [0,17]:
                        before=[count]*42
                        o.put(o.player,vtable);o.put(o.player+0x44,*before)
                        o.put(o.player+0x2fc,flags)
                        o.put(0x4c9424,day);o.put(0x4ca238,cycle)
                        o.put(0x20fe000-0x20,o.player)
                        o.slice(0x439fcd,0x439fea)
                        after=[o.get(o.player+0x44+4*i) for i in range(42)]
                        cases.append(dict(character=character,day=day,cycle=cycle,flags=flags,
                                          before=before,after=after,flagsAfter=o.get(o.player+0x2fc)))
    dates=[]
    for year,month,day in [(1999,12,31),(2000,1,31),(2000,2,28),(2000,2,29),(2001,2,28),(2000,4,30),(2000,5,1)]:
        o.put(0x4c9420,month,day,year,6)
        o.slice(0x474926,0x474a3f)
        dates.append(dict(before=[year,month,day,6],after=[o.get(0x4c9428),o.get(0x4c9420),o.get(0x4c9424),o.get(0x4c942c)]))
    result=dict(sourceSha256=SHA,scope=__doc__,vtables={k:hex(v) for k,v in VTABLES.items()},cases=cases,dates=dates)
    (ROOT/'tests/fixtures/original-monthly-gifts.json').write_text(json.dumps(result,indent=2),'utf8')
    print(f'{len(cases)} original dispatch/inventory cases, {len(dates)} original date transitions')


if __name__=='__main__':main()
