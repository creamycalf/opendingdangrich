import {decorateAction} from './action-art';
export function mountSetupPages(form: HTMLFormElement) {
  const nav = document.createElement('nav');
  nav.className = 'setupTabs';
  nav.setAttribute('aria-label','开局设置');
  const characters = form.querySelector<HTMLElement>('.pcSelection')!;
  const maps = form.querySelector<HTMLElement>('.mapChoices')!;
  const duration = form.querySelector<HTMLSelectElement>('#duration')!;
  const hint = form.querySelector<HTMLElement>('.setupNote')!;
  const terms=document.createElement('section');
  terms.className='pcTerms';terms.setAttribute('aria-label','选择年期');
  for(let year=1;year<=9;year++){
    const button=document.createElement('button');button.type='button';
    const value=String(year===9?0:year);
    button.setAttribute('aria-label',year===9?'不限年期':year+' 年');
    const image=document.createElement('img');image.alt='';image.src='assets/pc-selection/term-'+year+'.png';
    button.append(image);button.dataset.value=value;
    button.onclick=()=>{duration.value=value;duration.dispatchEvent(new Event('change'));};
    terms.append(button);
  }
  const refreshTerm=()=>Array.from(terms.querySelectorAll('button')).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===duration.value)));
  duration.onchange=refreshTerm;refreshTerm();duration.before(terms);duration.hidden=true;
  const start=form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const back=form.querySelector<HTMLButtonElement>(':scope > button[type="button"]')!;
  const next=document.createElement('button');next.type='button';next.className='primary';next.dataset.next='';
  const exit=back.onclick;
  let page=0;
  function selectPage(index:number) {
    page=index;
    characters.hidden=index!==0;maps.hidden=index!==1;terms.hidden=hint.hidden=index!==2;
    start.hidden=index!==2;next.hidden=index===2;
    next.textContent=index===0?'确定角色':'确定地图';
    back.textContent=index===0?'返回':'上一步';
    decorateAction(next,next.textContent);decorateAction(back,back.textContent);
    Array.from(nav.children).forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  }
  back.onclick=e=>{if(page)selectPage(page-1);else exit?.call(back,e);};
  next.onclick=()=>selectPage(page+1);
  for(const [i,label] of ['角色与玩家','选择地图','选择年期'].entries()){
    const button=document.createElement('button');button.type='button';button.textContent=label;decorateAction(button,label,i===0?'assets/ui/218.png':i===1?'assets/ui/190.png':undefined);button.onclick=()=>selectPage(i);nav.append(button);
  }
  form.prepend(nav);
  const footer=document.createElement('footer');footer.className='setupFooter';footer.append(back,next,start);
  form.append(footer);
  decorateAction(start,start.textContent||'开始游戏');
  selectPage(0);
}

export function arrangeDialogActions(content:HTMLElement) {
  const buttons=Array.from(content.querySelectorAll<HTMLButtonElement>(':scope > button'));
  if(buttons.length<3)return;
  const grid=document.createElement('div');grid.className='dialogChoices';
  const last=buttons.at(-1)!;
  const back=/^(保存并返回|返回|取消|离开|关闭)/.test(last.textContent??'') ? buttons.pop() : undefined;
  grid.append(...buttons);content.append(grid);
  if(buttons.length>6){
    let page=0;
    const bar=document.createElement('nav');bar.className='dialogPager';
    const prev=document.createElement('button'), next=document.createElement('button'), count=document.createElement('span');
    prev.textContent='上一页';next.textContent='下一页';count.setAttribute('aria-live','polite');
    function render(){
      const total=Math.ceil(buttons.length/6);
      buttons.forEach((b,i)=>{b.hidden=Math.floor(i/6)!==page;});
      prev.disabled=page===0;next.disabled=page===total-1;
      count.textContent=(page+1)+' / '+total;
    }
    prev.onclick=()=>{page--;render()};next.onclick=()=>{page++;render()};
    bar.append(prev,count,next);if(back)bar.append(back);content.append(bar);render();
  }else if(back)content.append(back);
}
