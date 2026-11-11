import json,struct
from verify_original_economy import ROOT,pe
rows=json.loads((ROOT/'research/hermit-vtables.json').read_text('utf8'))
names=['道具礼物','每日行动两次','双倍收租','赠送土地','建筑升级','好运降临','免交租','免受攻击','豆沙包礼物','矿山增长提高','全体醒来','小游戏','建筑奖励','商店六折','禁止使用道具','暂停行动','无法收租','禁止买地','禁止升级','禁止买道具','禁止小游戏','昏睡','缩小','恶运降临','双倍交租','豆沙包罚款','丢失道具','地震','矿山增长降低','炮台税','送往倒霉区域','矿山关闭','建筑税','时光机失控','平分现金']
out=[]
for r in rows:
 f=r['fields'];g=lambda n:f.get(str(n),0)
 out.append(dict(id=r['id'],name=names[r['id']],good=bool(g(7)),duration=g(4),mask=g(10),value=g(11),compensation=struct.unpack('<f',struct.pack('<I',g(14)))[0]))
tables={kind:[[pe.get_data(address-0x400000+i*79+j,1)[0] for j in range(35)] for i in range(count)] for kind,address,count in [('item',0x4c0bc8,44),('event',0x4c0bc8+44*79,35)]}
for name,address in [('self',0x4c0b9c),('attack',0x4c2400)]:tables[name]=[[pe.get_data(address-0x400000+(i+44)*79+j,1)[0] for j in range(44)] for i in range(35)]
texts=[r['text'] for r in json.loads((ROOT/'research/original-strings.json').read_text('utf8'))['records'] if r['id'].startswith('002/')]
(ROOT/'app/src/hermit-data.mjs').write_text('// Extracted from wa.exe constructors and conflict matrix; generate_hermit_data.py.\nexport const HERMIT_EVENTS='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\nexport const HERMIT_CONFLICTS='+json.dumps(tables,separators=(',',':'))+';\nexport const HERMIT_TEXT='+json.dumps(texts,ensure_ascii=False,separators=(',',':'))+';\n','utf8')
print(len(out),'events;',len(texts),'original messages; cash constants',[(hex(a),struct.unpack('<f',pe.get_data(a-0x400000,4))[0]) for a in [0x4b65dc,0x4b6910]])
