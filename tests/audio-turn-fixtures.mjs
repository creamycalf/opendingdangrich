import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {executeCommand} from '../app/src/commands.mjs';
import {originalLandItemNeighbor} from '../app/src/land-items.mjs';
import {applyEffect} from '../app/src/effects.mjs';
export const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
map.jail=JSON.parse(fs.readFileSync(new URL('../app/public/assets/flow-assets.json',import.meta.url))).jail;
const base=()=>E.createGame(map,{seed:72,startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
export function audioTurnFixtures(){
 const cases=[],add=(name,before,command,clips,sfx=[])=>{const after=executeCommand(map,before,command).state;cases.push({name,before,after,command,clips,sfx});return after;};
 const event=(number,pool)=>{const g=base();g.phase='resolving';g.queue=[{kind:'event',event:number}];if(pool!==undefined)g.pool=pool;return g;};
 add('奖励圈',event(10),{type:'advance'},[1]);
 add('有奖金的奖金池',event(12,250),{type:'advance'},[1]);
 add('空奖金池',event(12,0),{type:'advance'},[83]);
 add('追加移动圈',event(7),{type:'advance'},[12]);
 const fine=executeCommand(map,event(11),{type:'advance'}).state;add('征罚圈实际扣款',fine,{type:'advance'},[9]);
 const rent=base();rent.phase='resolving';rent.queue=[{kind:'charge',rent:true,amount:25,debtor:0,creditor:1,text:'租金'}];add('正常租金',rent,{type:'advance'},[5],[74]);
 const reverse=structuredClone(rent);reverse.queue[0].debtor=1;reverse.queue[0].creditor=0;add('颠倒租金',reverse,{type:'advance'},[64]);
 const road=map.cells.findIndex((c,i)=>E.walkable(c)&&map.cells[originalLandItemNeighbor(map,i)]?.event===1),lot=originalLandItemNeighbor(map,road);
 const owner=base();owner.phase='resolving';owner.queue=[{kind:'destination'}];owner.players[0].at=road;owner.visitAt=road;owner.owners[lot]=0;owner.levels[lot]=0;owner.kinds[lot]=0;
 const offer=add('升级选项',owner,{type:'advance'},[49]);
 for(const [effect,clip] of [['original-25',70],['original-11',10]]){
  const unable=structuredClone(owner);unable.owners[lot]=1;
  applyEffect(unable.players[1],effect,0,false);
  add('地主无法收租'+effect,unable,{type:'advance'},[78,clip]);
  const exempt=structuredClone(unable);applyEffect(exempt.players[0],'original-18',0,false);
  add('付款方免租优先'+effect,exempt,{type:'advance'},[]);
 }
 add('确认升级',offer,{type:'answer',action:'upgrade'},[51],[11]);
 add('确认卖地',offer,{type:'answer',action:'sell'},[52],[11]);
 const max=structuredClone(owner);max.levels[lot]=4;add('最高级仅可卖地',max,{type:'advance'},[53]);
 const hermit=base();hermit.phase='prompt';hermit.pending={kind:'hermit'};add('仙人开箱确认',hermit,{type:'answer',action:'chest',value:0},[],[82]);
 for(const [scores,clip] of [[[3,1,0,0],17],[[1,3,0,0],18]]){
  const mini=base();mini.phase='prompt';mini.pending={kind:'minigame',session:{id:6,stage:'result',remaining:0,players:scores.map(score=>({score}))}};
  add('小游戏结算语音'+clip,mini,{type:'answer',action:'collect'},[clip]);
 }
 const bankrupt=base();bankrupt.turn=3;bankrupt.phase='end';bankrupt.dayCycle=0;bankrupt.players[0].cash=-100;bankrupt.players[0].cashDebtDays=14;
 add('负债十五天破产',bankrupt,{type:'nextTurn'},[25,58,58,58]);
 return cases;
}

