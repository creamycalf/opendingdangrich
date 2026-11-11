import {loadImages} from './scene-image-loader';
import './certificate.css';
type Certificate={character:string;seat:number;name:string;grade:string;assets:number;days:number;buildings:number[]};
export async function mountCertificate(host:HTMLElement,certificate:Certificate,match:string,signal?:AbortSignal){
  const ids=['doraemon','nobita','dorami','shizuka','suneo','gian'];
  const character=ids.indexOf(certificate.character);if(character<0)return;
  const section=document.createElement('section');section.className='certificateView';
  const canvas=document.createElement('canvas');canvas.className='certificateCanvas';canvas.width=1169;canvas.height=827;
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label',certificate.name+'的证书，Rank '+certificate.grade);
  const form=document.createElement('form');form.className='certificateSignature';
  const label=document.createElement('label');label.textContent='证书姓名';
  const input=document.createElement('input');input.maxLength=20;input.setAttribute('aria-label','证书姓名');
  const key='dingdang.certificate-name.'+match;
  input.value=localStorage.getItem(key)??certificate.name;label.append(input);
  const save=document.createElement('button');save.type='submit';save.textContent='签名';form.append(label,save);
  section.append(canvas,form);host.prepend(section);
  const paths=[141+character*4+certificate.seat,certificate.grade==='S'?170:165+'ABCDE'.indexOf(certificate.grade)];
  const controller=new AbortController(),cancel=()=>controller.abort(),dialog=host.closest('dialog');
  const closed=()=>{if(!dialog?.open)cancel();};signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();dialog?.addEventListener('close',closed);
  const observer=new MutationObserver(()=>{if(!section.isConnected)cancel();});observer.observe(host,{childList:true});
  let images:HTMLImageElement[];try{images=await loadImages(paths.map(n=>'assets/pc-certificate/'+n+'.png'),{signal:controller.signal});if(!section.isConnected)throw new DOMException('Aborted','AbortError');}
  catch(e){section.remove();throw e;}finally{observer.disconnect();dialog?.removeEventListener('close',closed);signal?.removeEventListener('abort',cancel);}
  function draw(){
    const ctx=canvas.getContext('2d')!;ctx.drawImage(images[0],0,0);
    ctx.drawImage(images[1],98,626,104,104);
    ctx.fillStyle='#000';ctx.font='36px Microsoft YaHei, sans-serif';ctx.textBaseline='middle';
    ctx.fillText(input.value,170,349,420);ctx.fillText(String(Math.trunc(certificate.assets)),205,400,360);
    certificate.buildings.forEach((n,i)=>ctx.fillText(String(n).padStart(2,'0'),195+i*82,497));
    ctx.fillText(String(certificate.days),250,551,85);
  }
  const dispose=()=>{section.remove();signal?.removeEventListener('abort',dispose);watch.disconnect();};const watch=new MutationObserver(()=>{if(!section.isConnected)dispose();});watch.observe(host,{childList:true});signal?.addEventListener('abort',dispose,{once:true});
  form.onsubmit=e=>{e.preventDefault();localStorage.setItem(key,input.value);draw();save.textContent='已签名';};draw();return {dispose};
}
