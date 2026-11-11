// Original artwork, with a responsive touch layout; not a claim of pixel-identical PC UI.
export type SelectionAction={type:'character'|'control'|'slot';character:string;slot:number;control:'human'|'ai';previousCharacter?:string};
export function mountSelection(form:HTMLFormElement,characters:{id:string;name:string;description:string}[],onAction?:(action:SelectionAction)=>void){
 const portraits:Record<string,number>={doraemon:88,dorami:92,gian:96,nobita:100,shizuka:108,suneo:112,yellow:104};
 const figures:Record<string,number>={doraemon:400,nobita:401,dorami:402,shizuka:403,suneo:404,gian:405};
 const scene=document.createElement('section');scene.className='pcSelection';scene.setAttribute('aria-label','角色选择');
 const slots=document.createElement('div');slots.className='pcPlayerSlots';
 const choices=document.createElement('div');choices.className='pcCharacterChoices';
 const hint=document.createElement('p');hint.setAttribute('role','status');
 let active=0;
 const selects=Array.from({length:4},(_,i)=>form.querySelector<HTMLSelectElement>('#character'+i)!);
 const controls=Array.from({length:4},(_,i)=>form.querySelector<HTMLSelectElement>('#control'+i)!);
 const buttons:HTMLButtonElement[]=[],controlButtons:HTMLButtonElement[]=[];
 const emit=(type:SelectionAction['type'],slot:number,previousCharacter?:string)=>onAction?.({type,slot,character:selects[slot].value,control:controls[slot].value==='human'?'human':'ai',previousCharacter});
 const make=(label:string,click:()=>void)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.onclick=click;return b;};
 for(let i=0;i<4;i++){
  const slot=document.createElement('div');slot.className='pcPlayerSlot';
  const b=make('选择玩家 '+(i+1),()=>{active=i;refresh();emit('slot',i);});buttons.push(b);
  const c=make('切换玩家 '+(i+1)+' 真人或电脑',()=>{controls[i].value=controls[i].value==='human'?'ai':'human';refresh();emit('control',i);});controlButtons.push(c);slot.append(b,c);slots.append(slot);
  selects[i].addEventListener('change',refresh);controls[i].addEventListener('change',refresh);
 }
 for(const char of characters){
  const b=make('选择'+char.name,()=>{const previousCharacter=selects[active].value;const other=selects.findIndex((s,i)=>i!==active&&s.value===char.id);if(other>=0)selects[other].value=selects[active].value;selects[active].value=char.id;selects[active].dispatchEvent(new Event('change'));emit('character',active,previousCharacter);});
  b.style.left=({doraemon:6.25,nobita:18.75,dorami:31.25,yellow:43.75,shizuka:56.25,suneo:68.75,gian:81.25} as Record<string,number>)[char.id]+'%';
  if(char.id==='yellow'){
   b.style.top=(220/366*100)+'%';b.style.height=(106/366*100)+'%';
   b.style.background="url('assets/pc-selection/yellow-pedestal.png') center/100% 100%";
  }else{
   const im=document.createElement('img');im.src='assets/pc-selection/character-'+figures[char.id]+'.png';im.alt='';b.append(im);
  }
  const name=document.createElement('span');name.textContent=char.name;b.append(name);choices.append(b);
 }
 function refresh(){
  buttons.forEach((b,i)=>{const char=characters.find(c=>c.id===selects[i].value)!;const im=document.createElement('img');im.src='assets/pc-selection/portrait-'+(portraits[char.id]+i)+'.png';im.alt=char.name;const name=document.createElement('span');name.textContent='P'+(i+1)+' '+char.name;b.replaceChildren(im,name);b.setAttribute('aria-pressed',String(i===active));controlButtons[i].textContent=controls[i].value==='human'?'真人':'电脑';});
  hint.textContent='为 P'+(active+1)+' 选择角色 · '+characters.find(c=>c.id===selects[active].value)!.description;
 }
 scene.append(slots,hint,choices);form.prepend(scene);form.classList.add('pcSetup');refresh();
}
