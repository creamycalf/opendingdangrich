from pathlib import Path
import json,hashlib,shutil,re
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text('utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=read('test-results/rc24-package.json');installed=read('test-results/rc24-installed.json')
baseline=read('releases/1.0.0-rc22/verification.json');assert sha(R/'app/src/engine.mjs')==baseline['sourceHashes']['engine.mjs']
assert installed['apkSha256']==p['sha256'] and installed['versionCode']==55
paths=['rc24-datauri-hermit-production/result.json','rc24-dwarf-ui.json','rc24-dwarf-android-lifecycle.json','rc24-image-bundle/report.json','rc24-hermit-bundle/result.json','rc24-image-loader/report.json','rc24-datauri-ending-production/report.json','rc24-ending-native/report.json','rc24-hermit-production-android/result.json','rc24-hermit-production-android-seed1/result.json']
reports={}
for path in paths:
 d=read('test-results/'+path);assert (d.get('checks') or (path=='rc24-dwarf-ui.json' and d.get('paintedSprites',0)>0 and d.get('animation')==121)) and not d.get('errors') and not d.get('missing') and d.get('passed',True),path
 if 'native' in path or 'android' in path:assert d['apkSha256']==p['sha256'] and (d.get('restoredAndReloadVerified') or d.get('restored')),path
 reports[path]=d
assert len(reports['rc24-ending-native/report.json']['checks'])==3
comparison=read('test-results/rc24-load-comparison.json');assert comparison['apkSha256']==p['sha256']
assert all(row['afterMs']<row['beforeMs'] for row in comparison['rows'])
cert=r'Signer #1 certificate SHA-256 digest: (\w+)'
sig=(R/'test-results/rc24-signature.log').read_text('utf-8-sig');old=(R/'test-results/rc22-signature.log').read_text('utf-8-sig')
assert 'Verifies' in sig and re.search(cert,sig)[1]==re.search(cert,old)[1]
apk=R/'app/android/app/build/outputs/apk/debug/app-debug.apk';assert sha(apk)==p['sha256']
out=R/'releases/1.0.0-rc24';out.mkdir(exist_ok=True);target=out/'DingdangTouch-1.0.0-rc24.apk'
if target.exists():assert sha(target)==p['sha256']
else:shutil.copy2(apk,target)
files=set()
for pattern in ['test-results/rc24-*.json','test-results/rc24-*.log','test-results/rc24-*/report.json','test-results/rc24-*/result.json','test-results/rc24-*/restoration.json','test-results/rc24-*/human-progress.json','test-results/rc24-*/timing-summary.json','test-results/rc24-*/*.png','docs/audits/*RC24*','docs/audits/rc24*','docs/rules/*RC24*','app/src/scene-image-loader.ts','app/src/victory-presentation.mjs','app/src/item-lifecycle-presentation.mjs','app/src/scene-image-bundle.ts','app/src/*view.ts','app/src/pc-title.ts','app/src/main.ts','tests/*image-loader*','tests/*victory*','tests/rc24-*.cjs','tests/*lifecycle*','research/rc24*/*.json','tools/*bundle*','tools/compare_rc24_loads.py','app/public/assets/*/images.bundle.json','tests/*hermit-pause*','tests/rc22-ending*.cjs','tests/rc22-hermit-production.cjs','tools/archive_feedback_rc24.py']:
 files.update(f for f in R.glob(pattern) if f.is_file() and 'backup' not in f.name.lower())
evidence=[]
for f in sorted(files):
 dest=out/'evidence'/f.relative_to(R);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dest);evidence.append(dict(file=dest.relative_to(out).as_posix(),sha256=sha(dest)))
d=dict(version='1.0.0-rc24',versionCode=55,apk=dict(file=target.name,sha256=p['sha256'],bytes=target.stat().st_size),package=p,installed=installed,validation=reports,loadingComparison=comparison,evidence=evidence,sourceHashes={f.name:sha(f) for f in (R/'app/src').iterdir() if f.is_file()},ruleBaseline='RC22 349 rule/input tests; RC24 changes image loading and presentation lifecycle, not engine rules',limitations=['Android emulator only, no physical ARM verification','Original feature gaps remain as recorded in RC22-PC-FLOW-AUDIT.md'])
(out/'verification.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),'utf8')
(out/'SHA256SUMS.txt').write_text(p['sha256']+'  '+target.name+'\n','utf8')
(out/'README.md').write_text('叮当大富翁 RC24：可覆盖安装保留存档，不要先卸载。\n\n减少胜利/仙人逐图读取与图片地址处理开销，保留加载后解码、退出取消及后台恢复保护；补原版小矮人首次接管睡眠身体的60帧方向动画。实测提速数据与验收范围见verification.json。\n\n最终APK验收及范围见verification.json。原版规则未改，仍有接管坐标待核、部分状态/语音演出与AI/RNG等差异，暂无实体ARM验证。','utf8')
print(json.dumps(dict(apk=str(target),sha256=p['sha256'],evidence=len(evidence))))
