from pathlib import Path
R=Path(__file__).resolve().parents[1]
def edit(path,changes):
 p=R/path;s=p.read_text('utf8')
 for old,new in changes:
  assert old in s,(path,old[:90]);s=s.replace(old,new)
 p.write_text(s,'utf8')
edit('app/src/effects.mjs',[("export const EFFECTS={", "export const EFFECTS={\n  'original-24':{originalId:24,name:'分身药水',duration:5,mask:0xffffffff,value:0},\n  'original-32':{originalId:32,name:'一分为二刀',duration:5,mask:0xfff,value:0},")])
edit('app/src/engine.mjs',[
 ("import {magnetDirection", "import {CLONE_ITEMS,planClones,cloneNodes,actorCells,followClones,relocateClones,validClones} from './clones.mjs';\nimport {magnetDirection"),
 ("const stride=movePosition(map,p,direction);g.remaining--;", "const oldAt=p.at,stride=movePosition(map,p,direction);followClones(map,p,oldAt);g.remaining--;"),
 ("originalLandItemNeighbor(map,g.players[g.turn].at);if(i===null)", "originalLandItemNeighbor(map,g.visitAt??g.players[g.turn].at);if(i===null)"),
 ("lot=originalLandItemNeighbor(map,p.at),owner=", "lot=originalLandItemNeighbor(map,g.visitAt??p.at),owner="),
 ("schedule(g,[...(effectCapabilities(g.players[g.turn])&0x200000?[]:[{kind:'event',event:c.event}]),{kind:'destination'}]);", "schedule(g,actorCells(g.players[g.turn]).map(at=>({kind:'visit',at})));"),
 ("if(e.kind==='mini'){", "if(e.kind==='visit'){g.visitAt=e.at;g.queue.unshift(...(effectCapabilities(p)&0x200000?[]:[{kind:'event',event:map.cells[e.at].event}]),{kind:'destination'});return;}\n  if(e.kind==='mini'){"),
 ("if(!g.queue.length){g.phase=g.afterQueue;return;}", "if(!g.queue.length){g.phase=g.afterQueue;if(g.phase==='end')delete g.visitAt;return;}"),
 ("g.turnSerial++;", "g.turnSerial++;delete g.visitAt;"),
 ("const specialItem=SPECIAL_BUILDINGS.includes(item)", "const plannedClones=CLONE_ITEMS.includes(item)?planClones(map,g,item,n=>random(g,n)):null;if(CLONE_ITEMS.includes(item))requireState(plannedClones,'身后没有足够道路放置分身');\n  const specialItem=SPECIAL_BUILDINGS.includes(item)"),
 ("}else if(item==='original-3'){", "}else if(CLONE_ITEMS.includes(item)){\n    applyEffect(p,item,g.turn,true,false);p.effects.find(e=>e.id===item).nodes=plannedClones;g.phase='end';\n  }else if(item==='original-3'){"),
 ("p.at=target.to;p.half=null;p.direction=target.direction;p.previous=-1;", "p.at=target.to;p.half=null;p.direction=target.direction;p.previous=-1;relocateClones(map,p);"),
 ("p.direction=jail.direction;p.jail=true;", "p.direction=jail.direction;p.jail=true;relocateClones(map,p);"),
 ("p.at=target;p.half=null;p.previous=-1;g.phase='end';", "p.at=target;p.half=null;p.previous=-1;relocateClones(map,p);g.phase='end';"),
 ("p.previous=q.previous=-1;g.phase='end';", "p.previous=q.previous=-1;relocateClones(map,p);relocateClones(map,q);g.phase='end';"),
 ("if(g.players.some(p=>!p||!validEffects(p)))bad();", "if(g.players.some(p=>!p||!validEffects(p)||!validClones(map,p)))bad();\n  if(g.visitAt!==undefined&&(!integer(g.visitAt,0,map.cells.length-1)||!['prompt','resolving'].includes(g.phase)))bad();"),
 ("(['destination','mini'].includes(e.kind)||", "(['destination','mini'].includes(e.kind)||e.kind==='visit'&&integer(e.at,0,map.cells.length-1)||"),
 ("!adjacent(map,p.at).includes(q.lot)", "!adjacent(map,g.visitAt??p.at).includes(q.lot)"),
])
edit('app/src/special-buildings.mjs',[
 ("import {originalLandItemNeighbor}","import {relocateClones} from './clones.mjs';\nimport {originalLandItemNeighbor}"),
 ("lot=originalLandItemNeighbor(map,p.at)","lot=originalLandItemNeighbor(map,g.visitAt??p.at)"),
 ("p.direction=jail.direction;p.jail=true;", "p.direction=jail.direction;p.jail=true;relocateClones(map,p);"),
])
edit('app/src/road-items.mjs',[("import {originalDirectionMask}","import {actorCells} from './clones.mjs';\nimport {originalDirectionMask}"),(".filter(p=>!p.eliminated).map(p=>p.at)",".filter(p=>!p.eliminated).flatMap(actorCells)")])
edit('app/src/magnet.mjs',[("import {DIRECTIONS}","import {actorCells} from './clones.mjs';\nimport {DIRECTIONS}"),("p.at===at", "actorCells(p).includes(at)")])
edit('app/src/hermit.mjs',[("import ","import ")])
edit('app/src/inventory.mjs',[("const available={", "const available={\n  'original-24':{name:'分身药水',description:'变出三个跟随自己的分身，持续五天。每个分身停靠的位置分别结算事件和地产；分身也会占用道路位置。身后需要有可用道路。'},\n  'original-32':{name:'一分为二刀',description:'变出一个跟随自己的分身，持续五天。分身停靠的位置也会结算事件和地产。不能与分身药水同时生效。'},")])
edit('app/src/main.ts',[
 ("import {SPECIAL_BUILDINGS", "import {CLONE_ITEMS,planClones,cloneNodes} from './clones.mjs';\nimport {SPECIAL_BUILDINGS"),
 ("const effect=id==='original-21'", "const effect=CLONE_ITEMS.includes(id)&&!planClones(map,g,id)?{allowed:false,replaced:[],reason:'身后没有足够道路放置分身'}:id==='original-21'"),
 ("  for(const o of g.roadItems){", "  g.players.forEach((p:any)=>{if(p.eliminated)return;for(const n of cloneNodes(p)){const c=map.cells[n.at],xy=project(c.x,c.y),frame=flowAssets[p.character][n.direction][0],im=images['hero-'+frame];sprites.push({depth:c.x+c.y+.05,render:()=>{if(im)ctx.drawImage(im,xy.x-im.width/2,xy.y+12-im.height);}});}});\n  for(const o of g.roadItems){"),
])
