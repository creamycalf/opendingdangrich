"""Lexical triage only: a mention never proves working ABI compatibility."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
tree=root/'research/ra2-vm-audit/ra2-fc4dd415628216e21e09e80d233ba228692b12dc/src'
files=[(p.relative_to(tree).as_posix(),p.read_text('utf8')) for p in tree.rglob('*.ts')]
req=json.loads((root/'runtime-touch/ra2-vm-requirements.json').read_text('utf8'))
rows=[]
for dll in req['imports']:
 for symbol in dll['symbols']:
  hits=[]
  if not symbol.startswith('#'):
   for path,body in files:
    for n,line in enumerate(body.splitlines(),1):
     if symbol.lower() in line.lower():hits.append(dict(path=path,line=n))
  rows.append(dict(dll=dll['dll'],symbol=symbol,mentions=hits,status='needs-behavior-check' if hits else 'not-found-lexically'))
out=dict(commit=req['commit'],scope='Static lexical mentions only; computed dispatch, ordinals, COM and dynamic imports require further analysis.',rows=rows)
(root/'research/ra2-import-coverage.json').write_text(json.dumps(out,indent=2),'utf8')
print(len(rows),'imports;',sum(bool(r['mentions']) for r in rows),'mentioned;',sum(not r['mentions'] for r in rows),'not found lexically')
