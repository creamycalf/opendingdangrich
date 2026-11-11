const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
for(const folder of ['victory-scenes','pc-hermit'])test(folder+' every bundled PNG matches original bytes and hash',()=>{
 const root='app/public/',dir=root+'assets/'+folder+'/',m=JSON.parse(fs.readFileSync(dir+'images.bundle.json')),bin=fs.readFileSync(dir+m.bundle);assert.equal(bin.length,m.length);assert.equal(crypto.createHash('sha256').update(bin).digest('hex'),m.sha256);
 let end=0;for(const[url,e]of Object.entries(m.entries)){assert.equal(e.offset,end);const raw=bin.subarray(e.offset,e.offset+e.length);assert.deepEqual(raw,fs.readFileSync(root+url));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),e.sha256);end+=e.length;}assert.equal(end,bin.length);
});
