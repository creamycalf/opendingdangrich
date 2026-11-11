import {bindMiniDevices} from './pc-controls';
import {MINI_GAMES} from './minigames.mjs';
import {audio} from './audio';
import {miniAnimationAudio} from './audio-rules.mjs';
import './minigame-touch.css';
// wa.exe SHA f190b353..., MGame04 drawing 0x425aec, table 0x4be828 (80 rows).
const obstacleTrack=[1,0,2,3,4,1,2,3,4,1,4,1,3,1,2,4,3,2,1,3,4,3,1,2,4,2,3,1,4,1,3,2,3,4,2,1,2,3,4,1,2,3,1,4,1,3,2,3,4,2,4,1,3,1,2,4,3,2,1,3,4,3,1,2,4,2,3,1,4,1,3,2,3,4,2,1,3,4,1,2];
type Options={exitLabel?:string;retry?:()=>void;read:()=>any;tick:(inputs:number[])=>void;save:()=>Promise<void>;exit:()=>void;finish:()=>void;valid:()=>boolean;autostart:boolean;error:(e:unknown)=>void};
const loaded=new Map<number,Promise<{catalog:any;images:Record<string,HTMLImageElement>}>>();
function resources(id:number){
  if(loaded.has(id))return loaded.get(id)!;
  const promise=fetch('assets/minigames/catalog.json').then(async response=>{
    if(!response.ok)throw Error('小游戏资源目录缺失');
    const catalog=(await response.json())[id],images:Record<string,HTMLImageElement>={};
    await Promise.all(Object.entries<any>({...catalog.images,...Object.fromEntries(catalog.backgrounds.map((a:any,i:number)=>['bg'+i,a]))}).map(([id,art])=>new Promise<void>((resolve,reject)=>{const im=new Image();im.onload=()=>{images[id]=im;resolve();};im.onerror=()=>reject(Error('小游戏图片缺失：'+id));im.src=art.url;})));
    return {catalog,images};
  }).catch(e=>{loaded.delete(id);throw e;});
  loaded.set(id,promise);return promise;
}
export async function mountMiniGame(host:HTMLElement,options:Options){
  const id=options.read().pending.session.id,isRace=id===2||id===4,isShared=isRace||id===0||id===1,{catalog,images}=await resources(id);
  if(!options.valid())return ()=>{};
  let stopped=false,paused=!options.autostart,frame=0,last=performance.now(),accumulator=0,ticks=0,pendingWrites=0;
  const held=[0,0,0,0],inputs=[0,0,0,0],canvases:(HTMLCanvasElement|null)[]=[],scores:HTMLElement[]=[],raceFeedback:HTMLElement[]=[],buttons:HTMLButtonElement[][]=[];
  const root=document.createElement('section');root.className='miniGame';root.setAttribute('aria-label',MINI_GAMES[id as keyof typeof MINI_GAMES].name);
  const top=document.createElement('div');top.className='miniTop';const timer=document.createElement('strong');timer.id='miniTimer';
  const pause=document.createElement('button');pause.textContent=paused?'继续小游戏':'暂停';pause.id='miniPause';top.append(timer,pause);root.append(top);
  const hint=document.createElement('p');hint.textContent=id===7?'弹簧压到底时点击蓄力，飞起后点击抓取。以最高高度计分。':id===5?'看上方手势，换拳后出拳。石头胜剪刀，布胜石头，剪刀胜布。':id===4?'点击加速；按住防守可避开障碍，但会减速。':id===2?'交替点击左右按钮加速。连续按同一边不能加速。':id===3?'左右交替点击放大玩偶。每 4 次有效点击记 1 分。':'看上方目标，点击下方左／右按钮选择相同图案。';root.append(hint);
  if(id===4)hint.textContent='反复点按加速（按住不会连续加速）；按住防守，松手解除。落后画面时，下方小窗显示你的动作。';
  if(id===0)hint.textContent='按住左右按钮移动，接住豆沙包，避开炸弹。';
  if(id===1)hint.textContent='点击左右按钮切换手臂，模仿上方领队。小心假动作！';
  const resumePanel=document.createElement('div');resumePanel.className='miniResumePanel';
  const resumeText=document.createElement('span');resumeText.textContent='小游戏已暂停，计时已停止。点击继续后再操作。';
  const resume=document.createElement('button');resume.id='miniResume';resume.textContent='继续小游戏';resumePanel.append(resumeText,resume);root.append(resumePanel);
  const status=document.createElement('p');status.className='miniStatus';status.setAttribute('role','status');root.append(status);
  const retry=document.createElement('button');retry.textContent='重新练习';retry.className='miniRetry';retry.hidden=true;if(options.retry)root.append(retry);
  const raceCanvas=document.createElement('canvas');raceCanvas.width=640;raceCanvas.height=336;raceCanvas.className='miniRace';raceCanvas.setAttribute('aria-label',id===0?'原版接豆沙包舞台':'原版竞速赛道');if(isShared)root.append(raceCanvas);
  const grid=document.createElement('div');grid.className='miniGrid';root.append(grid);
  const game=options.read(),humanCount=game.players.filter((p:any)=>!p.eliminated&&p.control==='human').length;
  if(humanCount<=1&&!isShared)grid.classList.add('singleHuman');
  if(humanCount===1&&isRace)grid.classList.add('singleRaceHuman');
  for(let i=0;i<4;i++){
    const player=game.players[i];if(player.eliminated)continue;
    const card=document.createElement('div');card.className='miniPlayer '+(player.control==='human'?'human':'computer');card.style.setProperty('--player-color',['#26b6e5','#55bf4f','#ef5858','#e8c02d'][i]);card.dataset.player=String(i);
    const score=document.createElement('strong');scores[i]=score;card.append(score);
    if(isRace&&player.control==='human'){const feedback=document.createElement('small');feedback.className='miniRaceFeedback';raceFeedback[i]=feedback;card.append(feedback);}
    if(!isShared&&(player.control==='human'||humanCount===0)){
      const canvas=document.createElement('canvas');canvas.width=id===7?126:id===5?128:id===3?220:160;canvas.height=id===5||id===7?336:id===3?300:286;canvas.setAttribute('aria-label',player.name+(id===7?'的跳高赛道':id===5?'的猜拳机':id===3?'的放大光线':'的目标和图案'));canvases[i]=canvas;card.append(canvas);
    }
    const row=document.createElement('div');row.className='miniControls';buttons[i]=[];
    if(player.control==='human')for(const [label,input] of [['左',4],['右',8]] as const){
      const b=document.createElement('button');b.textContent=id===7?(input===4?'蓄力':'抓取'):id===5?(input===4?'出拳':'换拳'):id===4?(input===4?'加速':'防守'):label;b.setAttribute('aria-label',player.name+'选'+label);b.onpointerdown=e=>{e.preventDefault();if(!b.disabled){inputs[i]=input;if(id===0||(id===4&&input===8)){held[i]=input;b.setPointerCapture(e.pointerId);}};};
      const release=()=>{if(held[i]===input)held[i]=0;};b.onpointerup=b.onpointercancel=release;b.onlostpointercapture=release;b.onclick=e=>{if(e.detail===0&&!b.disabled)inputs[i]=input;};buttons[i].push(b);row.append(b);
    }
    card.append(row);grid.append(card);
  }
  const leave=document.createElement('button');leave.textContent=options.exitLabel??'保存并返回主菜单';leave.className='miniLeave';top.append(leave);host.replaceChildren(root);
  audio.pause(paused);
  const devices=bindMiniDevices(root,game.players.map((p:any)=>!p.eliminated&&p.control==='human'),id,()=>!paused&&!stopped&&!document.hidden);
  function dispose(){devices.dispose();stopped=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('dingdangPause',nativePause);audio.pause(false);}
  // A pause must enqueue its exact state even if a periodic native write is
  // still pending. SaveStore serializes writes; skipping this write loses ticks.
  const checkpoint=async(force=false)=>{if(pendingWrites&&!force)return;pendingWrites++;try{await options.save();}catch(e){paused=true;pause.textContent='继续小游戏';options.error(e);}finally{pendingWrites--;}};
  pause.onclick=()=>{paused=!paused;audio.pause(paused);devices.clear();inputs.fill(0);held.fill(0);last=performance.now();accumulator=0;pause.textContent=paused?'继续小游戏':'暂停';if(paused)void checkpoint(true);render();};
  resume.onclick=()=>{if(paused)pause.click();};
  retry.onclick=()=>{if(options.retry){dispose();options.retry();}};
  leave.onclick=async()=>{paused=true;devices.clear();inputs.fill(0);held.fill(0);try{await options.save();dispose();options.exit();}catch(e){options.error(e);pause.textContent='继续小游戏';}};
  function visibility(){if(document.hidden){paused=true;audio.pause(true);devices.clear();inputs.fill(0);held.fill(0);pause.textContent='继续小游戏';void checkpoint(true);render();}last=performance.now();accumulator=0;}
  function nativePause(){paused=true;audio.pause(true);devices.clear();inputs.fill(0);held.fill(0);pause.textContent='继续小游戏';last=performance.now();accumulator=0;void checkpoint(true);render();}
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('dingdangPause',nativePause);
  function render(){
    const game=options.read(),s=game.pending?.session;if(!s)return;
    timer.textContent=(paused?'已暂停 · ':'剩余 ')+Math.ceil(s.remaining/30)+' 秒';
    resumePanel.hidden=!paused;
    const humans=s.players.filter((p:any,i:number)=>p&&game.players[i].control==='human');
    const humansOut=id===1&&humans.length>0&&humans.every((p:any)=>p.mode===4||p.mode===6);
    const message=paused?'':humansOut?'本轮真人玩家已出局。电脑仍在比赛，结束后自动显示成绩。':id===1?(s.phase<2?'准备中：看清领队，开场动画结束后才能切换手臂。':s.phase===2?'现在可以切换手臂。左、右按钮各控制一侧；遇到假动作不要跟随。':'正在结算本轮成绩…'):'';
    if(status.textContent!==message)status.textContent=message;status.hidden=!message;
    retry.hidden=paused||!humansOut;
    if(id===0){
      const ctx=raceCanvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.drawImage(images.bg0,0,0);
      for(const o of [...s.drops,...s.players]){if(!o||(o.mode===32&&o.counter%2===0))continue;
        const animation=catalog.animations[o.animation],command=[...animation.commands].reverse().find((c:number[])=>c[0]<=o.age&&c[1]<animation.sprites.length);
        if(command){const sprite=animation.sprites[command[1]],a=catalog.images[sprite];ctx.drawImage(images[sprite],o.x+command[2]+a.hx,o.y+command[3]+a.hy);}
      }
    }
    if(id===1){
      const ctx=raceCanvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.drawImage(images.bg0,0,0);
      const draw=(o:any,x:number,y:number)=>{if(!o||o.animation<0)return;const a=catalog.animations[o.animation],command=[...a.commands].reverse().find((c:number[])=>c[0]<=o.age&&c[1]<a.sprites.length);
        if(command){const sprite=a.sprites[command[1]],art=catalog.images[sprite];ctx.drawImage(images[sprite],x+command[2]+art.hx,y+command[3]+art.hy);}};
      draw(s.leader,245,50);
      s.players.forEach((p:any,i:number)=>{if(p)draw(p.gate,[41,195,352,483][i],281);});
      s.players.forEach((p:any,i:number)=>{if(p)draw(p,30+i*145,p.mode===4?p.fallY:170);});
    }
    const raceInsets:(()=>void)[]=[];
    if(isRace){
      const ctx=raceCanvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#273c20';ctx.fillRect(0,0,640,336);
      const first=Math.floor(s.camera/112);
      for(let row=first;row<Math.ceil((s.camera+336)/112);row++){const im=images[id===4?obstacleTrack[row]:row===0?0:1+(row%4)];if(im)ctx.drawImage(im,0,row*112-s.camera);
        if(id===4&&row%8===0){const marker=10-Math.floor(row/8)%11;ctx.drawImage(images[5+marker],0,row*112-s.camera);ctx.drawImage(images[26+marker],640-images[26+marker].width,row*112-s.camera);}
      }
      if(id===2)for(let n=1;n<=11;n++){const y=n*784-s.camera;if(y>-80&&y<336)ctx.drawImage(images[16-n],0,y);}
      s.players.forEach((p:any,i:number)=>{if(!p)return;const anim=catalog.animations[p.animation],command=[...anim.commands].reverse().find((c:number[])=>c[0]<=p.age&&c[1]<anim.sprites.length),sprite=anim.sprites[command?.[1]??0],a=catalog.images[sprite];
        ctx.drawImage(images[sprite],100+i*120+p.sway+a.hx,p.y+a.hy);
        // The original shared camera can leave a slower player thousands of
        // pixels behind. Show that human's live animation in a labelled inset,
        // without moving the physical player/camera or changing collisions.
        if(game.players[i].control==='human'&&p.y+a.hy+a.h>336)raceInsets.push(()=>{
          const x=78+i*120;ctx.fillStyle='#101d30ed';ctx.fillRect(x,232,110,104);
          ctx.strokeStyle=['#26b6e5','#55bf4f','#ef5858','#e8c02d'][i];ctx.lineWidth=2;ctx.strokeRect(x+1,233,108,102);
          ctx.drawImage(images[sprite],x+(110-a.w)/2,256+(68-a.h)/2);
          ctx.fillStyle='#fff';ctx.font='bold 16px sans-serif';ctx.fillText('P'+(i+1)+' 后方 ↓',x+9,251);
        });
      });
    }
    if(id===4){const ctx=raceCanvas.getContext('2d')!,o=s.obstacles;if(o.mode===2)ctx.drawImage(images[25],o.x,20);if(o.mode===16)o.y.forEach((y:number,i:number)=>ctx.drawImage(images[o.good[i]?24:23],120+i*120,y));}
    raceInsets.forEach(draw=>draw());
    s.players.forEach((p:any,i:number)=>{
      if(!p)return;scores[i].textContent=game.players[i].name+' · '+p.score+' 分'+(id===1&&p.mode===6?'（已出局）':game.players[i].control==='ai'?'（电脑）':'');
      if(raceFeedback[i]){const action=p.finished?'已冲线':id===4&&p.mode===16?'撞到障碍，恢复中':id===4&&p.mode===8?'防守中':p.speed>0?'奔跑中':'点按加速';raceFeedback[i].textContent=action+' · 速度 '+p.speed+' · 加速 '+p.strokes+' 次';}
      buttons[i]?.forEach((b,index)=>b.disabled=paused||(id===6&&(p.mode!==1||p.scroll>0))||(id===3&&p.mode===3)||(id===5&&index===0&&p.actor.mode!==2)||(id===1&&(p.mode===4||p.mode===6||s.phase!==2)));
      const c=canvases[i];if(!c)return;const ctx=c.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#131a28';ctx.fillRect(0,0,160,220);
      if(id===7){
        let tile=Math.trunc((p.height+40)/334),y=tile===0?0:(p.height+40)%334-334;
        for(let n=0;n<(tile===0?1:2);n++,tile--,y+=334){
          ctx.drawImage(images[tile===0?49:tile<8?50:tile===8?51:52],0,y);
          if(tile%2===1&&Math.trunc((tile-1)/2)<14)ctx.drawImage(images[94+Math.trunc((tile-1)/2)],0,y);
          if(s.foodIndex[i]<10&&s.food[s.foodIndex[i]]===tile-1)ctx.drawImage(images[53],0,y+37);
        }
        const camera=p.height+40<334?336:p.height+40;
        for(const [a,top] of [[p.actor,camera-p.height],[p.spring,camera-200]] as const){
          if(!a)continue;const animation=catalog.animations[a.animation],command=[...animation.commands].reverse().find((c:number[])=>c[0]<=a.age&&c[1]<animation.sprites.length);
          if(command){const sprite=animation.sprites[command[1]],art=catalog.images[sprite];ctx.drawImage(images[sprite],command[2]+art.hx,top+command[3]+art.hy);}
        }
        return;
      }
      if(id===5){
        ctx.drawImage(images.bg0,64+i*128,0,128,336,0,0,128,336);
        for(const [key,x,y] of [['actor',18,147],['target',18,53],['feedback',18,12],['selector',0,241]] as const){
          const o=p[key];if(o.animation<0)continue;const a=catalog.animations[o.animation],command=[...a.commands].reverse().find((c:number[])=>c[0]<=o.age&&c[1]<a.sprites.length);
          if(command){const sprite=a.sprites[command[1]],art=catalog.images[sprite];ctx.drawImage(images[sprite],x+command[2]+art.hx,y+command[3]+art.hy);}
        }
        // Keep the original machine art and add a readable touch status line.
        ctx.fillStyle='#10131d';ctx.fillRect(18,12,92,30);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 12px sans-serif';
        ctx.fillText(p.actor.mode===3?'等待 '+Math.ceil((60-p.target.clock)/30)+' 秒':p.actor.mode===1?'出拳中':p.actor.mode===0?'收拳中':'请选择后出拳',64,31);
        return;
      }
      if(id===3){
        ctx.drawImage(images.bg0,80,0,220,336,0,0,220,300);
        const sprite=catalog.animations[2+i].sprites[p.growth],im=images[sprite];ctx.drawImage(im,(220-im.width)/2,240-im.height);
        ctx.drawImage(images[44],88,248);
        if(p.beamAge<7){const beam=images[45+p.beamAge];ctx.drawImage(beam,(220-beam.width)/2,250-beam.height);}
        return;
      }
      const art=(id:number,x:number,y:number)=>{if(images[id])ctx.drawImage(images[id],x,y);};
      // Original 0x42ac19 layout, cropped at y=50 to keep the target at top.
      ctx.fillStyle='#131a28';ctx.fillRect(0,0,160,286);
      ctx.save();ctx.beginPath();ctx.rect(18,0,126,286);ctx.clip();
      for(let row=0;row<7;row++)for(let col=0;col<2;col++){
        const value=p.ring[(p.start+row*2+col)%14],used=value>=128,x=18+col*63,y=row*61+p.offset-50;
        art(1+i*3+(used?1:0),x,y);art(13+2*(value&15)+(used?0:1),x+11,y+10);
      }
      const anim=catalog.animations[p.animation],frameIndex=Math.min(p.age,anim.frames-1);
      const command=[...anim.commands].reverse().find((c:number[])=>c[0]<=frameIndex&&c[1]<anim.sprites.length);
      if(command&&!(p.mode===4&&p.age%2)){
        const id=anim.sprites[command[1]],a=catalog.images[id];art(id,18+command[2]+a.hx,154+command[3]+a.hy);
      }
      ctx.restore();
      art(3+i*3,18,0);art(13+2*(p.ring[p.target]&15),61,10);
    });
  }
  function loop(now:number){
    if(stopped)return;const elapsed=Math.min(170,Math.max(0,now-last));last=now;
    try{
      if(!paused&&!document.hidden){
        accumulator+=elapsed;
        while(accumulator>=1000/30){
          const previous=options.read().pending.session;
          const physical=devices.sample();options.tick(inputs.map((n,i)=>held[i]||n||physical[i]));inputs.fill(0);accumulator-=1000/30;ticks++;
          for(const event of miniAnimationAudio(previous,options.read().pending.session,catalog))void audio.play(event);
          if(options.read().pending.session.stage==='result'){dispose();void options.save().then(options.finish).catch(options.error);return;}
          if(ticks%30===0)void checkpoint();
        }
      }
      render();frame=requestAnimationFrame(loop);
    }catch(e){dispose();options.error(e);}
  }
  render();frame=requestAnimationFrame(loop);return dispose;
}
