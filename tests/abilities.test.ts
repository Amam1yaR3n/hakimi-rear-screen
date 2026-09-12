import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, Enemy } from '../src/game';
import { ID, ITEMS, SAFE, W, H, ANCHOR, CFG } from '../src/config';
function setup(...weapons: number[]) {
    const g = new Game(); g.start(); g.spawn = 1000; g.rng = () => .9;
    g.levels.fill(0); g.weapons = weapons; for (const id of weapons) g.levels[id] = 1;
    return g;
}
function enemy(g: Game, x: number, y: number, hp = 1000): Enemy {
    const e = { uid: g.nextEnemyId++, x, y, hp, max: hp, r: 17, elite: false, flash: 0, alive: true };
    g.enemies.push(e); g.grid.rebuild(g.enemies); return e;
}
function step(g: Game, seconds: number) { for (let i = 0; i < Math.round(seconds * 60); i++) g.tick(1 / 60); }
function acquire(g: Game, id: number) { g.mode = 'choice'; g.choices = [id]; g.upgrade(id); }

test('four weapon slots reject stale choices but allow all twelve passives', () => {
    const g = setup(ID.hiss, ID.gum, ID.truck, ID.aura); acquire(g, ID.paw); assert.equal(g.levels[ID.paw], 0);
    for (const [id, item] of ITEMS.entries()) if (item.kind === 'passive') acquire(g, id);
    assert.equal(g.passives.length, 12); assert.equal(g.levels[ID.revive], 0);
    assert.ok(!g.options().includes(ID.revive));
    acquire(g, ID.amount); assert.equal(g.levels[ID.amount], 2); assert.ok(!g.options().includes(ID.amount));
});
test('each new evolution requires level eight and its owned prerequisite', () => {
    for (const id of [ID.paw, ID.gum, ID.truck]) {
        const g = setup(id); g.levels[id] = 7; acquire(g, ITEMS[id].prerequisite!);
        g.rng = () => 0; g.chest(); assert.equal(g.evolved[id], false);
        g.mode = 'playing'; g.levels[id] = 8; g.chest(); assert.equal(g.evolved[id], true);
        assert.equal(g.mode, 'chest'); assert.ok(!g.options().includes(id));
    }
});
test('revive restores half maximum HP once, repels enemies and grants three seconds immunity', () => {
    const g = setup(); acquire(g, ID.revive); acquire(g, ID.health);
    const e = enemy(g, 0, 0); g.player.hp = 1; g.tick(1 / 60);
    assert.equal(g.player.hp, 60); assert.equal(g.invulnerable, 3); assert.equal(g.reviveUsed, true);
    assert.ok(Math.hypot(e.x, e.y) >= 99); assert.equal(g.mode, 'playing');
    e.x = e.y = 0; g.tick(1 / 60); assert.equal(g.player.hp, 60);
    g.player.hp = -1; g.tick(1 / 60); assert.equal(g.mode, 'over');
    assert.ok(!g.options().includes(ID.revive));
});
test('passives affect movement, XP, attraction and legacy scaling endpoints', () => {
    const g = setup(); g.levels[ID.move] = 5; g.tick(.1, { x: 1, y: 0 });
    assert.equal(g.player.x, CFG.speed * 1.5 * .1);
    g.levels[ID.xp] = 5; g.collect({ x: 0, y: 0, value: 4, chest: false }); assert.equal(g.xp, 6);
    const d = { x: g.player.x + 180, y: 0, value: 2, chest: false }; g.drops = [d];
    g.tick(.01); assert.equal(d.x, g.player.x + 180);
    g.levels[ID.pickup] = 5; g.tick(.01); assert.ok(d.x < g.player.x + 180);
    g.levels[ID.hiss] = 1; assert.equal(g.legacyLevel(ID.hiss), 1);
    g.levels[ID.hiss] = 8; assert.equal(g.legacyLevel(ID.hiss), 5);
});
test('paw chooses visible distinct targets and evolved strike repeats at the original point', () => {
    const g = setup(ID.paw); g.levels[ID.amount] = 1; g.evolved[ID.paw] = true;
    const a = enemy(g, 100, 0), b = enemy(g, -100, 0), outside = enemy(g, -500, 0);
    g.tick(1 / 60); assert.equal(g.paws.length, 2); assert.ok(g.paws.some(p => p.x > 0)); assert.ok(g.paws.some(p => p.x < 0));
    const initial = g.paws.map(p => [p.x, p.y]);
    step(g, .2); assert.equal(a.hp, 980); assert.equal(b.hp, 980);
    step(g, .15); assert.deepEqual(g.paws.slice(2).map(p => [p.x, p.y]), initial);
    step(g, .2); assert.equal(a.hp, 960); assert.equal(b.hp, 960); assert.equal(outside.hp, 1000);
});
test('attack multiplier applies to all six abilities while amount excludes aura', () => {
    for (const id of [ID.hiss, ID.aura, ID.claw, ID.paw, ID.gum, ID.truck]) {
        const hit = (attack: number) => {
            const g = setup(id); g.levels[ID.attack] = attack;
            const e = enemy(g, id === ID.gum ? 85 : 45, 0);
            if (id === ID.truck) g.trucks.push({ x: 0, y: 0, dx: 1, dy: 0, life: 4, damage: 60 * g.attack, hit: new Set() });
            g.attacks(0); if (id === ID.paw) g.attacks(.2);
            if (id === ID.hiss) { g.waves.forEach(w => g.damage(e, w.damage)); }
            return 1000 - e.hp;
        };
        assert.ok(hit(0) > 0, ITEMS[id].name); assert.equal(hit(5), hit(0) * 1.5, ITEMS[id].name);
    }
    const g = setup(ID.aura); g.levels[ID.amount] = 2; const e = enemy(g, 30, 0); g.attacks(0);
    assert.equal(e.hp, 992); assert.equal(g.pending.length, 0);
});
test('amount appends alternating swipes and distinct-target sonic waves', () => {
    const g = setup(ID.hiss, ID.claw); g.levels[ID.amount] = 2;
    enemy(g, 60, 0); enemy(g, -70, 0); g.attacks(0);
    assert.equal(g.waves.length, 1); assert.equal(g.slashDirection, 1);
    g.attacks(.15); assert.equal(g.waves.length, 2); assert.equal(g.slashDirection, -1);
    assert.notEqual(g.waves[0].angle, g.waves[1].angle);
    g.attacks(.15); assert.equal(g.waves.length, 3); assert.equal(g.slashDirection, 1);
});
test('gum respects per-projectile cooldown, duration, downtime, speed and permanent evolution', () => {
    const g = setup(ID.gum); const e = enemy(g, 85, 0); g.attacks(0); assert.equal(e.hp, 992);
    g.attacks(0); assert.equal(e.hp, 992); g.time = .35; g.attacks(0); assert.equal(e.hp, 984);
    const base = setup(ID.gum), faster = setup(ID.gum); faster.levels[ID.duration] = 5; faster.levels[ID.projectileSpeed] = 5;
    base.attacks(.1); faster.attacks(.1); assert.equal(faster.gumLife, base.gumLife * 1.5); assert.equal(faster.gumAngle, base.gumAngle * 1.5);
    base.attacks(3); assert.equal(base.gums.length, 0); assert.equal(base.cd[ID.gum], 1.5);
    base.attacks(1.5); assert.equal(base.gums.length, 1);
    base.evolved[ID.gum] = true; base.attacks(20); assert.equal(base.gums.length, 1);
    base.levels[ID.amount] = 2; base.attacks(0); assert.equal(base.gums.length, 3);
});
test('four truck directions start outside the playable frame and keep their world routes', () => {
    for (let side = 0; side < 4; side++) {
        const g = setup(ID.truck); g.rng = () => (side + .1) / 4; g.attacks(0);
        const t = g.trucks[0]; assert.equal(g.trucks.length, 1);
        if (side === 0) assert.ok(t.x + ANCHOR.x + 75 < 0);
        if (side === 1) assert.ok(t.x + ANCHOR.x - 75 > W);
        if (side === 2) assert.ok(t.y + ANCHOR.y + 75 < 0);
        if (side === 3) assert.ok(t.y + ANCHOR.y - 75 > H);
        const e = enemy(g, 0, 0, 1000); const x = t.x, y = t.y;
        g.player.x += 200; g.player.y += 150;
        for (let i = 0; i < 120; i++) g.attacks(1 / 60);
        assert.ok(Math.abs(t.x - x - t.dx * 720) < 1e-6); assert.ok(Math.abs(t.y - y - t.dy * 720) < 1e-6);
        assert.equal(e.hp, 940); assert.equal(t.hit.size, 1);
        for (let i = 0; i < 121; i++) g.attacks(1 / 60); assert.equal(g.trucks.length, 0);
    }
});
test('truck convoy quantity, speed, duration and pooled enemy identity', () => {
    const g = setup(ID.truck); g.evolved[ID.truck] = true; g.levels[ID.amount] = 2; g.levels[ID.duration] = 5; g.levels[ID.projectileSpeed] = 5;
    g.attacks(0); assert.equal(g.trucks[0].life, 6); const t = g.trucks[0], x = t.x, y = t.y;
    g.attacks(.1); assert.equal(Math.hypot(t.x - x, t.y - y), 54);
    for (let i = 0; i < 16; i++) g.attacks(.1); assert.equal(g.trucks.length, 3);
    const e = enemy(g, t.x, t.y, 1000); g.attacks(0); assert.equal(e.hp, 940);
    const oldUid = e.uid; g.enemies = []; g.pool.push(e); g.spawnEnemy(); const reused = g.enemies[0];
    assert.equal(reused, e); assert.notEqual(reused.uid, oldUid);
    reused.x = t.x; reused.y = t.y; reused.hp = 1000; g.grid.rebuild(g.enemies); g.attacks(0); assert.equal(reused.hp, 940);
});
test('details freezes all attack timers and positions', () => {
    const g = setup(ID.paw, ID.gum, ID.truck); enemy(g, 100, 0); g.attacks(0); g.invulnerable = 3;
    const snapshot = () => JSON.stringify({ time: g.time, paws: g.paws, trucks: g.trucks, gums: g.gums, pending: g.pending.map(p => p.delay), cd: g.cd, life: g.gumLife, invulnerable: g.invulnerable });
    const before = snapshot(); g.mode = 'details'; g.tick(10); assert.equal(snapshot(), before);
});
test('ten-minute evolved new-ability build keeps effects bounded and numeric state finite', () => {
    const g = setup(ID.paw, ID.gum, ID.truck); g.spawn = 0;
    for (const id of g.weapons) { g.levels[id] = 8; g.evolved[id] = true; }
    for (const [id, item] of ITEMS.entries()) if (item.kind === 'passive') { g.passives.push(id); g.levels[id] = item.maxLevel; }
    let peakTrucks = 0, peakPending = 0;
    for (let i = 0; i < 36001 && g.mode !== 'over'; i++) {
        g.player.hp = g.maxHP; g.mode = 'playing';
        g.tick(1 / 60, { x: Math.cos(i / 180) * .7, y: Math.sin(i / 180) * .7 });
        peakTrucks = Math.max(peakTrucks, g.trucks.length); peakPending = Math.max(peakPending, g.pending.length);
        assert.ok(g.trucks.every(t => Number.isFinite(t.x) && Number.isFinite(t.y)));
    }
    assert.equal(g.won, true); assert.ok(peakTrucks <= 15); assert.ok(peakPending < 40); assert.equal(g.gums.length, 6);
});

