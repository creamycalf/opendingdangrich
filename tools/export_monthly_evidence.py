"""Retain exact native instruction ranges for the current analysis checkpoint."""
import json
from pathlib import Path
from verify_original_economy import ROOT,SOURCE,SHA,pe
import capstone,unicorn

folder=ROOT/'rea-analysis/wa.exe-ec35d2f7d4b2e39f'
evidence=folder/'evidence';evidence.mkdir(exist_ok=True)
ranges={
    'month-start-dispatch':(0x439fa0,0x439fea),
    'month-start-base':(0x43a173,0x43a18b),
    'nobita-gift':(0x451d2f,0x451d57),
    'shizuka-gifts':(0x452621,0x452658),
    'human-turn-gate':(0x43c148,0x43c184),
    'ai-turn-gate':(0x446ce7,0x446d35),
    'sunday-turn-gate':(0x45230d,0x452377),
    'day-advance':(0x474926,0x474a3f),
    'passive-ability-mask':(0x48db23,0x48db58),
    'rent-protection-gate':(0x44399c,0x4439e1),
    'attack-target-gate':(0x48d927,0x48da06),
    'item-conflict-query':(0x43904b,0x4391a8),
}
dis=capstone.Cs(capstone.CS_ARCH_X86,capstone.CS_MODE_32)
for name,(start,end) in ranges.items():
    lines=[f'{i.address:08x} {i.mnemonic} {i.op_str}' for i in dis.disasm(pe.get_data(start-0x400000,end-start),start)]
    (evidence/f'{name}.asm.txt').write_text('\n'.join(lines)+'\n','utf8')
metadata=dict(date='2026-11-03',sourcePath=str(SOURCE),sourceSha256=SHA,
              providers=dict(capstone=capstone.__version__,unicorn=unicorn.__version__),
              reaEngineUsed=False,ranges={k:[hex(a),hex(b)] for k,(a,b) in ranges.items()},
              oracle='tests/fixtures/original-monthly-gifts.json',
              limitations='Only monthly dispatch/date slices were executed in this checkpoint. Passive protection ranges are static follow-up leads, not implemented effects or executed gameplay evidence.')
(evidence/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),'utf8')
project=json.loads((folder/'project.json').read_text('utf-8-sig'))
project.update(status='analyzing',blocker=None,next_step='Monthly grants implemented; next verify passive protection items 1/10/19 and their conflict/expiration paths. Full game remains incomplete.')
project['analysis_source']=str(SOURCE)
project['provider_limitations']='No REA MCP or CLI available; using existing Capstone/Unicorn. This record contains no REA Evidence IDs.'
(folder/'project.json').write_text(json.dumps(project,ensure_ascii=False,indent=2),'utf8')
print('Saved instruction evidence and project checkpoint:',folder)
