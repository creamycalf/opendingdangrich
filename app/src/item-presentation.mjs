import {ITEMS} from './inventory.mjs';
import {originalLandItemNeighbor} from './land-items.mjs';
import {redirectAttack} from './target-items.mjs';
import {TARGET_ITEMS} from './effects.mjs';
import {playerPosition} from './movement-position.mjs';

// Original Tools.dat indices from factory +0x10 and the item-specific state
// handlers. Camera framing is adapted to the phone; this plan never alters RNG
// or gameplay. Committed item state is saved before any visual starts.
export function itemVisualPlan(map,before,after,command,catalog){
 if(command.type!=='useItem')return [];
 const id=ITEMS[command.item].originalId,actor=before.turn,p=before.players[actor];let target=command.target;
 if(TARGET_ITEMS.includes(command.item)){
  const selected=id===26?target.recipient:target;
  const redirected=redirectAttack(structuredClone(before),command.item,selected,id===26?target.donor:-1);
  target=id===26?{...target,recipient:redirected}:redirected;
 }
 const position=who=>({...playerPosition(map,before.players[who])});
 const at=cell=>({x:map.cells[cell].x,y:map.cells[cell].y});
 const own=position(actor),other=Number.isInteger(target)&&target>=0&&target<4?position(target):own;
 const steps=[],add=(animation,point)=>{if(!catalog.animations[animation])throw Error('道具动画资源缺失：'+animation);steps.push({animation,point});};
 if(id===12){add(67,own);add(after.players[actor].effects.find(e=>e.id===command.item)?.lucky?62:61,own);}
 else if(id===13){add(69,own);add(68,at(target));}
 else if(id===20)add(146,own);
 else if(id===26){add(81,position(target.donor));add(80,position(target.recipient));}
 else if(id===36){const hit=after.players[target].effects.some(e=>e.id==='air'&&e.source===actor);add(hit?88:89,other);}
 else if(id===4){add(34,own);add(35,other);}
 else if(id===21){add(76,own);add(75,at(target.first));add(75,at(target.second));}
 else if(id===33){add(267,own);add(33,other);}
 else if(id===6||id===37){const o=after.roadItems.find(o=>o.at===target);add(id===6?21+o.direction:47+(o.direction>>1),at(target));}
 else{
  let point=[0,2,40,41].includes(id)?at(originalLandItemNeighbor(map,p.at)):TARGET_ITEMS.includes(command.item)?other:own;
  // Following companions appear one cell behind the recipient (0x48eae2).
  if([1,8,14,23,35].includes(id)){const who=id===35?target:actor,d=before.players[who].direction,[dx,dy]=[[0,1],[0,-1],[1,0],[-1,0]][d];point={x:point.x+dx,y:point.y+dy};}
  add(catalog.primary[id],point);
 }
 return steps;
}
