from pathlib import Path
import json,hashlib,re,shutil
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text('utf-8-sig'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=read('test-results/rc18-package.json');a=read('test-results/rc18-android-items.json');s=read('test-results/rc18-v126-full-game-soak.json')
assert a['passed'] and len(a['checks'])==7 and a['apkSha256']==p['sha256']
assert s['status']=='passed' and len(s['sessions'])==24
for name,h in s['sourceHashes'].items():assert digest(R/'app/src'/name)==h,name
log=(R/'test-results/rc18-all-rules.log').read_text('utf-8-sig');assert re.search(r'fail 0\b',log)
tests=int(re.search(r'pass (\d+)\b',log)[1])
sig=(R/'test-results/rc18-signature.log').read_text('utf-8-sig');old=(R/'test-results/rc17-signature.log').read_text('utf-8-sig')
pattern=r'Signer #1 certificate SHA-256 digest: (\w+)'
assert 'Verifies' in sig and re.search(pattern,sig)[1]==re.search(pattern,old)[1]
mini=read('test-results/rc17-followup-minigame-ui-report.json');arcade=read('test-results/rc17-followup-arcade.json')
assert len(mini['checks'])==17 and not mini['errors'];assert len(arcade['rounds'])==8 and arcade['savePreserved'] and not arcade['pageErrors']
out=R/'releases/1.0.0-rc18';out.mkdir(exist_ok=True);apk=R/'app/android/app/build/outputs/apk/debug/app-debug.apk';assert digest(apk)==p['sha256']
target=out/'DingdangTouch-1.0.0-rc18.apk'
if target.exists():assert digest(target)==p['sha256']
else:shutil.copy2(apk,target)
patterns=['test-results/rc18-*','test-results/rc17-followup-*','test-results/audio-rc18/*','docs/audits/camera-v126-*.json','docs/audits/diamond-hermit-v126-*.json','research/diamond-v126-*.json','tests/fixtures/v126-camera.json','tests/fixtures/v126-diamond.json','tests/v126-camera.test.mjs','tests/diamond-v126.test.mjs','tests/android-item-audit-rc17.cjs','tests/v126-full-game-soak.mjs','tools/audit_camera_v126.py','tools/verify_v126_diamond.py','app/src/special-buildings.mjs','app/src/hermit.mjs','app/src/audio-rules.mjs','docs/rules/AUDIO.md']
files=set()
patterns+=['research/audio-new-*.txt','research/items-b-native-match-20261107.json','tools/audit_item_b_native.py']
for pattern in patterns:files.update(f for f in R.glob(pattern) if f.is_file() and not f.name.endswith('.snapshot.json') and not f.name.endswith('-http.log'))
manifest=[]
for f in sorted(files):
 dst=out/'evidence'/f.relative_to(R);dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dst);manifest.append(dict(file=dst.relative_to(out).as_posix(),sha256=digest(dst)))
report=dict(version='1.0.0-rc18',versionCode=49,apk=dict(file=target.name,sha256=p['sha256'],bytes=target.stat().st_size),ruleTests=tests,longGames=dict(count=24,maps=8,steps=sum(x['commands'] for x in s['sessions']),items=len(s['items']),minigames=sorted(s['minigames'])),android=a,browserBaseline=dict(version='RC17',miniScenarios=16,competitionRounds=8,scope='UI unchanged by RC18; RC18 separately verifies changed rules/audio and installed APK'),limitations=['No physical ARM phone verification','Camera and diamond scenarios cover the recorded native branches, not all possible multi-state game histories','Remaining unconfirmed audio/animation branches listed in docs/rules/AUDIO.md'],evidence=manifest)
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
(out/'SHA256SUMS.txt').write_text(p['sha256']+'  '+target.name+'\n','utf8')
(out/'README.md').write_text(f'''# RC18 连锁规则与小游戏语音修正版

覆盖安装，保留存档，不要先卸载。

- 导弹被咒语相机成功反射后消耗相机，无效目标仍保留，只反射一次。
- 全体缩小事件跳过已经缩小的角色，不再刷新或重复叠加。
- 送往监狱事件按实际地图区域判断目标，修正状态标志与位置不一致时的误判。
- 补上小游戏结算的胜者/其他角色语音。

{tests}项规则与输入回归、八地图24局长局、最终APK七个触屏场景通过。此前RC17同一套小游戏界面完成16个单人/四人触屏得分及存档恢复场景、完整八场比赛。本轮原版相机及仙人事件证据与验证范围见verification.json和evidence。

尚未穷尽任意多状态组合；部分语音与演出仍待逐场景核对；尚无实体ARM手机结果。VM版仍为RC11。
''','utf8')
print(json.dumps(dict(apk=str(target),sha256=p['sha256'],tests=tests,evidence=len(manifest)),ensure_ascii=False))
