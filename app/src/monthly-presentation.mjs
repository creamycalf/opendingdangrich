export const monthlyCharacterIds={doraemon:0,nobita:1,dorami:2,shizuka:3,suneo:4,gian:5,yellow:6};
const backgrounds=[68,76,64,80,84,72,54];
// 483d4c uses strict > in seat order. All nonpositive assets are handled safely
// on phones instead of reproducing the original invalid winner -1 access.
export function monthlyLeader(players,totals){let seat=players.findIndex(p=>!p.eliminated),best=0;totals.forEach((n,i)=>{if(!players[i].eliminated&&n>best){best=n;seat=i;}});return seat<0?0:seat;}
export function monthlyBackground(character,seat){const id=monthlyCharacterIds[character];if(id===undefined)throw Error('未知月结角色');return backgrounds[id]+(id===6?0:seat);}
export function monthlyBarHeight(total,maximum,tick){const target=maximum>0?Math.max(0,Math.trunc(Math.fround(total/maximum)*216)):0;return Math.min(Math.ceil(target/4)*4,Math.max(0,tick)*4);}
// 486793 / 486925: 15-step entrance then 30-sample damped bounce.
export function monthlyPanelY(tick,height=480){const target=Math.trunc((480-height)/2),speed=Math.fround((480-target)/15);if(tick<=15)return Math.trunc(Math.fround(480-Math.fround(speed*tick)));const i=tick-15;if(i<30)return target-Math.trunc(Math.sin(i*3.14159/5)*Math.fround((30-i)*speed/30));return target;}
