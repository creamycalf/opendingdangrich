from pathlib import Path
R=Path(__file__).resolve().parents[1]
def edit(path,changes):
 p=R/path;s=p.read_text('utf8')
 for old,new in changes:
  assert old in s,(path,old[:90]);s=s.replace(old,new)
 p.write_text(s,'utf8')
edit('app/src/effects.mjs',[
 ("export const EFFECTS={", "export const EFFECTS={\n  'original-3':{originalId:3,name:'南北极徽章',duration:5,mask:0xfff,value:0x400000},"),
 ("export const TARGET_ITEMS=['air'", "export const TARGET_ITEMS=['original-3','air'"),
 ("!target.eliminated&&canBeAttacked(target)","!target.eliminated&&canBeAttacked(target)&&!(id==='original-3'&&hasEffect(target,id))"),
 ("!REDIRECT_ITEMS.includes(e.id)", "!['original-3',...REDIRECT_ITEMS].includes(e.id)"),
])
edit('app/src/target-items.mjs',[("const reflectable=['original-4'", "const reflectable=['original-3','original-4'")])
edit('app/src/inventory.mjs',[("const available={", "const available={\n  'original-3':{name:'南北极徽章',description:'给自己和选定对手戴上相同徽章，持续五天。走近配对角色时会被排斥、转身离开。已戴徽章的角色不能再次被选中；咒语相机可转移目标。'},")])
edit('app/src/engine.mjs',[
 ("import {canEnterTunnel", "import {magnetDirection} from './magnet.mjs';\nimport {canEnterTunnel"),
 ("const p=g.players[g.turn],a=map.cells[p.at],b=map.cells[to],direction=halfStepTarget(map,p)!==null?p.direction:b.x>a.x?3:b.x<a.x?2:b.y>a.y?1:0;const stride=movePosition(map,p,direction);g.remaining--;", "const p=g.players[g.turn],a=map.cells[p.at],b=map.cells[to],requested=halfStepTarget(map,p)!==null?p.direction:b.x>a.x?3:b.x<a.x?2:b.y>a.y?1:0,direction=magnetDirection(map,g,requested);\n  if(direction===null){g.remaining=0;schedule(g,[{kind:'message',text:'南北极徽章相斥，前方没有可退让的道路。'}],'landed');return;}\n  const stride=movePosition(map,p,direction);g.remaining--;if(direction!==requested)record(g,'南北极徽章相斥，'+p.name+'转身离开。');"),
 ("if(SELF_EFFECTS.includes(item)||REDIRECT_ITEMS.includes(item)){", "if(item==='original-3'||SELF_EFFECTS.includes(item)||REDIRECT_ITEMS.includes(item)){"),
 ("}else if(item==='original-21'){", "}else if(item==='original-3'){\n    applyEffect(p,item,g.turn,true,false);p.effects.find(e=>e.id===item).target=target;\n    if(target!==g.turn){applyEffect(g.players[target],item,g.turn,false,true);g.players[target].effects.find(e=>e.id===item).target=target;}g.phase='end';\n  }else if(item==='original-21'){"),
])
edit('app/src/main.ts',[("(SELF_EFFECTS.includes(id)||REDIRECT_ITEMS.includes(id))?", "(id==='original-3'||SELF_EFFECTS.includes(id)||REDIRECT_ITEMS.includes(id))?")])
