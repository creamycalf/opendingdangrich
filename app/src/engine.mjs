import {initialBellCount,spawnBells,collectBell} from './bells.mjs';
import {originalAiBuy,originalAiProperty} from './property-ai.mjs';
import {initialItemAi,syncItemAiProperties,originalAiAttacked,originalAiRent} from './pc-item-ai.mjs';
import {originalAiBank,originalAiShop} from './ai-commerce.mjs';
import {pcEconomy,pcPropertyPayment,settleCashDebtDay,cashAtRefresh} from './pc-economy.mjs';
import {bankTransfer} from './bank-transfer.mjs';
import {pcTerrainSpin,finishPcRoll} from './pc-roll-spin.mjs';
import {rollEndpoints} from './roll-preview.mjs';
import {checkpoint,emptyHistory,rewindHistory} from './time-history.mjs';
import {encounterCharges} from './encounters.mjs';
import {armMovementHermit,movementHermit} from './movement-hermit.mjs';
import {specialRegionTransition} from './special-regions.mjs';
import {mapRegion,insideRegion} from './map-regions.mjs';
import {CLONE_ITEMS,planClones,cloneNodes,actorCells,followClones,relocateClones,validClones} from './clones.mjs';
import {magnetDirection} from './magnet.mjs';
import {canEnterTunnel,crossTunnel} from './tunnel.mjs';
import {retaliateRent} from './target-items.mjs';
import {SPECIAL_BUILDINGS,specialBuildStatus,buildSpecial,specialArrival,fireSpecial,missileTargets} from './special-buildings.mjs';
import {propertyKind,canSwapBuilding,swapBuildings} from './property-items.mjs';
import {playerPosition,halfStepTarget,movePosition} from './movement-position.mjs';
import {canTakeSleep,canGiveSleep,sleepTransferAvailable,transferSleep,redirectAttack} from './target-items.mjs';
import {REDIRECT_ITEMS} from './effects.mjs';
import {drawHermitEvent,applyHermitEvent} from './hermit.mjs';
import {HERMIT_EVENTS} from './hermit-data.mjs';
import {selectMiniGame} from './minigame-selection.mjs';
import {effectCapabilities} from './effects.mjs';
import {originalLuckyShot,originalLuckyShotV126} from './effects.mjs';
import {originalBombDestination} from './bomb.mjs';
import {gameRoadPlacement,chooseDoorDirection,originalDoorDestination,originalCannonDirection} from './road-items.mjs';
import {TARGET_ITEMS,replaceConflictingEffects} from './effects.mjs';
import {rentRecipient} from './effects.mjs';
import {advanceDayCycle} from './day-clock.mjs';
import {INITIAL_INTEREST,accrueInterest,inflate,inflateV126,settleMonthly} from './monthly.mjs';
import {nextCircleReward,originalCircleFine,accrueRentPool} from './board-events.mjs';
// Durable board-game flow. Evidence and provisional formulas: docs/rules/FLOW-0.2.md.
import {createMiniGame,tickMiniGame,validMiniGame,miniRewards,MINI_GAMES} from './minigames.mjs';
import {DIRECTIONS, movementDirectionMask} from './navigation.mjs';
import {originalDirection,originalRoadDirection} from './pc-navigation.mjs';
import {scaledLandPrice,originalPropertyCharge,originalUpgradeCost,originalPropertyValue,originalSaleValue} from './property.mjs';
import {originalShopPrice,mapShop} from './shop.mjs';
import {originalLandItemNeighbor,landItemStatus,applyLandItem} from './land-items.mjs';
import {applyEffect,hasEffect,hasEffectFrom,originalAirHit,tickPlayerEffects,validEffects,EFFECTS,SELF_EFFECTS,effectApplicationStatus,mustPayRent,canCollectRent,canVisitShop,affectedByHermit,protectedFromFine,canAttackPlayer} from './effects.mjs';
import {ITEMS,startingInventory,originalMonthlyGiftIds,itemKey} from './inventory.mjs';
export {ITEMS} from './inventory.mjs';
export const RULESET = 'town-flow-28';
export const CHARACTERS = [
  {id:'doraemon',name:'哆啦A梦',portrait:23,description:'每走一格吃掉一个豆沙包；开局从指定道具中抽取 22 种。'},
  {id:'nobita',name:'大雄',portrait:27,description:'每月 1 日轮到自己时得到空气枪；不能攻击静香。'},
  {id:'dorami',name:'哆啦美',portrait:31,description:'开局从指定道具中抽取 22 种，没有移动消耗。'},
  {id:'shizuka',name:'静香',portrait:35,description:'星期日休息。每月 1 日轮到自己时得到友情药袋和人见人爱丸，可免租或避免成为攻击目标。'},
  {id:'suneo',name:'小夫',portrait:39,description:'手持豆沙包和矿山存款均为其他角色的两倍。'},
  {id:'gian',name:'胖虎',portrait:43,description:'最多前进四格；遇到其他角色收取少量豆沙包。'},
  {id:'yellow',name:'黄耳叮当',portrait:47,description:'开局拥有全部 42 种道具，每种一件。'},
];
export function itemPrice(map,lot,item,kind='buy',g){
  requireState(Object.hasOwn(ITEMS,item),'道具无效');
  return originalShopPrice(mapShop(map,lot),ITEMS[item].originalId,kind,g?.inflation??1,g?.shopDiscount?60:100);
}
// Original shop 0x4a3c70; Suneo constructor sets capability 0x04000000.
export const canBuyItem=(player,item)=>!(player.character==='suneo'&&[10,19,27].includes(ITEMS[item]?.originalId));
export const LEVEL_NAMES=['空地基','铃铛地基','铃铛铜像','高台铃铛铜像','地主铜像'];
export const walkable=c=>!!c&&!!(c.flags&128)&&!(c.flags&64);
export const landPrice=(c,g)=>scaledLandPrice(c,g?.inflation??1);
export const idx=(map,x,y)=>y*map.width+x;
const requireState=(ok,message)=>{if(!ok)throw Error(message);};
const integer=(v,min=0,max=1e9)=>Number.isInteger(v)&&v>=min&&v<=max;
const money=(v,min=0)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=1e9;
const f32=Math.fround;
export const moneyText=value=>String(Math.trunc(value));
export function adjacent(map,index){const c=map.cells[index];if(!c)return [];return [[0,-1],[0,1],[-1,0],[1,0]].map(([dx,dy])=>[c.x+dx,c.y+dy]).filter(([x,y])=>x>=0&&y>=0&&x<map.width&&y<map.height).map(([x,y])=>idx(map,x,y));}
export const neighbors=(map,i)=>adjacent(map,i).filter(n=>walkable(map.cells[n]));
const mainRoadCache=new WeakMap();
export function teleportAllowed(map,to){
  if(!mainRoadCache.has(map)){const s=map.starts[0],start=idx(map,s.x,s.y),seen=new Set([start]),queue=[start];for(const i of queue)for(const n of neighbors(map,i))if(!seen.has(n)){seen.add(n);queue.push(n);}mainRoadCache.set(map,seen);}
  return mainRoadCache.get(map).has(to)&&map.cells[to]?.event===0;
}
// Closed exit tiles retain the road bit and a circle event. Western map uses
// event 7; future map uses a static object (type 7) rather than type 5.
const jailGate=c=>!!c&&(c.flags&0xc0)===0xc0&&c.event>=7&&c.event<=14;
export function random(g,n){
  if(g.randomVersion==='pc-v126'){
    g.seed=(Math.imul(g.seed,214013)+2531011)>>>0;
    const sample=(g.seed>>>16)&32767;
    return sample===32767?n-1:Math.trunc((sample/32767)*n);
  }
  g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return Math.floor(g.seed/4294967296*n);
}
export function dateParts(g){const d=new Date(g.startDate+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+g.round-1);return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),weekday:d.getUTCDay()};}
const monthKey=date=>String(date.year).padStart(4,'0')+'-'+String(date.month).padStart(2,'0');
export function daysInTerm(startDate,years){
  if(!Number.isInteger(years)||years<1||years>8)return 0;
  const start=new Date(startDate+'T12:00:00Z'), end=new Date(start);
  end.setUTCFullYear(start.getUTCFullYear()+years);
  return (end-start)/86400000;
}
export function createGame(map,options={}){
  const slots=options.players??[{character:'doraemon',control:'human'},{character:'nobita',control:'ai'},{character:'shizuka',control:'ai'},{character:'gian',control:'ai'}];
  requireState(slots.length===4&&new Set(slots.map(p=>p.character)).size===4,'请选择四名不同角色');
  requireState(slots.every(p=>CHARACTERS.some(c=>c.id===p.character)&&['human','ai'].includes(p.control)),'角色或控制方式无效');
  const startDate=options.startDate??'2000-01-01';
  requireState(/^\d{4}-\d{2}-\d{2}$/.test(startDate)&&Number.isFinite(Date.parse(startDate)),'日期无效');
  const years=options.maxYears??0;requireState(Number.isInteger(years)&&years>=0&&years<=8,'年期无效');
  const limit=years?daysInTerm(startDate,years):options.maxRounds??0;requireState(years||[0,30,60,120].includes(limit),'局长无效');
  const g={version:2,ruleset:RULESET,map:map.id,mapRevision:map.revision??'legacy',turn:0,round:1,startDate,maxRounds:limit,...(years?{maxYears:years}:{}),seed:(options.seed??123456789)>>>0,
    phase:'ready',remaining:0,dice:0,owners:{},levels:{},kinds:{},miniPlayed:0,shopDiscount:0,bankClosed:0,eventExtra:false,queue:[],afterQueue:'end',pending:null,
    chargedLots:[],roadItems:[],dayCycle:0,slowDays:0,inflation:1,interestRate:INITIAL_INTEREST,extraTurn:false,pool:0,rentPool:0,rewardNext:50,log:[],winners:[],endReason:'',turnSerial:0,
    players:slots.map((slot,i)=>{const character=CHARACTERS.find(c=>c.id===slot.character),s=map.starts[i],cash=slot.character==='suneo'?2000:1000;return {character:slot.character,name:character.name,control:slot.control,at:idx(map,s.x,s.y),previous:-1,direction:s.direction,cash,bank:cash,interest:0,walkPoints:0,monthlyClaimed:false,eliminated:false,skip:0,jail:false,charm:false,effects:[],events:[],small:false,half:null,effectTickPending:false,effectClockStarted:false,itemSleeping:false,inventory:[],lastGiftMonth:'',rentEarned:0,spent:0};})};
  if(map.revision==='pc-v126'){g.randomVersion='pc-v126';g.pcAnimatedRoll=true;g.firstSeatBreaksTie=true;g.propertyAiVersion='pc-v126';g.pcEconomyVersion='pc-v126';g.itemAiVersion='pc-v126';g.pcNavigationVersion='pc-v126';g.pcNavigationFirst=true;g.pcNavigationForced=null;for(const [seat,p] of g.players.entries()){p.cashDebtDays=0;p.itemAi={...initialItemAi(p.character),seat,propertyOrder:[]};}}
  for(const p of g.players)p.inventory=startingInventory(p.character,n=>random(g,n));
  spawnBells(map,g,initialBellCount(map),n=>random(g,n));
  record(g,'新游戏开始：四人参加，最后未破产的玩家获胜。');checkpoint(g);return g;
}
function record(g,text){syncItemAiProperties(g);g.log.push({round:g.round,text});if(g.log.length>80)g.log.shift();}
function prompt(g,p){g.pending=p;g.phase='prompt';}
function notice(g,text){record(g,text);prompt(g,{kind:'notice',text});}
function schedule(g,events,after='end'){g.queue=events;g.afterQueue=after;g.phase='resolving';g.pending=null;}
export function choices(map,g){
  const half=halfStepTarget(map,g.players[g.turn]);if(half!==null)return [half];
  const p=g.players[g.turn],at=map.cells[p.at],canEnter=i=>walkable(map.cells[i])||((p.jail||g.pcNavigationVersion==='pc-v126')&&jailGate(map.cells[i]));
  if(g.pcNavigationVersion==='pc-v126'&&g.pcNavigationForced!==null){const [dx,dy]=DIRECTIONS[g.pcNavigationForced],x=at.x+dx,y=at.y+dy,to=idx(map,x,y);return x>=0&&y>=0&&x<map.width&&y<map.height&&canEnter(to)?[to]:[];}
  {
    // The original navigation query still sees a closed jail gate as blocked.
    // Its two-square forward probe allows crossing that gate from inside.
    const free=(x,y)=>x>=0&&y>=0&&x<map.width&&y<map.height&&walkable(map.cells[idx(map,x,y)]);
    const mask=movementDirectionMask(map,p,free);
    const exits=DIRECTIONS.flatMap(([dx,dy],d)=>mask&(1<<d)&&canEnter(idx(map,at.x+dx,at.y+dy))?[idx(map,at.x+dx,at.y+dy)]:[]);
    if(exits.length){
      if(g.pcNavigationVersion==='pc-v126')return exits;
      // A door spans one axis. The original movement controller turns away
      // from its solid side; walking back remains possible at a blocked fork.
      const allowed=exits.filter(to=>{const dest=map.cells[to],d=dest.x>at.x?3:dest.x<at.x?2:dest.y>at.y?1:0,tunnel=g.roadItems.find(o=>o.id==='original-6'&&o.at===to);if(tunnel&&!canEnterTunnel(p,tunnel,d))return false;const door=g.roadItems.find(o=>o.id==='door'&&o.at===p.at);if(!door)return true;const c=map.cells[to],axis=c.x!==at.x?2:0;return (door.direction&2)===axis;});
      if(allowed.length)return allowed;
      const [dx,dy]=DIRECTIONS[p.direction],back=idx(map,at.x-dx,at.y-dy);if(canEnter(back))return [back];
      return [];
    }
    const [dx,dy]=DIRECTIONS[p.direction],back=idx(map,at.x-dx,at.y-dy);return canEnter(back)?[back]:[];
  }
}
export function beginTurn(g){
  requireState(g.phase==='ready','回合尚未准备好');const p=g.players[g.turn];
  requireState(!p.eliminated,'已破产角色不能开始回合');
  if(pcEconomy(g))p.cash=cashAtRefresh(g,p.cash);
  const date=dateParts(g),month=monthKey(date),gifts=originalMonthlyGiftIds(p.character,date.day,g.dayCycle);
  if(gifts.length&&p.lastGiftMonth!==month){
    p.lastGiftMonth=month;const items=gifts.map(itemKey);p.inventory.push(...items);
    record(g,'每月道具：'+p.name+'得到'+items.map(id=>ITEMS[id].name).join('、')+'。');
  }
  for(const id of tickPlayerEffects(p))record(g,p.name+'的'+(EFFECTS[id]?.name??HERMIT_EVENTS[Number(id.slice(7))].name)+'已结束。');
  if(!(effectCapabilities(p)&2)){schedule(g,[{kind:'message',text:p.name+'受到仙人影响，暂停行动。'}]);return false;}
  if(p.itemSleeping){schedule(g,[{kind:'message',text:p.name+'正在昏睡，休息等待醒来。'}]);return false;}
  if(p.skip>0){p.skip--;schedule(g,[{kind:'message',text:p.name+'休息一回合。'}]);return false;}
  if(p.character==='shizuka'&&dateParts(g).weekday===0){schedule(g,[{kind:'message',text:'静香星期日洗澡，休息一回合。'}]);return false;}
  return true;
}
export function roll(g,map,animated=true){
  requireState(g.phase==='ready','当前不能掷骰');const p=g.players[g.turn];
  const limit=p.jail?3:p.character==='gian'?4:6;
  if(g.pcAnimatedRoll&&map){
    const cache=new Map();
    const has=(face,direction)=>{
      const key=direction*8+face;
      if(!cache.has(key))cache.set(key,rollEndpoints(map,{...p,direction},face).length>0);
      return cache.get(key);
    };
    const plan=animated?pcTerrainSpin(limit,random(g,12),p.direction,has)
      :finishPcRoll(1+random(g,limit),p.direction,has);
    g.rollPlan=plan;g.dice=plan.result;p.direction=plan.direction;
  }else g.dice=1+random(g,limit);
  g.remaining=g.dice;g.phase='moving';g.chargedLots=[];if(g.pcNavigationVersion==='pc-v126'){g.pcNavigationFirst=true;g.pcNavigationForced=null;}
  armMovementHermit(g,n=>random(g,n));
  record(g,p.name+'掷出 '+g.dice+' 点。');return g.dice;
}
export function rent(map,g,lot){return originalPropertyCharge(map,g.owners,g.levels,lot,g.inflation).amount;}
export function upgradeCost(map,g,lot){requireState(propertyKind(g,lot)<2,'特殊建筑不能升级');return originalUpgradeCost(map.cells[lot],g.levels[lot]??0,g.inflation);}
export function propertyValue(map,g,lot){return originalPropertyValue(map.cells[lot],propertyKind(g,lot)>=2?0:g.levels[lot]??0,g.inflation);}
export const saleValue=(map,g,lot)=>originalSaleValue(map.cells[lot],g.levels[lot]??0,g.inflation);
export function ownedLots(g,who=g.turn){return Object.keys(g.owners).map(Number).filter(i=>g.owners[i]===who);}
export function netWorth(map,g,who){const p=g.players[who];return ownedLots(g,who).reduce((v,i)=>f32(v+propertyValue(map,g,i)),f32(p.cash+p.bank+p.walkPoints));}
export function liquidity(map,g,who=g.turn){const p=g.players[who];return p.cash+p.bank+ownedLots(g,who).reduce((v,i)=>v+saleValue(map,g,i),0);}
export function step(map,g,to){
  requireState(g.phase==='moving'&&g.remaining>0&&choices(map,g).includes(to),'不可走到此格');
  const p=g.players[g.turn],a=map.cells[p.at],b=map.cells[to],requested=halfStepTarget(map,p)!==null?p.direction:b.x>a.x?3:b.x<a.x?2:b.y>a.y?1:0,oldStraight=p.straightDistance??1;
  let direction=magnetDirection(map,g,requested),bounced=direction!==null&&direction!==requested,roadBounced=false;
  if(g.pcNavigationVersion==='pc-v126'&&direction!==null){
    const pos=playerPosition(map,p),stride=(p.small||p.half?.at===p.at)?0.5:1,[dx,dy]=DIRECTIONS[direction],target=idx(map,Math.trunc(pos.x+dx*stride),Math.trunc(pos.y+dy*stride)),road=g.roadItems.find(o=>o.at===target);
    const free=(x,y)=>x>=0&&y>=0&&x<map.width&&y<map.height&&walkable(map.cells[idx(map,x,y)]),mask=movementDirectionMask(map,p,free)||(1<<(p.direction^1));
    if(road){const adjusted=originalRoadDirection({first:g.pcNavigationFirst,mask,current:p.direction,selected:direction,item:road.id==='door'?37:road.id==='original-6'?6:-1,itemDirection:road.direction,ghost:p.effects.some(e=>e.id==='original-14'&&e.active),headband:hasEffect(p,'original-35'),clones:p.effects.some(e=>['original-24','original-32'].includes(e.id)),small:p.small});direction=adjusted.direction;roadBounced=adjusted.bounced;bounced||=adjusted.bounced;}
    const [mx,my]=DIRECTIONS[direction],x=Math.trunc(pos.x+mx*stride),y=Math.trunc(pos.y+my*stride),cell=x>=0&&y>=0&&x<map.width&&y<map.height?map.cells[idx(map,x,y)]:null;
    if(!walkable(cell)&&!jailGate(cell))direction=null;
  }
  if(direction===null){g.remaining=0;schedule(g,[{kind:'message',text:'前方受阻，没有可退让的道路。'}],'end');return;}
  const oldAt=p.at,stride=movePosition(map,p,direction);if(g.pcNavigationVersion==='pc-v126'){if(bounced&&!g.pcNavigationFirst)p.straightDistance=oldStraight+stride;g.pcNavigationFirst=false;}followClones(map,p,oldAt);g.remaining--;if(direction!==requested)record(g,(roadBounced?'道路道具阻挡，':'南北极徽章相斥，')+p.name+'转身离开。');
  const {x,y}=playerPosition(map,p);
  if(p.jail&&!insideRegion(mapRegion(map,3),map.cells[p.at].x,map.cells[p.at].y))p.jail=false;
  const events=[];
  if(!(effectCapabilities(p)&0x200000))p.walkPoints=f32(p.walkPoints+stride*actorCells(p).length);
  if(p.character==='doraemon')events.push({kind:'charge',amount:1,creditor:-2,text:'哆啦A梦吃了一个豆沙包。'});
  events.push(...encounterCharges(map,g));
  const tunnel=g.roadItems.find(o=>o.id==='original-6'&&o.at===p.at);if(tunnel){const text=crossTunnel(map,g,tunnel);if(text)events.push({kind:'message',text:p.name+text});}
  const door=g.roadItems.find(o=>o.id==='door'&&o.at===p.at);
  if(door){
    g.hermitArmed=false;
    const target=originalDoorDestination(map,p.at,n=>random(g,n),i=>g.roadItems.some(o=>o.at===i));
    p.at=target.to;p.half=null;p.direction=target.direction;p.previous=-1;relocateClones(map,p);g.remaining++;
    events.push({kind:'message',text:p.name+'穿过任意门，被传送到另一处道路，继续前进。'});
  }
  // Original 43daf5 keeps the actor heading after a road-item callback and
  // skips the next direction RNG block (local direction is no longer 4).
  if(g.pcNavigationVersion==='pc-v126')g.pcNavigationForced=tunnel||door?p.direction:null;
  if(g.remaining){const lot=originalLandItemNeighbor(map,p.at),event=map.cells[lot]?.event;if(event===5||event===6&&!g.bankClosed&&(!pcEconomy(g)||dateParts(g).weekday!==0))events.push({kind:'facility',lot});}
  if(movementHermit(g,!!(door||tunnel),n=>random(g,n)))events.push({kind:'midHermit'});
  schedule(g,events,g.remaining?'moving':'landed');
  // The walking segment ends here even if a door has already relocated p.at.
  return {x,y,direction,stride};
}
function finish(g,map,reason){
  g.phase='gameover';delete g.visitAt;g.pending=null;g.queue=[];g.remaining=0;g.endReason=reason;
  const survivors=g.players.map((p,i)=>p.eliminated?-1:i).filter(i=>i>=0);
  const best=Math.max(...survivors.map(i=>netWorth(map,g,i)));
  const tied=survivors.filter(i=>netWorth(map,g,i)===best);
  g.winners=g.firstSeatBreaksTie?tied.slice(0,1):tied;
  record(g,reason);
}
function checkWinner(map,g){if(g.players.filter(p=>!p.eliminated).length<=1){finish(g,map,'其他玩家已破产，游戏结束。');return true;}return false;}
function pay(g,amount,creditor,debtor=g.turn){const p=g.players[debtor];p.cash=f32(p.cash-amount);p.spent=f32(p.spent+amount);if(creditor>=0){g.players[creditor].cash=f32(g.players[creditor].cash+amount);g.players[creditor].rentEarned=f32(g.players[creditor].rentEarned+amount);}else if(creditor===-1)g.pool=f32(g.pool+amount);}
function afterCharge(g,e,debtor){if(e.armyTarget!==undefined&&retaliateRent(g,debtor,e.armyTarget))record(g,'玩具军队攻击了'+g.players[e.armyTarget].name+'。');}
function requestCharge(g,e){const debtor=e.debtor??g.turn;if(g.players[debtor].eliminated||e.creditor>=0&&g.players[e.creditor].eliminated)return;if(e.rent)g.rentPool=accrueRentPool(g.rentPool,e.amount);if(pcEconomy(g)||g.players[debtor].cash>=e.amount){pay(g,e.amount,e.creditor,debtor);const refreshed=g.players[e.rent?g.turn:debtor];refreshed.cash=cashAtRefresh(g,refreshed.cash);record(g,e.text);afterCharge(g,e,debtor);}else prompt(g,{kind:'debt',amount:e.amount,debtor,creditor:e.creditor,text:e.text,...(e.armyTarget!==undefined?{armyTarget:e.armyTarget}:{})});}
// Original landing controller 0x44072b chooses the first non-road neighbor.
// Ordinary rent is a landing transaction; merely passing a property is free.
function eligible(map,g){const i=originalLandItemNeighbor(map,g.visitAt??g.players[g.turn].at);if(i===null)return [];const c=map.cells[i];return [4,5,6].includes(c.event)||(c.event===1&&(g.owners[i]===undefined||g.owners[i]===g.turn&&propertyKind(g,i)<2))?[i]:[];}
function landingRent(map,g){
 const p=g.players[g.turn],lot=originalLandItemNeighbor(map,g.visitAt??p.at),owner=g.owners[lot];
 // v1.26 0x440a13 routes even one's own land to rent while wearing the
 // tanuki suit; 0x443bb1 then redirects payment to the suit's caster.
 if(lot===null||owner===undefined||(owner===g.turn&&!hasEffect(p,'original-15'))||propertyKind(g,lot)>=2)return false;
 const charge=originalPropertyCharge(map,g.owners,g.levels,lot,g.inflation);
 if(!canCollectRent(g.players[owner]))record(g,g.players[owner].name+'受道具影响，无法收取地产租金。');
 else if(mustPayRent(p)&&charge.amount>0){
  if(g.itemAiVersion==='pc-v126')originalAiRent(p,CHARACTERS.findIndex(c=>c.id===g.players[owner].character),charge.lots.length);
  const receiver=rentRecipient(p,owner),reverse=hasEffect(p,'original-9'),debtor=reverse?receiver:g.turn,creditor=reverse?g.turn:receiver,amount=f32(charge.amount*((effectCapabilities(p)&0x8000)?2:1)*((effectCapabilities(g.players[receiver])&0x4000)?2:1));
  g.queue.unshift({kind:'charge',rent:true,amount,debtor,creditor,...(!reverse&&hasEffect(p,'original-8')?{armyTarget:owner}:{}),text:(reverse?'颠倒笔生效：':'')+g.players[debtor].name+'向'+g.players[creditor].name+'支付租金 '+moneyText(amount)+'。'});
 }else record(g,p.name+'受到道具保护，本次免交地产租金。');
 return true;
}
function destination(map,g,lot,passing=false){
  const c=map.cells[lot];if(c.event===1){if(g.owners[lot]===undefined){if(pcEconomy(g)&&g.players[g.turn].cash<=landPrice(c,g))notice(g,'手持豆沙包不足，无法购买这块土地。');else prompt(g,{kind:'buy',lot});}else if(g.owners[lot]===g.turn)prompt(g,{kind:'property',lot});}
  else if(c.event===6){if(g.bankClosed)notice(g,'矿山关闭中，剩余 '+g.bankClosed+' 天。');else if(pcEconomy(g)&&dateParts(g).weekday===0)notice(g,'矿山星期日休息。');else prompt(g,{kind:'bank',lot,...(pcEconomy(g)&&passing?{withdrawOnly:true}:{})});}else if(c.event===5){if(canVisitShop(g.players[g.turn]))prompt(g,{kind:'shop',lot});else notice(g,'灵魂守卫生效期间，不能进入道具商店。');}
  else if(c.event===4){if(effectCapabilities(g.players[g.turn])&0x100)startMini(g);else notice(g,'仙人暂时禁止你进入小游戏。');}
}
function startMini(g){prompt(g,{kind:'minigame',session:createMiniGame(selectMiniGame(g,n=>random(g,n)),g.players,n=>random(g,n))});}
export function landing(map,g){
  requireState(g.phase==='landed','尚未到达');const c=map.cells[g.players[g.turn].at];
  const transition=specialRegionTransition(map,g,i=>netWorth(map,g,i),n=>random(g,n));if(transition){schedule(g,[{kind:'message',text:g.players[g.turn].name+transition}]);return;}
  schedule(g,actorCells(g.players[g.turn]).map((at,actor)=>({kind:'visit',at,actor})));
}
export function advance(map,g){
  requireState(g.phase==='resolving','当前没有待处理事件');
  if(!g.queue.length){g.phase=g.afterQueue;if(g.phase==='end')delete g.visitAt;return;}
  const e=g.queue.shift(),p=g.players[g.turn];
  if(e.kind==='visit'){const at=e.actor===undefined?e.at:actorCells(p)[e.actor];if(at===undefined){g.queue=[];return;}g.visitAt=at;const gift=collectBell(map,g,at,n=>random(g,n));if(gift)record(g,p.name+'拾取铃铛，得到'+ITEMS[gift].name+'。');g.queue.unshift(...(effectCapabilities(p)&0x200000?[]:[{kind:'event',event:map.cells[at].event}]),{kind:'destination'});return;}
  if(e.kind==='facility'){destination(map,g,e.lot,true);return;}
  if(e.kind==='midHermit'){if(!g.hermitSeen&&affectedByHermit(p)){g.hermitSeen=true;prompt(g,{kind:'hermit'});}return;}
  if(e.kind==='mini'){startMini(g);return;}
  if(e.kind==='charge'){requestCharge(g,e);return;}
  if(e.kind==='message'){notice(g,e.text);return;}
  if(e.kind==='destination'){const special=specialArrival(map,g);if(special){if(special.kind==='missile')prompt(g,special);else{const target=fireSpecial(map,g,special.lot,g.turn);notice(g,g.players[target].name+'被无敌炮台击中，送入倒霉区域。');}return;}if(landingRent(map,g))return;const ns=eligible(map,g);if(ns.length===1)destination(map,g,ns[0]);else if(ns.length>1)prompt(g,{kind:'destination',options:ns});return;}
  if(e.kind!=='event')throw Error('事件无效');
  switch(e.event){
    case 7:g.dice=1+random(g,6);g.remaining=g.dice;g.dicePending=true;if(g.pcNavigationVersion==='pc-v126'){g.pcNavigationFirst=true;g.pcNavigationForced=null;}armMovementHermit(g,n=>random(g,n));g.chargedLots=[];g.queue=[];g.pending=null;g.phase='moving';delete g.visitAt;record(g,p.name+'进入追加移动圈，再前进 '+g.dice+' 格。');break;
    case 8:{const target=originalBombDestination(map,p.at,n=>random(g,n));p.at=target.to;p.half=null;p.direction=target.direction;p.previous=-1;relocateClones(map,p);p.jail=false;g.remaining=0;g.queue=g.queue.filter(q=>q.kind!=='destination');notice(g,p.name+'踩中炸弹，被炸飞到另一处道路。');break;}
    case 9:{const jail=map.jail;if(jail&&walkable(map.cells[idx(map,jail.x,jail.y)])){p.at=idx(map,jail.x,jail.y);p.half=null;p.previous=idx(map,jail.x-(jail.direction===3?1:0),jail.y-(jail.direction===1?1:0));p.direction=jail.direction;p.jail=true;relocateClones(map,p);g.queue=g.queue.filter(q=>q.kind!=='destination');notice(g,'掉进陷阱，被送往倒霉区域；离开前每次只能走 1～3 格。');}break;}
    case 10:{const reward=nextCircleReward(g.rewardNext);g.rewardNext=reward.next;p.cash=cashAtRefresh(g,p.cash+reward.amount);notice(g,p.name+'得到 '+reward.amount+' 个豆沙包。');break;}
    case 11:if(protectedFromFine(p))notice(g,p.name+'受到道具保护，免受征罚圈罚款影响。');else{const amount=originalCircleFine(random(g,75),false,g.inflation);g.queue.unshift({kind:'charge',amount,creditor:-1,text:p.name+'支付罚款 '+amount+' 个豆沙包，存入罚款奖金池。'});}break;
    case 12:{const amount=g.pool;p.cash=cashAtRefresh(g,p.cash+amount);g.pool=0;notice(g,p.name+'领走奖金池的 '+moneyText(amount)+' 个豆沙包。');break;}
    case 13:{const amount=g.rentPool;p.cash=cashAtRefresh(g,p.cash+amount);g.rentPool=0;notice(g,p.name+'领走收租奖金池的 '+moneyText(amount)+' 个豆沙包。');break;}
    case 14:if(affectedByHermit(p))prompt(g,{kind:'hermit'});else notice(g,p.name+'受到道具保护，本次仙人圈事件不生效。');break;
  }
}
export function answer(map,g,action,value){
  requireState(g.phase==='prompt'&&g.pending,'当前没有等待回答的选择');const q=g.pending,debtor=q.kind==='debt'?(q.debtor??g.turn):g.turn,p=g.players[debtor];
  if(q.kind==='monthly'){requireState(action==='ok','请确认月结');g.pending=null;g.phase=q.resume;return;}
  const done=()=>{g.pending=null;g.phase='resolving';};
  if(q.kind==='notice'){requireState(action==='ok','请确认提示');done();if(q.resume==='ready')g.phase='ready';}
  else if(q.kind==='minigame'){
    if(action==='start'){requireState(q.session.stage==='intro','小游戏已经开始');q.session.stage='playing';}
    else if(action==='collect'){requireState(q.session.stage==='result','小游戏尚未结束');const rewards=miniRewards(q.session);rewards.forEach((amount,i)=>{if(!g.players[i].eliminated)g.players[i].cash=f32(g.players[i].cash+amount);});record(g,MINI_GAMES[q.session.id].name+'结束：'+rewards.map((n,i)=>g.players[i].name+' +'+n).join('、')+' 豆沙包。');done();}
    else throw Error('小游戏操作无效');
  }
  else if(q.kind==='missile'){requireState(action==='fire'&&missileTargets(g).includes(value),'请选择可攻击的角色');const lot=q.lot;done();const target=fireSpecial(map,g,lot,value);notice(g,g.players[target].name+'被自制导弹击中，送入倒霉区域。');}
  else if(q.kind==='destination'){requireState(action==='skip'||(action==='select'&&q.options.includes(value)),'地点无效');done();if(action==='select')destination(map,g,value);}
  else if(q.kind==='property'){
    requireState(g.owners[q.lot]===g.turn,'地产状态已变化');
    requireState(['upgrade','sell','leave'].includes(action),'地产操作无效');
    if(action==='upgrade'){requireState(!!(effectCapabilities(p)&0x10),'仙人暂时禁止升级');
      const preview=upgradeCost(map,g,q.lot);requireState(pcEconomy(g)?p.cash>preview:p.cash>=preview,'手持豆沙包不足');
      const price=pcEconomy(g)?pcPropertyPayment('upgrade',landPrice(map.cells[q.lot],g),g.levels[q.lot],g.inflation,p.control==='ai'):preview;
      p.cash=cashAtRefresh(g,p.cash-price);p.spent=f32(p.spent+price);g.levels[q.lot]++;g.kinds[q.lot]=1;
      record(g,p.name+'升级为'+LEVEL_NAMES[g.levels[q.lot]]+'，花费 '+price+' 个豆沙包。');
    }else if(action==='sell'){
      const price=pcEconomy(g)?pcPropertyPayment('sell',landPrice(map.cells[q.lot],g),g.levels[q.lot],g.inflation,p.control==='ai'):saleValue(map,g,q.lot);p.cash=cashAtRefresh(g,p.cash+price);
      delete g.owners[q.lot];delete g.levels[q.lot];delete g.kinds[q.lot];record(g,p.name+'出售地产，获得 '+price+' 个豆沙包。');
    }done();
  }
  else if(q.kind==='buy'||q.kind==='upgrade'){
    requireState(['yes','no'].includes(action),'选择无效');if(action==='yes'){
      requireState(!!(effectCapabilities(p)&(q.kind==='buy'?8:0x10)),'仙人暂时禁止此操作');const preview=q.kind==='buy'?landPrice(map.cells[q.lot],g):upgradeCost(map,g,q.lot);requireState(pcEconomy(g)?p.cash>preview:p.cash>=preview,'手持豆沙包不足');
      const price=pcEconomy(g)?pcPropertyPayment(q.kind,landPrice(map.cells[q.lot],g),g.levels[q.lot]??0,g.inflation,p.control==='ai'):preview;
      if(pcEconomy(g)&&q.kind==='buy')requireState(p.cash>=price,'手持豆沙包不足');
      requireState(q.kind==='buy'?g.owners[q.lot]===undefined:g.owners[q.lot]===g.turn&&g.levels[q.lot]<4,'地产状态已变化');
      p.cash=cashAtRefresh(g,p.cash-price);p.spent=f32(p.spent+price);if(q.kind==='buy'){g.owners[q.lot]=g.turn;g.levels[q.lot]=0;g.kinds[q.lot]=0;}else{g.levels[q.lot]++;g.kinds[q.lot]=1;}
      record(g,p.name+(q.kind==='buy'?'购买土地':'升级为'+LEVEL_NAMES[g.levels[q.lot]])+'，花费 '+price+' 个豆沙包。');
    }done();
  }else if(q.kind==='bank'){
    if(action==='aiBank'){
      requireState(pcEconomy(g),'当前存档不支持原版矿山策略');
      const transfer=originalAiBank({...p,day:dateParts(g).day,withdrawOnly:!!q.withdrawOnly});
      if(Math.trunc(transfer.cash)!==Math.trunc(p.cash)){p.cash=cashAtRefresh(g,transfer.cash);p.bank=transfer.bank;record(g,p.name+'调整矿山余额：手持 '+moneyText(p.cash)+'，矿山 '+moneyText(p.bank)+'。');}
      done();return;
    }
    if(action==='bankPosition'){
      requireState(pcEconomy(g),'当前存档不支持矿山滑条事务');
      requireState(!q.withdrawOnly||value>=50,'途经矿山只能提款');
      const transfer=bankTransfer(p.cash,p.bank,value);
      if(Math.trunc(transfer.cash)!==Math.trunc(p.cash)){p.cash=cashAtRefresh(g,transfer.cash);p.bank=transfer.bank;record(g,p.name+'调整矿山余额：手持 '+moneyText(p.cash)+'，矿山 '+moneyText(p.bank)+'。');}
      done();return;
    }
    if(action==='leave'){done();return;}requireState(['deposit','withdraw'].includes(action)&&money(value)&&value>0,'金额无效');
    if(action==='deposit'){requireState(!q.withdrawOnly,'途经矿山只能提款');requireState(value<=p.cash,'手持金额不足');p.cash=cashAtRefresh(g,p.cash-value);p.bank=f32(p.bank+value);}else{requireState(value<=p.bank,'存款不足');p.bank=f32(p.bank-value);p.cash=cashAtRefresh(g,p.cash+value);}
    record(g,p.name+(action==='deposit'?'存入':'提取')+' '+moneyText(value)+' 个豆沙包。');
  }else if(q.kind==='shop'){
    if(action==='leave'){done();return;}
    requireState(canVisitShop(p),'当前道具状态不能进入商店');
    if(action==='aiShop'){
      requireState(pcEconomy(g),'当前存档不支持原版商店策略');
      const result=originalAiShop({...p,...(g.itemAiVersion==='pc-v126'?{priorities:p.itemAi.weights}:{}),held:p.inventory.map(id=>ITEMS[id].originalId),prices:mapShop(map,q.lot).rawParameters,multiplier:g.inflation,discount:g.shopDiscount?60:100});
      p.cash=result.cash;p.inventory.push(...result.bought.map(itemKey));
      if(result.bought.length)record(g,p.name+'买了'+result.bought.map(id=>ITEMS[itemKey(id)].name).join('、')+'。');
      done();return;
    }
    requireState(['buy','sell'].includes(action)&&Object.hasOwn(ITEMS,value),'道具无效');
    const price=itemPrice(map,q.lot,value,action,g);
    if(action==='buy'){
      requireState(price>0,'这家商店不出售此道具');requireState(canBuyItem(p,value),'这个角色不能购买此道具');requireState(ITEMS[value].implemented,'此道具效果尚未还原，暂不开放购买');requireState(p.cash>=price,'豆沙包不足');
      p.cash=cashAtRefresh(g,p.cash-price);p.inventory.push(value);record(g,p.name+'买了'+ITEMS[value].name+'。');
    }else{
      const slot=p.inventory.indexOf(value);requireState(slot>=0,'没有此道具');
      p.inventory.splice(slot,1);p.cash=cashAtRefresh(g,p.cash+price);record(g,p.name+'卖出'+ITEMS[value].name+'，获得 '+moneyText(price)+' 豆沙包。');
    }
  }else if(q.kind==='hermit'){
    requireState(action==='chest'&&integer(value,0,2),'请选择一个宝箱');
    const priorEvents=g.players.map(p=>new Set(p.events??[]));
    const e=drawHermitEvent(map,g,n=>random(g,n)),result=applyHermitEvent(map,g,e,n=>random(g,n));
    const appliedEvents=g.players.flatMap((p,player)=>(p.events??[]).filter(event=>!priorEvents[player].has(event)).map(event=>({player,name:p.name,event:event.id,remaining:event.remaining})));
    const hermitResult={event:e.id,good:!!HERMIT_EVENTS[e.id].good,selected:value,appliedEvents};
    if(result.rewind){const day=rewindHistory(g);notice(g,result.text+' 已回到第 '+day+' 天，土地、资金、道具与角色状态已恢复。');g.pending.resume='ready';g.pending.hermitResult=hermitResult;return;}
    done();g.queue.unshift(...result.charges,...(result.minigame?[{kind:'mini'}]:[]));notice(g,result.text);g.pending.hermitResult=hermitResult;
  }else if(q.kind==='debt'){
    if(action==='withdraw'){requireState(p.bank>0,'矿山没有存款');const amount=Math.min(p.bank,Math.max(0,q.amount-p.cash));requireState(amount>0,'现金已足够');p.bank=f32(p.bank-amount);p.cash=cashAtRefresh(g,p.cash+amount);record(g,'从矿山提取 '+moneyText(amount)+' 个豆沙包应付欠款。');}
    else if(action==='sell'){requireState(g.owners[value]===debtor,'不能出售他人的地产');const amount=saleValue(map,g,value);p.cash=cashAtRefresh(g,p.cash+amount);delete g.owners[value];delete g.levels[value];delete g.kinds[value];record(g,p.name+'出售地产，获得 '+amount+' 个豆沙包。');}
    else if(action==='pay'){requireState(p.cash>=q.amount,'金额不足');pay(g,q.amount,q.creditor,debtor);record(g,q.text);afterCharge(g,q,debtor);done();}
    else if(action==='bankrupt'){
      requireState(liquidity(map,g,debtor)<q.amount,'仍可筹足欠款，请先取款或出售地产');
      const total=liquidity(map,g,debtor);for(const lot of ownedLots(g,debtor)){delete g.owners[lot];delete g.levels[lot];delete g.kinds[lot];}p.cash=total;p.bank=0;pay(g,Math.min(total,q.amount),q.creditor,debtor);afterCharge(g,q,debtor);p.eliminated=true;p.inventory=[];if(debtor===g.turn){g.extraTurn=false;g.remaining=0;g.queue=[];g.afterQueue='end';}done();record(g,p.name+'资金不足，破产退出。');checkWinner(map,g);
    }else throw Error('欠款处理方式无效');
  }else throw Error('未知选择');
}
export function miniTick(g,inputs){
  requireState(g.phase==='prompt'&&g.pending?.kind==='minigame','当前没有小游戏');
  tickMiniGame(g.pending.session,g.players,inputs,n=>random(g,n));
}
export function nextTurn(map,g){
  requireState(g.phase==='end','回合尚未结束');if(checkWinner(map,g))return;
  if(g.extraTurn&&!g.players[g.turn].eliminated){g.extraTurn=false;g.phase='ready';g.turnSerial++;g.hermitSeen=false;g.hermitArmed=false;delete g.visitAt;return;}
  if(!g.eventExtra&&(effectCapabilities(g.players[g.turn])&0x800000)){g.eventExtra=true;g.phase='ready';g.turnSerial++;g.hermitSeen=false;g.hermitArmed=false;delete g.visitAt;return;}
  g.eventExtra=false;g.players[g.turn].effectTickPending=true;
  let next=g.turn,monthly=false,wrapped=false;
  do{next++;if(next===g.players.length){next=0;wrapped=true;if(advanceDayCycle(g)){
    if(g.shopDiscount)g.shopDiscount--;if(g.bankClosed)g.bankClosed--;
    g.roadItems=g.roadItems.filter(o=>--o.remaining>0);
    if(pcEconomy(g)){
      for(const who of settleCashDebtDay(g))record(g,g.players[who].name+'连续 15 天手持豆沙包为负，破产退出。');
      if(checkWinner(map,g))return;
    }
    for(const p of g.players)p.interest=accrueInterest(p.bank,p.interest,g.interestRate);
    monthly=dateParts(g).day===1;
  }}}while(g.players[next].eliminated);
  g.turn=next;g.turnSerial++;g.hermitSeen=false;g.hermitArmed=false;delete g.visitAt;g.remaining=0;g.chargedLots=[];g.phase='ready';
  if(g.maxRounds&&g.round>g.maxRounds)finish(g,map,(g.maxYears?'年期届满':'短局到期')+'，按现金、存款及地产原值合计结算。');
  if(monthly&&g.phase!=='gameover'){
    g.inflation=pcEconomy(g)?inflateV126(g.inflation,random(g,20)):inflate(g.inflation,random(g,10));
    prompt(g,{kind:'monthly',converter:-1,rows:settleMonthly(map,g),resume:'ready'});
    record(g,'月末结算：地产、步行奖励发入手持豆沙包，利息存入矿山。');
  }
  if(wrapped&&g.phase!=='gameover')checkpoint(g);
}
export function useItem(map,g,item,target){
  requireState(ITEMS[item]?.implemented,'此道具效果尚未还原，暂不能使用');
  requireState(g.phase==='ready','只能在掷骰前使用道具');const p=g.players[g.turn],slot=p.inventory.indexOf(item);requireState(slot>=0&&!p.jail,'没有此道具或身处倒霉区域');
  requireState(!!(effectCapabilities(p)&1),'仙人暂时禁止使用道具');
  requireState(!p.skip&&!p.itemSleeping&&!(p.character==='shizuka'&&dateParts(g).weekday===0),'休息期间不能使用道具');
  const plannedClones=CLONE_ITEMS.includes(item)?planClones(map,g,item,n=>random(g,n)):null;if(CLONE_ITEMS.includes(item))requireState(plannedClones,'身后没有足够道路放置分身');
  const specialItem=SPECIAL_BUILDINGS.includes(item),landItem=item==='restoreRay'||item==='timeCloth',land=specialItem?specialBuildStatus(map,g,item):landItem?landItemStatus(map,g,item):null;
  if(landItem||specialItem)requireState(land.allowed,land.reason);
  else if(item==='original-21')requireState(target&&integer(target.first,0,map.cells.length-1)&&integer(target.second,0,map.cells.length-1)&&canSwapBuilding(g,target.first)&&canSwapBuilding(g,target.second,target.first),'请选择两座不同的普通建筑');
  else if(item==='door'||item==='original-6'||item==='original-13')requireState(integer(target,0,map.cells.length-1)&&gameRoadPlacement(map,g,target,item!=='original-13').length>0,'请选择没有角色或道具占用的合法道路');
  else if(item==='original-26')requireState(target&&integer(target.donor,0,3)&&integer(target.recipient,0,3)&&target.donor!==g.turn&&target.recipient!==g.turn&&sleepTransferAvailable(g)&&canTakeSleep(p,g.players[target.donor])&&canGiveSleep(g,target.donor,target.recipient),'请选择合法的睡眠来源和接收者');
  else if(TARGET_ITEMS.includes(item))requireState(integer(target,0,3)&&target!==g.turn&&canAttackPlayer(p,g.players[target],g.turn,item,target),'无法攻击这个角色');
  else requireState(SELF_EFFECTS.includes(item)||item==='original-5','道具无效');
  if(item==='original-5')requireState(!p.monthlyClaimed,'这个月已经使用过日期转换仪');
  if(item==='original-3'||SELF_EFFECTS.includes(item)||REDIRECT_ITEMS.includes(item)){const status=effectApplicationStatus(p,item,g.turn,false);requireState(status.allowed,status.reason);}
  if(item==='original-16')requireState(g.slowDays===0,'疯狂时间器仍在生效');
  p.inventory.splice(slot,1);record(g,p.name+'使用了'+ITEMS[item].name+'。');g.chargedLots=[];
  if(TARGET_ITEMS.includes(item)){
    const selected=item==='original-26'?target.recipient:target,redirected=redirectAttack(g,item,selected,item==='original-26'?target.donor:-1);
    if(redirected!==selected)record(g,g.players[selected].name+'的咒语相机将效果转移给'+g.players[redirected].name+'。');
    target=item==='original-26'?{donor:target.donor,recipient:redirected}:redirected;
  }
  if(item==='original-5'){
    replaceConflictingEffects(p,item,g.turn,false);
    prompt(g,{kind:'monthly',converter:g.turn,rows:settleMonthly(map,g,g.turn),resume:'end'});
  }else if(CLONE_ITEMS.includes(item)){
    applyEffect(p,item,g.turn,true,false);p.effects.find(e=>e.id===item).nodes=plannedClones;g.phase='end';
  }else if(item==='original-3'){
    applyEffect(p,item,g.turn,true,false);p.effects.find(e=>e.id===item).target=target;
    if(target!==g.turn){applyEffect(g.players[target],item,g.turn,false,true);g.players[target].effects.find(e=>e.id===item).target=target;}g.phase='end';
  }else if(item==='original-21'){
    swapBuildings(g,target.first,target.second);record(g,'两座建筑连同归属和等级交换了位置。');g.phase='end';
  }else if(item==='original-26'){
    transferSleep(g,target.donor,target.recipient);record(g,g.players[target.donor].name+'醒来，睡眠转移给'+g.players[target.recipient].name+'。');g.phase='end';
  }else if(REDIRECT_ITEMS.includes(item)){
    if(g.itemAiVersion==='pc-v126'&&item==='original-17')originalAiAttacked(g.players[target],g.turn,17);
    applyEffect(p,item,g.turn,true,false);p.effects.find(e=>e.id===item&&e.source===g.turn).target=target;g.phase='end';
  }else if(specialItem){
    buildSpecial(map,g,item);record(g,ITEMS[item].name+'建成，停靠这块属地时触发。');g.phase='end';
  }else if(landItem){
    const c=map.cells[land.lot];applyLandItem(g,item,land.lot);
    record(g,`土地（${c.x},${c.y}）`+(item==='timeCloth'?'恢复为空地，可重新购买。':'的建筑降低一级。'));g.phase='end';
  }else if(item==='door'||item==='original-6'){
    g.roadItems.push({id:item,source:g.turn,at:target,direction:chooseDoorDirection(gameRoadPlacement(map,g,target),n=>random(g,n)),remaining:5});g.phase='end';
  }else if(item==='original-13'){
    p.direction=originalCannonDirection(map,target,p.direction,n=>random(g,n));p.at=target;p.half=null;p.previous=-1;relocateClones(map,p);g.phase='end';
  }else if(item==='original-30'||item==='original-33'){
    const q=g.players[target];replaceConflictingEffects(p,item,g.turn,false);replaceConflictingEffects(q,item,g.turn,true);
    for(const key of ['at','direction','jail','half']){const value=p[key];p[key]=q[key];q[key]=value;}p.previous=q.previous=-1;relocateClones(map,p);relocateClones(map,q);g.phase='end';
    if(item==='original-33'){
      for(const key of ['cash','bank','walkPoints','interest','inventory']){const value=p[key];p[key]=q[key];q[key]=value;}
      for(const lot of Object.keys(g.owners)){if(g.owners[lot]===g.turn)g.owners[lot]=target;else if(g.owners[lot]===target)g.owners[lot]=g.turn;}
      if(g.itemAiVersion==='pc-v126'){const order=p.itemAi.propertyOrder;p.itemAi.propertyOrder=q.itemAi.propertyOrder;q.itemAi.propertyOrder=order;}
    }
  }
  else {
    if(item==='air'){
      const expert=p.character==='nobita';
      if(originalAirHit(expert,expert?undefined:random(g,1000)))applyEffect(g.players[target],item,g.turn,target===g.turn);
      else record(g,p.name+'的空气枪没有命中'+g.players[target].name+'。');
    }else if(TARGET_ITEMS.includes(item))applyEffect(g.players[target],item,g.turn,target===g.turn);
    else{applyEffect(p,item,g.turn,true);if(item==='original-12')p.effects.find(e=>e.id===item&&e.source===g.turn).lucky=(pcEconomy(g)?originalLuckyShotV126:originalLuckyShot)(random(g,1000));if(item==='original-16')g.slowDays=5;}
    g.phase='end';
  }
  syncItemAiProperties(g);
}
export function aiDirection(map,g){
  if(g.pcNavigationVersion==='pc-v126'){
    const candidates=choices(map,g),p=g.players[g.turn];if(!candidates.length)return undefined;if(g.pcNavigationForced!==null)return candidates[0];
    const half=halfStepTarget(map,p),at=map.cells[p.at],directions=candidates.map(to=>{const c=map.cells[to];return half!==null?p.direction:c.x>at.x?3:c.x<at.x?2:c.y>at.y?1:0;}),mask=directions.reduce((m,d)=>m|(1<<d),0);
    return candidates[directions.indexOf(originalDirection(mask,p.direction,n=>random(g,n)))];
  }
  const candidates=choices(map,g),scores=candidates.map(to=>{let score=0;for(const i of adjacent(map,to)){if(g.owners[i]!==undefined&&g.owners[i]!==g.turn)score-=rent(map,g,i);else if(map.cells[i].event===1)score+=g.owners[i]===undefined?18:7;}if([8,9,11].includes(map.cells[to].event))score-=60;return score+random(g,25);});
  return candidates[scores.indexOf(Math.max(...scores))];
}
export function aiAnswer(map,g){
  const q=g.pending,debtor=q?.kind==='debt'?(q.debtor??g.turn):g.turn,p=g.players[debtor];requireState(q,'没有选择');
  if(q.kind==='notice'||q.kind==='monthly')return ['ok'];
  if(q.kind==='missile')return ['fire',missileTargets(g).sort((a,b)=>netWorth(map,g,b)-netWorth(map,g,a))[0]];
  if(q.kind==='destination')return ['select',q.options.find(i=>map.cells[i].event===6&&p.cash<300)??q.options.find(i=>map.cells[i].event===1)??q.options[0]];
  if(g.propertyAiVersion==='pc-v126'&&['buy','upgrade','property'].includes(q.kind)){
    const capabilities=effectCapabilities(p),basePrice=landPrice(map.cells[q.lot],g);
    if(q.kind==='buy')return [(capabilities&8)&&(!pcEconomy(g)||p.cash>basePrice)&&originalAiBuy({character:p.character,cash:p.cash,basePrice,multiplier:g.inflation},n=>random(g,n))?'yes':'no'];
    if(!(capabilities&0x10)||propertyKind(g,q.lot)>=2)return [q.kind==='property'?'leave':'no'];
    const action=originalAiProperty({character:p.character,cash:p.cash,bank:p.bank,basePrice,level:g.levels[q.lot]??0,multiplier:g.inflation,propertyTags:ownedLots(g,g.turn).map(i=>propertyKind(g,i))},n=>random(g,n));
    return [q.kind==='property'?action:action==='upgrade'?'yes':'no'];
  }
  if(q.kind==='buy'||q.kind==='upgrade'){const price=q.kind==='buy'?landPrice(map.cells[q.lot],g):upgradeCost(map,g,q.lot);return [p.cash>=price+100&&(effectCapabilities(p)&(q.kind==='buy'?8:0x10))?'yes':'no'];}
  if(q.kind==='property')return [g.levels[q.lot]<4&&p.cash>=upgradeCost(map,g,q.lot)+100&&(effectCapabilities(p)&0x10)?'upgrade':'leave'];
  if(q.kind==='bank'){if(pcEconomy(g))return ['aiBank'];if(p.cash<500&&p.bank>0)return ['withdraw',Math.min(700,p.bank)];if(p.cash>1500)return ['deposit',p.cash-1000];return ['leave'];}
  if(q.kind==='shop'){
    if(pcEconomy(g))return ['aiShop'];
    const item=['air','original-4','original-25','original-1','timeCloth','restoreRay','charm','original-19','door'].find(id=>{const price=itemPrice(map,q.lot,id,'buy',g);return price>0&&p.cash>=price&&canBuyItem(p,id);});
    return p.inventory.filter(id=>ITEMS[id].implemented).length<2&&p.cash>500&&item?['buy',item]:['leave'];
  }
  if(q.kind==='minigame'&&q.session.stage!=='playing')return [q.session.stage==='intro'?'start':'collect'];
  if(q.kind==='hermit')return ['chest',random(g,3)];
  if(q.kind==='debt'){if(p.cash>=q.amount)return ['pay'];if(p.bank)return ['withdraw'];if(liquidity(map,g,debtor)<q.amount)return ['bankrupt'];return ['sell',ownedLots(g,debtor).sort((a,b)=>saleValue(map,g,a)-saleValue(map,g,b))[0]];}
  throw Error('电脑无法处理这个选择');
}
export function restore(map,text,historyEntry=false){
  let g;try{g=JSON.parse(text);}catch{throw Error('存档无法读取');}
  const bad=()=>{throw Error('存档格式不兼容或数据损坏');};
  if(historyEntry&&g?.history!==undefined)bad();
  if(g?.randomVersion!==undefined&&g.randomVersion!=='pc-v126')bad();
  if(g?.pcNavigationVersion!==undefined&&(g.pcNavigationVersion!=='pc-v126'||typeof g.pcNavigationFirst!=='boolean'||g.pcNavigationForced!==null&&!integer(g.pcNavigationForced,0,3)))bad();
  if(g?.pcAnimatedRoll!==undefined&&(g.pcAnimatedRoll!==true||g.randomVersion!=='pc-v126'))bad();
  if(g?.firstSeatBreaksTie!==undefined&&g.firstSeatBreaksTie!==true)bad();
  if(g?.propertyAiVersion!==undefined&&g.propertyAiVersion!=='pc-v126')bad();
  if(g?.itemAiVersion!==undefined&&g.itemAiVersion!=='pc-v126')bad();
  if(g?.pcEconomyVersion!==undefined&&g.pcEconomyVersion!=='pc-v126')bad();
  const balance=v=>money(v,pcEconomy(g)?-1e9:0);
  if(g?.players?.some(p=>p.cashDebtDays!==undefined&&!integer(p.cashDebtDays,0,15)||pcEconomy(g)&&!integer(p.cashDebtDays,0,15)))bad();
  if(g?.rollPlan!==undefined){const plan=g.rollPlan;if(!plan||!Array.isArray(plan.faces)||!Array.isArray(plan.directions)||plan.faces.length!==plan.directions.length||plan.faces.length<1||plan.faces.length>55||!plan.faces.every(f=>integer(f,0,6))||!plan.directions.every(d=>integer(d,0,3))||plan.result!==g.dice||plan.direction!==g.players?.[g.turn]?.direction)bad();}
  if((g?.mapRevision??'legacy')!==(map.revision??'legacy'))throw Error('存档地图版本不匹配');
  const legacyEvents=g?.version===2&&g.ruleset!==RULESET;
  if(legacyEvents){g.miniPlayed??=0;g.shopDiscount??=0;g.bankClosed??=0;g.eventExtra??=false;g.kinds??={};for(const p of g.players??[]){p.events??=[];p.small??=false;p.half??=null;}if(g.pending?.kind==='hermit')delete g.pending.lucky;g.rentPool??=0;g.rewardNext??=50;g.roadItems??=[];g.dayCycle??=0;g.slowDays??=0;g.inflation??=1;g.interestRate??=INITIAL_INTEREST;for(const p of g.players??[]){p.interest??=0;p.walkPoints??=0;p.monthlyClaimed??=false;}}
  const legacyGifts=g?.version===2&&['town-flow-2','town-flow-3','town-flow-4','town-flow-5','town-flow-6','town-flow-7'].includes(g.ruleset);
  if(g?.version===2&&['town-flow-5','town-flow-6','town-flow-7','town-flow-8','town-flow-9','town-flow-10','town-flow-11','town-flow-12','town-flow-13','town-flow-14','town-flow-15','town-flow-16','town-flow-17','town-flow-18','town-flow-19','town-flow-20','town-flow-21','town-flow-22','town-flow-23','town-flow-24','town-flow-25','town-flow-26','town-flow-27'].includes(g.ruleset))g.ruleset=RULESET;
  // Preserve balances and already queued charges; apply recovered formulas only to future actions.
  if(g?.version===2&&['town-flow-2','town-flow-3','town-flow-4'].includes(g.ruleset)&&Array.isArray(g.players)){
    g.ruleset=RULESET;
    // Old one-shot charm and skip counts retain their old meanings; do not
    // silently turn a stored bomb/air skip into a new multi-turn effect.
    for(const p of g.players){if(!p||typeof p!=='object')bad();p.effects=[];p.effectTickPending=false;p.effectClockStarted=false;p.itemSleeping=false;}
  }
  if(!g||g.version!==2||g.ruleset!==RULESET||g.map!==map.id||!Array.isArray(g.players)||g.players.length!==4||!integer(g.turn,0,3)||!integer(g.round,1,1000000)||!integer(g.seed,0,4294967295)||!['ready','moving','resolving','landed','prompt','end','gameover'].includes(g.phase)||!integer(g.remaining,0,8)||!integer(g.dice,0,6)||!money(g.pool)||!money(g.rentPool)||!integer(g.rewardNext,50,450)||g.rewardNext%50!==0||!integer(g.turnSerial)||!['moving','landed','end'].includes(g.afterQueue)||typeof g.extraTurn!=='boolean'||(g.maxYears===undefined?![0,30,60,120].includes(g.maxRounds):!integer(g.maxYears,1,8)||g.maxRounds!==daysInTerm(g.startDate,g.maxYears))||typeof g.startDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(g.startDate)||!Number.isFinite(Date.parse(g.startDate)))bad();
  if(new Set(g.players.map(p=>p.character)).size!==4)bad();
  if(g.itemAiVersion==='pc-v126'&&g.players.some((p,seat)=>!p.itemAi||p.itemAi.seat!==seat||!Array.isArray(p.itemAi.weights)||p.itemAi.weights.length!==42||!p.itemAi.weights.every(v=>integer(v,-2147483648,2147483647))||!Array.isArray(p.itemAi.opponents)||p.itemAi.opponents.length!==7||!p.itemAi.opponents.every(v=>integer(v,-2147483648,2147483647))||!Array.isArray(p.itemAi.propertyOrder)||new Set(p.itemAi.propertyOrder).size!==p.itemAi.propertyOrder.length||p.itemAi.propertyOrder.some(i=>!integer(i,0,map.cells.length-1)||map.cells[i].event!==1)))bad();
  if(!integer(g.miniPlayed,0,255)||!integer(g.shopDiscount,0,10)||!integer(g.bankClosed,0,10)||typeof g.eventExtra!=='boolean'||!g.kinds||typeof g.kinds!=='object'||Array.isArray(g.kinds)||Object.entries(g.kinds).some(([i,k])=>!Object.hasOwn(g.owners,i)||!integer(k,0,3)))bad();
  if(g.players.some(p=>p.half!==null&&(!p.half||!Number.isFinite(p.half.x)||!Number.isFinite(p.half.y)||p.half.x<0||p.half.y<0||p.half.x>=map.width||p.half.y>=map.height||!Number.isInteger(p.half.x*2)||!Number.isInteger(p.half.y*2)||p.half.at!==p.at||Math.trunc(p.half.y)*map.width+Math.trunc(p.half.x)!==p.at)))bad();
  if(['hermitSeen','hermitArmed'].some(k=>g[k]!==undefined&&typeof g[k]!=='boolean')||g.players.some(p=>p.bonusArea!==undefined&&typeof p.bonusArea!=='boolean'))bad();
  if(g.players.some(p=>p.dwarfBody&&(!integer(p.dwarfBody.at,0,map.cells.length-1)||!integer(p.dwarfBody.direction,0,3)||!walkable(map.cells[p.dwarfBody.at]))))bad();
  if(g.players.some(p=>p.straightDistance!==undefined&&(!Number.isFinite(p.straightDistance)||p.straightDistance<0||p.straightDistance>1e9)))bad();
  if(g.players.some(p=>typeof p.small!=='boolean'||!Array.isArray(p.events)||p.events.length>35||new Set(p.events.map(e=>e.id)).size!==p.events.length||p.events.some(e=>!e||!integer(e.id,0,34)||!HERMIT_EVENTS[e.id].duration||!integer(e.remaining,1,HERMIT_EVENTS[e.id].duration+1))))bad();
  if(!money(g.inflation,1)||!money(g.interestRate)||!integer(g.slowDays,0,5)||!integer(g.dayCycle,0,g.slowDays?1:0))bad();
  if(g.bells===undefined)spawnBells(map,g,initialBellCount(map),n=>random(g,n));
  if(!Array.isArray(g.bells)||g.bells.length>initialBellCount(map)||new Set(g.bells).size!==g.bells.length||g.bells.some(i=>!integer(i,0,map.cells.length-1)||!walkable(map.cells[i])||map.cells[i].event!==0||g.roadItems.some(o=>o.at===i)))bad();
  if(!Array.isArray(g.roadItems)||g.roadItems.length>map.cells.length||g.roadItems.some(o=>!o||!['door','original-6'].includes(o.id)||!integer(o.source,0,3)||!integer(o.at,0,map.cells.length-1)||!walkable(map.cells[o.at])||map.cells[o.at].event!==0||!integer(o.direction,0,3)||!integer(o.remaining,1,5))||new Set(g.roadItems.map(o=>o.at)).size!==g.roadItems.length)bad();
  if(g.players.some(p=>!p||!validEffects(p)||!validClones(map,p)))bad();
  if(g.visitAt!==undefined&&(!integer(g.visitAt,0,map.cells.length-1)||!['prompt','resolving'].includes(g.phase)))bad();
  // Older builds awarded Nobita eagerly and did not record who had collected.
  // Preserve old stock; suppress retroactive awards this month, resume next month.
  if(legacyGifts)for(const p of g.players)p.lastGiftMonth=monthKey(dateParts(g));
  if(g.players.some(p=>typeof p.lastGiftMonth!=='string'||(p.lastGiftMonth!==''&&!/^\d{4,6}-(0[1-9]|1[0-2])$/.test(p.lastGiftMonth))))bad();
  for(const p of g.players)if(!CHARACTERS.some(c=>c.id===p.character&&c.name===p.name)||!['human','ai'].includes(p.control)||!integer(p.at,0,map.cells.length-1)||!(walkable(map.cells[p.at])||(p.jail&&jailGate(map.cells[p.at])))||!integer(p.previous,-1,map.cells.length-1)||!integer(p.direction,0,3)||!balance(p.cash)||!balance(p.bank)||!balance(p.interest)||!money(p.walkPoints)||typeof p.monthlyClaimed!=='boolean'||!money(p.spent)||!money(p.rentEarned)||!integer(p.skip,0,1000)||!['jail','charm','eliminated'].every(k=>typeof p[k]==='boolean')||!Array.isArray(p.inventory)||!p.inventory.every(k=>Object.hasOwn(ITEMS,k)))bad();
  for(const key of ['owners','levels'])if(!g[key]||typeof g[key]!=='object'||Array.isArray(g[key]))bad();
  for(const [lot,who] of Object.entries(g.owners))if(!/^(0|[1-9]\d*)$/.test(lot)||map.cells[+lot]?.event!==1||!integer(who,0,3)||g.players[who].eliminated||!integer(g.levels[lot],0,4))bad();
  if(Object.keys(g.levels).some(lot=>!Object.hasOwn(g.owners,lot)))bad();
  if(!Array.isArray(g.queue)||g.queue.length>20||!g.queue.every(e=>e&&(['destination','mini','midHermit'].includes(e.kind)||e.kind==='visit'&&integer(e.at,0,map.cells.length-1)&&(e.actor===undefined||integer(e.actor,0,3))||e.kind==='facility'&&integer(e.lot,0,map.cells.length-1)&&[5,6].includes(map.cells[e.lot].event)||e.kind==='event'&&integer(e.event,0,15)||e.kind==='message'&&typeof e.text==='string'||e.kind==='charge'&&(e.rent===undefined||typeof e.rent==='boolean')&&(e.armyTarget===undefined||integer(e.armyTarget,0,3))&&money(e.amount)&&e.amount>0&&integer(e.creditor,-2,3)&&(e.debtor===undefined||integer(e.debtor,0,3))&&e.creditor!==(e.debtor??g.turn)&&typeof e.text==='string')))bad();
  if(!Array.isArray(g.chargedLots)||!g.chargedLots.every(i=>integer(i,0,map.cells.length-1)&&map.cells[i].event===1)||!Array.isArray(g.log)||g.log.length>80||!g.log.every(e=>e&&integer(e.round,1)&&typeof e.text==='string')||!Array.isArray(g.winners)||!g.winners.every(i=>integer(i,0,3))||typeof g.endReason!=='string')bad();
  if((g.dicePending!==undefined&&typeof g.dicePending!=='boolean')||(g.dicePending&&g.phase!=='moving')||(g.phase==='moving'&&!g.remaining&&!(g.dicePending&&g.rollPlan?.result===0)))bad();
  if(g.phase==='prompt'){
    const q=g.pending,p=g.players[g.turn];if(!q||!['notice','destination','missile','buy','upgrade','property','bank','shop','hermit','debt','minigame','monthly'].includes(q.kind))bad();
    if(q.kind==='monthly'&&(!['ready','end'].includes(q.resume)||!integer(q.converter,-1,3)||(q.converter<0?q.resume!=='ready':q.resume!=='end')||!Array.isArray(q.rows)||q.rows.length!==4||q.rows.some((r,i)=>!r||r.who!==i||typeof r.eligible!=='boolean'||!['property','walking'].every(k=>money(r[k]))||!['interest','total'].every(k=>balance(r[k]))||!['groups','counts'].every(k=>Array.isArray(r[k])&&r[k].length===5&&r[k].every(v=>money(v))))))bad();
    if(q.kind==='minigame'&&!validMiniGame(q.session,g.players))bad();
    if(q.kind==='notice'&&(typeof q.text!=='string'||q.resume!==undefined&&q.resume!=='ready'))bad();
    if(q.hermitResult!==undefined){const h=q.hermitResult;if(q.kind!=='notice'||!h||!integer(h.event,0,34)||!integer(h.selected,0,2)||typeof h.good!=='boolean'||h.good!==!!HERMIT_EVENTS[h.event].good)bad();
      if(h.appliedEvents!==undefined&&(!Array.isArray(h.appliedEvents)||h.appliedEvents.length>4||h.appliedEvents.some(e=>!e||!integer(e.player,0,3)||e.name!==g.players[e.player].name||!integer(e.event,0,34)||!HERMIT_EVENTS[e.event].duration||!integer(e.remaining,1,100)||!g.players[e.player].events.some(x=>x.id===e.event&&x.remaining===e.remaining))||new Set(h.appliedEvents.map(e=>e.player+':'+e.event)).size!==h.appliedEvents.length))bad();
    }
    if(q.kind==='missile'&&(specialArrival(map,g)?.kind!=='missile'||specialArrival(map,g)?.lot!==q.lot))bad();
    if(q.kind==='destination'&&(!Array.isArray(q.options)||!q.options.length||q.options.some(i=>!eligible(map,g).includes(i))))bad();
    if(['buy','upgrade','property','bank','shop'].includes(q.kind)){
      if(q.withdrawOnly!==undefined&&(q.kind!=='bank'||typeof q.withdrawOnly!=='boolean'))bad();
      if(!integer(q.lot,0,map.cells.length-1)||!adjacent(map,g.visitAt??p.at).includes(q.lot))bad();
      const c=map.cells[q.lot];if(q.kind==='buy'&&(c.event!==1||g.owners[q.lot]!==undefined)||q.kind==='upgrade'&&(g.owners[q.lot]!==g.turn||g.levels[q.lot]>=4||propertyKind(g,q.lot)>=2)||q.kind==='bank'&&c.event!==6||q.kind==='shop'&&c.event!==5)bad();
      if(q.kind==='property'&&(c.event!==1||g.owners[q.lot]!==g.turn||propertyKind(g,q.lot)>=2))bad();
    }

    if(q.kind==='debt'&&((!money(q.amount)||q.amount<=0)||!integer(q.creditor,-2,3)||(q.debtor!==undefined&&!integer(q.debtor,0,3))||(q.armyTarget!==undefined&&!integer(q.armyTarget,0,3))||q.creditor===(q.debtor??g.turn)||typeof q.text!=='string'))bad();
  }else if(g.pending!==null)bad();
  if(g.phase!=='gameover'&&g.players[g.turn].eliminated&&!(g.phase==='resolving'||g.phase==='end'))bad();
  if(g.phase==='gameover'&&((!g.winners.length&&(!pcEconomy(g)||g.players.some(p=>!p.eliminated)))||g.winners.some(i=>g.players[i].eliminated)))bad();
  if(!historyEntry){
    g.history??=emptyHistory();const h=g.history;
    if(!h||!integer(h.next,0,5)||!Array.isArray(h.slots)||h.slots.length!==6)bad();
    for(const state of h.slots)if(state!==null){
      if(!state||state.history!==undefined||state.phase!=='ready'||state.map!==g.map)bad();
      restore(map,JSON.stringify(state),true);
    }
  }
  return g;
}
