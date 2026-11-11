from pathlib import Path
import json,hashlib,shutil
root=Path.cwd();apk=root/'app/android/app/build/outputs/apk/debug/app-debug.apk'
native=json.loads((root/'test-results/rc3/android-smoke-report.json').read_text());flow=json.loads((root/'test-results/pc-front/flow-ui-report.json').read_text());integrity=json.loads((root/'test-results/rc3/apk.json').read_text())
hash=hashlib.sha256(apk.read_bytes()).hexdigest();assert native['status']=='passed' and native['apkSha256']==hash and integrity['sha256']==hash;assert flow['passed'] and not flow['errors'] and len(flow['checks'])==25
out=root/'releases/1.0.0-rc3';out.mkdir(exist_ok=True);target=out/'DingdangTouch-1.0.0-rc3.apk'
if target.exists():assert hashlib.sha256(target.read_bytes()).hexdigest()==hash
else:shutil.copy2(apk,target)
(out/'SHA256.txt').write_text(hash+'  '+target.name+'\n','utf8')
(out/'验证记录.json').write_text(json.dumps(dict(version='1.0.0-rc3',versionCode=34,sha256=hash,package=integrity,android=native,flow=flow,scope='Updated UI test candidate, not a fully faithful PC port. Previous rc1 gameplay coverage is historical, not rerun on this APK.'),ensure_ascii=False,indent=2),'utf8')
(out/'安装与已知差异.txt').write_text('叮当大富翁触屏版 1.0.0-rc3（测试候选）\n\n直接安装 APK；与 rc1 同包名，可覆盖安装。先保留旧 APK，不要卸载清除存档。新游戏会替换自动存档。无需 Winlator 或开发服务器。\n\n本次改动：原版落点闪动与音效修正；原版开场/任意门/正确调色板；四玩家触摸角色选择；八图预览选择；竖屏大按钮。保留既有八图、六角色、42道具、8小游戏实现。\n\n本包完成构建、所有包内资源校验、25项浏览器流程回归、Android15模拟器安装及四项原生触摸/冷恢复检查。未在实体手机验证，本轮没有重新跑旧包全部41项原生检查。\n\n重要差异：这不是原版完全还原完成的交付。已恢复原版蓝色落点标记及77/78交替音效，数字提示为触屏辅助，部分棋盘镜头/弹窗/小游戏呈现为独立实现；选人采用原美术的响应式布局，尚无原PC实机逐场景对照。地图规则仍使用先前提取版本，尚未整体迁移到新PC包。原版五项主菜单和隐藏角色/排行榜未完整恢复，不能导入PC存档。\n\n建议测试：新游戏选人选图 → 掷骰行走 → 买地/道具 → 小游戏 → 保存返回 → 关闭后继续。安卓验证与哈希见同目录文件。\n','utf8')
print(target)

