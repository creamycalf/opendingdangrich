// New PC b99f: 4166fd state machine; 401827 direction-specific sound opcodes.
export const HERMIT_TICK_MS=1000/30; // Mobile presentation clock; native frame order is preserved.
export function soundFrames(animation,reverse=false){
 return animation.commands.filter(c=>c[1]===(reverse?0x80c8:0x8000)).map(c=>({tick:reverse?animation.frames-1-c[0]:c[0],clip:c[2]})).sort((a,b)=>a.tick-b.tick);
}
export function hermitSounds(catalog,id,previous,current,reverse=false){return soundFrames(catalog.animations[id],reverse).filter(c=>c.tick>previous&&c.tick<=current).map(c=>c.clip);}
export function hermitChoiceFrame(phase,tick,selected=0){
 const out={actor:[1,tick],boxes:[],arrow:false,done:false};
 if(phase==='enter'){out.actor=[0,Math.min(tick,61)];out.done=tick>=62;}
 if(phase==='summon'){
  out.actor=tick<90?[2,tick]:[3,(tick-90)%30];
  out.boxes=[0,1,2].filter(i=>tick>=45+i*6).map(i=>({slot:i,id:9,tick:Math.max(0,31-(tick-45-i*6)),reverse:true,elapsed:tick-45-i*6}));out.done=tick>=89;
 }
 if(['instruction','choose'].includes(phase)){out.actor=[3,tick%30];out.boxes=[0,1,2].map(slot=>({slot,id:9,tick:0}));out.arrow=phase==='choose';}
 if(phase==='confirm'){
  out.actor=tick<60?[4,tick]:[3,(tick-60)%30];const others=[0,1,2].filter(i=>i!==selected);
  out.boxes=[0,1,2].map(slot=>({slot,id:9,tick:slot===selected?0:Math.max(0,Math.min(31,tick-25-others.indexOf(slot)*6)),elapsed:slot===selected?-1:tick-25-others.indexOf(slot)*6}));out.done=tick>=63;
 }
 return out;
}
export function hermitResultFrame(phase,tick,good,selected){
 const id=good?7:6,length=good?82:80;
 if(phase==='reveal')return {actor:[3,tick%30],box:{slot:selected,id,tick:Math.min(length-1,tick)},done:tick>=length};
 if(phase==='result')return {actor:[3,tick%30],box:{slot:selected,id,tick:length-1},done:false};
 if(tick<20)return {actor:[3,tick%30],box:{slot:selected,id:8,tick},done:false};
 if(tick<52)return {actor:[3,tick%30],box:{slot:selected,id:9,tick:tick-20},done:false};
 if(tick<136)return {actor:[5,tick-52],box:null,done:false};
 return {actor:null,box:null,done:tick>=181};
}
