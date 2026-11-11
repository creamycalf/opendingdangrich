// wa.exe 0x482348, 0x482dc9, 0x438262 and 0x474cff. See MONTHLY.md.
const f32=Math.fround;
import {cashAtRefresh} from './pc-economy.mjs';
const REWARDS=[5,7.5,11.25,16.875,25.3125];
export const INITIAL_INTEREST=f32(1.2);
export const accrueInterest=(bank,interest,rate=INITIAL_INTEREST)=>f32(f32(interest)+f32(bank)*f32(rate)/365);
export const inflate=(before,draw)=>f32(f32(before)+(draw+20)/100);
// v1.26 main scheduler 0x475915: RNG(20), then +(draw+40)/100.
export const inflateV126=(before,draw)=>f32(f32(before)+(draw+40)/100);
// Retain float32 rounding after each same-level sum and each subtotal addition.
export function monthlyAward(lots,steps,interest,multiplier,eligible=true){
 const groups=[0,0,0,0,0],counts=[0,0,0,0,0];let property=0;
 if(eligible)for(const lot of lots){if((lot.kind??0)>1)continue;const level=lot.level;groups[level]=f32(groups[level]+f32(lot.price)*f32(multiplier)*REWARDS[level]);counts[level]++;}
 for(const value of groups)property=f32(property+value);
 const walking=eligible?f32(f32(steps)*10):0,base=f32(property+walking);
 return {groups,counts,property,walking,interest:f32(interest),total:f32(base+f32(interest)),resetSteps:eligible};
}
export function settleMonthly(map,g,converter=-1){
 const rows=g.players.map((p,who)=>{
  if(p.eliminated)return {who,eligible:false,property:0,walking:0,interest:0,total:0,groups:[0,0,0,0,0],counts:[0,0,0,0,0]};
  const eligible=converter<0?!p.monthlyClaimed:who===converter;
  const lots=Object.keys(g.owners).map(Number).filter(i=>g.owners[i]===who).map(i=>({price:map.cells[i].price,level:g.levels[i],kind:g.kinds?.[i]??0}));
  const award=monthlyAward(lots,p.walkPoints,p.interest,g.inflation,eligible);
  if(award.resetSteps)p.walkPoints=0;
  return {who,eligible,...award};
 });
 for(const row of rows){const p=g.players[row.who];if(p.eliminated)continue;
  if(converter<0){p.cash=f32(p.cash+f32(row.total-p.interest));p.bank=f32(p.bank+p.interest);p.interest=0;p.monthlyClaimed=false;}
  else if(row.who===converter){p.cash=cashAtRefresh(g,p.cash+row.total);p.monthlyClaimed=true;}
 }
 return rows;
}
