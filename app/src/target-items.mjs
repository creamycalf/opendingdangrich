import {canAttackPlayer,hasEffect,applyEffect,replaceConflictingEffects,originalAttachmentCount,sleepSource,wakePlayer,fallAsleep} from './effects.mjs';
export {sleepSource} from './effects.mjs';

// Original selection callbacks 0x49a664 and use gate 0x49a1ae.
export function canTakeSleep(caster,target){
 // New PC 0x49c8b4: the donor branch returns before the attack/character gates.
 return !target.eliminated&&sleepSource(target);
}
export function canGiveSleep(g,donor,recipient){
 return donor!==recipient&&!!g.players[recipient]&&canAttackPlayer(g.players[g.turn],g.players[recipient],g.turn,'original-26',recipient);
}
export function sleepTransferAvailable(g){
 const p=g.players[g.turn];
 return g.players.some((q,i)=>i!==g.turn&&canTakeSleep(p,q))&&g.players.some((q,i)=>i!==g.turn&&!sleepSource(q)&&canGiveSleep(g,-1,i));
}
export function wakeSleep(p){
 p.effects=p.effects.filter(e=>!['air','original-4','original-26','original-42'].includes(e.id));
 p.events=(p.events??[]).filter(e=>e.id!==21);wakePlayer(p);
}
export function transferSleep(g,donor,recipient){
 const from=g.players[donor],to=g.players[recipient];
 replaceConflictingEffects(from,'original-26',g.turn,true);wakeSleep(from);
 applyEffect(to,'original-26',g.turn,recipient===g.turn,true);
}
// Selection callbacks test a single camera, before the air-gun hit draw.
// Cloth, situation-swap and friendship-ring callbacks never consult it.
const reflectable=['original-3','original-4','original-7','original-15','original-17','original-25','original-26','original-35','air','original-39'];
export function redirectAttack(g,id,target,donor=-1){
 if(!reflectable.includes(id))return target;
 const p=g.players[target],camera=p.effects.find(e=>e.id==='original-7');
 if(!camera||!g.players[camera.target])return target;
 const allowed=id==='original-26'?canGiveSleep(g,donor,camera.target):canAttackPlayer(g.players[g.turn],g.players[camera.target],g.turn,id,camera.target);
 if(!allowed)return target;
 p.effects=p.effects.filter(e=>e!==camera);return camera.target;
}
// 0x4438fb schedules retaliation after normal rent, never reversed rent.
// 0x4931b9 attaches internal factory item 42 directly, without attack eligibility.
export function retaliateRent(g,source,owner){
 const p=g.players[source],q=g.players[owner];
 if(!p||!q||q.eliminated||sleepSource(q)||!hasEffect(p,'original-8'))return false;
 replaceConflictingEffects(q,'original-42',owner,true);
 q.effects.push({id:'original-42',source:owner,remaining:originalAttachmentCount(5,owner===g.turn,q.effectClockStarted)});fallAsleep(q);
 p.effects=p.effects.filter(e=>e.id!=='original-8');return true;
}
