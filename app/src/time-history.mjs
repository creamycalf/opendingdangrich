// Original 0x4739c0 writes six rotating Database000a..000f checkpoints at
// round-cycle starts. 0x41373a reads the NEXT slot (oldest, once ring is full).
// These files are generated during play, not missing installation assets.
export const emptyHistory=()=>({next:0,slots:Array(6).fill(null)});
export function checkpoint(g){
 const h=g.history??emptyHistory(),{history,...state}=g;
 const snapshot=JSON.parse(JSON.stringify(state));
 // A month-end statement is informational: earnings have already settled.
 if(snapshot.pending?.kind==='monthly'&&snapshot.pending.resume==='ready'){
  snapshot.pending=null;snapshot.phase='ready';
 }
 const slots=h.slots.slice();slots[h.next]=snapshot;
 g.history={next:(h.next+1)%6,slots};
}
export function oldestCheckpoint(g){return g.history?.slots[g.history.next]??null;}
export function rewindHistory(g){
 const past=oldestCheckpoint(g);if(!past)throw Error('时光机尚未形成历史记录');
 const restored=JSON.parse(JSON.stringify(past)),seed=g.seed,serial=g.turnSerial+1;
 for(const key of Object.keys(g))delete g[key];
 Object.assign(g,restored,{seed,turnSerial:serial,history:emptyHistory()});
 // Original load 0x48aa52 deletes every history file. RNG is not in its save
 // record; keep the current random stream, avoiding a repeated-event loop.
 return g.round;
}
