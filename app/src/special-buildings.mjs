import {relocateClones} from './clones.mjs';
import {originalLandItemNeighbor} from './land-items.mjs';
import {propertyKind} from './property-items.mjs';
import {canBeAttacked,hasEffect,replaceConflictingEffects} from './effects.mjs';

export const SPECIAL_BUILDINGS=['original-40','original-41'];
export function specialBuildStatus(map,g,item){
 const lot=originalLandItemNeighbor(map,g.players[g.turn].at);
 const allowed=SPECIAL_BUILDINGS.includes(item)&&lot!==null&&g.owners[lot]===g.turn&&g.levels[lot]===0;
 return {lot,allowed,reason:allowed?'':'需要停在自己尚未建造建筑的属地旁。'};
}
export function buildSpecial(map,g,item){
 const status=specialBuildStatus(map,g,item);if(!status.allowed)throw Error(status.reason);
 g.levels[status.lot]=1;g.kinds[status.lot]=item==='original-40'?3:2;return status.lot;
}
// 0x44ea0d deliberately does not consult the item conflict predicates.
export function canMissileTarget(g,source,target){
 const p=g.players[source],q=g.players[target];
 return !!p&&!!q&&!q.eliminated&&canBeAttacked(q)&&!(p.character==='nobita'&&q.character==='shizuka')&&!p.effects.some(e=>e.id==='original-27'&&e.source===target);
}
export const missileTargets=(g,source=g.turn)=>g.players.flatMap((p,i)=>i!==source&&canMissileTarget(g,source,i)?[i]:[]);
// New PC 0x445ae6 removes the camera via 0x43b2d0 only after a valid
// redirected target passes 0x44ed7e. Only one camera is consulted.
export function missileRedirect(g,source,target){
 const camera=g.players[target].effects.find(e=>e.id==='original-7');
 if(!camera||!canMissileTarget(g,source,camera.target))return target;
 g.players[target].effects=g.players[target].effects.filter(e=>e!==camera);
 return camera.target;
}
export function specialArrival(map,g){
 const p=g.players[g.turn],lot=originalLandItemNeighbor(map,g.visitAt??p.at);
 if(lot===null||g.owners[lot]===undefined)return null;
 const own=g.owners[lot]===g.turn&&!hasEffect(p,'original-15'),kind=propertyKind(g,lot);
 if(own&&kind===2&&missileTargets(g).length)return {kind:'missile',lot};
 if(!own&&kind===3&&!p.effects.some(e=>e.id==='original-14'&&e.active))return {kind:'cannon',lot};
 return null;
}
export function fireSpecial(map,g,lot,target){
 const kind=propertyKind(g,lot),source=g.owners[lot],jail=map.jail;
 if(![2,3].includes(kind)||source===undefined||!g.players[target]||!jail)throw Error('特殊建筑或目标无效');
 const actual=kind===2?missileRedirect(g,source,target):target,p=g.players[actual];
 replaceConflictingEffects(p,kind===2?'original-41':'original-40',source,true);
 p.at=jail.y*map.width+jail.x;p.half=null;p.previous=-1;p.direction=jail.direction;p.jail=true;relocateClones(map,p);
 if(actual===g.turn){g.remaining=0;g.queue=[];g.afterQueue='end';}
 return actual;
}
