from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
p=r/'app/src/main.ts';s=p.read_text('utf8');s="import {canSwapBuilding,movableBuildings} from './property-items.mjs';\n"+s
s=s.replace("let roadSelection='door';", "let roadSelection='door',propertyFirst=-1;\nconst selectionAllowed=(i:number)=>roadSelection==='original-21'?canSwapBuilding(g,i,propertyFirst):gameRoadPlacement(map,g,i,roadSelection==='door').length>0;")
s=s.replace("gameRoadPlacement(map,g,c.y*map.width+c.x,roadSelection==='door').length",'selectionAllowed(c.y*map.width+c.x)')
old="if(gameRoadPlacement(map,g,i,roadSelection==='door').length){teleporting=false;$('routes').replaceChildren();dispatch({type:'useItem',item:roadSelection,target:i});save();center();void drive();}else toast('请选择绿色标出的空闲道路');"
new="if(selectionAllowed(i)){if(roadSelection==='original-21'&&propertyFirst<0){propertyFirst=i;selected=i;dirty=true;toast('已选第一座，请点击第二座绿色建筑');return;}teleporting=false;$('routes').replaceChildren();dispatch({type:'useItem',item:roadSelection,target:roadSelection==='original-21'?{first:propertyFirst,second:i}:i});propertyFirst=-1;save();center();void drive();}else toast(roadSelection==='original-21'?'请选择另一座绿色标出的普通建筑':'请选择绿色标出的空闲道路');"
assert old in s;s=s.replace(old,new)
s=s.replace("const effect=id==='original-5'", "const effect=id==='original-21'&&movableBuildings(g).length<2?{allowed:false,replaced:[],reason:'地图上需要两座普通建筑'}:id==='original-5'")
s=s.replace("if(id==='door'||id==='original-13'){teleporting=true;roadSelection=id;dirty=true;toast(id==='door'?'点击绿色道路放置任意门':'点击绿色道路选择大炮落点');", "if(id==='door'||id==='original-13'||id==='original-21'){teleporting=true;roadSelection=id;propertyFirst=-1;dirty=true;toast(id==='original-21'?'依次点击两座绿色建筑，拖动或缩放地图寻找目标':id==='door'?'点击绿色道路放置任意门':'点击绿色道路选择大炮落点');")
s=s.replace("cancel.onclick=()=>{teleporting=false;dirty=true;", "cancel.onclick=()=>{teleporting=false;propertyFirst=-1;dirty=true;")
s=s.replace('三十二种道具效果','三十六种道具效果');p.write_text(s,'utf8')
p=r/'app/package.json';j=json.loads(p.read_text('utf8'));j['scripts']['test']+=' ../tests/army-dwarf.test.mjs ../tests/building-swap.test.mjs';p.write_text(json.dumps(j,indent=2,ensure_ascii=False)+'\n','utf8')
