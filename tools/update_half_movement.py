from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app/src/engine.mjs';s=p.read_text('utf8');s="import {playerPosition,halfStepTarget,movePosition} from './movement-position.mjs';\n"+s
s=s.replace("small:false,effectTickPending", "small:false,half:null,effectTickPending")
s=s.replace("export function choices(map,g){", "export function choices(map,g){\n  const half=halfStepTarget(map,g.players[g.turn]);if(half!==null)return [half];")
old="const p=g.players[g.turn],a=map.cells[p.at],b=map.cells[to];p.direction=b.x>a.x?3:b.x<a.x?2:b.y>a.y?1:0;p.previous=p.at;p.at=to;g.remaining--;"
new="const p=g.players[g.turn],a=map.cells[p.at],b=map.cells[to],direction=halfStepTarget(map,p)!==null?p.direction:b.x>a.x?3:b.x<a.x?2:b.y>a.y?1:0;const stride=movePosition(map,p,direction);g.remaining--;"
assert old in s;s=s.replace(old,new).replace("p.walkPoints=f32(p.walkPoints+1);","p.walkPoints=f32(p.walkPoints+stride);")
s=s.replace("adjacent(map,to))if", "adjacent(map,p.at))if").replace("other.at===to", "other.at===p.at&&playerPosition(map,other).x===playerPosition(map,p).x&&playerPosition(map,other).y===playerPosition(map,p).y")
s=s.replace("g.roadItems.find(o=>o.at===to)", "g.roadItems.find(o=>o.at===p.at)")
s=s.replace("p.at=target.to;p.direction", "p.at=target.to;p.half=null;p.direction")
s=s.replace("p.at=idx(map,jail.x,jail.y);", "p.at=idx(map,jail.x,jail.y);p.half=null;")
s=s.replace("p.at=target;p.previous", "p.at=target;p.half=null;p.previous")
s=s.replace("['at','direction','jail']", "['at','direction','jail','half']")
s=s.replace("p.events??=[];p.small??=false;", "p.events??=[];p.small??=false;p.half??=null;")
s=s.replace("  if(g.players.some(p=>typeof p.small", "  if(g.players.some(p=>p.half!==null&&(!p.half||!Number.isFinite(p.half.x)||!Number.isFinite(p.half.y)||p.half.x<0||p.half.y<0||p.half.x>=map.width||p.half.y>=map.height||!Number.isInteger(p.half.x*2)||!Number.isInteger(p.half.y*2)||p.half.at!==p.at||Math.trunc(p.half.y)*map.width+Math.trunc(p.half.x)!==p.at)))bad();\n  if(g.players.some(p=>typeof p.small")
p.write_text(s,'utf8')
p=root/'app/src/hermit.mjs';s=p.read_text('utf8').replace("q.direction=map.jail.direction;", "q.half=null;q.direction=map.jail.direction;");p.write_text(s,'utf8')
p=root/'app/src/main.ts';s=p.read_text('utf8');s="import {playerPosition} from './movement-position.mjs';\n"+s
s=s.replace("const c=map.cells[g.players[g.turn].at];Object.assign(camera", "const c=playerPosition(map,g.players[g.turn]);Object.assign(camera")
s=s.replace("const c=map.cells[p.at],xy=", "const c=playerPosition(map,p),xy=")
s=s.replace("if(im)ctx.drawImage(im,xy.x-im.width/2,xy.y+12-im.height);", "if(im){const z=p.small?.5:1;ctx.drawImage(im,xy.x-im.width*z/2,xy.y+12-im.height*z,im.width*z,im.height*z);}")
s=s.replace("async function animate(from:number,to:number,epoch:number){const a=map.cells[from],b=map.cells[to],", "async function animate(a:{x:number;y:number},b:{x:number;y:number},epoch:number){const ")
s=s.replace("const from=p.at,to=dispatch", "const from={...playerPosition(map,p)},to=dispatch")
s=s.replace("await animate(from,to,epoch)", "await animate(from,playerPosition(map,g.players[g.turn]),epoch)")
s=s.replace("'yes',undefined,p.cash<cost)", "'yes',undefined,p.cash<cost||!(effectCapabilities(p)&(q.kind==='buy'?8:0x10)))")
p.write_text(s,'utf8')
p=root/'tests/flow-ui.cjs';s=p.read_text('utf8');s=s.replace("assert.equal((await snapshot(he.page)).game.players[0].cash,1150);", "const expected=structuredClone(fortune);E.answer(map,expected,'chest',1);assert.equal((await snapshot(he.page)).game.players[0].cash,expected.players[0].cash);")
p.write_text(s,'utf8')
