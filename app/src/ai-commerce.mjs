import {COMMERCE_PROFILES} from './ai-commerce-profiles.mjs';
const f32=Math.fround;
// Original 0x44bed2. The two integer-display comparisons are performed by the
// caller before committing, just as the native bank transaction does.
export function originalAiBank({character,cash,bank,day,withdrawOnly=false}){
  const [minimum,early,late]=COMMERCE_PROFILES[character].limits;
  cash=f32(cash);bank=f32(bank);
  const total=f32(cash+bank),reserve=f32(total*(day<15?early:late)/100);
  let target=f32(total-reserve);
  if(target<minimum)target=Math.min(minimum,total);
  return target<cash&&withdrawOnly?{cash,bank}:{cash:target,bank:f32(total-target)};
}
// Original 0x44c33f: one stable priority scan per visit, with its own budget.
// AI deliberately has no human shop character-exclusion check in the binary.
export function originalAiShop({character,cash,held,prices,multiplier=1,discount=100,priorities=COMMERCE_PROFILES[character].priorities}){
  const {limits}=COMMERCE_PROFILES[character];
  cash=f32(cash);let budget=f32(cash*limits[4]/100);const bought=[];
  for(const id of Array.from({length:42},(_,i)=>i).sort((a,b)=>priorities[b]-priorities[a]||a-b)){
    const price=f32((prices?.[id]??0)*f32(multiplier)*f32(discount)/100);
    if(price>0&&!held.includes(id)&&price<=budget){
      budget=f32(budget-price);cash=f32(cash-price);bought.push(id);
      if(bought.length>=limits[3])break;
    }
  }
  return {cash,bought};
}
