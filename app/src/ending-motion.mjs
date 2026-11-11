// New-PC 473ca6: counter first falls by ten, then indexes 19 native sine samples.
export const gameOverX=[1,81,158,253,337,424,499,568];
export const gameOverWave=Array.from({length:19},(_,i)=>Math.trunc(Math.sin(i*6.28/19)*4+186));
export function createGameOverMotion(){return {phase:0,counters:Array.from({length:8},(_,i)=>-44-i*10),y:Array.from({length:8},(_,i)=>-44-i*10),tick:0};}
export function tickGameOverMotion(state){
 const next={phase:state.phase,counters:[...state.counters],y:[...state.y],tick:state.tick+1};
 // Native chooses the outer phase once per tick, even if a letter changes it.
 if(state.phase===0){for(let i=0;i<8;i++){const n=next.counters[i];if(n<186){next.y[i]=n;next.counters[i]+=10;}else{next.y[i]=gameOverWave[n-186];if(n===194)next.phase=1;else next.counters[i]++;}}}
 else for(let i=0;i<8;i++){const n=next.counters[i];next.y[i]=gameOverWave[n-186];next.counters[i]=n===204?186:n+1;}
 return next;
}
