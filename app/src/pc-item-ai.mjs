// Original v1.26 AI; raw instruction fixtures live in research/pc-v126-item-ai.json.
import {ITEM_AI_PROFILES,ITEM_GROUPS} from './pc-item-ai-profiles.mjs';
const f32=Math.fround;
export const initialItemAi=character=>({weights:[...ITEM_AI_PROFILES[character].priorities],opponents:[...ITEM_AI_PROFILES[character].opponents]});
export function syncItemAiProperties(g){
 if(g.itemAiVersion!=='pc-v126')return;
 for(let who=0;who<g.players.length;who++){
  const p=g.players[who],owned=Object.keys(g.owners).map(Number).filter(i=>g.owners[i]===who),order=p.itemAi.propertyOrder;
  p.itemAi.propertyOrder=[...order.filter(i=>g.owners[i]===who),...owned.filter(i=>!order.includes(i))];
 }
}
export function originalAiAttacked(player,source,id){
 if(!player.itemAi||player.itemAi.seat===source||ITEM_GROUPS[id]!==1||id===26)return;
 player.itemAi.opponents[source]=(player.itemAi.opponents[source]+ITEM_AI_PROFILES[player.character].parameters[(0x5a8-0x3e8)/4])|0;
}
export function originalAiRent(player,ownerCharacter,count){
 if(!player.itemAi)return;
 player.itemAi.opponents[ownerCharacter]=(player.itemAi.opponents[ownerCharacter]+count*ITEM_AI_PROFILES[player.character].parameters[(0x5ac-0x3e8)/4])|0;
}
export function scoreOriginalItem(id,c,target=c.who){
  const table=ITEM_AI_PROFILES[c.character].parameters,P=offset=>table[(offset-0x3e8)/4];
  const who=c.who,rank=c.rank,cap=c.capabilities[who],ratio=n=>Math.trunc(n*100/c.totalRoad),enemy=ratio(c.otherRoad),empty=ratio(c.emptyRoad),own=ratio(c.ownRoad),lot=c.neighbor;
  let score=-10,destination=null,donor=null,scanStop=false;
  const choose=mode=>{const list=mode===1?c.wealthOrder.slice(0,2):mode===2?c.wealthOrder.slice(2):c.enemyOrder,found=list.find(i=>i!==who);scanStop=found!==undefined;return found??target;};
  const range=(a,b)=>{if(P(a)-1<rank||rank<P(b)-1)score=10;};
  const forward=()=>{const [x,y]=c.position,dx=[0,0,-1,1][c.direction],dy=[-1,1,0,0][c.direction];return [Math.trunc(x)+dx,Math.trunc(y)+dy];};
  switch(id){
    case 0:case 2:
      if(lot&&lot.owner!==null&&lot.owner!==who&&lot.level>0){
        const base=id===0?0x418:0x440;if(lot.level<=4)score=P(base+(lot.level-1)*4)-10;
        if(lot.owner===c.enemyOrder[0])score+=P(base+16);
        if(lot.owner===c.wealthOrder[0])score+=P(base+20);
        if(lot.owner===c.wealthOrder[3])score+=P(base+24);
      }break;
    case 1:if(P(0x434)<=enemy){score=10;scanStop=c.wealthOrder.includes(who);if(c.mode>1)score+=P(0x43c);}break;
    case 3:
      for(let i=0;i<4;i++){if(c.nearby[i])target=i;if(P(0x464)<=empty&&target!==who)score=10;}
      if(c.mode>1&&target!==who)score+=P(0x468);
      if(c.gianNearby&&c.gianNearby!==who+1){score+=P(0x45c);target=c.gianNearby-1;}break;
    case 4:target=choose(P(0x46c));if(target!==who)score=10;break;
    case 5:if(c.cash<P(0x470))score=10;break;
    case 6:destination=forward();if(c.roadPlaceable&&(P(0x474)<=own||P(0x478)<=empty))score=10;break;
    case 7:target=choose(P(0x47c));for(let i=0;i<4;i++)if(c.wealthOrder[i]===who&&(P(0x47c)<i||i<P(0x480)))score=10;if(c.mode>1)score+=P(0x488);break;
    case 8:if(P(0x48c)<=enemy)score=10;break;
    case 9:if(P(0x498)<=enemy&&(cap&0x20))score=10;if(cap&0x8000)score+=P(0x49c);break;
    case 10:range(0x4a0,0x4a4);if((cap&0x8000)&&(cap&0x20))score+=P(0x4a8);break;
    case 11:if(P(0x4b4)<=enemy)score=10;if(cap&0x8000)score+=P(0x4b8);break;
    case 12:range(0x4bc,0x4c0);if(c.mode>1)score+=P(0x4c4);break;
    case 13:
      if(P(0x4c4)<=enemy)score=10;if(c.gianNearby)score+=P(0x4c8);if(cap&0x40000)score+=P(0x4cc);
      if(score>0){destination=c.pickRoad();if(!destination)score=-10;scanStop=true;}break;
    case 14:range(0x4d0,0x4d4);break;
    case 15:target=choose(P(0x4d8));if(c.cash<=P(0x4dc))score=10;for(let i=0;i<4;i++)if(c.alive[i]&&i!==who&&(c.capabilities[i]&0x4000)){score+=P(0x4e0);target=i;}break;
    case 16:if(c.mode<2){scanStop=c.alive.some((a,i)=>a&&c.sleeping[i]);if(scanStop)score+=P(0x4e4);if(cap&0x40000)score+=P(0x4e8);if(c.clones[who])score+=P(0x4ec);}break;
    case 17:target=choose(P(0x4f0));if(target!==who)score=10;break;
    case 18:if(P(0x4f4)<=enemy||c.cash<=P(0x4f8))score=10;if(cap&0x40000)score=-20;break;
    case 19:range(0x4fc,0x500);if(c.mode>1)score+=P(0x504);break;
    case 20:if(P(0x508)-1<rank)score=10;if(c.mode>1)score+=P(0x50c);break;
    case 21:target=choose(P(0x510));if(lot&&lot.owner!==who&&lot.kind===1&&P(0x514)<lot.level&&lot.owner===target){scanStop=!!c.firstOwnBell;if(scanStop){score=10;destination=c.firstOwnBell;}}break;
    case 22:if(c.aheadHermit)score=P(0x518)-10;break;
    case 23:range(0x51c,0x520);break;
    case 24:if(P(0x524)<=empty||(P(0x528)<=enemy&&(cap&4)))score=10;break;
    case 25:if(P(0x530)<=enemy){target=choose(P(0x52c));if(target!==who)score=10;}break;
    case 26:
      target=choose(P(0x534));scanStop=false;for(let i=0;i<4;i++)if(c.alive[i]&&(c.sleeping[i]||(c.flags[i]&0x1000))&&i!==target){score=10;donor=i;}
      if(score>0&&((c.flags[target]&0x1000)||(c.capabilities[target]&0x400)))score=0;break;
    case 27:range(0x538,0x53c);if(score>0)target=choose(P(0x540));break;
    case 28:if(P(0x548)-1<rank)score=10;if(c.aheadHermit)score+=P(0x54c);break;
    case 29:if(P(0x550)<=enemy||P(0x554)-1<rank)score=10;if(cap&0x40000)score=-20;break;
    case 30:if(P(0x558)<=enemy||empty<=P(0x55c)){score=0;const first=c.alive.findIndex((a,i)=>a&&i!==who);scanStop=first>=0;if(scanStop){score=10;target=first;}}break;
    case 31:if(c.aheadJail)score=P(0x560)-10;if(c.aheadFine)score+=P(0x564);break;
    case 32:if(P(0x568)<=empty||P(0x56c)<=own)score=10;break;
    case 33:target=choose(P(0x570));if(P(0x574)-1<rank||c.cash<=P(0x578)||(c.wealthOrder[0]!==who&&c.cash+c.bank<f32(c.wealthTotals[c.wealthOrder[0]]/P(0x57c))))score=10;break;
    case 34:if(P(0x580)-1<rank)score=10;if(cap&0x10000)score+=P(0x584);break;
    case 35:
      if(P(0x58c)===3){for(let i=0;i<4;i++)if(c.alive[i]&&i!==who&&c.hasItem15[i]){target=i;score=10;}}
      else{target=choose(P(0x58c));if(target!==who)score=10;}break;
    case 36:target=choose(P(0x590));if(target!==who)score=10;break;
    case 37:if(P(0x594)<=enemy){destination=forward();if(c.roadPlaceable)score=10;}break;
    case 38:if(P(0x598)<=enemy)score=10;break;
    case 39:target=choose(P(0x59c));if(target!==who)score=10;break;
    case 40:case 41:if(P(0x5a0)-1<rank)score=10;break;
  }
  return {score:score|0,target,destination,donor,scanStop};
}
export function originalItemGroup(character,propertyCount,canUse,random){
  const groups=ITEM_AI_PROFILES[character].group,draw=random(100);let total=0,group=0;
  for(let i=1;i<4;i++){if(total<=draw&&draw<total+groups[i])group=i;total+=groups[i];}
  if(group===0)group=3;else if(propertyCount<10&&random(2)===0)group=0;
  return canUse?group:0;
}
export function selectOriginalItem(c,state,random,isLegal){
  const weights=state.weights,order=Array.from({length:42},(_,i)=>i).sort((a,b)=>weights[b]-weights[a]||a-b);
  const group=originalItemGroup(c.character,c.propertyCount,!!(c.capabilities[c.who]&1),random);
  let target=c.who,result=null;
  let halted=false;
  if(group){for(const pass of group===3?[3]:[group,3]){
    for(const id of order){
      if(!c.inventory[id]||(ITEM_GROUPS[id]!==pass&&ITEM_GROUPS[id]!==2))continue;
      const candidate=scoreOriginalItem(id,c,target);target=candidate.target;
      if(candidate.score===0)candidate.score=random(2);
      if(candidate.score>0&&isLegal(id,candidate)){result={id,...candidate};weights[id]=(weights[id]-16)|0;break;}
      if(candidate.scanStop){halted=true;break;}
    }if(result||halted)break;
  }}
  for(let i=0;i<42;i++)weights[i]=(weights[i]+1)|0;
  return result;
}
// Runs before item scoring, preserving the native mutable opponent/weight
// arrays. Character indices and seat indices are intentionally distinct.
export function prepareOriginalItemRanks(c,state){
  const P=offset=>ITEM_AI_PROFILES[c.character].parameters[(offset-0x3e8)/4],opponents=state.opponents;
  const totals=c.players.map(p=>p.alive?f32(f32(p.cash)+f32(p.bank)):0);
  const wealthOrder=[0,1,2,3].sort((a,b)=>totals[b]-totals[a]||a-b);
  for(let i=0;i<3;i++)if(!c.players[wealthOrder[i+1]].alive)wealthOrder[i+1]=wealthOrder[i];
  for(let i=0;i<4;i++)if(i!==c.who&&c.players[i].alive){
    const value=Math.trunc(f32(c.players[i].bank)*100/totals[i]),percent=Number.isFinite(value)&&value>=-2147483648&&value<=2147483647?value:-2147483648;
    if(percent<6)opponents[i]=(opponents[i]+P(0x5b0))|0;
  }
  const enemyOrder=[0,1,2,3];let sorted=false;
  while(!sorted){sorted=true;for(let j=0;j<3;j++){
    if(!c.players[enemyOrder[j]].alive)opponents[c.players[enemyOrder[j]].characterIndex]=0;
    if(opponents[c.players[enemyOrder[j]].characterIndex]<opponents[c.players[enemyOrder[j+1]].characterIndex]){[enemyOrder[j],enemyOrder[j+1]]=[enemyOrder[j+1],enemyOrder[j]];sorted=false;}
  }}
  return {wealthTotals:totals,wealthOrder,enemyOrder,rank:wealthOrder.lastIndexOf(c.who)};
}
export function updateOriginalItemWeights(c,state){
  const P=offset=>ITEM_AI_PROFILES[c.character].parameters[(offset-0x3e8)/4],w=state.weights;
  const add=(ids,offset)=>{for(const id of ids)w[id]=(w[id]+P(offset))|0;};
  for(let i=0;i<4;i++)if(i!==c.who&&c.alive[i]){
    if(c.capabilities[i]&0x4000)add([4,10,11,25,26,35,36],0x5b8);
    if(c.capabilities[i]&0x20000)add([17,35],0x5c4);
    if(c.clones[i])add([4],0x5c8);
    for(const count of c.inventories[i])if(count>5){state.opponents[c.characterIndices[i]]=(state.opponents[c.characterIndices[i]]+P(0x5ac))|0;add([4,26,10,15,36],0x5cc);}
  }
  const cap=c.capabilities[c.who];
  if(((cap&0x8000)||(cap&0x20))&&(cap&0x40000))add([1,9,10,15,23,25,38],0x5d4);
  if(cap&0x10000)add([17,34],0x5b4);
  if(c.gianNearby){add([3,4,13,26,30,36,37],0x5c0);state.opponents[5]=(state.opponents[5]+P(0x5c0))|0;}
  if(c.rank>1)add([5,31,33],0x5d8);
  if(cap&0x40000)add([24,32],0x5d8);
  add(c.neighbor&&(c.neighbor.owner===null||c.neighbor.owner===c.who)?[40,41]:[0,2],0x5d0);
  return state;
}
