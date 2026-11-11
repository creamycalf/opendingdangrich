import {animationFrame} from './character-animation.mjs';
import {playerPosition} from './movement-position.mjs';

const FOLLOWERS={1:17,8:96,14:113,23:130,35:275};
const identity=e=>e.id+':'+e.source;
const pointOf=(map,p)=>{const {x,y}=playerPosition(map,p);return {x,y};};
// DAT control rows encode the engine event as 0x8000 | eventId.
export function itemLifecycleEventFrame(animation,eventId){
 const row=animation.commands.find(c=>c[1]===(0x8000|eventId));
 return row?row[0]:animation.frames;
}
function followerPoint(map,p,effect){
 if(effect.id==='original-14'&&effect.active)return pointOf(map,p);
 let offset=0;
 for(const e of p.effects){const id=Number(e.id.slice(9));if(FOLLOWERS[id]===undefined||id===14&&e.active)continue;offset++;if(e===effect)break;}
 const c=playerPosition(map,p),[dx,dy]=[[0,1],[0,-1],[1,0],[-1,0]][p.direction];
 return {x:c.x+dx*offset,y:c.y+dy*offset};
}
// Pure post-transaction presentation. No RNG, timers, mutations or save data.
// Removed actor snapshots remain visible until the original animation event;
// the already-committed gameplay state is never rolled back for presentation.
export function itemLifecyclePlan(map,before,after,command,catalog){
 if(!command||!before||!after)return [];
 const groups=[];
 before.players.forEach((p,actor)=>{
  if(p.eliminated||after.players[actor].eliminated)return;
  const retained=new Set(after.players[actor].effects.map(identity));
  // 438bc6 -> +24(2) -> state50 -> 48f210 -> +14/49709c.
  // The existing helper changes animation before control transfers from the
  // sleeping body. This is once per helper, not the item's initial use108.
  const dwarf=p.effects.find(e=>e.id==='original-14'&&!e.active);
  if(dwarf&&after.players[actor].effects.some(e=>identity(e)===identity(dwarf)&&e.active)){
   const animation=121+p.direction,a=catalog.animations[animation];
   if(!a)throw Error('机械小矮人接管动画缺失：'+animation);
   const point=followerPoint(map,p,dwarf),body=structuredClone(p);
   body.effects=body.effects.filter(e=>e.id!=='original-14');body.itemSleeping=true;delete body.dwarfBody;
   const track={animation,point,delayFrames:0,frames:a.frames,ghost:{kind:'character',player:body,direction:p.direction},ghostPoint:pointOf(map,p),hideAtFrame:a.frames,replaceActor:actor};
   groups.push({kind:'itemLifecycle',actor,item:dwarf.id,reason:'activated',timing:'after-action',point,tracks:[track],frames:a.frames});
  }
  for(const effect of p.effects){
   if(retained.has(identity(effect)))continue;
   const id=Number(effect.id.slice(9)),tracks=[],direction=p.direction;
   const add=(animation,point,delayFrames=0,extra={})=>{
    const a=catalog.animations[animation];if(!a)throw Error('道具结束动画缺失：'+animation);
    const track={animation,point,delayFrames,frames:a.frames,...extra};tracks.push(track);return track;
   };
   if(id===24||id===32){
    for(const [n,node] of (effect.nodes??[]).entries()){
     const cell=map.cells[node.at];
     add(33,{x:cell.x,y:cell.y},id===24?(2-n)*5:0,{ghost:{kind:'character',player:structuredClone(p),direction:node.direction},hideAtFrame:itemLifecycleEventFrame(catalog.animations[33],111)});
    }
   }else if(id===38){
    add(42,pointOf(map,p),0,{ghost:{kind:'character',player:structuredClone(p),direction},hideAtFrame:itemLifecycleEventFrame(catalog.animations[42],111),replaceActor:actor});
   }else if(FOLLOWERS[id]!==undefined){
    const animation=id===35?181:catalog.companions[id]+direction;
    // 4909a3 swaps the follower's own animation table after 60 ticks.
    // 4a0653 instead overlays 181, keeping the ghost until event 111.
    add(animation,followerPoint(map,p,effect),60,{ghost:{kind:'companion',animation:FOLLOWERS[id]+direction},hideAtFrame:id===35?itemLifecycleEventFrame(catalog.animations[animation],111):0});
   }
   const tick=['beginTurn','roll','aiAction'].includes(command.type)&&actor===before.turn&&p.effectTickPending;
   const waking=id===14&&((p.effects??[]).some(e=>['air','original-4','original-26','original-42'].includes(e.id)&&e.remaining===1)||(p.events??[]).some(e=>e.id===21&&e.remaining===1));
   const timing=tick&&(effect.remaining===1||waking)?'before-action':'after-action';
   if(tracks.length)groups.push({kind:'itemLifecycle',actor,item:effect.id,reason:'removed',timing,point:tracks[0].point,tracks,frames:Math.max(...tracks.map(t=>t.delayFrames+t.frames))});
  }
 });
 for(const road of before.roadItems??[]){
  if(!['original-6','door'].includes(road.id)||(after.roadItems??[]).some(n=>n.id===road.id&&n.at===road.at&&n.source===road.source))continue;
  const animation=road.id==='original-6'?29+road.direction:53+(road.direction>>1),a=catalog.animations[animation],{x,y}=map.cells[road.at],point={x,y};
  if(!a)throw Error('道路道具结束动画缺失：'+animation);
  // 493d54/4a2043 replace the static road actor immediately, then await101.
  groups.push({kind:'itemLifecycle',actor:road.source,item:road.id,reason:'removed',timing:'after-action',point,tracks:[{animation,point,delayFrames:0,frames:a.frames}],frames:a.frames});
 }
 return groups;
}
// Renderer consumes these entries in normal world depth order. Ghosts use
// existing character/item catalogs. Sprites use the new lifecycle catalog.
export function itemLifecycleFrame(group,frame,catalog){
 const sprites=[],ghosts=[],replaceActors=[];
 if(frame<0||frame>=group.frames)return {sprites,ghosts,replaceActors};
 for(const t of group.tracks){
  const local=frame-t.delayFrames;
  if(t.ghost&&local<t.hideAtFrame){ghosts.push({...t.ghost,point:t.ghostPoint??t.point});if(t.replaceActor!==undefined)replaceActors.push(t.replaceActor);}
  if(local>=0&&local<t.frames)for(const c of animationFrame(catalog.animations[t.animation],local,false))sprites.push({...c,point:t.point,animation:t.animation});
 }
 return {sprites,ghosts,replaceActors};
}
