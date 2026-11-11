from pathlib import Path
import json, hashlib, re, shutil

R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text('utf-8-sig'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

package=read('test-results/rc19-package.json')
android=read('test-results/rc19-scene-audio-android.json')
chrome=read('test-results/rc19-scene-audio-chrome.json')
items=read('test-results/rc19-android-items.json')
audio=read('test-results/audio-rc19/playback.json')
life=read('test-results/audio-rc19/music-lifecycle.json')
assert len(life['checks'])==5 and not life['errors'] and not life['diagnostics']['errors']
for report in [android,chrome,items]:assert report['passed'] and not report['errors']
assert len(android['checks'])==8 and len(chrome['checks'])==8 and len(items['checks'])==7
assert android['apkSha256']==items['apkSha256']==package['sha256']
assert not audio['errors'] and not audio['diagnostics']['errors']
log=(R/'test-results/rc19-all-rules.log').read_text('utf-8-sig')
assert re.search(r'fail 0\b',log)
tests=int(re.search(r'pass (\d+)\b',log)[1])
signature=(R/'test-results/rc19-signature.log').read_text('utf-8-sig')
previous=(R/'test-results/rc18-signature.log').read_text('utf-8-sig')
pattern=r'Signer #1 certificate SHA-256 digest: (\w+)'
assert 'Verifies' in signature and re.search(pattern,signature)[1]==re.search(pattern,previous)[1]
assert read('app/package.json')['version']=='1.0.0-rc19'
out=R/'releases/1.0.0-rc19';out.mkdir(exist_ok=True)
apk=R/'app/android/app/build/outputs/apk/debug/app-debug.apk'
assert digest(apk)==package['sha256']
target=out/'DingdangTouch-1.0.0-rc19.apk'
if target.exists():assert digest(target)==package['sha256']
else:shutil.copy2(apk,target)
patterns=[
 'test-results/rc19-*.json','test-results/rc19-*.png','test-results/rc19-all-rules.log',
 'test-results/rc19-build.log','test-results/rc19-signature.log','test-results/audio-rc19/*',
 'test-results/selection-touch-ui-report.json','docs/rules/AUDIO.md',
 'docs/audits/selection-audio-2026-11-07.json','docs/audits/v126-*audio*.json',
 'docs/audits/v126-ending-music-coverage.json','docs/audits/v126-ending-followup-rea.json',
 'docs/audits/v126-monthly-music-rea.json','research/v126-certificate*.json','research/audio-selection-v126-*.json',
 'research/v126-clone-rent-controller.json','research/audio-music-*.json',
 'tests/fixtures/v126-ending-music.json','tests/v126-ending-music.test.mjs',
 'tests/selection-audio.test.mjs','tests/selection-touch-ui.cjs','tests/scene-audio-ui.cjs',
 'tests/audio-playback-ui.cjs','tests/audio-turn-fixtures.mjs','tests/audio.test.mjs',
 'tests/audio-music-lifecycle-ui.cjs','research/audio-new-music-repeat-disassembly.txt','research/audio-old-music-repeat-wrapper.txt',
 'tools/audit_ending_music_v126.py','tools/audit_selection_audio.py',
 'app/src/main.ts','app/src/audio.ts','app/src/audio-rules.mjs',
 'app/src/selection-audio.mjs','app/src/pc-selection.ts',
 'app/package.json','app/android/app/build.gradle']
files=set()
for pattern in patterns:files.update(p for p in R.glob(pattern) if p.is_file())
manifest=[]
for p in sorted(files):
 dest=out/'evidence'/p.relative_to(R);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
 manifest.append(dict(file=dest.relative_to(out).as_posix(),sha256=digest(dest)))
report=dict(version='1.0.0-rc19',versionCode=50,
 apk=dict(file=target.name,sha256=package['sha256'],bytes=target.stat().st_size),
 ruleTests=tests,package=package,androidScenes=android,androidItems=items,chromeScenes=chrome,
 audioPlayback=audio,musicLifecycle=life,
 sourceHashes={p.name:digest(p) for p in sorted((R/'app/src').glob('*')) if p.is_file()},
 priorBaseline=dict(version='RC18',maps=8,longGames=24,commands=471034,
  scope='Prior rules baseline, not rerun as RC19. RC19 changes audio/menu integration; current regression results above.'),
 limitations=['No physical ARM phone validation','Original GAME OVER and monthly entrance animations are not yet replicated',
  'Unconfirmed hermit NPC audio and exact dialogue timing remain; this is not proof of full PC equivalence'],evidence=manifest)
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
(out/'SHA256SUMS.txt').write_text(package['sha256']+'  '+target.name+'\n','utf8')
(out/'README.md').write_text(f'''# RC19 音频与场景切换修正版

可直接覆盖安装，保留存档；不要先卸载旧版。

- 选人补上原版角色确认语音、切换/确认/返回音效。
- 地主无法收租时补上双方对话，自身免租不误播。
- 胜利、失败、小游戏计分和常规月结按原版切换音乐。
- 修正结局后“再玩一局”及小游戏重试、返回菜单的音乐切换。
- 失败和小游戏计分音乐只播放一次，自然结束后触摸不会再次播放。

{tests} 项规则/输入回归通过。最终 APK 完成 8 组场景音频触摸测试、7 组道具回归；Chrome 完成同样的 8 组场景测试及真实音频解码播放。安装包核验 20662 项资源，签名与 RC18 相同。

完整证据见 verification.json 与 evidence。原版 GAME OVER/月结开场演出、部分仙人语音仍有差异；未在实体 ARM 手机验收。VM 版仍为 RC11。
''','utf8')
print(json.dumps(dict(apk=str(target),sha256=package['sha256'],tests=tests,evidence=len(manifest)),ensure_ascii=False))
