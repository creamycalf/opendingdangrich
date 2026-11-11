// Original x86 evidence and limits: docs/rules/PROPERTY.md.
const VALUES=[1,1.5,2.25,3.375,5.0625];
const RENTS=[.5,.75,1.125,1.6875,2.53125];
const f32=Math.fround;
export const scaledLandPrice=(cell,multiplier=1)=>Math.trunc(cell.price*f32(multiplier));
export const originalUpgradeCost=(cell,level,multiplier=1)=>{
  if(!Number.isInteger(level)||level<0||level>=4)throw Error('建筑不能继续升级');
  return Math.trunc(scaledLandPrice(cell,multiplier)*VALUES[level]);
};
export const originalSaleValue=(cell,level,multiplier=1)=>Math.trunc(scaledLandPrice(cell,multiplier)*VALUES[level]/2);
// Asset valuation retains the float32 base; transaction prompts truncate it.
export const originalPropertyValue=(cell,level,multiplier=1)=>f32(f32(cell.price*f32(multiplier))*VALUES[level]);

export function connectedProperty(map,owners,lot){
  if(owners[lot]===undefined)return [];
  const who=owners[lot],seen=new Set(),result=[],stack=[lot];
  while(stack.length){
    const i=stack.pop(),c=map.cells[i];
    if(!c||seen.has(i)||owners[i]!==who||((c.flags&128)&&!(c.flags&64)))continue;
    seen.add(i);result.push(i);
    // Reverse push preserves original recursive N, S, W, E visitation order.
    if(c.x+1<map.width)stack.push(i+1);
    if(c.x>0)stack.push(i-1);
    if(c.y+1<map.height)stack.push(i+map.width);
    if(c.y>0)stack.push(i-map.width);
  }
  return result;
}

export function originalPropertyCharge(map,owners,levels,lot,multiplier=1){
  const lots=connectedProperty(map,owners,lot);
  let sum=0;
  for(const i of lots)sum=f32(sum+scaledLandPrice(map.cells[i],multiplier)*RENTS[levels[i]??0]);
  return {lots,amount:f32(sum*lots.length)};
}
