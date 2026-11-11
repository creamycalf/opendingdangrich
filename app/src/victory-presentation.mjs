export function createVictoryMotion(){return {stage:'gate',tick:0,banner:0,left:-640};}
export function advanceVictoryMotion(state){
 if(state.stage==='gate')return {...state,stage:'opening',tick:0};
 if(state.stage==='buildings-ready')return {...state,stage:'buildings-out',tick:0};
 if(state.stage==='assets-ready')return {...state,stage:'assets-out',tick:0};
 return state;
}
export function tickVictoryMotion(state){
 const s={...state,tick:state.tick+1};
 if(s.stage==='opening'&&s.tick>=98){s.stage='banner-in';s.tick=0;}
 else if(s.stage==='banner-in'){s.banner=s.tick;if(s.banner>=35){s.stage='buildings-in';s.tick=0;s.left=-640;}}
 else if(s.stage==='buildings-in'||s.stage==='assets-in'){s.left+=10;if(s.left===0){s.stage=s.stage==='buildings-in'?'buildings-ready':'assets-ready';s.tick=0;}}
 else if(s.stage==='buildings-out'||s.stage==='assets-out'){s.left+=10;if(s.left===640){if(s.stage==='buildings-out'){s.stage='assets-in';s.left=-640;}else{s.stage='banner-out';}s.tick=0;}}
 else if(s.stage==='banner-out'){s.banner=35+s.tick;if(s.banner>=72)s.stage='done';}
 return s;
}

export function victoryStaticIds(seat,character,grade){return [400+character,...Array.from({length:5},(_,i)=>567+seat*11+i+(i===4?character:0)),grade==='S'?612:613+'ABCDE'.indexOf(grade),611,618];}
