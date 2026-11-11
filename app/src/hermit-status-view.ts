import {loadHermitAssets} from './hermit-view';
import {animationFrame} from './character-animation.mjs';
import {HERMIT_TICK_MS,hermitSounds} from './hermit-presentation.mjs';
import {diffHermitStatuses,hermitRemovalFrame} from './hermit-status-model.mjs';
import {HERMIT_EVENTS} from './hermit-data.mjs';
import './hermit-status-view.css';
type Event={id:number;remaining:number};
type Detail=Event&{name:string;good:boolean};
type State={player:string|number|null;events:Event[];active?:boolean};
type Assets=Awaited<ReturnType<typeof loadHermitAssets>>;
/** active:false clears baselines and cancels all pending sound/animation. */
export function mountHermitStatusView(host:HTMLElement,options:{onInspect:(event:Detail)=>void;onSound?:(clip:number)=>void}){
 const root=document.createElement('section');root.className='hermitStatusView';root.setAttribute('aria-label','仙人持续效果');root.hidden=true;
 const track=document.createElement('div');track.className='hermitStatusTrack';track.setAttribute('role','group');
 const live=document.createElement('span');live.className='sr-only';live.setAttribute('aria-live','polite');root.append(track,live);host.append(root);
 let player:State['player']=null,events:Event[]=[],queue:Event[]=[],active=false,dead=false,a:Assets|undefined,loading=false,frame=0,started=0,last=-1,removing:Event|undefined;
 const detail=(e:Event):Detail=>({...e,name:HERMIT_EVENTS[e.id]?.name??'仙人效果',good:!!HERMIT_EVENTS[e.id]?.good});
 function visible(){return active&&!dead&&root.isConnected&&!document.hidden&&!document.querySelector('dialog[open]')&&!document.querySelector('#diceDisplay:not([hidden])');}
 function stop(){cancelAnimationFrame(frame);frame=0;queue=[];removing=undefined;last=-1;}
 function reset(){stop();events=[];player=null;active=false;root.hidden=true;track.replaceChildren();}
 function sprite(ctx:CanvasRenderingContext2D,id:number,tick:number,x:number,y:number){for(const cmd of animationFrame(a!.catalog.animations[id],tick,false)){const m=a!.catalog.images[cmd.sprite];ctx.drawImage(a!.images[cmd.sprite],cmd.x+m.hx+x,cmd.y+m.hy+y);}}
 function paintIcon(c:HTMLCanvasElement,e:Event){if(!a)return;const meta=a.catalog.events[e.id]?.icon;if(!meta)return;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;const scale=Math.min(3,80/meta.w,65/meta.h);ctx.drawImage(a.images[10000+meta.id],(c.width-meta.w*scale)/2,(c.height-meta.h*scale)/2,meta.w*scale,meta.h*scale);}
 function render(){
  if(dead)return;root.hidden=!active||(!events.length&&!removing&&!queue.length);const scroll=track.scrollLeft;track.replaceChildren();
  if(removing){const ghost=document.createElement('div');ghost.className='hermitStatusRemoval';ghost.setAttribute('role','img');ghost.setAttribute('aria-label',detail(removing).name+'效果结束');const c=document.createElement('canvas');c.width=144;c.height=96;ghost.append(c);track.append(ghost);}
  for(const e of events){const d=detail(e),b=document.createElement('button');b.type='button';b.className='hermitStatusCard';b.dataset.event=String(e.id);b.dataset.good=String(d.good);b.setAttribute('aria-label',d.name+'，剩余 '+e.remaining+' 回合，'+(d.good?'好运':'恶运')+'效果');b.title=d.name+' · 剩余 '+e.remaining+' 回合';b.onclick=()=>{if(visible())options.onInspect(detail(events.find(x=>x.id===e.id)??e));};
   const c=document.createElement('canvas');c.width=96;c.height=80;c.setAttribute('aria-hidden','true');const count=document.createElement('span');count.textContent=String(e.remaining);count.className='hermitStatusCount';b.append(c,count);track.append(b);paintIcon(c,e);
  }
  track.scrollLeft=scroll;
 }
 function next(){if(dead||!active||!a)return;removing=queue.shift();if(!removing){render();return;}started=performance.now();last=-1;live.textContent=detail(removing).name+'效果结束';render();track.scrollLeft=0;frame=requestAnimationFrame(draw);}
 function draw(now:number){
  frame=0;if(dead||!active||!removing||!root.isConnected){stop();return;}
  // A modal or roll blocks the HUD. Stop feedback, never leave stale sounds queued.
  if(!visible()){stop();render();return;}
  const tick=Math.max(0,Math.floor((now-started)/HERMIT_TICK_MS)),d=detail(removing),v=hermitRemovalFrame(tick,d.good,!events.some(e=>detail(e).good===d.good)&&!queue.some(e=>detail(e).good===d.good)),ctx=track.querySelector('canvas')?.getContext('2d');
  if(ctx){ctx.clearRect(0,0,144,96);ctx.save();ctx.translate(20,24);ctx.scale(1.5,1.5);ctx.imageSmoothingEnabled=false;const base=d.good?0:21,meta=a!.catalog.events[removing.id]?.icon;if(v.iconVisible&&meta)ctx.drawImage(a!.images[10000+meta.id],base+12,17);sprite(ctx,v.npc,v.npcTick,d.good?21:0,v.npcY);if(v.status!==null)sprite(ctx,v.status,v.statusTick,base,0);ctx.restore();}
  for(const clip of hermitSounds(a!.catalog,d.good?16:17,last,tick))options.onSound?.(clip);
  
  last=tick;if(v.done){removing=undefined;next();}else frame=requestAnimationFrame(draw);
 }
 function update(state:State){
  if(dead)return;if(state.active===false||state.player===null){reset();return;}
  const filtered=state.events.filter(e=>Number.isInteger(e.id)&&HERMIT_EVENTS[e.id]?.duration>0&&Number.isInteger(e.remaining)&&e.remaining>0).map(e=>({...e}));
  const same=active&&player===state.player;active=true;
  if(!same){stop();player=state.player;}else if(visible())queue.push(...diffHermitStatuses(events,filtered).filter((e:Event)=>!queue.some(q=>q.id===e.id)&&removing?.id!==e.id));
  events=filtered;render();
  if(a){if(!removing&&queue.length)next();return;}
  if(!loading&&(events.length||queue.length)){loading=true;void loadHermitAssets().then(value=>{loading=false;if(dead)return;a=value;render();if(active&&queue.length&&!removing)next();}).catch(()=>{loading=false;root.dataset.error='assets';live.textContent='效果图标未加载，可点击查看说明';});}
 }
 const observer=new MutationObserver(()=>{if(!root.isConnected){destroy();return;}if(removing&&!visible()){stop();render();}});
 observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden']});
 // Hidden tabs may receive no RAF until already visible again: cancel at the
 // visibility edge, not in the next frame, so stale expiry audio cannot leak.
 function visibility(){if(document.hidden){stop();render();}}
 document.addEventListener('visibilitychange',visibility);
 function destroy(){dead=true;stop();observer.disconnect();document.removeEventListener('visibilitychange',visibility);root.remove();}
 return {update,destroy};
}
