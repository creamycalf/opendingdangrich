from pathlib import Path
import hashlib,json,re,subprocess
R=Path(__file__).resolve().parents[1]
adb='F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe'
def run(*args):return subprocess.check_output([adb,'-s','emulator-5580',*args],text=True,encoding='utf8').strip()
package=run('shell','dumpsys','package','local.dingdang.touch')
assert re.search(r'versionCode=52\b',package) and 'versionName=1.0.0-rc21' in package
remote=run('shell','pm','path','local.dingdang.touch').removeprefix('package:')
sha=run('shell','sha256sum',remote).split()[0]
local=hashlib.sha256((R/'app/android/app/build/outputs/apk/debug/app-debug.apk').read_bytes()).hexdigest()
assert sha==local
report=dict(device='emulator-5580',versionCode=52,versionName='1.0.0-rc21',apkSha256=sha,scope='Installed package identity; actual touch checks recorded separately')
(R/'test-results/rc21-installed.json').write_text(json.dumps(report,indent=2)+'\n','utf8')
print(json.dumps(report))
