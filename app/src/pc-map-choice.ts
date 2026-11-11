export function mountMapChoice(form:HTMLFormElement,names:string[]){
  const select=form.querySelector<HTMLSelectElement>('#mapChoice')!;
  const gallery=document.createElement('section');gallery.className='mapChoices pcMapDoor';
  gallery.setAttribute('aria-label','选择地图');
  const label=document.createElement('span');label.setAttribute('aria-live','polite');gallery.append(label);
  const choose=(delta:number)=>{
    select.value=String((Number(select.value)+delta+names.length)%names.length);
    select.dispatchEvent(new Event('change'));
  };
  for(const [index,text] of ['上一张地图','确认当前地图','下一张地图'].entries()){
    const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',text);
    b.onclick=()=>{if(index===1)form.querySelector<HTMLButtonElement>('.setupFooter button[data-next]')?.click();else choose(index===0?-1:1);};
    gallery.append(b);
  }
  function refresh(){
    const id=Number(select.value);
    gallery.style.backgroundImage='url(assets/pc-selection/map-scene-'+id+'.png)';
    label.textContent=names[id];
  }
  select.addEventListener('change',refresh);select.hidden=true;form.querySelector<HTMLElement>('#mapPreview')!.hidden=true;
  select.before(gallery);refresh();
}
