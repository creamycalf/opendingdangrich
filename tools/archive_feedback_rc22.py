"""Release RC22 only after the final installed APK reports and resource check agree."""
from pathlib import Path
import hashlib,json,re,shutil
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text('utf-8-sig'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=read('test-results/rc22-package.json');installed=read('test-results/rc22-installed.json')
assert installed['apkSha256']==p['sha256'] and installed['versionCode']==53
paths={
 'endingBrowser':'test-results/rc22-ending-production/report.json',
 'endingLayout':'test-results/rc22-ending-production/layout-report.json',
 'endingCancelLoad':'test-results/rc22-ending-production/race-report.json',
 'hermitGoodBrowser':'test-results/rc22-hermit-production/result.json',
 'hermitBadBrowser':'test-results/rc22-hermit-production-seed1/result.json',
 'hermitStatusBrowser':'test-results/rc22-hermit-status-production/result.json',
 'hermitLoader':'test-results/rc22-hermit-loader/result.json',
 'bankBrowser':'test-results/rc22-bank-production/report.json',
 'lifecycleBrowser':'test-results/rc22-item-lifecycle-ui.json',
 'endingAndroid':'test-results/rc22-ending-native/report.json',
 'hermitGoodAndroid':'test-results/rc22-hermit-production-android/result.json',
 'hermitBadAndroid':'test-results/rc22-hermit-production-android-seed1/result.json',
 'lifecycleAndroid':'test-results/rc22-android-lifecycle.json',
 'bankAndroid':'test-results/rc22-bank-production-android/report.json',
}
reports={}
for name,path in paths.items():
 d=read(path);assert d['checks'] and not d.get('errors',[]) and not d.get('missing',[]),path
 assert d.get('passed',True),path
 if d.get('apkSha256'):assert d['apkSha256']==p['sha256'],path
 reports[name]=d
assert reports['lifecycleAndroid']['restored']
assert len(reports['endingAndroid']['checks'])==3,'monthly, AI and human native checks must all complete'
for name in ('endingAndroid','hermitGoodAndroid','hermitBadAndroid','lifecycleAndroid','bankAndroid'):
 assert reports[name]['apkSha256']==p['sha256'],name
for name in ('hermitGoodAndroid','hermitBadAndroid'):
 assert reports[name]['restoredAndReloadVerified'],name
assert read('test-results/rc22-ending-native/restoration.json')['restored']
assert read('test-results/rc22-bank-production-android/storage-restored.json')['verified']
rules=(R/'test-results/rc22-all-rules.log').read_text('utf-8-sig');assert re.search(r'fail 0\b',rules)
sig=(R/'test-results/rc22-signature.log').read_text('utf-8-sig');old=(R/'test-results/rc21-signature.log').read_text('utf-8-sig')
cert=r'Signer #1 certificate SHA-256 digest: (\w+)';assert 'Verifies' in sig and re.search(cert,sig)[1]==re.search(cert,old)[1]
apk=R/'app/android/app/build/outputs/apk/debug/app-debug.apk';assert digest(apk)==p['sha256']
out=R/'releases/1.0.0-rc22';out.mkdir(exist_ok=True);target=out/'DingdangTouch-1.0.0-rc22.apk'
if target.exists():assert digest(target)==p['sha256']
else:shutil.copy2(apk,target)
patterns=['test-results/rc22-*.json','test-results/rc22-*.png','test-results/rc22-build.log','test-results/rc22-all-rules.log','test-results/rc22-targeted-rules.log','test-results/rc22-signature.log',
 'test-results/rc22-*/report.json','test-results/rc22-*/result.json','test-results/rc22-*/layout-report.json','test-results/rc22-*/race-report.json','test-results/rc22-*/restoration.json','test-results/rc22-*/storage-restored.json','test-results/rc22-*/*.png','test-results/rc22-ending-native/monthly-paint.json','test-results/rc22-ending-native/first-attempt.json','test-results/rc22-ending-native/retry-attempts.json','test-results/rc22-ending-native/last-failure.json','test-results/rc22-ending-native/human-progress.json',
 'docs/audits/RC22*','docs/audits/rc22*','docs/rules/*RC22*','research/rc22*.json',
 'tests/rc22-*.cjs','tests/*presentation.test.mjs','tests/hermit-result-save.test.mjs','tests/item-lifecycle-ui.cjs','tests/map-animation.test.mjs',
 'tools/archive_feedback_rc22.py','tools/verify-installed-rc22.py','tools/extract_v126_hermit.py','tools/extract_item_lifecycle.py','tools/extract_ending_scenes.py','tools/extract_victory_scenes.py',
 'app/src/main.ts','app/src/engine.mjs','app/src/audio-rules.mjs','app/src/rent-presentation.mjs','app/src/map-animation.mjs','app/src/hermit-*','app/src/*lifecycle*','app/src/monthly-*','app/src/ending-*','app/src/victory-*',
 'app/public/assets/pc-hermit/catalog.json','app/public/assets/item-lifecycle/catalog.json','app/public/assets/monthly-scenes/catalog.json','app/public/assets/ending-scenes/catalog.json','app/public/assets/victory-scenes/catalog.json',
 'app/package.json','app/android/app/build.gradle']
files=set()
for pattern in patterns:files.update(f for f in R.glob(pattern) if f.is_file() and 'backup' not in f.name.lower())
manifest=[]
for f in sorted(files):
 dest=out/'evidence'/f.relative_to(R);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dest);manifest.append(dict(file=dest.relative_to(out).as_posix(),sha256=digest(dest)))
