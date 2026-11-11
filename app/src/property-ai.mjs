// v1.26 0x44b4e8 / 0x44ba36. Original x86 fixtures and limitations:
// research/PC-V126-PROPERTY-AI.md. `basePrice` is the arriving event's payload,
// which has already had map inflation applied once.
export const PROPERTY_AI_PROFILES=Object.freeze({
  doraemon:[25,20,0,5,2000,1,10],nobita:[25,25,0,0,1500,1,5],
  dorami:[25,20,0,20,3000,1000,20],shizuka:[25,20,0,20,1000,1,5],
  suneo:[25,25,20,25,1500,1,15],gian:[25,20,0,20,500,500,2],
  yellow:[25,20,0,5,1000,500,5],
});
const VALUES=[1,1.5,2.25,3.375,5.0625];
const ftol=x=>Number.isFinite(x)&&x>=-2147483648&&x<2147483648?Math.trunc(x):-2147483648;
function decision(character,cash,price,random){
  const w=PROPERTY_AI_PROFILES[character],cost=ftol(price),percentage=ftol(Math.imul(cost,100)/Math.fround(cash));
  // Percentage 50 deliberately receives BOTH middle and high weights.
  let score=-20;
  if(percentage<=25)score+=w[0];
  if(percentage>25&&percentage<51)score+=w[1];
  if(percentage>=50)score+=w[2];
  if(cost<800)score+=w[3];
  return {score,percentage,w,yes:score===0?random(2)===0:score>0};
}
export function originalAiBuy({character,cash,basePrice,multiplier=1},random){
  const price=basePrice*Math.fround(multiplier),d=decision(character,cash,price,random);
  return d.yes&&Math.fround(cash)>=price;
}
export function originalAiProperty({character,cash,bank,basePrice,level,multiplier=1,propertyTags=[]},random){
  const cost=Math.trunc(basePrice*VALUES[level]),unavailable=level>=4||Math.fround(cash)<=cost;
  const d=decision(character,cash,cost*Math.fround(multiplier),random);
  let action=d.yes&&!unavailable?'upgrade':'leave';
  if(action==='leave'){
    if(Math.fround(cash)<d.w[4]||Math.fround(bank)<d.w[5])action='sell';
    if(propertyTags.filter(k=>k===0||k===1).length<d.w[6])action='leave';
  }
  // Actual 0x44bdff..0x44be11 overrides the weighted choice whenever available.
  if(!unavailable)action='upgrade';
  return action;
}
