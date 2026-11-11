import {test} from 'node:test';
import assert from 'node:assert/strict';
import {viewport,gamePoint,TouchInput} from '../runtime-touch/input.mjs';
test('touch maps portrait/landscape letterboxing to original 640x480 coordinates',()=>{
 for(const [w,h] of [[360,800],[915,412],[640,480]]){
  const v=viewport(w,h);assert.deepEqual(gamePoint(v,w/2,h/2),{x:320,y:240});
  assert.equal(gamePoint(v,v.x-1,v.y),null);assert.equal(gamePoint(v,v.x+640*v.scale,v.y),null);
 }
});
test('multiple fingers and background/rotation never leave held keys',()=>{
 const events=[],input=new TouchInput(e=>events.push(e),viewport(915,412));
 input.hold(1,'Left');input.hold(2,'Left');input.release(1);
 assert.deepEqual(events,[{type:'key',key:'Left',down:true}]);
 input.hold(3,'Space');input.resize(viewport(360,800));
 assert.equal(events.filter(e=>!e.down).length,2);assert.equal(input.held.size,0);
 const before=events.length;assert.equal(input.tap(0,0),false);assert.equal(events.length,before);
 assert.equal(input.tap(180,400),true);assert.deepEqual(events.slice(-3),[{type:'move',x:320,y:240},{type:'button',button:1,down:true},{type:'button',button:1,down:false}]);
});