report=dict(version='1.0.0-rc22',versionCode=53,appName='叮当大富翁',apk=dict(file=target.name,sha256=p['sha256'],bytes=target.stat().st_size),package=p,installed=installed,ruleTests=int(re.search(r'pass (\d+)\b',rules)[1]),validation=reports,
 limitations=['No physical ARM phone verification','Original PC save format, AI/RNG, fonts and some presentation timing differ','Additional dwarf animation121..124 and every status capability-feedback combination are not fully proven','Full original afterword validated in browser; Android validation scope is explicitly recorded'],
 sourceHashes={f.name:digest(f) for f in (R/'app/src').iterdir() if f.is_file()},evidence=manifest)
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
(out/'SHA256SUMS.txt').write_text(p['sha256']+'  '+target.name+'\n','utf8')
(out/'README.md').write_text('''# 叮当大富翁 RC22

可直接覆盖旧版安装并保留存档，不要先卸载。独立触屏版，VM本轮未改。

- 原版月结明细→资产排行两阶段及曲9→10；提前领取不多播结果页。
- 真人胜利片头、两页成绩、证书与原片尾；失败GAME OVER字母演出；黄耳按原分支跳过证书。
- 仙人完整出现、对白、施法、选箱、开合箱、离场；根据实际生效玩家显示状态图与剩余回合，存档不重复发奖。
- 棋盘显示16种原持续效果图标，可横滑点查，到期有原NPC/图标移除反馈。
- 修复安卓仙人图片加载与解码时序问题，避免卡在“仙人正在出现”。
- 分身、竹蜻蜓、跟随者、缩形隧道、任意门补原退出动画，按原控制帧消失。
- 矿山取款先倒放矿山再出钱，存款关闭矿山并付钱，预览/取消不播成功动画。
- 月结/终局短横屏和竖屏按钮固定在同一底行，不用长距离下滑。

最终APK关键流程与保存恢复通过；完整50秒原片尾在浏览器实际播放验证，原生验收没有重复穷尽全部片尾与所有组合。详细证据、测试范围和剩余差异见verification.json与evidence/docs/audits/RC22-PC-FLOW-AUDIT.md。仍无实体ARM测试，不声称与PC所有画面/组合逐帧完全一致。
''','utf8')
print(json.dumps(dict(apk=str(target),sha256=p['sha256'],evidence=len(manifest)),ensure_ascii=False))
