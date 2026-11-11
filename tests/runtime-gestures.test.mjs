import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TouchInput,viewport} from '../runtime-touch/input.mjs';
import {TouchGestures} from '../runtime-touch/gestures.mjs';
test('finger drift clicks once; dragging inspects without sending a click',()=>{
 const events=[],points=[],input=new TouchInput(e=>events.push(e),viewport(640,480));
 const g=new TouchGestures(input,{inspect:p=>points.push(p)});
 g.down(1,100,100);assert.equal(g.up(1,102,103),true);assert.equal(events.length,3);
 g.down(1,100,100);g.move(1,120,120);assert.deepEqual(points.at(-1),{x:120,y:120});
 assert.equal(g.up(1,125,125),false);assert.equal(events.length,3);
});
test('pinch, pointer cancellation and rotation cannot become a click',()=>{
 const events=[],input=new TouchInput(e=>events.push(e),viewport(640,480)),g=new TouchGestures(input);
 g.down(1,100,100);g.down(2,200,200);g.up(2,200,200);g.up(1,100,100);assert.deepEqual(events,[]);
 g.down(1,100,100);g.cancel();g.up(1,100,100);assert.deepEqual(events,[]);
 input.hold(3,'Space');g.down(1,100,100);g.resize(viewport(480,640));g.up(1,100,100);
 assert.deepEqual(events,[{type:'key',key:'Space',down:true},{type:'key',key:'Space',down:false}]);
});
