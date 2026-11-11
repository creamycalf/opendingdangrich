# 新版地图与半格恢复修复

新PC八图直接解码至 assets/maps-v126，旧 maps 保留。新版包含59处格记录变化，rawConfig、出生点、倒霉区域、商店参数均取自新分发；八个mapElem逐字节一致后才复用既有美术。各原始地图SHA256见 research/v126-map-export.json。

新局保存mapRevision=pc-v126；旧存档缺字段按legacy加载旧图。恢复函数拒绝跨图版本，时光机快照随整份状态保留版本标记。未宣称新版EXE所有规则均已移植。

新版24局×120天压力测试发现：缩小效果到期时角色仍停半格，旧移动逻辑按完整步幅推进且容许转弯，最终落到非道路，存档恢复失败。修复为处于半格时先按当前朝向完成半步，再恢复完整步幅。此为移动端一致性修复，未声称原EXE在效果到期瞬间的时序已验证。

验证：test-results/v126-full-game-soak.json记录全部24局成功；tests/map-revision.test.mjs覆盖八图版本隔离/旧档读取；half-movement测试覆盖到期半步；旧导航oracle与相关11项测试通过。
