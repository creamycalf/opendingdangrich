import json,re,struct
from verify_original_economy import ROOT,pe
items=[]
for n in [0,1]: items+=json.loads((ROOT/f'research/hermitCtors{n}.json').read_text('utf8'))['normalized_result']['items']
out=[]
for i,item in enumerate(items):
 s=item['pseudocode'];v=int(re.search(r'PTR_FUN_([0-9a-f]+)',s)[1],16)
 methods=struct.unpack('<12I',pe.get_data(v-0x400000,48))
 fields={int(a,0):int(b,0) for a,b in re.findall(r'param_1\[([0-9a-fx]+)\] = (0x[0-9a-f]+|[0-9]+);',s)}
 row=dict(id=i,ctor=item['address'],vtable=hex(v),methods=[hex(x) for x in methods],fields=fields)
 out.append(row)
(ROOT/'research/hermit-vtables.json').write_text(json.dumps(out,indent=2),'utf8')
for x in out: print(x['id'],x['methods'])
