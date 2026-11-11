from pathlib import Path
R=Path(__file__).resolve().parents[1]
def edit(path,changes):
 p=R/path;s=p.read_text('utf8')
 for old,new in changes:
  assert old in s,(path,old[:100]);s=s.replace(old,new)
 p.write_text(s,'utf8')
edit('app/src/effects.mjs',[
 ("export const EFFECTS={", "export const EFFECTS={\n  'original-43':{originalId:43,name:'缩形隧道造成的缩小',duration:5,mask:0xfffffebe,value:0},"),
 ("id!=='original-42'&&!TARGET_ITEMS", "!['original-42','original-43'].includes(id)&&!TARGET_ITEMS"),
 ("e.id==='original-39'", "['original-39','original-43'].includes(e.id)"),
 ("if(id==='original-39')player.small=true;", "if(['original-39','original-43'].includes(id))player.small=true;"),
])
edit('app/src/hermit.mjs',[("x.id==='original-39'", "['original-39','original-43'].includes(x.id)")])
edit('app/src/engine.mjs',[
 ("import {retaliateRent}","import {canEnterTunnel,crossTunnel} from './tunnel.mjs';\nimport {retaliateRent}"),
 ("const allowed=exits.filter(to=>{const door=g.roadItems.find(o=>o.at===p.at);", "const allowed=exits.filter(to=>{const dest=map.cells[to],d=dest.x>at.x?3:dest.x<at.x?2:dest.y>at.y?1:0,tunnel=g.roadItems.find(o=>o.id==='original-6'&&o.at===to);if(tunnel&&!canEnterTunnel(p,tunnel,d))return false;const door=g.roadItems.find(o=>o.id==='door'&&o.at===p.at);"),
 # Existing lambda's local d would conflict.
 ("const c=map.cells[to],d=c.x!==at.x?2:0;return (door.direction&2)===d;", "const c=map.cells[to],axis=c.x!==at.x?2:0;return (door.direction&2)===axis;"),
 ("const door=g.roadItems.find(o=>o.at===p.at);\n  if(door)", "const tunnel=g.roadItems.find(o=>o.id==='original-6'&&o.at===p.at);if(tunnel){const text=crossTunnel(map,g,tunnel);if(text)events.push({kind:'message',text:p.name+text});}\n  const door=g.roadItems.find(o=>o.id==='door'&&o.at===p.at);\n  if(door)"),
 ("item==='door'||item==='original-13'", "item==='door'||item==='original-6'||item==='original-13'"),
 ("gameRoadPlacement(map,g,target,item==='door')", "gameRoadPlacement(map,g,target,item!=='original-13')"),
 ("}else if(item==='door'){\n    g.roadItems.push({id:'door'", "}else if(item==='door'||item==='original-6'){\n    g.roadItems.push({id:item"),
 ("o.id!=='door'", "!['door','original-6'].includes(o.id)"),
 ("!integer(g.remaining,0,6)", "!integer(g.remaining,0,8)"),
])
edit('app/src/inventory.mjs',[("const available={", "const available={\n  'original-6':{name:'缩形隧道',description:'在绿色道路上放置五天的缩形隧道。由大口穿过会缩小五天、步幅减半；缩小后从相反方向穿过可恢复。侧面不能进入，携带分身或怨恨头带时不能穿过。'},")])
edit('app/src/main.ts',[
 ("roadSelection==='door').length", "roadSelection!=='original-13').length"),
 ("id==='door'||id==='original-13'||id==='original-21'", "id==='door'||id==='original-6'||id==='original-13'||id==='original-21'"),
 ("id==='door'?'点击绿色道路放置任意门'", "id==='original-6'?'点击绿色道路放置缩形隧道':id==='door'?'点击绿色道路放置任意门'"),
 ("roadArt.animations[47+(o.direction>>1)]", "roadArt.animations[o.id==='original-6'?21+o.direction:47+(o.direction>>1)]"),
])
edit('tools/extract_road_items.py',[("for index in range(47,55):", "for index in [*range(21,33),*range(47,55)]:")])
edit('tools/verify_original_protection.py',[("range(43)","range(44)")])
