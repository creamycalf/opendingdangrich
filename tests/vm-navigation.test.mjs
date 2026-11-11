import test from 'node:test';import assert from 'node:assert/strict';
import {createNavigationControls} from '../vm-app/web/navigationControls.mjs';
import {ORIGINAL_SHA,KEY_GROUPS} from '../vm-app/web/originalControls.mjs';
test('scene-bound keyboard confirmation survives a short tap until its original VK read',()=>{
 const bytes=new Uint8Array(0x900000),d=new DataView(bytes.buffer),put=(a,n)=>d.setUint32(a,n,true),calls=[],memory={read_memory:(a,n)=>bytes.slice(a,a+n)};
 put(0x4cda70,0x800000);put(0x800000,0x4b9384);KEY_GROUPS[0].forEach((k,i)=>d.setUint16(0x800020+i*2,k,true));
 const shim={dispatch:()=>({eax:32768}),setKeyState:(...a)=>calls.push(a)},a=createNavigationControls({memory,shim,executableSha256:ORIGINAL_SHA});
 assert(a.onAction({action:'confirm',down:true}));a.onAction({action:'confirm',down:false});assert.deepEqual(calls,[[46,true]]);
 assert.deepEqual(shim.dispatch({imported:{dll:'USER32.DLL',name:'GetAsyncKeyState'},args:[46]}),{eax:32768});assert.deepEqual(calls,[[46,true],[46,false]]);
 a.onAction({action:'left',down:true});a.clear();assert.deepEqual(calls.at(-1),[37,false]);put(0x800000,0);assert.equal(a.onAction({action:'confirm',down:true}),false);
});

test('speech confirmation follows the dialogue owner instead of the last player controller',()=>{
 const bytes=new Uint8Array(0x900000),d=new DataView(bytes.buffer),put=(a,n)=>d.setUint32(a,n,true),calls=[],memory={read_memory:(a,n)=>bytes.slice(a,a+n)};
 const menu=0x801000,controller=0x802000,oldController=0x803000,items=0x804000;
 put(0x4cc574,menu);put(menu+0x30,1);put(menu+0x34,items);put(menu+0x58,controller);
 for(const [address,group] of [[controller,0],[oldController,1]]){put(address,0x4b9384);put(address+0x1c,group);KEY_GROUPS[group].forEach((key,i)=>d.setUint16(address+0x20+i*2,key,true));}
 put(0x4cda70,oldController);
 const shim={dispatch:()=>({eax:32768}),setKeyState:(...a)=>calls.push(a)},a=createNavigationControls({memory,shim,executableSha256:ORIGINAL_SHA});
 assert(a.onAction({action:'confirm',down:true}));assert.deepEqual(calls,[[46,true]]);a.clear();
 put(menu+0x74,1);put(menu+0xd0,0x805000);bytes[0x805000]=65;
 assert.equal(a.onAction({action:'confirm',down:true}),false);assert.equal(calls.length,2);
});
