import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STARTING_ITEM_POOL,startingInventory,ITEMS,itemKey} from '../app/src/inventory.mjs';
import * as E from '../app/src/engine.mjs';
import {executeCommand} from '../app/src/commands.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const evidence=read('./fixtures/original-inventory.json');
const map=read('../app/public/assets/maps/4.json');

test('starting inventory matches both original x86 loops including duplicate RNG consumption',()=>{
  assert.deepEqual(STARTING_ITEM_POOL,evidence.pool);
  for(const c of evidence.starting.filter(c=>!c.loading)){
    let used=0;
    const actual=startingInventory(c.character,n=>{assert.equal(n,25);return c.draws[used++];});
    const expected=c.counts.flatMap((count,id)=>Array(count).fill(itemKey(id)));
    assert.deepEqual(actual,expected);assert.equal(used,c.used);assert.equal(actual.length,22);
  }
  for(const c of evidence.starting.filter(c=>c.loading)){assert.equal(c.used,0);assert.ok(c.counts.every(n=>n===0));}
  for(const id of ['nobita','shizuka','suneo','gian'])assert.deepEqual(startingInventory(id,()=>assert.fail('unexpected draw')),[]);
});

test('all 42 original item IDs have stable distinct inventory keys and descriptions',()=>{
  assert.equal(Object.keys(ITEMS).length,42);
  for(let id=0;id<42;id++){const item=ITEMS[itemKey(id)];assert.equal(item.originalId,id);assert.ok(item.name&&item.originalDescription);}
  const game=E.createGame(map);game.players[0].inventory=Array.from({length:42},(_,i)=>itemKey(i));
  assert.deepEqual(E.restore(map,JSON.stringify(game)),game);
  game.players[0].inventory.push('original-42');assert.throws(()=>E.restore(map,JSON.stringify(game)));
});

test('new games draw for Doraemon and Dorami; save migration never rerolls or refills inventory',()=>{
  const options={seed:72,players:[{character:'doraemon',control:'human'},{character:'dorami',control:'human'},{character:'nobita',control:'human'},{character:'shizuka',control:'human'}]};
  const game=E.createGame(map,options);assert.deepEqual(game,E.createGame(map,options));
  assert.deepEqual(game.players.map(p=>p.inventory.length),[22,22,0,0]);assert.notEqual(game.seed,72);
  for(const p of game.players.slice(0,2)){assert.equal(new Set(p.inventory).size,22);assert.ok(!p.inventory.includes('timeCloth'));}
  assert.deepEqual(E.restore(map,JSON.stringify(game)),game);
  game.ruleset='town-flow-6';game.players[0].inventory=['door','charm'];game.players[1].inventory=[];
  const restored=E.restore(map,JSON.stringify(game));assert.equal(restored.seed,game.seed);
  assert.deepEqual(restored.players.map(p=>({...p,lastGiftMonth:''})),game.players);assert.equal(restored.ruleset,E.RULESET);
});

test('shop quantities above twelve match accepted original increments and survive saves',()=>{
  for(const c of evidence.increments)assert.equal(c.after,c.before+1);
  const shop=map.shops[0],lot=shop.y*map.width+shop.x;
  let game=E.createGame(map);game.players[0].at=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));
  game.phase='prompt';game.pending={kind:'shop',lot};game.players[0].cash=100000;
  game.players[0].inventory=Array(1000).fill('charm');
  game=executeCommand(map,game,{type:'answer',action:'buy',value:'charm'}).state;
  assert.equal(game.players[0].inventory.length,1001);assert.equal(game.players[0].cash,99920);
  game=E.restore(map,JSON.stringify(game));
  game=executeCommand(map,game,{type:'answer',action:'sell',value:'charm'}).state;
  assert.equal(game.players[0].inventory.length,1000);assert.equal(game.players[0].cash,99960);
});

test('all 42 inventory entries are enabled; invalid targeting retains stock and selling still works',()=>{
  assert.equal(Object.values(E.ITEMS).filter(i=>i.implemented).length,42);
  let game=E.createGame(map,{startDate:'2000-04-03'});game.players[0].inventory=['original-3'];
  const before=structuredClone(game);
  assert.throws(()=>executeCommand(map,game,{type:'useItem',item:'original-3'}),/攻击/);assert.deepEqual(game,before);
  const shop=map.shops[0],lot=shop.y*map.width+shop.x;
  game.players[0].at=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));game.phase='prompt';game.pending={kind:'shop',lot};
  const price=E.itemPrice(map,lot,'original-3','sell'),saved=E.restore(map,JSON.stringify(game));
  game=executeCommand(map,saved,{type:'answer',action:'sell',value:'original-3'}).state;
  assert.deepEqual(game.players[0].inventory,[]);assert.equal(game.players[0].cash,1000+price);
});
