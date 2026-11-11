"""Decode the mapElem group 4 animations used by flag type 6 (0x476950).
Sprites are mapElem group 3, already exported with each map's own palette.
"""
from extract_assets import *

for number in range(8):
    path=OUT/'maps'/f'{number}.json'
    board=json.loads(path.read_text('utf8'))
    animations={}
    for key,packed in board['rawAnimations'].items():
        b=decompress(bytes.fromhex(packed))
        offset,frames,rate,flags,count=struct.unpack_from('<5I',b)
        ids=list(struct.unpack_from('<'+'I'*count,b,20));commands=[]
        for p in range(offset,len(b)-13,14):
            row=struct.unpack_from('<HHhhHHH',b,p)
            if row[1]==65535:break
            commands.append(row)
        assert all('3-'+str(n) in board['art'] for n in ids)
        animations[key.split('-')[1]]=dict(frames=frames,rate=rate,flags=flags,sprites=ids,commands=commands)
    board['animations']=animations
    path.write_text(json.dumps(board,ensure_ascii=False),encoding='utf8')
    print(number,len(animations),'map animations')
