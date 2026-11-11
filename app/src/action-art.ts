/** Touch UI decoration. Original artwork is preferred; generic navigation uses small vector symbols. */
const paths:Record<string,string>={back:'M14 5 7 12l7 7M7 12h14',play:'m8 4 12 8-12 8Z',save:'M4 3h14l3 3v15H3V3h1m3 0v6h10V3M7 21v-8h10v8',sound:'M3 9h4l5-4v14l-5-4H3Zm13-2q7 5 0 10m-1-7q3 2 0 4',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 3v1',check:'m4 12 5 5L20 6',history:'M4 4v6h6M4 10a8 8 0 1 1 0 6m8-10v6l4 2',settings:'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6'};
export function decorateAction(button:HTMLElement,label:string,art?:string){
 if(button.querySelector('.actionIcon'))return;
 let icon:Element|undefined;
 if(art){const im=document.createElement('img');im.src=art;im.alt='';im.draggable=false;icon=im;}
 else{
  const name=/^(返回|取消|离开|退出|这次先|上一步)/.test(label)?'back':/^(保存)/.test(label)?'save':/声音|音效|音乐|语音/.test(label)?'sound':/玩法|说明/.test(label)?'help':/^(开始|继续|再玩|下一场|重试)/.test(label)?'play':/^(确定|购买|升级|使用|领取)/.test(label)?'check':/读取|记录/.test(label)?'history':/设置/.test(label)?'settings':null;
  if(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]);p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','2');p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');svg.append(p);icon=svg;}
 }
 if(icon){icon.classList.add('actionIcon');icon.setAttribute('aria-hidden','true');button.prepend(icon);button.classList.add('illustratedAction');}
}
export function installTouchSurface(){
 const editable=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('input,textarea,[contenteditable="true"]');
 document.addEventListener('contextmenu',e=>{if(!editable(e.target))e.preventDefault();});
 document.addEventListener('selectstart',e=>{if(!editable(e.target))e.preventDefault();});
 document.addEventListener('dragstart',e=>{if(!editable(e.target))e.preventDefault();});
}
