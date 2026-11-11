import {loadImages} from './scene-image-loader';
import {animationFrame} from './character-animation.mjs';
import {audio} from './audio';

// Coordinates and resource IDs: v1.26 title callback 0x458e79,
// game submenu 0x45a157. Phone-only sound/help controls stay outside the scene.
export async function mountPcTitle(root:HTMLElement, showRanking:()=>void, exitGame:()=>void, controls:()=>void, arcadePlayers:(competition:boolean)=>void,signal?:AbortSignal){
 const response=await fetch('assets/pc-front/catalog.json',{signal});
 if(!response.ok)throw Error('开场资源缺失');
 const catalog=await response.json(),pictures:Record<string,HTMLImageElement>={};
 let speaker=Math.floor(Math.random()*6);if(speaker===2)speaker=3;
 const voice=(clip:number)=>void audio.play({kind:'voice',character:speaker,bank:1,clip});
 const entries=Object.entries({...catalog.images,...Object.fromEntries(Object.entries(catalog.static).map(([k,v])=>['s2-'+k,v]))}) as [string,any][];
 const loaded=await loadImages(entries.map(([,meta])=>meta.url),{signal});entries.forEach(([id],i)=>pictures[id]=loaded[i]);if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const canvas=root.querySelector<HTMLCanvasElement>('#titleArt')!,ctx=canvas.getContext('2d')!;
 const stage=root.querySelector<HTMLElement>('.pcTitleStage')!,gate=root.querySelector<HTMLButtonElement>('#titleGate')!;
 const menu=root.querySelector<HTMLElement>('.pcTitleActions')!;
 const primary=document.createElement('div');primary.hidden=true;stage.append(primary);
 const primaryActions=[['大富翁',()=>void open(20)],['小游戏',()=>void open(19)],['操控设定',controls],['排行榜',showRanking],['离开游戏',exitGame]] as const;
 for(const [i,[label,action]] of primaryActions.entries()){
  const button=document.createElement('button');button.setAttribute('aria-label',label);button.onclick=()=>{voice([1,5,8,9,10][i]);action();};
  Object.assign(button.style,{position:'absolute',left:'242px',top:`${160+i*32}px`,width:'148px',height:'30px',background:'transparent',border:'0',padding:'0'});primary.append(button);
 }
 const modes=document.createElement('div');modes.hidden=true;stage.append(modes);
 for(const [i,label] of ['比赛模式','练习模式','返回主菜单'].entries()){
   const button=document.createElement('button');button.setAttribute('aria-label',label);
   button.onclick=()=>i===2?void open(21):arcadePlayers(i===0);
   Object.assign(button.style,{position:'absolute',left:'242px',top:`${160+i*32}px`,width:'148px',height:'30px',background:i===2?'#155f9d':'transparent',border:'0',padding:'0'});
   if(i===2)button.textContent='返回';modes.append(button);
 }
 const shortcuts=document.createElement('div');shortcuts.className='titleTouchActions';shortcuts.hidden=true;
 for(const [id,label] of [['newGame','新游戏'],['continueGame','继续游戏']]){
  const button=document.createElement('button');button.textContent=label;button.onclick=()=>root.querySelector<HTMLButtonElement>('#'+id)!.click();button.dataset.target=id;shortcuts.append(button);
 }
 root.append(shortcuts);
 let frame=0,epoch=0,disposed=false,finishOpen:(()=>void)|undefined;
 function size(){stage.style.setProperty('--title-scale',String(Math.min(root.clientWidth/640,root.clientHeight/480)));}
 const resizeObserver=new ResizeObserver(size);resizeObserver.observe(root);
 function sprite(id:string,x:number,y:number){ctx.drawImage(pictures[id],x,y);}
 function animation(id:number,tick:number,x:number,y:number){
  for(const cmd of animationFrame(catalog.animations[id],Math.min(tick,26),false)){
   const meta=catalog.images[cmd.sprite];sprite(String(cmd.sprite),x+cmd.x+meta.hx,y+cmd.y+meta.hy);
  }
 }
 function draw(tick:number,panel:number){
  ctx.clearRect(0,0,640,480);ctx.imageSmoothingEnabled=false;
  sprite('s2-319',154,283);
  animation(panel,tick,226,148);animation(18,tick,196,112);
 }
 async function open(panel=21){
  if(disposed)return;finishOpen?.();
  primary.hidden=true;modes.hidden=true;
  const token=++epoch;gate.hidden=true;menu.hidden=true;shortcuts.hidden=true;
  const start=performance.now();
  await new Promise<void>(resolve=>{
   finishOpen=resolve;
   function step(now:number){if(token!==epoch){resolve();return;}const tick=Math.max(0,Math.min(26,Math.floor((now-start)/33.333)));draw(tick,panel);if(tick<26)frame=requestAnimationFrame(step);else resolve();}frame=requestAnimationFrame(step);
  });
  if(token===epoch&&!disposed){finishOpen=undefined;primary.hidden=panel!==21;menu.hidden=panel!==20;shortcuts.hidden=panel!==20;modes.hidden=panel!==19;syncShortcuts();}
 }
 function syncShortcuts(){for(const button of Array.from(shortcuts.querySelectorAll('button')))button.disabled=root.querySelector<HTMLButtonElement>('#'+button.dataset.target)!.disabled;}
 const menuObserver=new MutationObserver(syncShortcuts);menuObserver.observe(menu,{subtree:true,attributes:true,attributeFilter:['disabled']});
 // PC v1.26 title 0x458e79: bank 1, primary menu table 0x4c878c;
 // gate alternates 0/22, with original SFX 11. Cosmetic RNG is separate.
 gate.onclick=()=>{voice(Math.random()<.5?0:22);void audio.play({kind:'sfx',clip:11});void open();};
 const menuClick=(event:Event)=>{const id=(event.target as HTMLElement).closest('button')?.id;if(id==='newGame')voice(2);else if(id==='continueGame')voice(3);};menu.addEventListener('click',menuClick);
 function dispose(){if(disposed)return;disposed=true;epoch++;cancelAnimationFrame(frame);finishOpen?.();finishOpen=undefined;resizeObserver.disconnect();menuObserver.disconnect();gate.onclick=null;menu.removeEventListener('click',menuClick);primary.remove();modes.remove();shortcuts.remove();signal?.removeEventListener('abort',dispose);}
 signal?.addEventListener('abort',dispose,{once:true});
 return {dispose,arcade:()=>open(19),show(splash=false){
  if(disposed)return;epoch++;finishOpen?.();finishOpen=undefined;cancelAnimationFrame(frame);size();primary.hidden=splash;menu.hidden=true;gate.hidden=!splash;shortcuts.hidden=true;syncShortcuts();
  if(splash){ctx.clearRect(0,0,640,480);sprite('s2-559',154,138);sprite('s2-558',200,357);gate.focus({preventScroll:true});}
  else draw(26,21);
  modes.hidden=true;
 }};
}
