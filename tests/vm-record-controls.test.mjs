import test from 'node:test';import assert from 'node:assert/strict';
import {readOriginalRecordState} from '../vm-app/web/recordControls.mjs';
import {createNavigationControls} from '../vm-app/web/navigationControls.mjs';
import {ORIGINAL_SHA,KEY_GROUPS} from '../vm-app/web/originalControls.mjs';
function setup(seat,character,name){
 const b=new Uint8Array(0x900000),d=new DataView(b.buffer),put=(a,n)=>d.setUint32(a,n,true),memory={read_memory:(a,n)=>b.slice(a,a+n)};
 for(let i=0;i<4;i++){b[0x4cd128+i*8]=10;put(0x4cc814+i*4,0x800000+i*0x100);put(0x800000+i*0x100,i===3?0x4b93cc:0x4b9384);if(i<3){put(0x80001c+i*0x100,i);KEY_GROUPS[i].forEach((k,j)=>d.setUint16(0x800020+i*0x100+j*2,k,true));}}
 put(0x4cda70,0x800300); // Last selection owner is P4, not the new record owner.
 put(name?0x4cc8e4:0x4cc7c4,0x810000);put(name?0x4cd8e4:0x4ccd7c,name?0x820000:1);
 put(name?0x4cd478:0x4cd8d8,0x15d);put(name?0x4cd694:0x4cc838,character);put(name?0x4cd334:0x4cd808,19290);
 b[0x4cd128+seat*8]=0;b[0x4cd129+seat*8]=character;put(0x4cd12c+seat*8,19290);
 return {b,d,put,memory};
}
test('both original record screens resolve all four seats and seven characters',()=>{
 for(const name of [false,true])for(let seat=0;seat<4;seat++)for(let ch=0;ch<7;ch++){
  const {memory}=setup(seat,ch,name),s=readOriginalRecordState(memory);assert.equal(s.seat,seat);assert.equal(s.context,name?'record-name':'record');
 }
});
test('stale, ambiguous and absent record markers never select a player',()=>{
 const {b,put,memory}=setup(0,0,false);put(0x4ccd7c,0);assert.equal(readOriginalRecordState(memory),null);put(0x4ccd7c,1);
 b[0x4cd128+8]=0;b[0x4cd129+8]=0;put(0x4cd12c+8,19290);assert.equal(readOriginalRecordState(memory),null);
 b[0x4cd128+8]=10;put(0x4cc7c4,0);assert.equal(readOriginalRecordState(memory),null);
});
test('record confirm goes to the recorded keyboard owner instead of stale mouse owner',()=>{
 const {memory}=setup(0,0,false),keys=[],mouse=[];
 const shim={dispatch:()=>({eax:32768}),setKeyState:(...a)=>keys.push(a),directInput:(...a)=>mouse.push(a)},nav=createNavigationControls({memory,shim,executableSha256:ORIGINAL_SHA});
 nav.onAction({action:'confirm',down:true});nav.onAction({action:'confirm',down:false});assert.deepEqual(keys,[[46,true]]);assert.deepEqual(mouse,[]);
 shim.dispatch({imported:{dll:'USER32.DLL',name:'GetAsyncKeyState'},args:[46]});assert.deepEqual(keys,[[46,true],[46,false]]);
});
