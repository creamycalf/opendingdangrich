import {netWorth,random} from './engine.mjs';
import {propertyKind} from './property-items.mjs';

const AWARDS='dingdang.certificate-awards.v1';
export function certificateGrade(assets,days){
  const daily=Math.fround(Math.fround(assets)/days);
  // x87 unordered comparisons set C0, which takes every lower-grade branch.
  if(Number.isNaN(daily))return 'E';
  const index=[900,600,500,400,300].filter(threshold=>daily<threshold).length;
  return ['S','A','B','C','D','E'][index];
}
export function winnerCertificate(map,g){
  if(g.phase!=='gameover')return null;
  // The PC chooses the first surviving seat when assets tie.
  const seat=g.winners?.slice().sort((a,b)=>a-b)[0],player=g.players[seat];
  if(!player||player.control!=='human')return null;
  const assets=netWorth(map,g,seat),days=g.round-1,buildings=[0,0,0,0,0];
  for(const [lot,owner] of Object.entries(g.owners)){
    if(owner===seat&&propertyKind(g,Number(lot))<2)buildings[g.levels[lot]??0]++;
  }
  return {seat,character:player.character,name:player.name,assets,days,buildings,grade:certificateGrade(assets,days)};
}
export function validUnlockRecords(records){
  return Array.isArray(records)&&records.length===6&&records.every(n=>Number.isInteger(n)&&n>0&&n<100)&&records.reduce((sum,n)=>sum+n,0)%6===0;
}
function awards(storage){
  try{const value=JSON.parse(storage.getItem(AWARDS)??'null');if(value?.version===1&&value.attempts&&typeof value.attempts==='object'&&!Array.isArray(value.attempts))return value;}catch{}
  return {version:1,records:[],attempts:{}};
}
export function permanentYellowUnlocked(storage){return validUnlockRecords(awards(storage).records);}
export function awardCertificate(storage,g,certificate){
  if(!certificate||certificate.character!=='doraemon'||certificate.grade!=='S'||g.players.filter(p=>p.control==='ai').length!==3)return permanentYellowUnlocked(storage);
  const current=awards(storage);
  const key=JSON.stringify([g.map,g.startDate,g.seed,g.turnSerial,certificate]);
  if(!Object.hasOwn(current.attempts,key)){
    // Store the attempt and its checksum in one write, so reopening a result
    // cannot reroll an unlucky zero or consume the board game's RNG again.
    const stream={seed:g.seed,randomVersion:'pc-v126'};
    const records=Array.from({length:5},()=>random(stream,100));
    records.push(6-records.reduce((sum,n)=>sum+n,0)%6);
    current.records=records;current.attempts[key]=records;
    storage.setItem(AWARDS,JSON.stringify(current));
  }
  return validUnlockRecords(current.records);
}
