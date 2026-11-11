import {loadBundledImages} from './scene-image-bundle';
import {animationFrame} from './character-animation.mjs';
import {HERMIT_TICK_MS,hermitSounds,hermitChoiceFrame,hermitResultFrame} from './hermit-presentation.mjs';
import './hermit-view.css';
type Assets={catalog:any;images:Record<number,HTMLImageElement>};
let assets:Promise<Assets>|undefined;
function load(){return assets??=fetch('assets/pc-hermit/catalog.json').then(async r=>{
 if(!r.ok)throw Error('仙人宝箱资源加载失败');const catalog=await r.json(),images:Record<number,HTMLImageElement>={};
 const jobs:{id:number;url:string}[]=Object.entries(catalog.images).map(([id,meta]:[string,any])=>({id:Number(id),url:meta.url}));
 for(const e of Object.values(catalog.events??{}) as any[])if(e.icon)jobs.push({id:10000+e.icon.id,url:e.icon.url});
 const loaded=await loadBundledImages(jobs.map(job=>job.url),{manifestUrl:'assets/pc-hermit/images.bundle.json',concurrency:16});
 for(let i=0;i<jobs.length;i++)images[jobs[i].id]=loaded[i];return {catalog,images};
}).catch(e=>{assets=undefined;throw e;});}
const names=['右边的宝箱','中间的宝箱','左边的宝箱'];
/** Shared original sprite cache for the board's persistent status strip. */
export const loadHermitAssets=load;
const sceneVisible=(root:HTMLElement)=>root.isConnected&&(root.closest('dialog')?.open??true);
function canvas(label:string,w=144,h=150){const c=document.createElement('canvas');c.width=w;c.height=h;c.setAttribute('role','img');c.setAttribute('aria-label',label);return c;}
function drawSprite(ctx:CanvasRenderingContext2D,a:Assets,id:number,tick:number,x=0,y=0){for(const cmd of animationFrame(a.catalog.animations[id],tick,false)){const m=a.catalog.images[cmd.sprite];ctx.drawImage(a.images[cmd.sprite],x+cmd.x+m.hx,y+cmd.y+m.hy);}}
function stageDraw(c:HTMLCanvasElement,a:Assets,actor:number[]|null,boxes:any[],arrow=false,selected=0,tick=0){const ctx=c.getContext('2d')!;ctx.clearRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;const crop=actor?.[0]===0?[100,-20,440,440]:actor?.[0]===5?[120,-30,240,320]:[100,100,320,240],scale=Math.min(c.width/crop[2],c.height/crop[3]);ctx.save();ctx.translate((c.width-crop[2]*scale)/2,(c.height-crop[3]*scale)/2);ctx.scale(scale,scale);ctx.translate(-crop[0],-crop[1]);if(actor)drawSprite(ctx,a,actor[0],actor[1],-40,60);for(const box of boxes)drawSprite(ctx,a,box.id,box.tick,240-box.slot*40,240+box.slot*20);if(arrow)drawSprite(ctx,a,10,tick,240-selected*40,240+selected*20);ctx.restore();}
function accessibleButton(text:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b;}
function lifecycle(root:HTMLElement,content:HTMLElement){
 let dead=false,frame=0,hiddenAt:number|null=document.hidden?performance.now():null,hiddenTime=0,pending:FrameRequestCallback|undefined;
 const alive=()=>!dead&&sceneVisible(root),now=()=>(hiddenAt??performance.now())-hiddenTime;
 function request(){if(!frame&&pending&&alive()&&!document.hidden)frame=requestAnimationFrame(()=>{frame=0;if(!alive()){destroy();return;}if(document.hidden){visibility();return;}const fn=pending;pending=undefined;fn?.(now());});}
 function visibility(){
  if(document.hidden){if(hiddenAt===null)hiddenAt=performance.now();cancelAnimationFrame(frame);frame=0;}
  else{if(hiddenAt!==null){hiddenTime+=performance.now()-hiddenAt;hiddenAt=null;}request();}
 }
 const observer=new MutationObserver(()=>{if(!sceneVisible(root))destroy();});observer.observe(content,{childList:true});if(root.closest('dialog'))observer.observe(root.closest('dialog')!,{attributes:true,attributeFilter:['open']});
 document.addEventListener('visibilitychange',visibility);
 function destroy(){dead=true;cancelAnimationFrame(frame);frame=0;pending=undefined;observer.disconnect();document.removeEventListener('visibilitychange',visibility);}
 return {destroy,alive,now,running:()=>alive()&&!document.hidden,schedule:(fn:FrameRequestCallback)=>{pending=fn;request();}};
}
/** Native slots: 0 right, 1 middle, 2 left. No RNG in this view. */
export function mountHermitChoices(content:HTMLElement,options:{onChoose:(nativeIndex:number)=>void;onSelect?:()=>void;onSound?:(clip:number)=>void;selected?:number}){
 const root=document.createElement('section');root.className='hermitChoices';root.setAttribute('aria-label','仙人宝箱');
 const stage=canvas('原版仙人出现与施法',640,480);stage.className='hermitStage';
 const choices=document.createElement('div');choices.className='hermitChests';choices.setAttribute('role','group');choices.setAttribute('aria-label','选择一个宝箱');choices.hidden=true;
 const status=document.createElement('p');status.className='hermitStatus';status.setAttribute('aria-live','polite');status.textContent='正在准备宝箱…';
 let selected=options.selected??0,phase='loading',start=0,last=-1,a:Assets|undefined;const boxes:HTMLButtonElement[]=[],pictures:HTMLCanvasElement[]=[];
 const open=accessibleButton('仙人正在出现…',()=>{
  if(!life.running())return;
  if(phase==='greeting')setPhase('summon');else if(phase==='instruction')setPhase('choose');
  else if(phase==='choose'){options.onSound?.(82);setPhase('confirm');}
 });open.className='primary hermitOpen';open.disabled=true;
 for(const index of [2,1,0]){const card=accessibleButton('',()=>{if(phase!=='choose'||!life.running())return;selected=index;update();options.onSelect?.();});card.className='hermitChest';card.setAttribute('aria-label',names[index]);card.dataset.nativeIndex=String(index);card.disabled=true;const picture=canvas(names[index]),label=document.createElement('span');label.textContent=names[index];card.append(picture,label);boxes[index]=card;pictures[index]=picture;choices.append(card);}
 function update(){root.dataset.phase=phase;choices.hidden=phase!=='choose';stage.hidden=phase==='choose';for(let i=0;i<3;i++){boxes[i].disabled=phase!=='choose';boxes[i].setAttribute('aria-pressed',String(i===selected));}open.disabled=!['greeting','instruction','choose'].includes(phase);open.textContent=phase==='choose'?'打开'+names[selected]:phase==='greeting'?'老师好，请继续':phase==='instruction'?'选择宝箱':phase==='confirm'?'正在打开宝箱…':'仙人正在施法…';status.textContent=phase==='greeting'?a!.catalog.dialogue.greeting:phase==='instruction'?a!.catalog.dialogue.instruction:phase==='choose'?'已选'+names[selected]+'，点“打开”确认。':phase==='confirm'?'仙人正在收起另外两个宝箱…':phase==='enter'?'仙人来了…':'宝箱正在出现…';}
 function setPhase(next:string){phase=next;start=life.now();last=-1;update();}
 root.append(stage,choices,status,open);content.append(root);const life=lifecycle(root,content);
 void load().then(result=>{if(!life.alive())return;a=result;setPhase('enter');
  function draw(now:number){if(!life.alive()){life.destroy();return;}const tick=Math.max(0,Math.floor((now-start)/HERMIT_TICK_MS));const view=hermitChoiceFrame(phase,tick,selected);
   const sound=(id:number,offset=0,reverse=false)=>{for(const clip of hermitSounds(a!.catalog,id,last-offset,tick-offset,reverse))options.onSound?.(clip);};
   if(phase==='enter')sound(0);if(phase==='summon')for(let i=0;i<3;i++)sound(9,45+i*6,true);if(phase==='confirm')for(const [n] of [0,1,2].filter(i=>i!==selected).entries())sound(9,25+n*6);
   stageDraw(stage,a!,view.actor,view.boxes,view.arrow,selected,tick);
   if(phase==='choose')for(let i=0;i<3;i++){const ctx=pictures[i].getContext('2d')!;ctx.clearRect(0,0,144,150);ctx.save();ctx.translate(12,93);ctx.scale(1.5,1.5);drawSprite(ctx,a!,9,0);if(i===selected)drawSprite(ctx,a!,10,tick);ctx.restore();}
   last=tick;if(view.done){if(phase==='enter')setPhase('greeting');else if(phase==='summon')setPhase('instruction');else if(phase==='confirm'){life.destroy();options.onChoose(selected);return;}}
   life.schedule(draw);
  }life.schedule(draw);
 }).catch(e=>{console.warn('仙人图片加载失败',e);if(!life.alive())return;phase='error';root.dataset.error='assets';status.textContent='仙人图片加载失败，请返回后重试。';open.disabled=true;});
 return {destroy:life.destroy};
}
/** Result is already settled by engine; presentation never reapplies it. */
export function mountHermitResult(content:HTMLElement,options:{good:boolean;selected:number;text:string;event?:number;appliedEvents?:{player:number;name:string;event:number;remaining:number}[];onContinue:()=>void;onSound?:(clip:number)=>void}){
 const root=document.createElement('section');root.className='hermitResult';root.setAttribute('aria-label','宝箱结果');root.dataset.good=String(options.good);root.dataset.nativeIndex=String(options.selected);
 const stage=canvas('原版宝箱开合与仙人离场',640,480);stage.className='hermitStage hermitResultChest';
 const text=document.createElement('p');text.className='hermitResultText';text.textContent=options.text;text.hidden=true;
 const state=document.createElement('p');state.className='hermitStatus';state.setAttribute('aria-live','polite');state.textContent=names[options.selected]+'正在打开…';
 let phase='loading',start=0,last=-1,a:Assets|undefined,applied:NonNullable<typeof options.appliedEvents>=[];
 const next=accessibleButton('正在打开宝箱…',()=>{if(!life.running())return;if(phase==='error'){life.destroy();options.onContinue();return;}if(phase!=='result')return;phase='leave';root.dataset.phase=phase;start=life.now();last=-1;next.disabled=true;next.textContent='仙人正在离开…';text.hidden=true;});next.className='primary hermitContinue';next.disabled=true;
 root.append(stage,state,text,next);content.append(root);const life=lifecycle(root,content);
 void load().then(result=>{if(!life.alive())return;a=result;applied=(options.appliedEvents??[]).filter(e=>a!.catalog.events?.[e.event]?.hasStatus&&Number.isInteger(e.remaining)&&e.remaining>0);phase='reveal';root.dataset.phase=phase;start=life.now();
  function draw(now:number){if(!life.alive()){life.destroy();return;}const tick=Math.max(0,Math.floor((now-start)/HERMIT_TICK_MS)),view=hermitResultFrame(phase,tick,options.good,options.selected);
   const sound=(id:number,offset=0)=>{for(const clip of hermitSounds(a!.catalog,id,last-offset,tick-offset))options.onSound?.(clip);};if(phase==='reveal')sound(options.good?7:6);if(phase==='leave'){sound(9,20);sound(5,52);}
   if(phase==='status'){
    for(let i=0;i<applied.length;i++)sound(11,i*46);
    const n=Math.floor(tick/46),entry=applied[n];last=tick;
    if(!entry){life.destroy();options.onContinue();return;}
    const frame=tick%46,definition=a!.catalog.events[entry.event],ctx=stage.getContext('2d')!;
    ctx.clearRect(0,0,640,480);ctx.save();ctx.translate(220,180);ctx.scale(3,3);ctx.imageSmoothingEnabled=false;
    // Original left lane: icon x5, NPC x26. Right lane: icon x587, NPC x566.
    drawSprite(ctx,a!,definition.good?14:15,frame%10,definition.good?21:0,Math.min(0,-48+frame*2));
    if(frame<22)drawSprite(ctx,a!,11,frame,definition.good?0:21,0);
    if(frame>=9){const icon=definition.icon;ctx.drawImage(a!.images[10000+icon.id],(definition.good?0:21)+12,17);}
    ctx.restore();state.textContent=entry.name+' · 效果生效，剩余 '+entry.remaining+' 回合';life.schedule(draw);return;
   }
   stageDraw(stage,a!,view.actor,view.box?[view.box]:[]);last=tick;
   if(view.done){if(phase==='reveal'){phase='result';root.dataset.phase=phase;start=now;last=-1;text.hidden=false;next.disabled=false;next.textContent='继续';state.textContent=names[options.selected]+' · '+(options.good?'好运':'考验');}else if(phase==='leave'){if(applied.length){phase='status';root.dataset.phase=phase;start=now;last=-1;next.textContent='正在显示状态变化…';}else{life.destroy();options.onContinue();return;}}}
   life.schedule(draw);
  }life.schedule(draw);
 }).catch(e=>{console.warn('仙人图片加载失败',e);if(!life.alive())return;phase='error';root.dataset.error='assets';state.textContent='仙人图片加载失败，可继续游戏。';text.hidden=false;next.disabled=false;next.textContent='继续';});
 return {destroy:life.destroy};
}
