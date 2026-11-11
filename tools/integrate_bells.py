from pathlib import Path
R=Path(__file__).resolve().parents[1]
def edit(path,changes):
 p=R/path;s=p.read_text('utf8')
 for old,new in changes:
  assert old in s,(path,old[:90]);s=s.replace(old,new)
 p.write_text(s,'utf8')
edit('app/src/engine.mjs',[
 ("import {CLONE_ITEMS", "import {initialBellCount,spawnBells,collectBell} from './bells.mjs';\nimport {CLONE_ITEMS"),
 ("for(const p of g.players)p.inventory=startingInventory(p.character,n=>random(g,n));", "for(const p of g.players)p.inventory=startingInventory(p.character,n=>random(g,n));\n  spawnBells(map,g,initialBellCount(map),n=>random(g,n));"),
 ("if(e.kind==='visit'){g.visitAt=e.at;", "if(e.kind==='visit'){g.visitAt=e.at;const gift=collectBell(map,g,e.at,n=>random(g,n));if(gift)record(g,p.name+'拾取铃铛，得到'+ITEMS[gift].name+'。');"),
 ("if(!Array.isArray(g.roadItems)", "if(g.bells===undefined)spawnBells(map,g,initialBellCount(map),n=>random(g,n));\n  if(!Array.isArray(g.bells)||g.bells.length>initialBellCount(map)||new Set(g.bells).size!==g.bells.length||g.bells.some(i=>!integer(i,0,map.cells.length-1)||!walkable(map.cells[i])||map.cells[i].event!==0||g.roadItems.some(o=>o.at===i)))bad();\n  if(!Array.isArray(g.roadItems)"),
])
edit('app/src/road-items.mjs',[("i=>roads.has(i)||actors.has(i)", "i=>roads.has(i)||actors.has(i)||(g.bells??[]).includes(i)")])
edit('app/src/main.ts',[
 ("  for(const o of g.roadItems){", "  for(const at of g.bells){const c=map.cells[at],p=project(c.x,c.y),a=roadArt.animations[274],tick=Math.floor(performance.now()/100)%a.frames;for(const command of a.commands.filter((v:number[])=>v[0]===tick&&v[1]<a.sprites.length)){const id=a.sprites[command[1]],meta=roadArt.images[id];sprites.push({depth:c.x+c.y-.01,render:()=>ctx.drawImage(images['road-'+id],p.x-40+command[2]+meta.hx,p.y-20+command[3]+meta.hy)});}}\n  for(const o of g.roadItems){"),
])
edit('tools/extract_road_items.py',[("[*range(21,33),*range(47,55)]", "[*range(21,33),*range(47,55),274]")])
