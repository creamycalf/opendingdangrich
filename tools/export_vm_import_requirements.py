"""Static original-EXE contract; never interpret import presence as supported."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'research/new-pc-comparison.json').read_text('utf8'))['newExecutable']
requirements={
 'targetSha256':source['sha256'],
 'framework':'https://github.com/ra2-games/ra2',
 'commit':'fc4dd415628216e21e09e80d233ba228692b12dc',
 'executed':False,
 'imports':[{'dll':dll,'symbols':names,'implementationVerified':False} for dll,names in source['imports'].items()],
 'additionalChecks':['GetProcAddress dynamic imports','DirectInput COM vtables and data formats','8-bit DirectDraw palette and surface pitch','DSOUND ordinal 1 resolution','WINMX native DLL and its dependencies','AVI/VFW codec paths','Chinese GDI/font rendering','virtual registry installation data','save writeback and cold restore'],
 'policy':'Missing functions must fail visibly; no success-only placeholders. Original resource files remain unchanged.'
}
(root/'runtime-touch/ra2-vm-requirements.json').write_text(json.dumps(requirements,ensure_ascii=False,indent=2),'utf8')
print(sum(len(v) for v in source['imports'].values()),'imports in',len(source['imports']),'DLLs')
