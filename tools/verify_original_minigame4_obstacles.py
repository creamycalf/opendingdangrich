"""Run the original MGame04 obstacle controller across complete spawn cycles."""
from verify_original_minigame6 import MiniOracle,ROOT,SHA
import json,struct

def main():
    oracle=MiniOracle(4);o=oracle.player
    catalog=json.loads((ROOT/'app/public/assets/minigames/catalog.json').read_text('utf8'))
    width=catalog['4']['images']['25']['w']
    oracle.uc.mem_write(o,bytes(0x100));oracle.put(o+0x20,4);oracle.put(o+0x40,0x10e6000)
    oracle.uc.mem_write(0x10e6000,struct.pack('<H',width))
    def state():
        signed=lambda a:struct.unpack('<i',oracle.uc.mem_read(a,4))[0]
        return dict(mode=oracle.get(o+0x20),width=width,y=[signed(o+i*4) for i in range(4)],speed=[signed(o+0x10+i*4) for i in range(4)],delay=signed(o+0x24),x=signed(o+0x28),horizontalSpeed=signed(o+0x2c),good=[oracle.get(o+0x30+i*4) for i in range(4)])
    oracle.call(0x42728a,o);initial=state();setup=list(oracle.draws);rows=[]
    for t in range(1200):
        before=len(oracle.draws);oracle.call(0x4273c6,o);rows.append(dict(draws=oracle.draws[before:],state=state()))
    (ROOT/'tests/fixtures/original-minigame4-obstacles.json').write_text(json.dumps(dict(sourceSha256=SHA,setup=setup,initial=initial,rows=rows),separators=(',',':')),'utf8')
    print(json.dumps(dict(ticks=len(rows),width=width,spawnCycles=sum(r['state']['mode']==4 for r in rows))))
if __name__=='__main__':main()
