from pathlib import Path
import json,hashlib,shutil
root=Path.cwd();read=lambda p:json.loads((root/p).read_text('utf-8-sig'))
def archive(folder,apk,name,verification,evidence,report,readme):
 out=root/'releases'/folder;out.mkdir(exist_ok=True);v=read(verification);src=root/apk;digest=hashlib.sha256(src.read_bytes()).hexdigest();assert digest==v['sha256'];dest=out/name
 if dest.exists():assert hashlib.sha256(dest.read_bytes()).hexdigest()==digest
 else:shutil.copy2(src,dest)
 manifest=[]
 for file in evidence:
  src=root/file;assert src.exists(),file;target=out/file.replace('test-results/','').replace('docs/','').replace('/','-');shutil.copy2(src,target);manifest.append(dict(source=file,file=target.name,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
 report.update(apk=dict(file=name,sha256=digest,bytes=dest.stat().st_size),integrity=v,evidence=manifest)
 (out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');(out/'SHA256SUMS.txt').write_text(digest+'  '+name+'\n',encoding='utf8');(out/'README.md').write_text(readme,encoding='utf8');print(out)
ind=read('test-results/rc16-android-feedback.json');assert ind['passed'] and ind['apkSha256']==read('test-results/rc16-package.json')['sha256'];items=read('test-results/rc16-all-items-ui-report.json');assert items['status']=='passed' and len(items['checks'])==42
indFiles=['rc16-package.json','rc16-signature.log','rc16-android-build.log','rc16-android-feedback.json','rc16-android-clone.png','rc16-android-real-surface.png','rc16-all-rules.log','rc16-final-audio-clone-tests.log','rc16-all-items-ui-report.json','rc16-clone-arrival-ui.json','rc16-clone-second-purchase.png','rc16-touch-art.json','rc16-player-cards-640.png','rc16-player-cards-360.png','rc16-target-icons-640.png','rc16-target-icons-360.png','rc16-touch-layout.log','touch-layout/checks.json','touch-layout/360-pocket.png','touch-layout/640-arcade-paused.png','audio-rc16/playback.json','audio-rc16/scenes.json']
archive('1.0.0-rc16','app/android/app/build/outputs/apk/debug/app-debug.apk','DingdangTouch-1.0.0-rc16.apk','test-results/rc16-package.json',['test-results/'+f for f in indFiles]+['docs/audits/PC-V126-ITEMS-2026-11-06.md','docs/audits/PC-V126-ITEMS-2026-11-06.json','docs/rules/AUDIO.md'],dict(version='1.0.0-rc16',versionCode=47,status='verified feedback-fix candidate',android=ind,checks=['42 item touch use, presentation, command replay and save restore','27 responsive layout checks','long press suppresses selection/context menu; editable fields exempt','two original-map clone purchases and cold resume; clone camera','284 combined rule/input tests prior to additional audio mappings; 11 final audio/clone tests','actual audio decoding, lifecycle and 13 command-event scenarios'],limitations=['No physical ARM phone validation','42 item implementation/touch coverage is not full new-PC behavioral equivalence; audit identifies unverified cases','All original voice variants and timing are not yet proven matched','Earlier full-game/8-round competition evidence remains under RC15; this update focuses on reported feedback']),'''独立触屏版 RC16 / code47

直接覆盖安装，勿先卸载，以保留存档。

本轮：原版高频事件语音与小游戏音乐、冷加载/暂停/音量误停声修复；长按不再选择文字；口袋/道具详情/目标角色/常用操作及玩家资产增加原图/图标；分身停靠镜头与提示修复；狸猫套装自家地产租金分支修复。小游戏暂停改覆盖提示以适合短横屏。

一分为二刀的本体与分身分别结算邻地，符合条件时连续买两块，无须再掷骰；不是每次必定两次购买。已实测两次购买与第二次提示保存恢复。音频已接高频事件，但并非所有语句/时机均完全还原。42道具核对表与完整验证范围随包附上。

APK为本地测试签名，无需Winlator/联网。未在实体ARM手机验收，不称逐项完全等同PC。
''')
vm=read('test-results/vm-19-package.json');assert vm['sha256']=='e0b82d13dc8163a2d6dd1ae604814b087661060a9580acf3594fbe569c578838'
vmFiles=['vm-19-package.json','vm-19-signature.log','RC11-VM-TOUCH-REPORT.md','rc11-vm-typecheck.log','rc11-vm-engine-touch.log','rc11-vm-doraemon-touch.log','vm-touch-controls-ui.json','rc11-vm-grid-entry.json','rc11-vm-grid-before.png','rc11-vm-grid-after.png','rc11-vm-fast-run.json','rc11-vm-final-native-polls.json','rc11-vm-run-before.png','rc11-vm-run-after.png']
archive('vm-0.9-rc11','vm-app/build/outputs/apk/debug/DoraemonOriginal-debug.apk','DoraemonOriginal-0.9-rc11.apk','test-results/vm-19-package.json',['test-results/'+f for f in vmFiles],dict(version='0.9-rc11',versionCode=19,status='verified touch-fix candidate',checks=['native eight-picture selection: five real taps enter only ID2 once','120 actual alternating touches: 1390 native polls, 61 left/60 right incl Ready, zero combined mask3','P1 count 00 to 15; 42.30s neutral input after release','29 input tests; 61 browser overlay checks','engine TypeScript passed; 6 touch controls and 2 Doraemon controller tests passed'],limitations=['Android15 x86_64 emulator only, not physical ARM speed/compatibility','Focused selection/running input acceptance; not all eight games replayed on RC11','Earlier RC10 dialogue and prior saved-game/competition evidence remains historical']),'''原引擎触屏版 RC11 / code19

覆盖安装，保留原存档，无需外部Winlator。

本轮修复：快速左右点击被合并、小游戏八图标页点击无效、旧鼠标点击跨界面延迟触发、手指按下期间布局变化导致误点、多指和兼容click重复触发。

跑步小游戏请快速交替点屏幕“左/右”。已在最终APK以约7.9次/秒实际点120次，原版完整读取，P1计数00→15，没有同时左右输入或松手后持续连发。直接点第三个小游戏图标进入跑步也已验证。

本轮针对输入修复，不表示所有小游戏已再次通关或所有机型流畅。完整步骤/证据见RC11-VM-TOUCH-REPORT.md与verification.json。
''')
