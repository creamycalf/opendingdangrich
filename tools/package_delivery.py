"""Publish a local candidate only after matching APK, device and content checks."""
from pathlib import Path
import hashlib,json,re,shutil,datetime
root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text(encoding='utf-8-sig'))
package=read('app/package.json');version=package['version']
apk=root/'app/android/app/build/outputs/apk/debug/app-debug.apk'
digest=hashlib.sha256(apk.read_bytes()).hexdigest()
integrity=read('test-results/apk-1.0.0-rc1.json')
native=read('test-results/android-smoke-report.json')
offline=read('test-results/android-offline-report.json')
flow=read('test-results/flow-ui-report.json')
items=read('test-results/all-items-ui-report.json')
soak=read('test-results/full-game-soak.json')
atlas=read('test-results/sprite-atlas.json')
historyUi=read('test-results/time-history-ui-report.json')
assert all(r['status']=='passed' and r['apkSha256']==digest for r in (native,offline))
assert integrity['sha256']==digest and integrity['sizeBytes']==apk.stat().st_size
assert flow['passed'] and not flow['errors'] and len(flow['checks'])==25
assert items['status']=='passed' and len(items['checks'])==42 and not items['errors']
assert soak['status']=='passed' and len(soak['sessions'])==24
tap=(root/'test-results/node-rules28-final.tap').read_text(encoding='utf-8-sig')
passed=int(re.search(r'^# pass (\d+)$',tap,re.M)[1]);assert passed>=175 and re.search(r'^# fail 0$',tap,re.M)
assert not native['errors'] and not offline['errors']
assert len(native['checks'])>=41
assert atlas['spritesVerified']==9501
assert historyUi['status']=='passed' and not historyUi['errors']
out=root/'releases'/version;out.mkdir(exist_ok=True)
destination=out/f'DingdangTouch-{version}.apk'
if destination.exists():assert hashlib.sha256(destination.read_bytes()).hexdigest()==digest,'Refuse to overwrite a different delivery'
else:shutil.copy2(apk,destination)
assert hashlib.sha256(destination.read_bytes()).hexdigest()==digest
shutil.copy2(root/'docs/DELIVERY-INSTRUCTIONS.md',out/'安装与测试说明.md')
if native.get('continuation'):
    for name in (native['continuation']['priorReport'],'android-pose-input-trace.json'):
        shutil.copy2(root/'test-results'/name,out/name)
(out/'SHA256.txt').write_text(f'{digest}  {destination.name}\n',encoding='utf8')
report={
 'version':version,'versionCode':32,'ruleset':'town-flow-28','status':'complete-content-test-candidate',
 'builtAndValidatedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'apk':destination.name,'sha256':digest,'sizeBytes':apk.stat().st_size,
 'content':{'maps':8,'characters':6,'usableItems':42,'playableMinigames':8},
 'packageIntegrity':integrity,'nativeAndroid':native,'offlineColdStart':offline,
 'unitTestsPassed':passed,'touchFlow':flow,'allItemsTouch':items,
 'fullGames':{'sessions':len(soak['sessions']),'daysPerSession':120,'actions':sum(s['commands'] for s in soak['sessions']),'allResultsPassed':True,'minigames':soak['minigames']},
 'losslessAtlas':atlas,'timeMachineTouch':historyUi,
 'limitations':['Android 15 emulator verified; physical phone not yet tested.','Independent engine: AI weights and seeded RNG differ from PC.','Touch UI, camera and some animation sequencing adapted; not frame-exact EXE equivalence.','PC saves cannot be imported.','Mobile autosave preserves the six time-machine checkpoints across app restarts; triggering time travel clears them as in the PC game.'],
 'distribution':'Local test APK with workspace debug signature; not uploaded or publicly published.'
}
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
validation=f'''# Android 交付测试验证

1.0.0-rc1 / versionCode 32 / town-flow-28，2026-11-03。交付目录为 `releases/{version}`。APK为独立引擎和原作资源的本地打包，不依赖Winlator或开发服务器。

最终离线验证所安装的包与交付APK的SHA-256相同：`{digest}`。大小{apk.stat().st_size:,}字节。包内{integrity['bundledFilesVerified']:,}个文件与构建资源逐一一致，六角色资源及八图读取通过。

完整原生回归、离线测试与交付文件使用同一APK哈希。

## 实际设备范围

使用专用Android 15 / API35 x86_64模拟器emulator-5580，屏幕320×640。按钮和道路目标通过ADB原生触摸，CDP读取游戏状态并设置部分新局下拉框；规则隔离场景会注入确定性存档。尚未在用户实体手机验证，模拟器结果不等同于所有安卓设备兼容。

## 最终包结果

原生回归{len(native['checks'])}项通过，页面异常0。包括启动安全区、连续五次存档读取、原音频与后台暂停、库存、先掷骰后走路、岔路与电脑回合、事务回放、强制停止后继续、横竖屏、八地图、月初发放和效果到期；攻击、道路、分身、搬迁、特殊建筑等道具触摸及动画；两张综合地图特殊区域出入；时光机六槽回溯、回溯后冷启动与继续行动；八款小游戏带历史存档的实际触摸得分、暂停、精确冷启动续玩、正常结束和发奖返回。

模仿动作首轮自动检查因反复测量按钮和读取整份历史而错过操作时机；缓存按钮位置、缩小观察数据后，在同一APK上完成剩余两项验收。未更改游戏代码或APK。原39项通过记录和点击轨迹随包保留，详情见verification.json的continuation字段。

另将模拟器置于飞行模式并关闭Wi-Fi/移动数据，系统确认没有默认网络。从启动命令到确认主菜单可用记录为{offline['startupMs']}毫秒（包含测试连接开销），触摸继续后与磁盘存档完全一致，{offline['loadedSprites']}幅棋盘精灵及音乐可用。测试后恢复模拟器原网络设置。

## 其他交叉验证

- Node回归{passed}项通过，浏览器完整触屏流程25项通过。
- 42件道具逐件触屏使用、原动画、暂停和回放/保存核验通过。
- 八图×三组角色共24局120天自动对局，{report['fullGames']['actions']:,}次行动均正常结算，覆盖六角色、八小游戏及40种AI道具。
- 9501幅角色、道具、道路动画精灵合并为八张图集；全部RGBA像素与原始PNG逐一相等，修复数千请求拖慢启动的问题。

详细检查项及绑定APK哈希见 `releases/{version}/verification.json`。该验证说明功能覆盖和测试范围，不宣称原EXE逐指令或逐帧完全一致。AI、随机数、触屏镜头、PC存档与手机历史续存的差异见安装说明。
'''
(root/'docs/ANDROID-VALIDATION.md').write_text(validation,encoding='utf8')
shutil.copy2(root/'docs/ANDROID-VALIDATION.md',out/'验证记录.md')
print(json.dumps({'directory':str(out),'apk':str(destination),'sha256':digest,'nativeChecks':len(native['checks'])},ensure_ascii=False,indent=2))
