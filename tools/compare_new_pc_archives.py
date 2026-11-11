"""Compare decoded resource leaves without extracting or changing either game."""
import json, hashlib
from pathlib import Path
from extract_assets import archive, decompress, SIG, u32

root=Path(__file__).resolve().parents[1]
old=root/'work/哆啦a梦大富翁/Dora'
new=Path('D:/Game/old/Doraemon/Doraemon')
rows=[]
for name in ['building.dat','strings.dat','tools.DAT','Sfx.dat']+[f'map{i:04}.dat' for i in range(8)]:
    a,b=(old/name).read_bytes(),(new/name).read_bytes()
    row={'name':name,'oldBytes':len(a),'newBytes':len(b)}
    if not (a.startswith(SIG) and b.startswith(SIG)):
        row['archive']=False
        rows.append(row)
        continue
    aa,bb=archive(a),archive(b)
    row.update(archive=True,oldLeaves=len(aa),newLeaves=len(bb),sameLeaves=0,changedLeaves=[])
    if name.startswith('map'):
        ah,bh=aa[(0,)],bb[(0,)]
        dims=[u32(ah,4),u32(ah,8)]
        row['oldDimensions']=dims
        row['newDimensions']=[u32(bh,4),u32(bh,8)]
        if row['oldDimensions']==row['newDimensions']:
            row['cellCount']=dims[0]*dims[1]
            row['changedCells']=[{'x':i%dims[0],'y':i//dims[0],
                'old':ah[80+i*16:96+i*16].hex(),
                'new':bh[80+i*16:96+i*16].hex()}
                for i in range(row['cellCount'])
                if ah[80+i*16:96+i*16]!=bh[80+i*16:96+i*16]]
    for key in sorted(aa.keys()|bb.keys()):
        x,y=aa.get(key),bb.get(key)
        if x==y:
            row['sameLeaves']+=1
            continue
        leaf={'path':list(key),'oldBytes':len(x) if x else None,'newBytes':len(y) if y else None}
        if x is not None and y is not None:
            diffs=[i for i in range(min(len(x),len(y))) if x[i]!=y[i]]
            leaf.update(differentSharedBytes=len(diffs),firstDiffs=diffs[:20])
            if len(diffs)<=40 and len(x)==len(y):
                leaf['changes']=[{'offset':i,'old':x[i],'new':y[i]} for i in diffs]
            try:
                dx,dy=decompress(x),decompress(y)
                leaf.update(decodedOldBytes=len(dx),decodedNewBytes=len(dy),decodedSame=dx==dy)
            except (ValueError,AssertionError,IndexError):
                pass
        row['changedLeaves'].append(leaf)
    rows.append(row)
out=root/'research/new-pc-resource-leaves.json'
out.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps([{'name':r['name'],'sameLeaves':r.get('sameLeaves'),
    'changedLeaves':len(r.get('changedLeaves',[])),
    'dimensions':r.get('newDimensions'),'cellCount':r.get('cellCount'),
    'changedCellCount':len(r['changedCells']) if 'changedCells' in r else None}
    for r in rows],ensure_ascii=False,indent=2))
