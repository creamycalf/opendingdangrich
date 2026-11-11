import {relocateClones} from './clones.mjs';
import {oldestCheckpoint} from './time-history.mjs';
import {HERMIT_EVENTS as E,HERMIT_CONFLICTS as C,HERMIT_TEXT as T} from './hermit-data.mjs';
import {effectCapabilities,hasEffect,EFFECTS,fallAsleep} from './effects.mjs';
import {itemKey,ITEMS} from './inventory.mjs';
import {wakeSleep} from './target-items.mjs';
import {cashAtRefresh} from './pc-economy.mjs';
import {mapRegion,insideRegion} from './map-regions.mjs';
const f=Math.fround;
const itemId=e=>EFFECTS[e.id]?.originalId??ITEMS[e.id]?.originalId;
const lots=(g,who)=>Object.keys(g.owners).map(Number).filter(i=>g.owners[i]===who);
const kind=(g,i)=>g.kinds?.[i]??((g.levels[i]??0)>0?1:0);
// New PC 0x412d1f uses region 3 coordinates, not the saved jail movement flag.
const outsidePrison=(map,p)=>!insideRegion(mapRegion(map,3),p.at%map.width,Math.floor(p.at/map.width));
export function hermitCompatible(p,id){
 const c=effectCapabilities(p),e=E[id];
 return !p.eliminated&&!!(c&0x800)&&!(c&(e.good?0x10000:0x20000))&&
  !p.effects.some(x=>C.item[itemId(x)]?.[id]===2)&&!(p.events??[]).some(x=>C.event[x.id][id]===2);
}
export function hermitGood(p,draw){const c=effectCapabilities(p);return c&0x10000?false:c&0x20000?true:draw(1000)>=667;}
// Constructor RNG occurs even when the category later rejects the candidate.
export function createHermitEvent(id,g,draw){
 const e={id,all:id===10};
 if(id===0)e.item=draw(42);
 if([5,8,14,22,23,24,25,26,30].includes(id))e.all=draw(1000)>=(id===26?701:501);
 if(id===9)e.rate=f((draw(10)+1)/100);
 if(id===28)e.rate=f((draw(20)+20)*g.interestRate/100);
 return e;
}
function pickLot(g,who,predicate,draw){const owned=lots(g,who);if(!owned.length)return null;for(let n=0;n<100;n++){const i=owned[draw(owned.length)];if(n<99&&predicate(i))return i;}return null;}
export function prepareHermitEvent(map,g,e,draw){
 const p=g.players[g.turn],id=e.id,eligible=q=>hermitCompatible(q,id);
 if(!eligible(p))return false;
 if(id===0)return e.item!==33&&!(p.character==='suneo'&&[10,19,27].includes(e.item));
 if(id===1)return !(effectCapabilities(p)&0x800000);
 if(id===3){for(let n=0;n<100;n++){const x=draw(map.width),y=draw(map.height),i=y*map.width+x;if(n<99&&map.cells[i].event===1&&g.owners[i]===undefined){e.lot=i;return true;}}return false;}
 if(id===4){e.lot=pickLot(g,g.turn,i=>kind(g,i)<=1&&g.levels[i]<4,draw);return e.lot!==null;}
 if(id===10)return g.players.some(q=>!q.eliminated&&q.itemSleeping);
 if(id===12){e.count=lots(g,g.turn).filter(i=>g.levels[i]>0).length;return e.count>0;}
 if(id===22)return (e.all?g.players:[p]).some(q=>eligible(q)&&!q.small);
 if(id===26)return (e.all?g.players:[p]).some(q=>eligible(q)&&q.inventory.length);
 if(id===27)return g.players.some((q,i)=>eligible(q)&&!hasEffect(q,'original-17')&&lots(g,i).some(j=>kind(g,j)!==0));
 if(id===29)return g.players.some((q,i)=>!q.eliminated&&lots(g,i).some(j=>kind(g,j)===3));
 if(id===30)return !!map.jail&&(e.all?g.players:[p]).some(q=>!q.eliminated&&outsidePrison(map,q));
 if(id===31)return g.bankClosed===0;
 if(id===32)return g.players.some((q,i)=>!q.eliminated&&lots(g,i).some(j=>kind(g,j)!==0));
 if(id===33)return !!oldestCheckpoint(g);
 if(id===34)return g.players.some(q=>!q.eliminated&&q.cash>0);
 return true;
}
export function drawHermitEvent(map,g,draw){
 const good=hermitGood(g.players[g.turn],draw);
 for(let n=0;n<10000;n++){const e=createHermitEvent(draw(35),g,draw);if(E[e.id].good===good&&prepareHermitEvent(map,g,e,draw))return e;}
 throw Error('仙人事件抽取未找到合法分支');
}
export function attachHermitEvent(p,e,g,who,compensation=E[e.id].compensation){
 const id=e.id,def=E[id];
 p.effects=p.effects.filter(x=>C.item[itemId(x)]?.[id]!==1);
 p.events=(p.events??[]).filter(x=>C.event[x.id][id]!==1);
 if(def.duration)p.events.push({id,remaining:def.duration+(who!==g.turn&&p.effectClockStarted?1:0)});
 if(!def.good&&hasEffect(p,'original-34'))p.cash=cashAtRefresh(g,p.cash+f(compensation*g.inflation));
 if(id===21)fallAsleep(p);
 p.small=p.effects.some(x=>['original-39','original-43'].includes(x.id))||p.events.some(x=>x.id===22);
}
export function applyHermitEvent(map,g,e,draw){
 const id=e.id,charges=[];let who=g.turn;
 if(!e.all&&((id>=14&&id<=26)||id===29||id===30)){
  const actor=g.players[who],diamond=actor.effects.find(x=>x.id==='original-17');
  if(diamond){actor.effects=actor.effects.filter(x=>x!==diamond);const q=g.players[diamond.target];
   if(q&&hermitCompatible(q,id)&&(id!==22||!q.small)&&(id!==26||q.inventory.length)&&(id!==30||outsidePrison(map,q)))who=diamond.target;
  }
 }
 const p=g.players[who];
 const targets=e.all?g.players.map((q,i)=>i):[who];
 const attach=(i,comp)=>attachHermitEvent(g.players[i],e,g,i,comp);
 const charge=(i,amount)=>{if(amount>0)charges.push({kind:'charge',amount:f(amount),debtor:i,creditor:-2,text:g.players[i].name+'：'+E[id].name+'，支付 '+Math.trunc(amount)+' 个豆沙包。'});};
 let text=E[id].name+'。';
 if(id===0){p.inventory.push(itemKey(e.item));text=T[0]+ITEMS[itemKey(e.item)].name+T[1];}
 else if(id===3){g.owners[e.lot]=who;g.levels[e.lot]=0;g.kinds[e.lot]=0;text=T[4];}
 else if(id===4){g.levels[e.lot]++;g.kinds[e.lot]=1;text=T[5];}
 else if(id===8){const amount=Math.trunc(1000*g.inflation);for(const i of targets)if(hermitCompatible(g.players[i],id))g.players[i].cash=cashAtRefresh(g,g.players[i].cash+amount);text=(e.all?T[10]:T[12])+amount+(e.all?T[11]:T[13]);}
 else if(id===9){g.interestRate=f(g.interestRate+e.rate);text=T[14];}
 else if(id===10){for(const q of g.players)if(q.itemSleeping&&hermitCompatible(q,id)){wakeSleep(q);}text=T[15];}
 else if(id===11){text=T[16];}
 else if(id===12){const amount=f(g.inflation*100*e.count);p.cash=cashAtRefresh(g,p.cash+amount);text='现有 '+e.count+' 座建筑，共获得 '+Math.trunc(amount)+' 个豆沙包。';}
 else if(id===13){g.shopDiscount=10;text=T[19];}
 else if(id===25){const amount=Math.trunc(-500*g.inflation);for(const i of targets)if(hermitCompatible(g.players[i],id)){attach(i);charge(i,-amount);}text=(e.all?T[35]:T[37])+(-amount)+(e.all?T[36]:T[38]);}
 else if(id===26){for(const i of targets){const q=g.players[i];if(!hermitCompatible(q,id)||!q.inventory.length)continue;let item;if(q.inventory.includes('original-33')&&draw(1000)>=501)item=33;else{do{item=draw(42);}while(!q.inventory.includes(itemKey(item)));}q.inventory.splice(q.inventory.indexOf(itemKey(item)),1);attach(i);}text=T[e.all?39:40];}
 else if(id===27){let i;do{i=draw(4);}while(!hermitCompatible(g.players[i],id)||hasEffect(g.players[i],'original-17')||!lots(g,i).some(j=>kind(g,j)!==0));const owned=lots(g,i);let lot;do{lot=owned[draw(owned.length)];}while(kind(g,lot)===0);const area=[lot],seen=new Set(area);for(const j of area){const c=map.cells[j];for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){const x=c.x+dx,y=c.y+dy,k=y*map.width+x;if(x>=0&&y>=0&&x<map.width&&y<map.height&&!seen.has(k)&&g.owners[k]!==undefined&&kind(g,k)!==0){seen.add(k);area.push(k);}}}for(const j of area){g.levels[j]=0;g.kinds[j]=0;}attach(i);text=T[41];}
 else if(id===28){g.interestRate=f(g.interestRate-e.rate);for(let i=0;i<4;i++)if(i!==who&&hermitCompatible(g.players[i],id))attach(i);text=T[42];}
 // 0x411ef0 starts with the diamond recipient, then visits every slot except
 // the ORIGINAL actor. The redirected recipient can therefore be taxed twice.
 // 0x412ece (property tax) has the same iteration but never redirects.
 else if(id===29||id===32){for(const i of [who,...g.players.map((_,i)=>i).filter(i=>i!==g.turn)]){const q=g.players[i],cap=effectCapabilities(q);if(q.eliminated||!(cap&0x800)||(cap&0x20000))continue;let amount=0;for(const j of lots(g,i)){const k=kind(g,j),v=id===29?(k===3?100:0):k===3?200:k===2?250:k===1?[0,20,30,50,70][g.levels[j]]:0;amount=f(amount+v*g.inflation);}if(amount){attach(i,id===29?amount/g.inflation/2:amount/2);charge(i,amount);}}text=T[id===29?43:48];}
 else if(id===30){for(const i of targets)if(hermitCompatible(g.players[i],id)){const q=g.players[i];q.at=map.jail.y*map.width+map.jail.x;q.half=null;q.direction=map.jail.direction;q.previous=-1;q.jail=true;relocateClones(map,q);attach(i);}text=T[e.all?45:46];}
 else if(id===31){g.bankClosed=10;for(let i=0;i<4;i++)if(i!==who&&hermitCompatible(g.players[i],id))attach(i);text=T[47];}
 else if(id===33){text=T[49];}
 else if(id===34){let sum=0,count=0;for(const q of g.players)if(!q.eliminated){sum=f(sum+Math.max(0,q.cash));count++;}const mean=f(sum/count);for(const q of g.players)if(!q.eliminated)q.cash=mean;p.cash=cashAtRefresh(g,p.cash);text=T[50];}
 else{for(const i of targets)if(hermitCompatible(g.players[i],id)&&(id!==22||!g.players[i].small))attach(i);const ti={1:2,2:3,5:e.all?6:7,6:8,7:9,14:e.all?20:21,15:22,16:23,17:24,18:25,19:26,20:27,21:28,22:e.all?29:30,23:e.all?31:32,24:e.all?33:34}[id];text=T[ti];}
 return {text:(who!==g.turn?g.players[g.turn].name+'的恶运钻石将事件转移给'+p.name+'。\n':'')+text,charges,minigame:id===11,rewind:id===33};
}
