import {loadImages} from './scene-image-loader';
import {monthlyCharacterIds,monthlyLeader,monthlyBackground,monthlyBarHeight,monthlyPanelY} from './monthly-presentation.mjs';
import './ending-view.css';
const characterIds:Record<string,number>=monthlyCharacterIds;
type Options={rows:any[];players:any[];totals:number[];converter:number;onStage?:(stage:'intro'|'result')=>void;onSfx?:(id:number)=>void;onDone:()=>void;signal?:AbortSignal};
export async function mountMonthlyPresentation(host:HTMLElement,options:Options){
 const response=await fetch('assets/monthly-scenes/catalog.json',{signal:options.signal});if(!response.ok)throw Error('月结资源缺失');const catalog=await response.json();
 const data=structuredClone({rows:options.rows,players:options.players,totals:options.totals,converter:options.converter});
 const leader=monthlyLeader(data.players,data.totals),bg=monthlyBackground(data.players[leader].character,leader),images:Record<string,HTMLImageElement>={};
 const keys=new Set<string>(['b119','b'+bg]);data.players.forEach((p,i)=>{const c=characterIds[p.character];keys.add('s'+(433+i*7+c));keys.add('s'+(data.rows[i]?.eligible&&!p.eliminated?304+c:311+c));if(!p.eliminated){keys.add('s'+(465+i));keys.add('s'+(461+i));keys.add('s'+(469+c));}});
 const orderedKeys=[...keys],loaded=await loadImages(orderedKeys.map(key=>{const meta=(key[0]==='b'?catalog.bitmaps:catalog.sprites)[Number(key.slice(1))];if(!meta)throw Error('月结图像缺失：'+key);return meta.url;}),{signal:options.signal});orderedKeys.forEach((key,i)=>images[key]=loaded[i]);
 if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
 const section=document.createElement('section');section.className='originalEnding monthlyPresentation';section.setAttribute('aria-label','月度结算');
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','四人月结明细及资产排行');const ctx=canvas.getContext('2d')!;
 const button=document.createElement('button');section.append(canvas,button);host.append(section);
 let stage='intro-enter',tick=0,y=480,disposed=false,paused=document.hidden,raf=0,last=performance.now(),elapsed=0,readyAge=0,done=false;
 const automatic=data.converter>=0?data.players[data.converter].control==='ai':!data.players.some(p=>!p.eliminated&&p.control==='human');
 const activeDialog=host.closest('dialog');
 function closed(){if(!activeDialog?.open)dispose();}
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('dingdangPause',pause);window.removeEventListener('dingdangResume',resume);activeDialog?.removeEventListener('close',closed);options.signal?.removeEventListener('abort',dispose);section.remove();}
 function finish(){if(done||disposed)return;done=true;dispose();options.onDone();}
 function advance(){if(stage==='intro-ready'){stage='intro-exit';tick=0;}else if(stage==='result-ready'){stage='result-exit';tick=0;}}
 button.onclick=advance;
 function text(value:number,x:number,yy:number,color='#fff'){ctx.font='bold 17px sans-serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.lineWidth=2;ctx.strokeStyle='#28334b';ctx.fillStyle=color;const s=String(Math.trunc(value));ctx.strokeText(s,x,yy);ctx.fillText(s,x,yy);}
 function draw(){ctx.clearRect(0,0,640,480);ctx.save();ctx.translate(0,y);ctx.imageSmoothingEnabled=false;
  if(stage.startsWith('intro')){ctx.drawImage(images.b119,0,0);data.players.forEach((p,i)=>{const c=characterIds[p.character],row=data.rows[i],eligible=row?.eligible&&!p.eliminated;ctx.drawImage(images['s'+(eligible?304+c:311+c)],i*160+54,19);ctx.drawImage(images['s'+(433+i*7+c)],i*160+7,294);if(eligible){row.groups.forEach((value:number,j:number)=>{text(value,i*160+65,126+j*47);text(row.counts[j],i*160+31,140+j*47,'#ffff32');});text(row.walking,i*160+65,349);text(Math.min(99999,row.interest),i*160+65,386);text(Math.min(999999,row.total),i*160+49,433);}});
  }else{ctx.drawImage(images['b'+bg],0,0);data.players.forEach((p,i)=>{if(p.eliminated)return;const c=characterIds[p.character],h=monthlyBarHeight(data.totals[i],Math.max(...data.totals),stage==='result-enter'?0:tick),bar=images['s'+(461+i)];ctx.drawImage(images['s'+(465+i)],i*160,343);if(h>0)ctx.drawImage(bar,0,0,bar.width,Math.min(h,bar.height),i*160+18,343-h,bar.width,h);ctx.drawImage(images['s'+(469+c)],i*160+29,241-h);const values=[data.rows[i].total,data.totals[i]-p.cash-p.bank,p.cash,p.bank,data.totals[i]];values.forEach((v,j)=>text(v,i*160+48,j===4?446:351+j*20,v<0?'#ffaaaa':['#c8c8ff','#bcffb6','#ffc4c4','#ffffb0'][i]));});}
  ctx.restore();section.dataset.stage=stage;section.dataset.tick=String(tick);button.disabled=!stage.endsWith('ready');button.textContent=stage.startsWith('intro')?(data.converter>=0?'领取完毕，继续游戏':'查看月结排行'):'确认月结，继续游戏';
 }
 function step(){tick++;if(stage.endsWith('enter')){y=monthlyPanelY(tick);if(tick===16)options.onSfx?.(14);if(tick>=45){stage=stage==='intro-enter'?'intro-ready':'result-bars';tick=0;readyAge=0;}}
  else if(stage.endsWith('exit')){y-=32;if(y+480<0){if(stage==='intro-exit'&&data.converter<0){stage='result-enter';tick=0;y=480;options.onStage?.('result');}else finish();}}
  else if(stage==='result-bars'){if(tick>=54){stage='result-ready';readyAge=0;}}
  else if(stage.endsWith('ready')&&automatic&&++readyAge>=50)advance();
 }
 function frame(now:number){if(disposed)return;if(!section.isConnected){dispose();return;}const dt=Math.min(100,now-last);last=now;if(!paused){elapsed+=dt;while(elapsed>=1000/30&&!disposed){step();elapsed-=1000/30;}if(!disposed)draw();}if(!disposed)raf=requestAnimationFrame(frame);}
 function visibility(){paused=document.hidden;last=performance.now();}function pause(){paused=true;}function resume(){paused=document.hidden;last=performance.now();}
 document.addEventListener('visibilitychange',visibility);window.addEventListener('dingdangPause',pause);window.addEventListener('dingdangResume',resume);activeDialog?.addEventListener('close',closed);options.signal?.addEventListener('abort',dispose);
 options.onStage?.('intro');draw();raf=requestAnimationFrame(frame);return {dispose,snapshot:()=>({stage,tick,y,paused,disposed})};
}