test('chests use exact tier thresholds, only owned items, and repeated upgrades', () => {
    for (const [roll, count] of [[0,1],[.6999,1],[.7,3],[.9499,3],[.95,5],[.999,5]]) {
        const g = setup(ID.hiss); g.rng = () => roll; g.chest();
        assert.equal(g.chestRewards.length,count); assert.equal(g.levels[ID.hiss],1+count);
        assert.deepEqual(g.weapons,[ID.hiss]); assert.deepEqual(g.passives,[]);
        assert.ok(g.chestRewards.every(r=>r.id===ID.hiss)); assert.deepEqual(g.choices,[]);
        const rewards = JSON.stringify(g.chestRewards); g.chest(); assert.equal(JSON.stringify(g.chestRewards),rewards);
        g.advanceChest(); assert.equal(g.mode,'chest'); assert.equal(g.chestAge,g.chestDuration);
        g.advanceChest(); assert.equal(g.mode,'playing'); assert.equal(g.levels[ID.hiss],1+count);
    }
});
test('one chest can finish a weapon, evolve it, and fill exhausted rewards with healing', () => {
    const g=setup(ID.hiss); g.levels[ID.hiss]=7; g.passives=[ID.cooldown]; g.levels[ID.cooldown]=5;
    g.rng=()=>.99; g.player.hp=1; g.chest();
    assert.deepEqual(g.chestRewards.map(r=>r.kind),['upgrade','evolution','heal','heal','heal']);
    assert.equal(g.player.hp,91); assert.equal(g.evolved[ID.hiss],true);
    const time=g.time, x=g.player.x; g.tick(10,{x:1,y:1}); assert.equal(g.time,time); assert.equal(g.player.x,x);
    assert.equal(g.mode,'chest'); g.xp=g.need; g.advanceChest(); assert.equal(g.mode,'choice');
});
test('multiple evolutions take priority and full-health compensation stays capped', () => {
    const g=setup(ID.hiss,ID.aura); g.weapons.forEach(i=>g.levels[i]=8);
    g.passives=[ID.cooldown,ID.recovery]; g.passives.forEach(i=>g.levels[i]=5); g.rng=()=>.99;
    g.chest(); assert.deepEqual(g.chestRewards.map(r=>r.kind),['evolution','evolution','heal','heal','heal']);
    assert.equal(g.player.hp,g.maxHP);
});
test('ordinary truck ignores maximum projectile quantity', () => {
    const g=setup(ID.truck); g.levels[ID.amount]=2; g.summonTrucks();
    assert.equal(g.trucks.length,1); assert.equal(g.pending.length,0); assert.match(g.description(ID.truck),/^1 辆车/);
});

