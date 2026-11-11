// v1.26 event payload and daily insolvency evidence:
// research/PC-V126-PROPERTY-AI.md, pc-v126-property-transactions.json.
const LEVEL=[1,1.5,2.25,3.375,5.0625];
export const pcEconomy=g=>g.pcEconomyVersion==='pc-v126';
// 0x44f0cb refresh: cap the stored float cash, not merely rendered digits.
export const cashAtRefresh=(g,value)=>pcEconomy(g)?Math.min(999999,Math.fround(value)):Math.fround(value);
export const pcPropertyPayment=(kind,base,level,multiplier,ai)=>{
  if(kind==='buy')return ai?base*Math.fround(multiplier):base;
  const payload=ai?Math.trunc(base*LEVEL[level]):base;
  return Math.trunc(payload*LEVEL[level]/(kind==='sell'?2:1));
};
export const nextCashDebtDays=(cash,days)=>Math.fround(cash)<0?days+1:0;
export function settleCashDebtDay(g){
  const eliminated=[];
  for(let who=0;who<g.players.length;who++){
    const p=g.players[who];if(p.eliminated)continue;
    p.cashDebtDays=nextCashDebtDays(p.cash,p.cashDebtDays??0);
    if(p.cashDebtDays<15)continue;
    p.eliminated=true;p.effects=[];p.events=[];p.itemSleeping=false;p.small=false;
    delete p.dwarfBody;
    for(const lot of Object.keys(g.owners))if(g.owners[lot]===who){delete g.owners[lot];delete g.levels[lot];delete g.kinds[lot];}
    eliminated.push(who);
  }
  return eliminated;
}
