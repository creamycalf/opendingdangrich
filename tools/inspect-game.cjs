// Read-only inventory and PE import inspection; never executes the game.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.argv[2] || 'D:\\Game\\old\\哆啦a梦大富翁';
function pe(b) {
  if (b.toString('ascii', 0, 2) !== 'MZ') return null;
  const p=b.readUInt32LE(60), opt=p+24;
  if(b.toString('ascii',p,p+4)!=='PE\0\0') return {format:'non-PE MZ'};
  const count=b.readUInt16LE(p+6), size=b.readUInt16LE(p+20);
  const sections=Array.from({length:count},(_,i)=>{
    const s=opt+size+i*40;
    return {name:b.toString('ascii',s,s+8).replace(/\0/g,''),rva:b.readUInt32LE(s+12),raw:b.readUInt32LE(s+20),size:Math.max(b.readUInt32LE(s+8),b.readUInt32LE(s+16))};
  });
  const off=r=>{const s=sections.find(s=>r>=s.rva&&r<s.rva+s.size);return s?r-s.rva+s.raw:r;};
  const str=o=>b.toString('ascii',o,b.indexOf(0,o));
  const magic=b.readUInt16LE(opt), imports=[];
  if(magic===0x10b){
    const r=b.readUInt32LE(opt+104);
    if(r) for(let d=off(r); d+20<=b.length&&b.readUInt32LE(d+12); d+=20){
      const names=[], thunk=b.readUInt32LE(d)||b.readUInt32LE(d+16);
      for(let t=off(thunk);t+4<=b.length;t+=4){const n=b.readUInt32LE(t);if(!n)break;names.push(n&0x80000000?'ordinal:'+ (n&65535):str(off(n)+2));}
      imports.push({dll:str(off(b.readUInt32LE(d+12))),functions:names});
    }
  }
  return {machine:'0x'+b.readUInt16LE(p+4).toString(16),format:magic===0x10b?'PE32':'PE32+',entryRva:b.readUInt32LE(opt+16),sections,imports};
}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(root).map(f=>{
  const b=fs.readFileSync(f), item={path:path.relative(root,f),bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),header:b.subarray(0,32).toString('hex')};
  if(/\.exe$/i.test(f))item.pe=pe(b);
  return item;
});
fs.mkdirSync('research',{recursive:true});
fs.writeFileSync('research/local-inventory.json',JSON.stringify({root,totalBytes:files.reduce((n,f)=>n+f.bytes,0),files},null,2));
console.log(JSON.stringify({fileCount:files.length,totalMiB:files.reduce((n,f)=>n+f.bytes,0)/1048576,executables:files.filter(f=>f.pe)},null,2));