test('attack range has five levels and expands each of the six abilities', () => {
    for (const id of [ID.hiss,ID.aura,ID.claw,ID.paw,ID.gum,ID.truck]) {
        const hit = (range: number) => {
            const g=setup(id); g.levels[ID.range]=range; g.rng=()=>0;
            if(id===ID.hiss) { enemy(g,140,0); g.attacks(0); return g.waves.length; }
            if(id===ID.aura) { const e=enemy(g,90,0); g.attacks(0); return 1000-e.hp; }
            if(id===ID.claw) { const e=enemy(g,70,65); g.swipe(1); return 1000-e.hp; }
            if(id===ID.paw) { enemy(g,0,0); const e=enemy(g,55,0); g.attacks(0); g.attacks(.18); return 1000-e.hp; }
            if(id===ID.gum) { const e=enemy(g,130,0); g.attacks(0); return 1000-e.hp; }
            const e=enemy(g,0,55); g.cd[ID.truck]=100;
            g.trucks=[{x:0,y:0,dx:1,dy:0,life:4,damage:60,hit:new Set()}];g.attacks(0);return 1000-e.hp;
        };
        assert.equal(hit(0),0,ITEMS[id].name);assert.ok(hit(5)>0,ITEMS[id].name);
    }
    const g=setup();for(let i=0;i<6;i++)acquire(g,ID.range);
    assert.equal(g.levels[ID.range],5);assert.equal(g.attackRange,1.5);assert.ok(!g.options().includes(ID.range));
});
test('expanded trucks still spawn entirely outside all four screen edges', () => {
    for(let side=0;side<4;side++){
        const g=setup(ID.truck);g.levels[ID.range]=5;g.rng=()=>(side+.1)/4;g.summonTrucks();const t=g.trucks[0],radius=75*g.attackRange;
        assert.ok(side===0?t.x+ANCHOR.x+radius<0:side===1?t.x+ANCHOR.x-radius>W:side===2?t.y+ANCHOR.y+radius<0:t.y+ANCHOR.y-radius>H);
    }
});
test('late enemies grow faster while utility drops fall to one quarter without changing experience drops', () => {
    assert.equal(CFG.enemyHP(0),18); assert.ok(CFG.enemyHP(540)>18*(1+540/60)*2);
    assert.ok(CFG.enemySpeed(540)>100);assert.ok(CFG.enemySpeed(540,true)>100);
    assert.ok(CFG.enemyDamage(540)>20);assert.ok(CFG.spawnInterval(540)<.09);
    assert.equal(CFG.itemDrops.heal+CFG.itemDrops.magnet+CFG.itemDrops.bomb,.0175);
    for(const [roll,kind] of [[.00874,'heal'],[CFG.itemDrops.heal,'magnet'],[CFG.itemDrops.heal+CFG.itemDrops.magnet,'bomb'],[.0175,undefined]] as const){
        const g=setup();g.rng=()=>roll;const e=enemy(g,0,0,1);g.damage(e,2);
        assert.equal(g.drops.filter(d=>d.kind).length,kind?1:0);if(kind)assert.equal(g.drops[1].kind,kind);
        assert.equal(g.drops[0].value,2);
    }
});
