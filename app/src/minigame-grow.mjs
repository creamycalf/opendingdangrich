// MGame03 0x424250, alternating keys 0x424d15, character AI 0x424e2c.
const difficulty={doraemon:3,nobita:5,dorami:1,shizuka:4,suneo:3,gian:2,yellow:3};
export function createGrowPlayer(slot){return {slot,mode:0,last:0,strokes:0,growth:0,score:0,beamAge:7};}
export function tickGrow(s,players,inputs,draw){
  // The original parent consumes two setup ticks before accepting keys.
  if(s.remaining<=448){
    for(const p of s.players)if(p){p.beamAge=Math.min(7,p.beamAge+1);if(p.strokes>=398)p.mode=3;p.score=Math.trunc(p.strokes/4);}
    s.players.forEach((p,i)=>{
      if(!p||p.mode===3)return;
      const input=players[i].control==='ai'?(draw(difficulty[players[i].character]+2)===0?(p.last===1?2:1):0):inputs[i];
      if((input===1||input===2)&&input!==p.last){p.last=input;p.strokes++;p.beamAge=0;if(p.strokes%20===0)p.growth=Math.min(10,p.growth+1);}
    });
  }
  if(--s.remaining===0)s.stage='result';
}
export const growRewards=s=>s.players.map(p=>p?p.score*7:0);
const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export function validGrow(s,players){return s.players.every((p,i)=>players[i].eliminated?p===null:p&&p.slot===i&&[0,3].includes(p.mode)&&int(p.last,0,2)&&int(p.strokes,0,398)&&int(p.growth,0,10)&&p.growth===Math.min(10,Math.trunc(p.strokes/20))&&int(p.score,0,99)&&int(p.beamAge,0,7));}
