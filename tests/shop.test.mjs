import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {originalShopPrice,mapShop} from '../app/src/shop.mjs';
import * as E from '../app/src/engine.mjs';
import {executeCommand} from '../app/src/commands.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const maps=Array.from({length:8},(_,id)=>read(`../app/public/assets/maps/${id}.json`));
test('all shop buy/sell quotes match original x87 results exactly',()=>{
  const fixture=read('./fixtures/original-shop-prices.json');assert.ok(fixture.cases.length>2000);
  for(const c of fixture.cases){
    const shop=maps[c.map].shops[c.shop];
    assert.equal(originalShopPrice(shop,c.item,'buy',c.multiplier,c.purchasePercent),c.buy,JSON.stringify(c));
    assert.equal(originalShopPrice(shop,c.item,'sell',c.multiplier,c.purchasePercent),c.sell,JSON.stringify(c));
  }
});
test('unstocked items can have a sale price; no synthetic fallback shop',()=>{
  const map=maps[4],shop=map.shops[0],lot=shop.y*map.width+shop.x;
  assert.equal(mapShop(map,lot),shop);
  assert.equal(originalShopPrice(shop,36,'buy'),0);assert.equal(originalShopPrice(shop,36,'sell'),100);
  assert.equal(originalShopPrice(shop,37,'buy'),80);assert.equal(originalShopPrice(shop,37,'sell'),40);
  assert.throws(()=>mapShop({...map,shops:[]},lot));assert.throws(()=>originalShopPrice(shop,42,'buy'));
});
test('shop purchase and sale persist; rejected transactions leave state unchanged',()=>{
  const map=maps[4],shop=map.shops[0],lot=shop.y*map.width+shop.x;
  let g=E.createGame(map);g.players[0].at=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));
  g.phase='prompt';g.pending={kind:'shop',lot};g.players[0].inventory=['air'];
  const original=structuredClone(g);
  assert.throws(()=>executeCommand(map,g,{type:'answer',action:'buy',value:'air'}),/不出售/);
  assert.deepEqual(g,original);
  g=executeCommand(map,g,{type:'answer',action:'sell',value:'air'}).state;
  assert.equal(g.players[0].cash,1100);assert.deepEqual(g.players[0].inventory,[]);
  g=E.restore(map,JSON.stringify(g));const saved=structuredClone(g);
  assert.throws(()=>executeCommand(map,g,{type:'answer',action:'sell',value:'air'}),/没有/);assert.deepEqual(g,saved);
  g=executeCommand(map,g,{type:'answer',action:'buy',value:'charm'}).state;
  assert.equal(g.players[0].cash,1020);assert.deepEqual(g.players[0].inventory,['charm']);
  g=E.restore(map,JSON.stringify(g));g.players[0].cash=0;const poor=structuredClone(g);
  assert.throws(()=>executeCommand(map,g,{type:'answer',action:'buy',value:'door'}),/不足/);assert.deepEqual(g,poor);
});
test('AI shop choice is in stock and older pending shop saves retain balances',()=>{
  for(const map of maps)for(const shop of map.shops){
    const lot=shop.y*map.width+shop.x,g=E.createGame(map);
    g.players[0].at=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));
    if(g.players[0].at===undefined)continue;
    g.phase='prompt';g.pending={kind:'shop',lot};g.players[0].inventory=[];
    const [action,item]=E.aiAnswer(map,g);
    if(action==='buy')assert.ok(E.itemPrice(map,lot,item)>0);
    assert.doesNotThrow(()=>executeCommand(map,g,{type:'answer',action,value:item}));
    g.ruleset='town-flow-3';const restored=E.restore(map,JSON.stringify(g));
    assert.equal(restored.ruleset,E.RULESET);assert.equal(restored.players[0].cash,g.players[0].cash);
  }
});
