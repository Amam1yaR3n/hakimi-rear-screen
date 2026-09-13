const ENDLESS_START = 360;
const endlessGrowth = (t: number) => 1 + Math.max(0, t - ENDLESS_START) / 120;
export const W = 904, H = 572, SAFE = 271.2, ANCHOR = { x: 588, y: 330 };
export const ELITE_HISS = {
    firstDelay: 4, chaseDuration: 5, recovery: .6, damageMultiplier: 1.5,
    circle: { radius: 240, windup: 2.2, halfAngle: Math.PI },
    cone: { radius: 520, windup: 1.8, halfAngle: 35 * Math.PI / 180 },
} as const;
export const CFG = { duration: ENDLESS_START, speed: 142, pickup: 52, ricePickup: 110, baseHP: 100, enemyCap: 420, spawnInterval: (t: number) => Math.max(.065, .55 - t * .0015), enemyHP: (t: number) => 18 * (1 + t / 45) * (1 + .8 * (t / 600) ** 2) * endlessGrowth(t), xpNeed: (level: number) => Math.round(7 + level * 2.5), contactDamage: 12, enemySpeed: (t: number, elite = false) => (elite ? 52 + Math.min(60, t * .1) : 42 + Math.min(70, t * .12)) * Math.sqrt(endlessGrowth(t)), enemyDamage: (t: number) => 12 * (1 + Math.max(0, t - 180) / 420) * endlessGrowth(t), itemDrops: { heal: .00525, magnet: .002, bomb: .0015 } };
export type Item = { name: string; short: string; color: string; desc: string; kind: 'weapon' | 'passive'; maxLevel: number; upgrades?: string[]; evo?: string; prerequisite?: number };
export const ID = { hiss: 0, aura: 1, claw: 2, cooldown: 3, recovery: 4, health: 5, paw: 6, gum: 7, truck: 8, attack: 9, amount: 10, revive: 11, move: 12, xp: 13, pickup: 14, duration: 15, projectileSpeed: 16, range: 17, ear: 18, chicken: 19, luck: 20, bean: 21, honey: 22, mambo: 23 } as const;
export const ITEMS: Item[] = [
    { name: '哈气', short: '气', color: '#badd6c', desc: '瞄准最近敌人释放扇形声波', kind: 'weapon', maxLevel: 8, evo: '哈气永动机', prerequisite: ID.cooldown },
    { name: '老吴光环', short: '环', color: '#b8a4e5', desc: '持续灼伤身边的敌人', kind: 'weapon', maxLevel: 8, evo: '老吴结界', prerequisite: ID.recovery },
    { name: '基米挠', short: '挠', color: '#ee9773', desc: '横向挥爪，扫开近处敌人', kind: 'weapon', maxLevel: 8, evo: '超级基米挠', prerequisite: ID.health },
    { name: '冷却缩减', short: '冷', color: '#deded0', desc: '每级减少 8% 攻击冷却', kind: 'passive', maxLevel: 5 },
    { name: '生命恢复', short: '愈', color: '#e5a7bf', desc: '每级每秒恢复 0.35 生命', kind: 'passive', maxLevel: 5 },
    { name: '心心容器', short: '心', color: '#e87864', desc: '每级增加 20 最大生命', kind: 'passive', maxLevel: 5 },
    { name: '小白手套', short: '爪', color: '#f4f1e8', desc: '白色猫爪从天而降，范围拍击', kind: 'weapon', maxLevel: 8, evo: '小白连环拍', prerequisite: ID.amount },
    { name: '口香糖', short: '糖', color: '#efa9ca', desc: '糖块绕身旋转，接触造成伤害', kind: 'weapon', maxLevel: 8, evo: '永恒口香糖', prerequisite: ID.duration },
    { name: '大运', short: '运', color: '#86c6db', desc: '召唤大卡车，撞击沿途敌人', kind: 'weapon', maxLevel: 8, evo: '大运车队', prerequisite: ID.attack },
    { name: '攻击力', short: '攻', color: '#eaa57b', desc: '伤害每级＋10%，叮咚鸡除外', kind: 'passive', maxLevel: 5 },
    { name: '子弹数量', short: '多', color: '#e7cc7d', desc: '数量＋1，光环、大运、叮咚鸡、曼波除外', kind: 'passive', maxLevel: 2 },
    { name: '复活', short: '生', color: '#eabed6', desc: '一次半血复活，三秒无敌', kind: 'passive', maxLevel: 0 },
    { name: '速度', short: '速', color: '#afd58c', desc: '移动速度及蜂蜜海移动、成长每级＋10%', kind: 'passive', maxLevel: 5 },
    { name: '经验加成', short: '经', color: '#ddd48c', desc: '每级获取经验增加 10%', kind: 'passive', maxLevel: 5 },
    { name: '吸取范围', short: '吸', color: '#a6d8cc', desc: '每级吸取范围增加 20%', kind: 'passive', maxLevel: 5 },
    { name: '持续时间', short: '时', color: '#b7b7e1', desc: '糖块、卡车、猫耳、蜂蜜、曼波持续＋10%', kind: 'passive', maxLevel: 5 },
    { name: '子弹速度', short: '飞', color: '#9bbce1', desc: '糖块、卡车、猫耳、绿豆速度及蜂蜜海成长＋10%', kind: 'passive', maxLevel: 5 },
    { name: '攻击范围', short: '范', color: '#b1d6a3', desc: '范围每级＋10%，叮咚鸡除外', kind: 'passive', maxLevel: 5 },
    { name: '妙脆角', short: '耳', color: '#c9b69a', desc: '旋转猫耳向上抛射，穿透沿途敌人', kind: 'weapon', maxLevel: 8, evo: '妙脆角·满天脆', prerequisite: ID.attack },
    { name: '叮咚鸡', short: '鸡', color: '#f1ce75', desc: '突脸清屏，概率保留本次击杀掉落', kind: 'weapon', maxLevel: 8, evo: '叮咚鸡·开饭', prerequisite: ID.luck },
    { name: '幸运', short: '幸', color: '#98cf8b', desc: '提高道具掉率、多项宝箱与双倍小米概率', kind: 'passive', maxLevel: 5 },
    { name: '南北绿豆', short: '豆', color: '#a4d277', desc: '瞄准最近敌人，逐颗发射穿透绿豆', kind: 'weapon', maxLevel: 8, evo: '南北绿豆机关炮', prerequisite: ID.cooldown,
      upgrades: ['自动瞄准，发射绿豆', '每批数量＋1', '批次间隔－0.1秒', '伤害＋10', '每批数量＋1', '可命中敌人数＋1', '每批数量＋1', '伤害＋10，间隔－0.1秒'] },
    { name: '蜂蜜', short: '蜜', color: '#edbd58', desc: '蜂蜜罐落地留下持续伤害的蜂蜜池', kind: 'weapon', maxLevel: 8, evo: '蜂蜜海', prerequisite: ID.pickup,
      upgrades: ['落罐生成蜂蜜池', '数量＋1，基础半径＋20%', '伤害＋10，持续＋0.5秒', '数量＋1，基础半径＋20%', '伤害＋10，持续＋0.5秒', '数量＋1，基础半径＋20%', '伤害＋5', '伤害＋5，基础半径＋20%'] },
    { name: '曼波', short: '♪', color: '#c5a3e8', desc: '纵向音波贯穿敌群，持续跟随角色', kind: 'weapon', maxLevel: 8, evo: '超级曼波', prerequisite: ID.duration,
      upgrades: ['释放纵向音符波', '宽度＋40像素', '持续＋0.5秒，间隔＋0.75秒', '宽度＋10，伤害＋10', '持续＋0.5秒，间隔＋0.75秒', '宽度＋10，伤害＋10', '持续＋0.5秒，间隔＋0.75秒', '宽度＋10，伤害＋10'] },
];
export const EVOLUTION_PASSIVE = ITEMS.map(item => item.prerequisite ?? -1);
