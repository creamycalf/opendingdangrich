// Original event table 0x4450a7. Reward circle uses a global 50..450 cycle;
// fine circle 0x444595, and independent rent pool 0x443baa / event 13.
export function nextCircleReward(next,triple=false){return {amount:next*(triple?3:1),next:next===450?50:next+50};}
export function originalCircleFine(draw,protectedFine=false,multiplier=1){
  if(!Number.isInteger(draw)||draw<0||draw>=75)throw Error('罚款随机值无效');
  return protectedFine?0:Math.fround((75+draw)*Math.fround(multiplier));
}
export const accrueRentPool=(pool,amount)=>Math.fround(pool+Math.abs(amount));
