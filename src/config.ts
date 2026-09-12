export const W = 904, H = 572, SAFE = 271.2, ANCHOR = { x: 588, y: 330 };
export const CFG = { duration: 600, speed: 142, pickup: 52, ricePickup: 110, baseHP: 100, enemyCap: 420, spawnInterval: (t: number) => Math.max(.09, .55 - t * .0013), enemyHP: (t: number) => 18 * (1 + t / 60), xpNeed: (level: number) => Math.round(7 + level * 2.5), contactDamage: 12 };
export const ITEMS = [
    { name: '哈气', short: '气', color: '#badd6c', desc: '瞄准最近敌人释放扇形声波', evo: '哈气永动机' },
    { name: '老吴光环', short: '环', color: '#b8a4e5', desc: '持续灼伤身边的敌人', evo: '老吴结界' },
    { name: '基米挠', short: '挠', color: '#ee9773', desc: '横向挥爪，扫开近处敌人', evo: '超级基米挠' },
    { name: '白手套', short: '套', color: '#deded0', desc: '每级减少 8% 攻击冷却' },
    { name: '口香糖', short: '糖', color: '#e5a7bf', desc: '每级每秒恢复 0.35 生命' },
    { name: '心心容器', short: '心', color: '#e87864', desc: '每级增加 20 最大生命' },
];
export const EVOLUTION_PASSIVE = [3, 4, 5];
