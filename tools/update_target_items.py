from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
p=root/'app/src/effects.mjs'
s=p.read_text('utf8').replace('反射相机','咒语相机').replace('瞌睡转移枪','睡意枪')
s=s.replace("Number.isInteger(e.remaining)&&e.remaining>0", "(!REDIRECT_ITEMS.includes(e.id)||(Number.isInteger(e.target)&&e.target>=0&&e.target<4))&&(e.id!=='original-12'||typeof e.lucky==='boolean')&&Number.isInteger(e.remaining)&&e.remaining>0")
p.write_text(s,'utf8')
p=root/'app/src/engine.mjs';s=p.read_text('utf8').replace('反射相机','咒语相机')
s=s.replace("creditor=reverse?g.turn:receiver;events.push({kind:'charge',rent:true,amount:f32(charge.amount*((effectCapabilities(p)&0x8000)?2:1)*((effectCapabilities(g.players[receiver])&0x4000)?2:1)),debtor", "creditor=reverse?g.turn:receiver,amount=f32(charge.amount*((effectCapabilities(p)&0x8000)?2:1)*((effectCapabilities(g.players[receiver])&0x4000)?2:1));events.push({kind:'charge',rent:true,amount,debtor")
s=s.replace("moneyText(charge.amount)+'。'", "moneyText(amount)+'。'")
p.write_text(s,'utf8')
p=root/'app/src/inventory.mjs';s=p.read_text('utf8').replace('const available={', '''const available={
  'original-7':{name:'咒语相机',description:'先拍摄一名对手。此后受到可反射的攻击时，将攻击转给照片中的角色并消耗相机；若该角色无法承受此攻击，相机保留。交换布、处境掉换枪和朋友圈不受反射影响。'},
  'original-17':{name:'恶运钻石',description:'选择一名对手。八天内第一次遇到可转移的单人坏仙人事件时，将事件传给该角色，钻石随即消耗。对方不符合事件条件时，坏事件仍由自己承受。'},
  'original-26':{name:'睡意枪',description:'先选一名有睡意的对手，再选另一名可攻击的对手。前者醒来，后者昏睡五天；接收者的咒语相机可以转移效果。'},''')
p.write_text(s,'utf8')
p=root/'app/src/hermit.mjs';s=p.read_text('utf8').replace("import {connectedProperty} from './property.mjs';", "import {wakeSleep} from './target-items.mjs';")
s=s.replace('const id=e.id,p=g.players[g.turn],charges=[],who=g.turn;', '''const id=e.id,charges=[];let who=g.turn;
 if(!e.all&&((id>=14&&id<=26)||id===30)){
  const actor=g.players[who],diamond=actor.effects.find(x=>x.id==='original-17');
  if(diamond){actor.effects=actor.effects.filter(x=>x!==diamond);const q=g.players[diamond.target];
   if(q&&hermitCompatible(q,id)&&(id!==22||!q.small)&&(id!==26||q.inventory.length)&&(id!==30||!q.jail))who=diamond.target;
  }
 }
 const p=g.players[who];''')
s=s.replace("q.effects=q.effects.filter(x=>!['air','original-4','original-26','original-42'].includes(x.id));q.events=q.events.filter(x=>x.id!==21);q.itemSleeping=false;",'wakeSleep(q);')
s=s.replace('text=T[17]+Math.trunc(amount)+T[18];', "text='现有 '+e.count+' 座建筑，共获得 '+Math.trunc(amount)+' 个豆沙包。';")
s=s.replace("const area=connectedProperty(map,g.owners,lot).filter(j=>kind(g,j)!==0);", "const area=[lot],seen=new Set(area);for(const j of area){const c=map.cells[j];for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){const x=c.x+dx,y=c.y+dy,k=y*map.width+x;if(x>=0&&y>=0&&x<map.width&&y<map.height&&!seen.has(k)&&g.owners[k]!==undefined&&kind(g,k)!==0){seen.add(k);area.push(k);}}}")
s=s.replace('return {text,charges,minigame:id===11};', "return {text:(who!==g.turn?g.players[g.turn].name+'的恶运钻石将事件转移给'+p.name+'。\\n':'')+text,charges,minigame:id===11};")
p.write_text(s,'utf8')
p=root/'app/src/main.ts';s=p.read_text('utf8')
s="import {canTakeSleep,canGiveSleep,sleepTransferAvailable} from './target-items.mjs';\nimport {REDIRECT_ITEMS} from './effects.mjs';\n"+s
s=s.replace('SELF_EFFECTS.includes(id)?effectApplicationStatus(p,id,g.turn):null', "id==='original-26'&&!sleepTransferAvailable(g)?{allowed:false,replaced:[],reason:'需要一名有睡意的对手，以及另一名可攻击的清醒对手'}:(SELF_EFFECTS.includes(id)||REDIRECT_ITEMS.includes(id))?effectApplicationStatus(p,id,g.turn,false):null")
s=s.replace('disabled:!ITEMS[id].implemented||', 'disabled:!(effectCapabilities(p)&1)||p.jail||p.itemSleeping||!!p.skip||!ITEMS[id].implemented||')
s=s.replace("else if(TARGET_ITEMS.includes(id)){show", "else if(id==='original-26'){sleepSelection(showAll);}\n      else if(TARGET_ITEMS.includes(id)){show")
at="function inventory(showAll=false){"
s=s.replace(at,'''function sleepSelection(showAll:boolean,donor?:number){
 const p=g.players[g.turn],first=donor===undefined;
 show('睡意枪 · '+(first?'选择睡眠来源':'选择接收者'),first?'先吸走一名对手的睡意。':'将睡意交给另一名对手，持续五天。',[
  ...g.players.map((q:any,i:number)=>({label:q.name,disabled:i===g.turn||(first?!canTakeSleep(p,q):!canGiveSleep(g,donor,i)),run:()=>{
   if(first)sleepSelection(showAll,i);else{dispatch({type:'useItem',item:'original-26',target:{donor,recipient:i}});save();center();void drive();}
  }})),{label:first?'取消':'返回选择来源',run:()=>first?inventory(showAll):sleepSelection(showAll)}
 ],true);
}
'''+at)
s=s.replace('二十五种道具效果','三十二种道具效果')
p.write_text(s,'utf8')
p=root/'app/package.json';j=json.loads(p.read_text('utf8'));j['scripts']['test']+=' ../tests/half-movement.test.mjs ../tests/target-items.test.mjs';p.write_text(json.dumps(j,indent=2,ensure_ascii=False)+'\n','utf8')
