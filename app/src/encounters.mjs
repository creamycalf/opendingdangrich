import {actorCells} from './clones.mjs';
import {effectCapabilities} from './effects.mjs';
import {playerPosition} from './movement-position.mjs';

// 0x43d7c2 charges at each moving head/follower node. Occupancy slots are
// per player, so several stationary clones on one cell count only once.
export function encounterCharges(map,g){
 const capabilities=p=>effectCapabilities(p,0xfff|(p.character==='gian'?0x8000000:0));
 const p=g.players[g.turn],cap=capabilities(p);
 if(cap&0x200000)return [];
 const events=[],amount=Math.fround(20*g.inflation),pos=playerPosition(map,p);
 const moving=[...(Number.isInteger(pos.x)&&Number.isInteger(pos.y)?[p.at]:[]),...actorCells(p).slice(1)];
 for(const at of moving)for(let i=0;i<g.players.length;i++){
  const q=g.players[i],otherCap=capabilities(q);
  if(i===g.turn||q.eliminated||(otherCap&0x200000))continue;
  const qpos=playerPosition(map,q),occupied=[...(Number.isInteger(qpos.x)&&Number.isInteger(qpos.y)?[q.at]:[]),...actorCells(q).slice(1)];
  if(!occupied.includes(at))continue;
  if(cap&0x8000000)events.push({kind:'charge',amount,debtor:i,creditor:g.turn,text:'胖虎遇见'+q.name+'，收取 '+amount+' 个豆沙包。'});
  else if(otherCap&0x8000000)events.push({kind:'charge',amount,creditor:i,text:p.name+'遇见胖虎，交出 '+amount+' 个豆沙包。'});
 }
 return events;
}
