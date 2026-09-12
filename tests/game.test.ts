import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game';
import { ITEMS, ID } from '../src/config';
test('choice uniqueness, limits and ownership', () => { const g = new Game(); g.start(); for (let k = 0; k < 150; k++) {
    g.offer();
    if (g.mode === 'choice') {
        assert.equal(new Set(g.choices).size, g.choices.length);
        g.upgrade(g.choices[0]);
    }
} assert.equal(g.options().length, 0); for (const id of [...g.weapons, ...g.passives]) assert.equal(g.levels[id], ITEMS[id].maxLevel); assert.equal(g.weapons.length, 4); assert.equal(g.passives.length, 12); g.player.hp = 1; g.offer(); assert.equal(g.player.hp, 31); });
test('three evolutions use owned slot order, passive level one, and are final', () => { const g = new Game(); g.start(); g.rng = () => 0; g.weapons = [0, 2, 1]; g.levels = ITEMS.map((_, i) => i < 3 ? 8 : i < 6 ? 1 : 0); g.passives = [3, 4, 5]; for (const expected of [0, 2, 1]) {
    g.chest();
    assert.equal(g.lastEvolution, expected);
    assert.equal(g.mode, 'chest');
    g.mode = 'playing';
} assert.ok([0, 1, 2].every(i => g.evolved[i])); assert.ok(g.options().every(i => ![0, 1, 2].includes(i))); });
test('unqualified chest offers upgrades and paused states freeze simulation', () => { const g = new Game(); g.start(); g.chest(); assert.equal(g.mode, 'chest'); for (const mode of ['choice', 'paused', 'details', 'evolution', 'chest'] as const) {
    g.mode = mode;
    g.tick(10, { x: 1, y: 1 });
    assert.equal(g.time, 0);
    assert.equal(g.player.x, 0);
} });
test('minutes 1–9 spawn once; minute 10 wins without spawning', () => { const g = new Game(); g.start(); for (let i = 1; i <= 9; i++) {
    g.time = i * 60 - .01;
    g.tick(.02);
    assert.equal(g.eliteMinute, i);
    assert.equal(g.enemies.filter(e => e.elite).length, i);
} g.time = 599.99; g.tick(.02); assert.equal(g.mode, 'over'); assert.equal(g.won, true); assert.equal(g.eliteMinute, 9); });
test('death, experience overflow and max health upgrades', () => { const g = new Game(); g.start(); g.player.hp = -1; g.tick(.01); assert.equal(g.mode, 'over'); g.start(); g.xp = 100; g.checkLevel(); assert.equal(g.mode, 'choice'); g.choices = [5]; g.upgrade(5); assert.equal(g.maxHP, 120); assert.equal(g.player.hp, 120); assert.equal(g.mode, 'choice'); });
test('accelerated ten-minute stress simulation preserves caps and finite positions', () => { const g = new Game(); g.start(); g.levels = ITEMS.map((item, i) => item.kind === 'passive' || i < 3 ? item.maxLevel : 0); g.evolved = ITEMS.map((_, i) => i < 3); g.passives = ITEMS.flatMap((item, i) => item.kind === 'passive' ? [i] : []); g.weapons = [0, 1, 2]; let peak = 0; for (let i = 0; i < 36001 && g.mode !== 'over'; i++) {
    g.player.hp = g.maxHP;
    if (g.mode !== 'playing')
        g.mode = 'playing';
    g.tick(1 / 60, { x: Math.cos(i / 180) * .7, y: Math.sin(i / 180) * .7 });
    peak = Math.max(peak, g.enemies.length);
    assert.ok(Number.isFinite(g.player.x));
} assert.equal(g.won, true); assert.ok(peak <= 429); });
test('aimed sonic cone hits multiple enemies once and excludes enemies behind', () => {
    const g = new Game(); g.start(); g.spawn = 100; g.rng = () => .9;
    const enemy = (x: number, y: number) => ({ uid: g.nextEnemyId++, x, y, hp: 100, max: 100, r: 17, elite: false, flash: 0, alive: true });
    const front = enemy(65, 0), side = enemy(95, 40), behind = enemy(-100, 0);
    g.enemies = [front, side, behind];
    for (let i = 0; i < 30; i++) g.tick(1 / 60);
    assert.equal(front.hp, 91); assert.equal(side.hp, 91); assert.equal(behind.hp, 100);
    assert.ok(g.numbers.length > 0);
});
test('pickups heal, attract all rice and bomb only visible enemies', () => {
    const g = new Game(); g.start(); g.rng = () => .9; g.player.hp = 80;
    g.collect({ x: 0, y: 0, chest: false, value: 0, kind: 'heal' }); assert.equal(g.player.hp, 100);
    const rice = { x: 2500, y: 0, chest: false, value: 4, attracted: false };
    g.drops = [rice]; g.collect({ x: 0, y: 0, chest: false, value: 0, kind: 'magnet' }); assert.equal(rice.attracted, true);
    const enemy = (x: number) => ({ uid: g.nextEnemyId++, x, y: 0, hp: 100, max: 100, r: 17, elite: true, flash: 0, alive: true });
    const visible = enemy(100), outside = enemy(1000), underCamera = enemy(-500);
    g.enemies = [visible, outside, underCamera];
    g.collect({ x: 0, y: 0, chest: false, value: 0, kind: 'bomb' });
    assert.equal(visible.alive, false); assert.equal(outside.alive, true); assert.equal(underCamera.alive, true);
    g.enemies = []; g.spawn = 100;
    for (let i = 0; i < 180; i++) g.tick(1 / 60);
    assert.equal(g.xp, 4); assert.equal(g.drops.includes(rice), false);
});
test('enemy drop rolls include all three items', () => {
    for (const [roll, kind] of [[.004, 'heal'], [.01, 'magnet'], [.015, 'bomb']] as const) {
        const g = new Game(); g.rng = () => roll; g.spawnEnemy(); g.damage(g.enemies[0], 1000);
        assert.ok(g.drops.some(d => d.kind === kind));
    }
});
