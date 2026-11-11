// Compatibility entry point; keep the generated artwork reproducible.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const result=spawnSync(process.env.PYTHON||'python',[fileURLToPath(new URL('./build_launcher_icons.py',import.meta.url))],{stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;
process.exitCode=result.status??1;
