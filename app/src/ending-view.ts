import {loadImages} from './scene-image-loader';
import {createGameOverMotion,tickGameOverMotion,gameOverX} from './ending-motion.mjs';
import './ending-view.css';

// Parent owns music/scene transitions. This view never settles cash or records wins.
export async function mountGameOverPresentation(host:HTMLElement,options:{onDone:()=>void;signal?:AbortSignal}){
 const response=await fetch('assets/ending-scenes/catalog.json',{signal:options.signal});if(!response.ok)throw Error('结局资源缺失');const catalog=await response.json();
 const section=document.createElement('section');section.className='originalEnding';section.setAttribute('aria-label','GAME OVER');
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d')!;
 const button=document.createElement('button');button.textContent='返回主菜单';button.disabled=true;
 section.append(canvas,button);
 const images=await loadImages([catalog.background,...catalog.letters].map((meta:any)=>meta.url),{signal:options.signal});
 if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');host.append(section);const activeDialog=host.closest('dialog');
 let motion=createGameOverMotion(),disposed=false,paused=document.hidden,last=performance.now(),elapsed=0,raf=0,done=false;
 function finish(){if(disposed||done||motion.phase!==1)return;done=true;dispose();options.onDone();}
 button.onclick=finish;canvas.onclick=finish;
 function draw(){ctx.imageSmoothingEnabled=false;ctx.drawImage(images[0],0,0,640,480);images.slice(1).forEach((image,i)=>ctx.drawImage(image,gameOverX[i],motion.y[i]));button.disabled=motion.phase!==1;section.dataset.phase=String(motion.phase);section.dataset.tick=String(motion.tick);}
 function frame(now:number){if(disposed)return;if(!section.isConnected){dispose();return;}const dt=Math.min(100,now-last);last=now;if(!paused){elapsed+=dt;while(elapsed>=1000/30){motion=tickGameOverMotion(motion);elapsed-=1000/30;}draw();}raf=requestAnimationFrame(frame);}
 const visibility=()=>{paused=document.hidden;last=performance.now();};const pause=()=>{paused=true;};const resume=()=>{paused=document.hidden;last=performance.now();};
 document.addEventListener('visibilitychange',visibility);window.addEventListener('dingdangPause',pause);window.addEventListener('dingdangResume',resume);
 function closed(){if(!activeDialog?.open)dispose();}
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('dingdangPause',pause);window.removeEventListener('dingdangResume',resume);activeDialog?.removeEventListener('close',closed);options.signal?.removeEventListener('abort',dispose);section.remove();}
 activeDialog?.addEventListener('close',closed);options.signal?.addEventListener('abort',dispose);
 draw();raf=requestAnimationFrame(frame);
 return {dispose,snapshot:()=>structuredClone(motion)};
}
