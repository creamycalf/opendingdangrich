import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {originalLandItemNeighbor,originalLandItemAllowed,landItemStatus,applyLandItem} from '../app/src/land-items.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const maps=Array.from({length:8},(_,id)=>read(`../app/public/assets/maps/${id}.json`));
const fixture=read('./fixtures/original-land-items.json');
const key=id=>id===0?'restoreRay':'timeCloth';
const site=map=>{for(let at=0;at<map.cells.length;at++)if(E.walkable(map.cells[at])){const lot=originalLandItemNeighbor(map,at);if(lot!==null&&map.cells[lot].event===1)return {at,lot};}throw Error('No property');};

test('land item targets match original neighboring-cell query on all eight maps',()=>{
  assert.equal(fixture.neighbors.length,1171);
  for(const c of fixture.neighbors)assert.equal(originalLandItemNeighbor(maps[c.map],c.at),c.lot,JSON.stringify(c));
});
test('land item permission matches 480 original ownership, level and road configurations',()=>{
  const map={width:3,height:3,cells:Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3),flags:128,event:0}))};
  for(const c of fixture.eligibility){
    for(const [bit,lot] of [1,7,3,5].entries())map.cells[lot].flags=c.mask&(1<<bit)?0:128;
    const owner=c.owner<0?undefined:c.owner;
    const g={turn:0,players:[{at:4}],owners:{},levels:{}};
    for(const lot of [1,7,3,5])if(owner!==undefined){g.owners[lot]=owner;g.levels[lot]=c.level;}
    assert.equal(landItemStatus(map,g,key(c.item)).allowed,c.allowed,JSON.stringify(c));
  }
  assert.equal(originalLandItemAllowed('restoreRay',0,1,0),true);
  assert.equal(originalLandItemAllowed('timeCloth',0,4,0),false);
});
test('downgrade and reset match original mutation instructions, including level zero',()=>{
  for(const c of fixture.mutations){
    const g={owners:{1:1},levels:{1:c.initialLevel}};applyLandItem(g,key(c.item),1);
    assert.equal(g.owners[1]!==undefined,c.result.owned);
    assert.equal(g.levels[1]??0,c.result.level);
    if(c.result.listRemoved)assert.equal(Object.hasOwn(g.levels,1),false);
  }
});
test('land use persists, reprices property immediately and replays without cash compensation',()=>{
  for(const map of maps)for(const item of ['restoreRay','timeCloth']){
    const {at,lot}=site(map),g=E.createGame(map,{startDate:'2000-04-03'});
    g.players[0].at=at;g.players[0].inventory=[item];g.owners[lot]=1;g.levels[lot]=4;
    const cash=g.players.map(p=>[p.cash,p.bank]),initial=structuredClone(g);
    const command={type:'useItem',item},next=executeCommand(map,g,command).state;
    assert.deepEqual(g,initial);assert.deepEqual(next.players.map(p=>[p.cash,p.bank]),cash);
    assert.deepEqual(next.players[0].inventory,[]);assert.equal(next.phase,'end');
    if(item==='restoreRay'){assert.equal(next.levels[lot],3);assert.ok(E.rent(map,next,lot)<E.rent(map,g,lot));}
    else{assert.equal(next.owners[lot],undefined);assert.equal(E.ownedLots(next,1).includes(lot),false);}
    assert.deepEqual(E.restore(map,JSON.stringify(next)),next);
    assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[command]}),next);
  }
});
test('invalid land use preserves inventory and cannot choose a distant target',()=>{
  const map=maps[4],{at,lot}=site(map),g=E.createGame(map,{startDate:'2000-04-03'});
  g.players[0].at=at;g.players[0].inventory=['timeCloth','restoreRay'];g.owners[lot]=0;g.levels[lot]=0;
  for(const item of g.players[0].inventory){
    const before=structuredClone(g);assert.throws(()=>executeCommand(map,g,{type:'useItem',item,target:lot+1}));assert.deepEqual(g,before);
  }
  g.levels[lot]=4;const next=executeCommand(map,g,{type:'useItem',item:'restoreRay',target:lot+1}).state;
  assert.equal(next.levels[lot],3);assert.equal(next.levels[lot+1],undefined);
  g.ruleset='town-flow-5';g.players[0].effects=[{id:'charm',source:0,remaining:2}];g.players[0].effectClockStarted=true;
  const restored=E.restore(map,JSON.stringify(g));assert.equal(restored.ruleset,E.RULESET);assert.deepEqual(restored.players,g.players.map(p=>({...p,lastGiftMonth:'2000-04'})));
});
test('land item shops preserve original supply: ray sold, cloth only bought back',()=>{
  const map=maps[4];
  for(const item of ['restoreRay','timeCloth']){
    const shop=map.shops[0];
    const lot=shop.y*map.width+shop.x,g=E.createGame(map);
    g.phase='prompt';g.pending={kind:'shop',lot};g.players[0].at=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));g.players[0].inventory=[];
    const buy=E.itemPrice(map,lot,item),sell=E.itemPrice(map,lot,item,'sell');
    if(item==='restoreRay'){assert.equal(buy,100);E.answer(map,g,'buy',item);assert.equal(g.players[0].cash,1000-buy);assert.deepEqual(g.players[0].inventory,[item]);}
    else{assert.equal(buy,0);assert.throws(()=>executeCommand(map,g,{type:'answer',action:'buy',value:item}),/不出售/);g.players[0].inventory=[item];}
    E.answer(map,g,'sell',item);assert.equal(g.players[0].cash,1000-buy+sell);assert.deepEqual(g.players[0].inventory,[]);
  }
});
