from pathlib import Path
import json,hashlib,shutil,re
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text('utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=read('test-results/rc23-package.json');installed=read('test-results/rc23-installed.json')
baseline=read('releases/1.0.0-rc22/verification.json');assert sha(R/'app/src/engine.mjs')==baseline['sourceHashes']['engine.mjs']
assert installed['apkSha256']==p['sha256'] and installed['versionCode']==54
paths=['rc23-image-loader/report.json','rc23-hermit-pause/result.json','rc23-ending-production/report.json','rc23-ending-native/report.json','rc23-hermit-production-android/result.json','rc23-hermit-production-android-seed1/result.json']
reports={}
for path in paths:
 d=read('test-results/'+path);assert d.get('checks') and not d.get('errors') and not d.get('missing') and d.get('passed',True),path
 if 'native' in path or 'android' in path:assert d['apkSha256']==p['sha256'] and d['restoredAndReloadVerified'],path
 reports[path]=d
assert len(reports['rc23-ending-native/report.json']['checks'])==3
cert=r'Signer #1 certificate SHA-256 digest: (\w+)'
sig=(R/'test-results/rc23-signature.log').read_text('utf-8-sig');old=(R/'test-results/rc22-signature.log').read_text('utf-8-sig')
assert 'Verifies' in sig and re.search(cert,sig)[1]==re.search(cert,old)[1]
apk=R/'app/android/app/build/outputs/apk/debug/app-debug.apk';assert sha(apk)==p['sha256']
out=R/'releases/1.0.0-rc23';out.mkdir(exist_ok=True);target=out/'DingdangTouch-1.0.0-rc23.apk'
if target.exists():assert sha(target)==p['sha256']
else:shutil.copy2(apk,target)
files=set()
for pattern in ['test-results/rc23-*.json','test-results/rc23-*.log','test-results/rc23-*/report.json','test-results/rc23-*/result.json','test-results/rc23-*/restoration.json','test-results/rc23-*/human-progress.json','test-results/rc23-*/timing-summary.json','test-results/rc23-*/*.png','docs/audits/*RC23*','docs/audits/rc23*','docs/rules/*RC23*','app/src/scene-image-loader.ts','app/src/*view.ts','app/src/pc-title.ts','app/src/main.ts','tests/*image-loader*','tests/*hermit-pause*','tests/rc22-ending*.cjs','tests/rc22-hermit-production.cjs','tools/archive_feedback_rc23.py']:
 files.update(f for f in R.glob(pattern) if f.is_file() and 'backup' not in f.name.lower())
evidence=[]
for f in sorted(files):
 dest=out/'evidence'/f.relative_to(R);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dest);evidence.append(dict(file=dest.relative_to(out).as_posix(),sha256=sha(dest)))
d=dict(version='1.0.0-rc23',versionCode=54,apk=dict(file=target.name,sha256=p['sha256'],bytes=target.stat().st_size),package=p,installed=installed,validation=reports,evidence=evidence,sourceHashes={f.name:sha(f) for f in (R/'app/src').iterdir() if f.is_file()},ruleBaseline='RC22 349 rule/input tests; RC23 changes image loading and presentation lifecycle, not engine rules',limitations=['Android emulator only, no physical ARM verification','Original feature gaps remain as recorded in RC22-PC-FLOW-AUDIT.md'])
(out/'verification.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),'utf8')
(out/'SHA256SUMS.txt').write_text(p['sha256']+'  '+target.name+'\n','utf8')
(out/'README.md').write_text('叮当大富翁 RC23：可覆盖安装保留存档，不要先卸载。\n\n修复月结、结局、证书、标题图片的加载/解码时序，限制并发并支持退出取消；修复仙人组件后台计时和过期音效清理，保留实际游戏后台暂停菜单及保存逻辑。\n\n最终APK验收及范围见verification.json。原版规则未改，仍有小矮人额外动作、部分状态/语音演出与AI/RNG等差异，暂无实体ARM验证。','utf8')
print(json.dumps(dict(apk=str(target),sha256=p['sha256'],evidence=len(evidence))))
