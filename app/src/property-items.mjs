// 0x497346: choose two distinct owned ordinary buildings (kind 1).
export const propertyKind=(g,i)=>g.kinds[i]??((g.levels[i]??0)>0?1:0);
export const movableBuildings=g=>Object.keys(g.owners).map(Number).filter(i=>propertyKind(g,i)===1);
export function canSwapBuilding(g,i,first=-1){return i!==first&&g.owners[i]!==undefined&&propertyKind(g,i)===1;}
export function swapBuildings(g,first,second){
 if(!canSwapBuilding(g,first)||!canSwapBuilding(g,second,first))throw Error('请选择两座不同的普通建筑');
 for(const key of ['owners','levels']){const value=g[key][first];g[key][first]=g[key][second];g[key][second]=value;}
 g.kinds[first]=g.kinds[second]=1;
}
