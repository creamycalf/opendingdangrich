import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rollEndpoints} from '../app/src/roll-preview.mjs';
const map={rawConfig:'00'.repeat(256),width:12,height:3,cells:Array.from({length:36},(_,i)=>({x:i%12,y:Math.floor(i/12),flags:Math.floor(i/12)===1?128:0}))};
test('endpoint preview advances without changing player or consuming state',()=>{
 const p={at:14,direction:3,straightDistance:2,small:false};const before=JSON.stringify(p);
 assert.deepEqual(rollEndpoints(map,p,4).map(n=>[n.x,n.y,n.sprite]),[[6,1,2]]);assert.equal(JSON.stringify(p),before);
});
test('small character previews alternating half tiles',()=>{
 const p={at:14,direction:3,straightDistance:2,small:true};
 assert.deepEqual(rollEndpoints(map,p,1).map(n=>[n.x,n.y,n.sprite]),[[2.5,1,78]]);
 assert.deepEqual(rollEndpoints(map,p,2).map(n=>[n.x,n.y,n.sprite]),[[3,1,77]]);
});
