const {readdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {spawnSync}=require('node:child_process');

const directory=resolve(__dirname,'../tests');
const files=readdirSync(directory).filter(name=>name.endsWith('.test.mjs')).sort();
const result=spawnSync(process.execPath,['--test','--test-concurrency=3',...files.map(name=>resolve(directory,name))],{stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;
process.exitCode=result.status??1;
