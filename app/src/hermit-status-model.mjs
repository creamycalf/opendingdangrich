// Compare only one uninterrupted player's view. Switching players is not expiry.
export function diffHermitStatuses(previous,next){const ids=new Set(next.map(e=>e.id));return previous.filter(e=>!ids.has(e.id));}
// 4152d9: NPC16/17 frame22 triggers 41445c -> slot250 -> Events12.
// Its frame3 toggles the icon off. Events13 is ability feedback, NOT removal.
export function hermitRemovalFrame(tick,good,lastOfKind=true){
 return {npc:tick<40?(good?16:17):(good?14:15),npcTick:tick<40?tick:(tick-40)%10,npcY:tick<40?0:-(tick-40),status:tick>=22&&tick<31?12:null,statusTick:Math.max(0,tick-22),iconVisible:tick<25,done:tick>=(lastOfKind?88:40)};
}
