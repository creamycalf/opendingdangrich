"""MGame05 cyclic choice outcome and original four-draw AI decisions."""
from verify_original_minigame6 import MiniOracle,ROOT,SHA
import json
def main():
    o=MiniOracle(5);pairs=[];rows=[]
    for choice in range(3):
        for target in range(3):
            pairs.append([choice,target,o.call(0x4288bd,0,choice,target)])
            for recognition in range(7):
                for decision in range(7):
                    for seed in [1,2,123,987654321,0xffffffff]:
                        o.seed=seed;o.draws=[];o.put(o.player+0x40,recognition,decision)
                        action=o.call(0x428fd1,o.player,choice,target)
                        rows.append(dict(choice=choice,target=target,recognition=recognition,decision=decision,draws=o.draws,action=action))
    (ROOT/'tests/fixtures/original-minigame5-rules.json').write_text(json.dumps(dict(sourceSha256=SHA,pairs=pairs,rows=rows),separators=(',',':')),'utf8')
    print(json.dumps(dict(pairs=len(pairs),aiCases=len(rows))))
if __name__=='__main__':main()
