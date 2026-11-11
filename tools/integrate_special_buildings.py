from pathlib import Path
R=Path(__file__).resolve().parents[1]
def edit(path,changes):
 p=R/path;s=p.read_text('utf8')
 for old,new in changes:
  assert old in s,(path,old[:100]);s=s.replace(old,new)
 p.write_text(s,'utf8')
edit('app/src/engine.mjs',[
 ("import {canSwapBuilding,swapBuildings}","import {SPECIAL_BUILDINGS,specialBuildStatus,buildSpecial,specialArrival,fireSpecial,missileTargets} from './special-buildings.mjs';\nimport {propertyKind,canSwapBuilding,swapBuildings}"),
 ("export function upgradeCost(map,g,lot){return", "export function upgradeCost(map,g,lot){requireState(propertyKind(g,lot)<2,'特殊建筑不能升级');return"),
 ("originalPropertyValue(map.cells[lot],g.levels[lot]??0,g.inflation)","originalPropertyValue(map.cells[lot],propertyKind(g,lot)>=2?0:g.levels[lot]??0,g.inflation)"),
 ("if(g.owners[lot]!==undefined&&g.owners[lot]!==g.turn&&!g.chargedLots.includes(lot))", "if(g.owners[lot]!==undefined&&g.owners[lot]!==g.turn&&propertyKind(g,lot)<2&&!g.chargedLots.includes(lot))"),
 ("(g.owners[i]===undefined||g.owners[i]===g.turn)","(g.owners[i]===undefined||g.owners[i]===g.turn&&propertyKind(g,i)<2)"),
 ("if(e.kind==='destination'){const ns=eligible(map,g);", "if(e.kind==='destination'){const special=specialArrival(map,g);if(special){if(special.kind==='missile')prompt(g,special);else{const target=fireSpecial(map,g,special.lot,g.turn);notice(g,g.players[target].name+'被无敌炮台击中，送入倒霉区域。');}return;}const ns=eligible(map,g);"),
 ("else if(q.kind==='destination'){requireState", "else if(q.kind==='missile'){requireState(action==='fire'&&missileTargets(g).includes(value),'请选择可攻击的角色');const lot=q.lot;done();const target=fireSpecial(map,g,lot,value);notice(g,g.players[target].name+'被自制导弹击中，送入倒霉区域。');}\n  else if(q.kind==='destination'){requireState"),
 ("const landItem=item==='restoreRay'||item==='timeCloth',land=landItem?landItemStatus(map,g,item):null;", "const specialItem=SPECIAL_BUILDINGS.includes(item),landItem=item==='restoreRay'||item==='timeCloth',land=specialItem?specialBuildStatus(map,g,item):landItem?landItemStatus(map,g,item):null;"),
 ("if(landItem)requireState(land.allowed,land.reason);","if(landItem||specialItem)requireState(land.allowed,land.reason);"),
 ("}else if(landItem){", "}else if(specialItem){\n    buildSpecial(map,g,item);record(g,ITEMS[item].name+'建成，停靠这块属地时触发。');g.phase='end';\n  }else if(landItem){"),
 ("if(q.kind==='destination')return", "if(q.kind==='missile')return ['fire',missileTargets(g).sort((a,b)=>netWorth(map,g,b)-netWorth(map,g,a))[0]];\n  if(q.kind==='destination')return"),
 ("'notice','destination','buy','upgrade','property','bank','shop','hermit','debt','minigame','monthly'", "'notice','destination','missile','buy','upgrade','property','bank','shop','hermit','debt','minigame','monthly'"),
 ("if(q.kind==='destination'&&(!Array.isArray(q.options)","if(q.kind==='missile'&&(specialArrival(map,g)?.kind!=='missile'||specialArrival(map,g)?.lot!==q.lot))bad();\n    if(q.kind==='destination'&&(!Array.isArray(q.options)"),
 ("if(q.kind==='property'&&(c.event!==1||g.owners[q.lot]!==g.turn))", "if(q.kind==='property'&&(c.event!==1||g.owners[q.lot]!==g.turn||propertyKind(g,q.lot)>=2))"),
 ("q.kind==='upgrade'&&(g.owners[q.lot]!==g.turn||g.levels[q.lot]>=4)","q.kind==='upgrade'&&(g.owners[q.lot]!==g.turn||g.levels[q.lot]>=4||propertyKind(g,q.lot)>=2)"),
])
edit('app/src/inventory.mjs',[("const available={", "const available={\n  'original-40':{name:'无敌炮台',description:'在身旁自己的空地基上建造炮台。对手停靠时自动将其送往倒霉区域；正在代替主人行动的机械小矮人可避开炮台。设施可以反复使用。'},\n  'original-41':{name:'自制导弹',description:'在身旁自己的空地基上建造导弹。自己再次停靠时选择一名可攻击的对手，送其进入倒霉区域。咒语相机可以转移导弹，设施可以反复使用。'},")])
edit('app/src/main.ts',[
 ("import {canSwapBuilding,movableBuildings}","import {SPECIAL_BUILDINGS,specialBuildStatus,missileTargets} from './special-buildings.mjs';\nimport {propertyKind,canSwapBuilding,movableBuildings}"),
 ("const base=[0,1,5,9,statue][level]+(level?rotation:0)+owner*57;", "const kind=propertyKind(g,i),base=kind===3?266+rotation*4+owner:kind===2?282+owner:[0,1,5,9,statue][level]+(level?rotation:0)+owner*57;"),
 ("g.owners[i]===undefined?'空地':LEVEL_NAMES[g.levels[i]]", "g.owners[i]===undefined?'空地':propertyKind(g,i)===3?'无敌炮台':propertyKind(g,i)===2?'自制导弹':LEVEL_NAMES[g.levels[i]]"),
 ("if(q.kind==='destination'){title=", "if(q.kind==='missile'){title='自制导弹 · 选择目标';body='停靠自己的导弹基地，选择要送往倒霉区域的角色。咒语相机可能转移攻击。';actions=missileTargets(g).map((i:number)=>a(g.players[i].name,'fire',i));}\n  if(q.kind==='destination'){title="),
 ("destination:'选择到访地点'", "destination:'选择到访地点',missile:'选择导弹目标'"),
 ("const land=['restoreRay','timeCloth'].includes(id)?landItemStatus(map,g,id):null;", "const land=SPECIAL_BUILDINGS.includes(id)?specialBuildStatus(map,g,id):['restoreRay','timeCloth'].includes(id)?landItemStatus(map,g,id):null;"),
 ("for(let i=0;i<228;i++)used.add('2-'+i);", "for(let i=0;i<228;i++)used.add('2-'+i);\n  for(let i=266;i<286;i++)used.add('2-'+i);"),
])
