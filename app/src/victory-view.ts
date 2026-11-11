import {loadBundledImages} from './scene-image-bundle';
import {animationFrame} from './character-animation.mjs';
import {monthlyCharacterIds} from './monthly-presentation.mjs';
import {createVictoryMotion,tickVictoryMotion,advanceVictoryMotion,victoryStaticIds} from './victory-presentation.mjs';
import './ending-view.css';
type Certificate={character:string;seat:number;name:string;grade:string;assets:number;days:number;buildings:number[]};
type Options={certificate?:Certificate;onDone:()=>void;onSfx?:(id:number)=>void;signal?:AbortSignal};
const characterIds:Record<string,number>=monthlyCharacterIds;
export async function mountVictoryPresentation(host:HTMLElement,options:Options&{certificate:Certificate}){return mount(host,options,false);}
export async function mountVictoryAfterword(host:HTMLElement,options:Options){return mount(host,options,true);}
async function mount(host:HTMLElement,options:Options,afterword:boolean){
 const response=await fetch('assets/victory-scenes/catalog.json',{signal:options.signal});if(!response.ok)throw Error('胜利演出资源缺失');const catalog=await response.json(),certificate=options.certificate?structuredClone(options.certificate):null;
 if(!afterword&&(!certificate||characterIds[certificate.character]===undefined||certificate.seat<0||certificate.seat>3))throw Error('胜利角色资料无效');
 const indices=afterword?[66]:[50,51,52,53+certificate!.seat],group=afterword?'afterword':'victory',images:Record<string,HTMLImageElement>={},sources:Record<string,any>={background:catalog.backgrounds[group]};
 for(const index of indices)for(const id of catalog.animations[index].sprites)sources[group+'-'+id]=catalog.images[group+'-'+id];
 if(!afterword)for(const id of victoryStaticIds(certificate!.seat,characterIds[certificate!.character],certificate!.grade))sources['s'+id]=catalog.static[id];
 const entries=Object.entries(sources),loaded=await loadBundledImages(entries.map(([,meta])=>meta.url),{manifestUrl:'assets/victory-scenes/images.bundle.json',signal:options.signal,concurrency:afterword?4:16});entries.forEach(([key],i)=>images[key]=loaded[i]);if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
 const section=document.createElement('section');section.className='originalEnding victoryPresentation';section.setAttribute('aria-label',afterword?'原版片尾':'胜利演出');const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d')!;const button=document.createElement('button');section.append(canvas,button);host.append(section);
 let state=createVictoryMotion(),age=0,paused=document.hidden,disposed=false,done=false,raf=0,last=performance.now(),elapsed=0;const dialog=host.closest('dialog');
 function closed(){if(!dialog?.open)dispose();}
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('dingdangPause',pause);window.removeEventListener('dingdangResume',resume);dialog?.removeEventListener('close',closed);options.signal?.removeEventListener('abort',dispose);section.remove();}
 function finish(){if(done||disposed)return;done=true;dispose();options.onDone();}
 button.onclick=()=>{if(afterword){if(age>=35+catalog.animations[66].frames)finish();}else state=advanceVictoryMotion(state);};
 function animation(index:number,tick:number,y=0){const a=catalog.animations[index];for(const cmd of animationFrame(a,Math.max(0,Math.min(a.frames-1,tick)),false)){const key=a.group+'-'+cmd.sprite,meta=catalog.images[key];ctx.drawImage(images[key],cmd.x+meta.hx,cmd.y+meta.hy+y);}}
 function sound(index:number,tick:number){for(const c of catalog.animations[index].commands)if(c[0]===tick&&c[1]===0x8000)options.onSfx?.(c[2]);}
 function number(value:number,x:number,y:number){ctx.font='bold 25px sans-serif';ctx.textBaseline='top';ctx.lineWidth=3;ctx.strokeStyle='#173363';ctx.fillStyle='#fff';const text=String(Math.trunc(value));ctx.strokeText(text,x,y);ctx.fillText(text,x,y);}
 function draw(){ctx.clearRect(0,0,640,480);ctx.imageSmoothingEnabled=false;if(afterword){ctx.fillStyle='#000';ctx.fillRect(0,0,640,480);}else ctx.drawImage(images.background,0,0,640,480);
  if(afterword){if(age>=35)animation(66,age-35);button.disabled=age<35+catalog.animations[66].frames;button.textContent='返回主菜单';section.dataset.stage=button.disabled?'afterword-playing':'afterword-ready';}
  else{const c=certificate!,character=characterIds[c.character],opening=state.stage==='gate'?0:state.stage==='opening'?state.tick:97;
   animation(50,opening);ctx.drawImage(images['s'+(400+character)],191,81);animation(52,state.stage==='gate'?0:Math.max(0,opening-5));animation(51,age%catalog.animations[51].frames);
   if(!['gate','opening'].includes(state.stage))animation(53+c.seat,state.banner,362);
   if(state.stage.startsWith('buildings')||state.stage.startsWith('assets')){ctx.save();ctx.translate(state.left,362);if(state.stage.startsWith('buildings')){for(let i=0;i<5;i++){ctx.drawImage(images['s'+(567+c.seat*11+i+(i===4?character:0))],48+i*84,4);number(c.buildings[i]??0,89+i*84,18);}const rank=c.grade==='S'?612:613+'ABCDE'.indexOf(c.grade);ctx.drawImage(images['s'+rank],522,19);}else{ctx.drawImage(images.s611,358,9);number(c.assets,424,18);ctx.drawImage(images.s618,165,15);number(c.days,72,18);}ctx.restore();}
   button.disabled=!['gate','buildings-ready','assets-ready'].includes(state.stage);button.textContent=state.stage==='gate'?'查看胜利成绩':state.stage==='buildings-ready'?'查看资产与天数':'继续领取证书';section.dataset.stage=state.stage;
  }section.dataset.tick=String(afterword?age:state.tick);
 }
 function step(){age++;if(afterword){if(age>=35&&age<35+catalog.animations[66].frames)sound(66,age-35);}else{const previous=state;state=tickVictoryMotion(state);if(state.stage==='opening'){sound(50,state.tick);if(state.tick>=5)sound(52,state.tick-5);}if(state.stage==='banner-in'||state.stage==='banner-out')sound(53+certificate!.seat,state.banner);sound(51,age%catalog.animations[51].frames);if(state.stage==='done'&&previous.stage!=='done')finish();}}
 function frame(now:number){if(disposed)return;if(!section.isConnected){dispose();return;}const dt=Math.min(100,now-last);last=now;if(!paused){elapsed+=dt;while(elapsed>=1000/30&&!disposed){step();elapsed-=1000/30;}if(!disposed)draw();}if(!disposed)raf=requestAnimationFrame(frame);}
 function visibility(){paused=document.hidden;last=performance.now();}function pause(){paused=true;}function resume(){paused=document.hidden;last=performance.now();}
 document.addEventListener('visibilitychange',visibility);window.addEventListener('dingdangPause',pause);window.addEventListener('dingdangResume',resume);dialog?.addEventListener('close',closed);options.signal?.addEventListener('abort',dispose);draw();raf=requestAnimationFrame(frame);
 return {dispose,snapshot:()=>({state:{...state},age,paused,disposed,afterword})};
}
