// MGame05: 0x427f0a / 0x42890d / 0x428fd1 / 0x429937.
export const rpsWins=(choice,target)=>choice-target===1||(choice===0&&target===2);
export const nextRpsChoice=choice=>(choice+1)%3;
export function rpsAI(choice,target,recognition,decision,draw){
  const a=draw((recognition+3)*5),b=draw((decision+3)*5),coin=draw(2);draw(3);
  if(a===0){if(!rpsWins(choice,target))return 2;if(b===0)return 1;return coin===0?0:2;}
  return b===0&&rpsWins(choice,target)?1:0;
}
const difficulty={doraemon:[3,4],nobita:[5,5],dorami:[1,1],shizuka:[4,2],suneo:[3,3],gian:[2,4],yellow:[3,4]};
const object=(choice=2,animation=-1)=>({mode:2,choice,clock:0,animation,age:0,ended:0});
export function createRpsPlayer(slot){return {slot,score:0,wins:0,actor:object(),target:object(),feedback:object(0),selector:object(2,12+slot)};}
function animate(o,animation){o.animation=animation;o.age=0;o.ended=0;}
function transition(o,mode,choice=-1,base=-1){
  o.mode=mode;if(choice!==-1)o.choice=choice;
  if(mode!==2&&base!==-1)animate(o,base+mode+2*o.choice);
}
function feedback(o,mode,animation=-1){o.mode=mode;if(animation!==-1)animate(o,animation);}
function due(o,n){if(++o.clock<n)return false;o.clock=0;return true;}
function ended(o){const value=o.ended;o.ended=0;return !!value;}
const length=a=>a<4?[6,4,6,4][a]:a<16?12:a%2?8:10;
function animationTick(o){if(o.animation<0)return;o.age=Math.min(length(o.animation)-1,o.age+1);if(o.age===length(o.animation)-1)o.ended=1;}
export function tickRps(s,players,inputs,draw){
  const active=s.players.filter(Boolean);
  if(s.remaining===1349){for(const p of active)transition(p.target,1,draw(3),16);}
  else if(s.remaining<=1348){
    for(const p of active){const t=p.target;
      if(t.mode===1&&due(t,90))transition(t,0,-1,16);
      if(t.mode===0&&ended(t)){transition(t,1,draw(3),16);t.clock=0;}
      if(t.mode===3&&due(t,60)){transition(t,0,-1,16);transition(p.actor,0,-1,22);feedback(p.feedback,2,2);}
    }
    for(const p of active){const f=p.feedback;if(f.mode===0&&ended(f))feedback(f,3);if(f.mode===3&&due(f,30))feedback(f,2,0);}
    for(const p of active){const a=p.actor;p.score=p.wins;
      if(a.mode===1&&ended(a)){
        if(rpsWins(a.choice,p.target.choice)){p.wins++;feedback(p.feedback,0,1);transition(p.target,0,-1,16);transition(a,0,-1,22);}
        else{feedback(p.feedback,1,3);transition(p.target,3);transition(a,3);}
        p.target.clock=0;
      }
      if(a.mode===0&&ended(a))transition(a,2);
    }
    s.players.forEach((p,i)=>{if(!p)return;
      const input=players[i].control==='ai'?rpsAI(p.selector.choice,p.target.choice,...difficulty[players[i].character],draw):inputs[i];
      if(input===2){p.selector.choice=nextRpsChoice(p.selector.choice);animate(p.selector,4+i+p.selector.choice*4);}
      if(input===1&&p.actor.mode===2)transition(p.actor,1,p.selector.choice,22);
    });
  }
  for(const p of active)for(const key of ['actor','target','feedback','selector'])animationTick(p[key]);
  if(--s.remaining===0)s.stage='result';
}
export const rpsRewards=s=>s.players.map(p=>p?p.score*25:0);
const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export function validRps(s,players){return s.players.every((p,i)=>{
  if(players[i].eliminated)return p===null;
  if(!p||p.slot!==i||!int(p.wins,0,170)||!int(p.score,0,p.wins)||p.wins-p.score>1)return false;
  if(!['actor','target','feedback','selector'].every(k=>{const o=p[k];return o&&int(o.mode,0,3)&&int(o.choice,0,2)&&int(o.clock,0,k==='target'?89:29)&&int(o.animation,-1,27)&&int(o.age,0,o.animation<0?0:length(o.animation)-1)&&[0,1].includes(o.ended);}))return false;
  return p.selector.mode===2&&p.selector.animation===4+i+p.selector.choice*4&&p.selector.clock===0&&p.actor.clock===0&&p.feedback.choice===0&&p.feedback.animation<=3&&
    (p.actor.animation===-1||p.actor.animation>=22)&& (p.target.animation===-1||(p.target.animation>=16&&p.target.animation<=21));
});}
