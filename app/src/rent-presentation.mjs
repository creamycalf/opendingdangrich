import {originalLandItemNeighbor} from './land-items.mjs';
import {playerPosition} from './movement-position.mjs';

// New PC 44f7ca: Anime.dat, not Tools.dat. 0..3 point toward adjacent land;
// 4 is the non-directional cash shower. This module only reads committed state.
export function cashAnimationIndex(delta,direction=4,height=0){
 if(!Number.isInteger(direction)||direction<0||direction>4)throw Error('Invalid cash animation direction');
 if(!Number.isInteger(height)||height<0||height>2)throw Error('Invalid cash animation height');
 return direction===4?(delta<0?49:48):(delta<0?55:67)+direction*3+height;
}
export function cashDirection(point,lot){
 let d=4;if(point.x<lot.x)d=3;if(lot.x<point.x)d=2;if(point.y<lot.y)d=1;if(lot.y<point.y)d=0;return d;
}
export function cashVisualPlan(map,before,after,command){
 const actor=before.turn,p=before.players[actor],next=after.players[actor],q=before.pending,e=before.queue?.[0];
 const point=Number.isInteger(before.visitAt)?map.cells[before.visitAt]:playerPosition(map,p);
 const delta=next.cash-p.cash;
 const make=(kind,change,lot=null,pose=null,extra={})=>{
  const direction=lot===null?4:cashDirection(point,map.cells[lot]);
  const height=lot===null?0:Math.floor((before.levels[lot]??0)/2);
  return [{kind,actor,point:{x:point.x,y:point.y},lot,direction,height,delta:change,balanceDelta:delta,
   amountText:(change<0?'-':'+')+Math.trunc(Math.abs(change)),animation:cashAnimationIndex(change,direction,height),
   pose,numberOffset:{x:40,y:-60},receipts:[{who:actor,before:p.cash,after:next.cash}],...extra}];
 };
 if(command.type==='advance'&&e?.kind==='charge'){
  const debtor=e.debtor??actor;
  // Deferred debt, exempt or otherwise cancelled transactions get no success effect.
  if(after.pending?.kind==='debt'||before.players[debtor].spent===after.players[debtor].spent)return [];
  if(e.rent){
   const lot=originalLandItemNeighbor(map,before.visitAt??p.at),change=debtor===actor?-e.amount:e.amount;
   const receipts=[debtor,e.creditor].filter((n,i,a)=>n>=0&&a.indexOf(n)===i).map(who=>({who,before:before.players[who].cash,after:after.players[who].cash}));
   return make('rent',change,lot,change<0?6:null,{debtor,creditor:e.creditor,receipts});
  }
  if(e.creditor===-1&&delta<0)return make('fine',-e.amount,null,6);
 }
 if(command.type==='advance'&&e?.kind==='event'&&[10,12,13].includes(e.event)&&delta>0){
  return make(e.event===10?'reward':e.event===12?'pool':'rent-pool',delta,null,5,e.event===13?{animation:50,screenCentered:true}:{});
 }
 if(['answer','aiAnswer'].includes(command.type)&&q&&['buy','upgrade','property'].includes(q.kind)){
  if(before.owners[q.lot]===undefined&&after.owners[q.lot]===actor&&delta<0)return make('buy',delta,q.lot);
  if(after.levels[q.lot]>before.levels[q.lot]&&delta<0)return make('upgrade',delta,q.lot);
  if(before.owners[q.lot]===actor&&after.owners[q.lot]===undefined&&delta>0)return make('sell',delta,q.lot,null,{height:0,animation:cashAnimationIndex(delta,cashDirection(point,map.cells[q.lot]),0)});
 }
 // New PC 4453a7: only an accepted change plays the mine and cash sequence.
 // Withdrawal runs the mine backwards first; deposit runs it forwards while
 // paying. 401767 selects direction and 402193 seeks the first/last frame.
 if(['answer','aiAnswer'].includes(command.type)&&q?.kind==='bank'&&after.pending?.kind!=='bank'&&Math.trunc(next.cash)!==Math.trunc(p.cash)){
  const animation=map.animations?.[map.cells[q.lot]?.object],mineFrames=animation?.frames??0;
  return make('bank',delta,q.lot,null,{height:1,animation:cashAnimationIndex(delta,cashDirection(point,map.cells[q.lot]),1),mineFrames,preFrames:delta>0?mineFrames:0});
 }
 return [];
}

export function cashFrame(step,frame){return Math.max(0,frame-(step.preFrames??0));}
export function cashDuration(step,animation){return (step.preFrames??0)+Math.max(animation.frames,step.kind==='bank'&&step.delta<0?step.mineFrames:0);}
export function bankMineFrame(step,frame){return step.delta>0?frame<step.mineFrames?step.mineFrames-1-frame:step.mineFrames-1:Math.min(step.mineFrames-1,frame);}

// Unlike actor walking poses, cash sprites retain their DAT motion offsets.
// Reuse animationFrame(animation,tick,false) and boardActorSpritePoint to draw.
export function cashPresentationSprites(catalog,plan){
 const ids=new Set();for(const step of plan){const a=catalog.animations[step.animation];if(!a)throw Error('现金动画缺失：'+step.animation);for(const n of a.sprites)ids.add(n);}return [...ids];
}
