import { CFG, ANCHOR, W, H, SAFE, ITEMS, ID, ELITE_HISS } from './config';
export type Mode = 'ready' | 'playing' | 'paused' | 'details' | 'choice' | 'evolution' | 'chest' | 'over';
export type EliteHiss = {
    phase: 'chase' | 'windup' | 'recovery';
    kind: 'circle' | 'cone';
    remaining: number;
    x: number;
    y: number;
    angle: number;
};
export type Enemy = {
    hiss?: EliteHiss;
    slowUntil?: number;
    uid: number;
    x: number;
    y: number;
    hp: number;
    max: number;
    r: number;
    elite: boolean;
    flash: number;
    alive: boolean;
};
export type Drop = {
    x: number;
    y: number;
    chest: boolean;
    value: number;
    kind?: 'heal' | 'magnet' | 'bomb' | 'spinosaurus';
    attracted?: boolean;
};
export type Wave = { x: number; y: number; radius: number; maxRadius: number; angle: number; halfAngle: number; damage: number; hit: Set<number> };
export type DamageNumber = { x: number; y: number; value: number; life: number };
export type Ear = { x: number; y: number; vx: number; vy: number; gravity: number; life: number; angle: number; radius: number; damage: number; hit: Set<number> };
export type Bean = { x: number; y: number; vx: number; vy: number; life: number; radius: number; damage: number; pierce: number; hit: Set<number> };
export type HoneyPool = { x: number; y: number; fall: number; life: number; radius: number; initialRadius: number; damage: number; evolved: boolean; speed: number; hits: Map<number, number> };
export type MamboWave = { life: number; width: number; damage: number; evolved: boolean; hits: Map<number, number> };
export const CHICKEN_IMPACT = .18, CHICKEN_DURATION = .45;
export const SLASH_DURATION = .32;
export class SpatialGrid {
    cells = new Map<string, Enemy[]>();
    size = 80;
    rebuild(enemies: Enemy[]) { for (const c of this.cells.values())
        c.length = 0; for (const e of enemies) {
        if (!e.alive)
            continue;
        const key = `${Math.floor(e.x / this.size)},${Math.floor(e.y / this.size)}`;
        let a = this.cells.get(key);
        if (!a)
            this.cells.set(key, a = []);
        a.push(e);
    } if (this.cells.size > 2000)
        for (const [k, v] of this.cells)
            if (!v.length)
                this.cells.delete(k); }
    query(x: number, y: number, r: number) { const out: Enemy[] = []; for (let i = Math.floor((x - r) / 80); i <= Math.floor((x + r) / 80); i++)
        for (let j = Math.floor((y - r) / 80); j <= Math.floor((y + r) / 80); j++)
            for (const e of this.cells.get(`${i},${j}`) ?? [])
                if (e.alive && Math.hypot(e.x - x, e.y - y) < r + e.r)
                    out.push(e); return out; }
}
export class Game {
    mode: Mode = 'ready';
    time = 0;
    player = { x: 0, y: 0, hp: 100 };
    level = 1;
    xp = 0;
    kills = 0;
    levels: number[] = ITEMS.map((_, i) => i === ID.hiss ? 1 : 0);
    evolved = ITEMS.map(() => false);
    weapons = [0];
    passives: number[] = [];
    enemies: Enemy[] = [];
    pool: Enemy[] = [];
    drops: Drop[] = [];
    waves: Wave[] = [];
    numbers: DamageNumber[] = [];
    ears: Ear[] = [];
    beans: Bean[] = [];
    honeyPools: HoneyPool[] = [];
    mamboWaves: MamboWave[] = [];
    honeyAngle = 0;
    chicken: { age: number; evolved: boolean; settled: boolean } | null = null;
    bombFlash = 0;
    spinosaurusUntil = 0;
    intimidationWave: { x: number; y: number; startedAt: number } | null = null;
    get spinosaurusActive() { return this.time < this.spinosaurusUntil; }
    grid = new SpatialGrid();
    choices: number[] = [];
    spawn = 0;
    eliteMinute = 0;
    cd = ITEMS.map(() => 0);
    nextEnemyId = 1;
    reviveUsed = false;
    pending: { delay: number; run: () => void }[] = [];
    paws: { x: number; y: number; radius: number; age: number; angle: number }[] = [];
    trucks: { x: number; y: number; dx: number; dy: number; life: number; damage: number; hit: Set<number> }[] = [];
    gums: { x: number; y: number; hits: Map<number, number> }[] = [];
    gumLife = 0;
    gumAngle = 0;
    invulnerable = 0;
    slash = 0;
    slashDirection = 1;
    chestRewards: { id: number; kind: 'upgrade' | 'evolution' | 'heal'; level: number }[] = [];
    chestAge = 0;
    get chestDuration() { return this.chestRewards.length === 5 ? 4.8 : this.chestRewards.length === 3 ? 3.2 : 1.4; }
    advanceChest() {
        if (this.mode !== 'chest') return;
        if (this.chestAge < this.chestDuration) this.chestAge = this.chestDuration;
        else { this.mode = 'playing'; this.checkLevel(); }
    }
    lastEvolution = 0;
    won = false;
    onEffect = (_kind: string, _x: number, _y: number) => { };
    onSound = (s: string) => { };
    rng = () => Math.random();
    get maxHP() { return CFG.baseHP + this.levels[ID.health] * 20; }
    get need() { return CFG.xpNeed(this.level); }
    get cooldown() { return 1 - this.levels[ID.cooldown] * .08; }
    get attack() { return 1 + this.levels[ID.attack] * .1; }
    get amount() { return this.levels[ID.amount]; }
    get attackRange() { return 1 + this.levels[ID.range] * .1; }
    get hissRange() { return (105 + (this.legacyLevel(ID.hiss) - 1) * 6 + (this.evolved[ID.hiss] ? 12 : 0)) * this.attackRange; }
    get auraRange() { return (55 + this.legacyLevel(ID.aura) * 9) * (this.evolved[ID.aura] ? 1.25 : 1) * this.attackRange; }
    get auraDamage() { return (5 + this.legacyLevel(ID.aura) * 3) * 1.25 * (this.evolved[ID.aura] ? 1.2 : 1) * this.attack; }
    get duration() { return 1 + this.levels[ID.duration] * .1; }
    get projectileSpeed() { return 1 + this.levels[ID.projectileSpeed] * .1; }
    get luck() { return this.levels[ID.luck]; }
    get chickenCooldown() { return (this.evolved[ID.chicken] ? 30 : 60 - 3 * (this.levels[ID.chicken] - 1)) * this.cooldown; }
    get chickenRetention() { return .3 + .05 * (this.levels[ID.chicken] - 1); }
    get earStats() {
        const l = this.levels[ID.ear], evolved = this.evolved[ID.ear];
        return { damage: (evolved ? 110 : 30 + 8 * (l - 1)) * this.attack,
            count: (evolved ? 8 : 1 + Math.floor((l - 1) / 2)) + this.amount,
            interval: (evolved ? 2.3 : 3 - .1 * (l - 1)) * this.cooldown,
            life: (evolved ? 3 : 2 + .1 * (l - 1)) * this.duration,
            radius: (evolved ? 20 : 14) * this.attackRange,
            speed: (evolved ? 230 : 260) * this.projectileSpeed };
    }
    get beanStats() {
        const l = this.levels[ID.bean], e = this.evolved[ID.bean];
        return { damage: (e ? 30 : 10 + (l >= 4 ? 10 : 0) + (l >= 8 ? 10 : 0)) * this.attack,
            count: (e ? 4 : 1 + Number(l >= 2) + Number(l >= 5) + Number(l >= 7)) + this.amount,
            interval: (e ? .4 : 1.2 - (l >= 3 ? .1 : 0) - (l >= 8 ? .1 : 0)) * this.cooldown,
            speed: (e ? 840 : 420) * this.projectileSpeed, radius: 5 * this.attackRange, pierce: e || l >= 6 ? 2 : 1, life: 3 };
    }
    get honeyStats() {
        const l = this.levels[ID.honey], e = this.evolved[ID.honey];
        return { damage: (e ? 40 : 10 + 10 * Number(l >= 3) + 10 * Number(l >= 5) + 5 * Number(l >= 7) + 5 * Number(l >= 8)) * this.attack,
            count: (e ? 4 : 1 + Number(l >= 2) + Number(l >= 4) + Number(l >= 6)) + this.amount,
            interval: 5 * this.cooldown,
            life: (e ? 4 : 2 + .5 * Number(l >= 3) + .5 * Number(l >= 5)) * this.duration,
            radius: (e ? 56 : 28 * (1 + .2 * (Number(l >= 2) + Number(l >= 4) + Number(l >= 6) + Number(l >= 8)))) * this.attackRange,
            speed: e ? 1 + this.levels[ID.projectileSpeed] * .1 + this.levels[ID.move] * .1 : 0 };
    }
    get mamboStats() {
        const l = this.levels[ID.mambo], e = this.evolved[ID.mambo], stages = Number(l >= 3) + Number(l >= 5) + Number(l >= 7);
        return { damage: (e ? 40 : 10 + 10 * (Number(l >= 4) + Number(l >= 6) + Number(l >= 8))) * this.attack,
            width: (e ? 160 : 40 + 40 * Number(l >= 2) + 10 * (Number(l >= 4) + Number(l >= 6) + Number(l >= 8))) * this.attackRange,
            life: (e ? 3 : .5 + .5 * stages) * this.duration, interval: (e ? 3 : 2 + .75 * stages) * this.cooldown };
    }
    nearestEnemy() { return this.enemies.filter(e => e.alive).sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y))[0]; }
    fireBean() {
        const target = this.nearestEnemy(); if (!target) return;
        const s = this.beanStats, angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
        this.beans.push({ ...s, x: this.player.x, y: this.player.y, vx: Math.cos(angle) * s.speed, vy: Math.sin(angle) * s.speed, hit: new Set() });
        if (this.beans.length > 120) this.beans.shift();
    }
    summonHoney() {
        const s = this.honeyStats, evolved = this.evolved[ID.honey];
        for (let i = 0; i < s.count; i++) this.schedule(i * .3, () => {
            const target = s.count < 4 && i === 0 ? this.nearestEnemy() : undefined;
            const angle = this.honeyAngle; this.honeyAngle = (angle + Math.PI * 2 / Math.max(4, s.count)) % (Math.PI * 2);
            this.honeyPools.push({ x: target?.x ?? this.player.x + Math.cos(angle) * 140, y: target?.y ?? this.player.y + Math.sin(angle) * 140,
                fall: .35, life: s.life, radius: s.radius, initialRadius: s.radius, damage: s.damage, evolved, speed: s.speed, hits: new Map() });
            const cap = this.evolved[ID.honey] ? 30 : 20;
            if (this.honeyPools.length > cap) this.honeyPools.shift();
        });
    }
    summonMambo() { const s = this.mamboStats; this.mamboWaves.push({ ...s, evolved: this.evolved[ID.mambo], hits: new Map() }); }
    updateNewAbilities(dt: number) {
        for (const bean of this.beans) {
            const step = Math.min(dt, bean.life), x = bean.x, y = bean.y, dx = bean.vx * step, dy = bean.vy * step, length2 = dx * dx + dy * dy;
            bean.x += dx; bean.y += dy; bean.life -= dt;
            // Resolve swept hits in travel order so the nearest collision consumes penetration first.
            const hits = this.enemies.filter(e => e.alive && !bean.hit.has(e.uid)).map(e => {
                const t = length2 ? Math.max(0, Math.min(1, ((e.x - x) * dx + (e.y - y) * dy) / length2)) : 0;
                return { e, t, distance: Math.hypot(e.x - x - dx * t, e.y - y - dy * t) };
            }).filter(h => h.distance <= h.e.r + bean.radius).sort((a, b) => a.t - b.t);
            for (const { e } of hits) {
                bean.hit.add(e.uid); this.damage(e, bean.damage);
                if (--bean.pierce === 0) { bean.life = 0; break; }
            }
        }
        this.beans = this.beans.filter(b => b.life > 0);
        for (const pool of this.honeyPools) {
            let step = dt;
            if (pool.fall > 0) { const falling = Math.min(step, pool.fall); pool.fall = Math.max(0, pool.fall - falling); step -= falling; if (pool.fall > 1e-9) continue; pool.fall = 0; }
            step = Math.min(step, pool.life);
            if (pool.evolved) {
                const dx = this.player.x - pool.x, dy = this.player.y - pool.y, distance = Math.hypot(dx, dy);
                if (distance > 0) {
                    const travel = Math.min(distance, 35 * pool.speed * step);
                    pool.x += dx / distance * travel; pool.y += dy / distance * travel;
                    pool.radius = Math.min(pool.initialRadius * 2, pool.radius + pool.initialRadius * .25 * pool.speed * (travel / (35 * pool.speed)));
                }
            }
            for (const [uid, until] of pool.hits) if (until <= this.time + 1e-9) pool.hits.delete(uid);
            for (const e of this.grid.query(pool.x, pool.y, pool.radius)) if (!pool.hits.has(e.uid)) {
                this.damage(e, pool.damage); pool.hits.set(e.uid, this.time + .5);
            }
            pool.life -= step;
        }
        this.honeyPools = this.honeyPools.filter(p => p.life > 1e-9);
        for (const wave of this.mamboWaves) {
            for (const [uid, until] of wave.hits) if (until <= this.time + 1e-9) wave.hits.delete(uid);
            for (const e of this.enemies) if (e.alive && Math.abs(e.x - this.player.x) <= wave.width / 2 + e.r && e.y + e.r >= this.player.y - ANCHOR.y && e.y - e.r <= this.player.y + H - ANCHOR.y && !wave.hits.has(e.uid)) {
                this.damage(e, wave.damage); wave.hits.set(e.uid, this.time + 1);
                if (wave.evolved) e.slowUntil = this.time + 2;
            }
            wave.life -= dt;
        }
        this.mamboWaves = this.mamboWaves.filter(w => w.life > 1e-9);
    }
    legacyLevel(id: number) { return 1 + 4 * (this.levels[id] - 1) / 7; }
    owns(id: number) { return this.weapons.includes(id) || this.passives.includes(id); }
    start() { const sound = this.onSound, effect = this.onEffect; Object.assign(this, new Game()); this.onSound = sound; this.onEffect = effect; this.onEffect('reset', 0, 0); this.mode = 'playing'; }
    options() { return ITEMS.flatMap((item, i) => {
        if (item.maxLevel === 0) return this.owns(i) ? [] : [i];
        if (this.evolved[i] || this.levels[i] >= item.maxLevel) return [];
        return item.kind === 'weapon' && !this.owns(i) && this.weapons.length >= 4 ? [] : [i];
    }); }
    offer() { const options = this.options(); if (!options.length) {
        this.player.hp = Math.min(this.maxHP, this.player.hp + 30); return;
    }
    if (this.weapons.length < 4) {
        // Favor abilities modestly until all four active slots are occupied.
        this.choices = [];
        while (options.length && this.choices.length < 3) {
            const weights = options.map(id => ITEMS[id].kind === 'weapon' ? 1.5 : 1);
            let roll = this.rng() * weights.reduce((sum, weight) => sum + weight, 0);
            let index = 0;
            while (index < options.length - 1 && roll >= weights[index]) roll -= weights[index++];
            this.choices.push(options.splice(index, 1)[0]);
        }
    } else {
        for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
        this.choices = options.slice(0, 3);
    }
    this.mode = 'choice'; this.onSound('level'); }
    upgrade(id: number) {
        if (this.mode !== 'choice' || !this.choices.includes(id) || !this.options().includes(id)) return;
        this.applyUpgrade(id);
        this.mode = 'playing'; this.checkLevel();
    }
    applyUpgrade(id: number) {
        if (!this.owns(id)) (ITEMS[id].kind === 'weapon' ? this.weapons : this.passives).push(id);
        if (ITEMS[id].maxLevel) this.levels[id]++;
        if (id === ID.chicken) this.triggerChicken();
        if (id === ID.health) this.player.hp += 20;
    }
    checkLevel() { if (this.mode !== 'playing')
        return; if (this.xp >= this.need) {
        this.xp -= this.need;
        this.level++;
        this.offer();
    } }
    chest() {
        if (this.mode !== 'playing') return;
        const roll = this.rng(), count = roll < (70 - 4 * this.luck) / 100 ? 1 : roll < (95 - this.luck) / 100 ? 3 : 5;
        this.chestRewards = []; this.chestAge = 0; this.choices = [];
        for (let slot = 0; slot < count; slot++) {
            const evolution = this.weapons.find(i => this.levels[i] === ITEMS[i].maxLevel && !this.evolved[i] && this.owns(ITEMS[i].prerequisite!));
            if (evolution !== undefined) {
                this.evolved[evolution] = true; this.lastEvolution = evolution;
                if (evolution === ID.chicken) this.triggerChicken();
                this.chestRewards.push({ id: evolution, kind: 'evolution', level: this.levels[evolution] });
                continue;
            }
            const pool = this.options().filter(i => this.owns(i));
            if (pool.length) {
                const id = pool[Math.floor(this.rng() * pool.length)]; this.applyUpgrade(id);
                this.chestRewards.push({ id, kind: 'upgrade', level: this.levels[id] });
            } else {
                this.player.hp = Math.min(this.maxHP, this.player.hp + 30);
                this.chestRewards.push({ id: ID.recovery, kind: 'heal', level: 0 });
            }
        }
        this.mode = 'chest'; this.onSound(count === 5 ? 'evolve' : 'chest');
    }
    spawnEnemy(elite = false) { if (!elite && this.enemies.length >= CFG.enemyCap)
        return; const side = Math.floor(this.rng() * 4); let x = -ANCHOR.x - 45, y = -ANCHOR.y - 45; if (side === 0 || side === 1) {
        x += this.rng() * (W + 90);
        y = side === 0 ? y : H - ANCHOR.y + 45;
    }
    else {
        y += this.rng() * (H + 90);
        x = side === 2 ? x : W - ANCHOR.x + 45;
    } const hp = CFG.enemyHP(this.time) * (elite ? 12 : 1); const e = this.pool.pop() ?? {} as Enemy; Object.assign(e, { uid: this.nextEnemyId++, x: this.player.x + x, y: this.player.y + y, hp, max: hp, r: elite ? 27 : 17, elite, flash: 0, alive: true, slowUntil: 0,
        hiss: elite ? { phase: 'chase', kind: 'circle', remaining: ELITE_HISS.firstDelay, x: 0, y: 0, angle: 0 } : undefined }); this.enemies.push(e); }
    hurtPlayer(amount: number) {
        if (this.invulnerable > 0) return;
        this.player.hp -= amount;
        this.invulnerable = .55;
        this.onSound('hurt');
    }
    private eliteHissHits(hiss: EliteHiss) {
        const shape = ELITE_HISS[hiss.kind], playerRadius = 17;
        const dx = this.player.x - hiss.x, dy = this.player.y - hiss.y;
        const distance = Math.hypot(dx, dy);
        if (distance > shape.radius + playerRadius) return false;
        if (hiss.kind === 'circle' || distance <= playerRadius) return true;
        const angle = Math.atan2(dy, dx) - hiss.angle;
        if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) <= shape.halfAngle) return true;
        // Outside the angular span, only the two finite radial edges can overlap the player.
        return [-shape.halfAngle, shape.halfAngle].some(offset => {
            const ux = Math.cos(hiss.angle + offset), uy = Math.sin(hiss.angle + offset);
            const along = Math.max(0, Math.min(shape.radius, dx * ux + dy * uy));
            return Math.hypot(dx - along * ux, dy - along * uy) <= playerRadius;
        });
    }
    private advanceEliteHisses(dt: number) {
        for (const e of this.enemies) {
            const hiss = e.hiss;
            if (!e.alive || !e.elite || !hiss) continue;
            hiss.remaining -= dt;
            if (hiss.remaining > 0) continue;
            if (hiss.phase === 'chase') {
                hiss.phase = 'windup';
                hiss.remaining = ELITE_HISS[hiss.kind].windup;
                hiss.x = e.x; hiss.y = e.y;
                hiss.angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
            } else if (hiss.phase === 'windup') {
                hiss.phase = 'recovery';
                hiss.remaining = ELITE_HISS.recovery;
                this.onSound('eliteHiss');
                if (this.eliteHissHits(hiss)) this.hurtPlayer(CFG.enemyDamage(this.time) * ELITE_HISS.damageMultiplier);
            } else {
                hiss.phase = 'chase';
                hiss.kind = hiss.kind === 'circle' ? 'cone' : 'circle';
                hiss.remaining = ELITE_HISS.chaseDuration;
            }
        }
    }
    damage(e: Enemy, n: number, rewards = true, riceMultiplier = 1) { if (!e.alive)
        return; e.hp -= n; this.onEffect(e.hp <= 0 ? 'kill' : 'hit', e.x, e.y); e.flash = .1; this.numbers.push({ x: e.x, y: e.y - e.r, value: Math.round(n), life: .7 });
        if (this.numbers.length > 180) this.numbers.shift(); if (e.hp <= 0) {
        e.alive = false;
        e.hiss = undefined;
        this.kills++;
        if (e.elite) this.drops.push({ x: e.x, y: e.y, chest: true, value: 0 });
        if (!rewards) return;
        if (!e.elite) {
            const doubled = this.luck > 0 && this.rng() < this.luck / 10;
            this.drops.push({ x: e.x, y: e.y, chest: false, value: 2 * riceMultiplier * (doubled ? 2 : 1) });
        }
        const roll = this.rng(), dropMultiplier = 1 + .2 * this.luck;
        // Round cumulative base odds before scaling to keep exact tier boundaries stable.
        const magnetThreshold = Number((CFG.itemDrops.heal + CFG.itemDrops.magnet).toFixed(8));
        const bombThreshold = Number((magnetThreshold + CFG.itemDrops.bomb).toFixed(8));
        // Keep the new form's odds tied to the Xiaomi orb, including luck.
        const spinosaurusThreshold = Number((bombThreshold + CFG.itemDrops.magnet).toFixed(8));
        const kind = roll < CFG.itemDrops.heal * dropMultiplier ? 'heal' : roll < magnetThreshold * dropMultiplier ? 'magnet' : roll < bombThreshold * dropMultiplier ? 'bomb' : roll < spinosaurusThreshold * dropMultiplier ? 'spinosaurus' : undefined;
        if (kind) this.drops.push({ x: e.x + 12, y: e.y, chest: false, value: 0, kind });
    } }
    collect(d: Drop) {
        this.onEffect(d.kind ?? (d.chest ? 'chest' : 'xp'), d.x, d.y);
        if (!d.kind && !d.chest) this.onSound('pickup');
        if (d.kind === 'heal') this.player.hp = Math.min(this.maxHP, this.player.hp + 30);
        else if (d.kind === 'magnet') {
            for (const drop of this.drops) if (!drop.chest && !drop.kind) drop.attracted = true;
        } else if (d.kind === 'bomb') {
            this.bombFlash = .45;
            for (const e of this.enemies) {
                const x = e.x - this.player.x + ANCHOR.x, y = e.y - this.player.y + ANCHOR.y;
                if (x + e.r >= SAFE && x - e.r <= W && y + e.r >= 0 && y - e.r <= H) this.damage(e, e.elite ? e.max * .5 : e.hp);
            }
        } else if (d.kind === 'spinosaurus') {
            this.spinosaurusUntil = this.time + 10;
            this.intimidationWave = { x: this.player.x, y: this.player.y, startedAt: this.time };
        } else if (d.chest) this.chest();
        else this.xp += d.value * (1 + this.levels[ID.xp] * .1);
        if (d.kind) this.onSound('chest');
    }
    schedule(delay: number, run: () => void) { if (delay <= 0) run(); else this.pending.push({ delay, run }); }
    visibleEnemies() { return this.enemies.filter(e => e.alive && e.x - this.player.x + ANCHOR.x >= SAFE && e.x - this.player.x + ANCHOR.x <= W && e.y - this.player.y + ANCHOR.y >= 0 && e.y - this.player.y + ANCHOR.y <= H); }
    pawStrike(x: number, y: number, radius: number, damage: number, angle = 0) {
        this.paws.push({ x, y, radius, age: 0, angle });
        // Give the falling paw a brief, readable wind-up before impact.
        this.schedule(.18, () => { for (const e of this.grid.query(x, y, radius)) this.damage(e, damage); this.onSound('hit'); });
    }
    hiss(angle: number) {
        const l = this.legacyLevel(ID.hiss);
        this.waves.push({ x: this.player.x, y: this.player.y, radius: 0, maxRadius: this.hissRange, angle, halfAngle: (32 + (l - 1) * 2 + (this.evolved[ID.hiss] ? 3 : 0)) * Math.PI / 180, damage: (6 + l * 3) * this.attack, hit: new Set() });
        this.onSound('hit');
    }
    swipe(direction: number) {
        this.slashDirection = direction; this.slash = SLASH_DURATION;
        for (const e of this.grid.query(this.player.x, this.player.y, 135 * this.attackRange)) {
            if ((e.x - this.player.x) * direction < -20 * this.attackRange || Math.abs(e.y - this.player.y) >= 52 * this.attackRange) continue;
            const crit = this.evolved[ID.claw] && this.rng() < .4;
            this.damage(e, (17 + this.legacyLevel(ID.claw) * 10) * this.attack * (crit ? 2 : 1));
            if (crit) this.player.hp = Math.min(this.maxHP, this.player.hp + 3);
        }
    }
    summonTrucks() {
        const side = Math.floor(this.rng() * 4), dx = side === 0 ? 1 : side === 1 ? -1 : 0, dy = side === 2 ? 1 : side === 3 ? -1 : 0;
        const x = this.player.x + (side === 0 ? -ANCHOR.x - 90 * this.attackRange : side === 1 ? W - ANCHOR.x + 90 * this.attackRange : 0);
        const y = this.player.y + (side === 2 ? -ANCHOR.y - 90 * this.attackRange : side === 3 ? H - ANCHOR.y + 90 * this.attackRange : 0);
        const count = (this.evolved[ID.truck] ? 3 : 1);
        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * 76 * this.attackRange;
            this.trucks.push({ x: x - dy * offset, y: y + dx * offset, dx, dy, life: 4 * this.duration, damage: (60 + 15 * (this.levels[ID.truck] - 1)) * this.attack, hit: new Set() });
        }
    }
    summonEars() {
        const stats = this.earStats, evolved = this.evolved[ID.ear];
        for (let i = 0; i < stats.count; i++) {
            const angle = evolved ? -Math.PI / 2 + i * Math.PI * 2 / stats.count
                : -Math.PI / 2 + (stats.count === 1 ? 0 : (i / (stats.count - 1) - .5) * Math.PI / 2);
            this.ears.push({ x: this.player.x, y: this.player.y, vx: Math.cos(angle) * stats.speed,
                vy: Math.sin(angle) * stats.speed, gravity: evolved ? 0 : 300,
                life: stats.life, angle, radius: stats.radius, damage: stats.damage, hit: new Set() });
        }
    }
    triggerChicken() {
        this.chicken = { age: 0, evolved: this.evolved[ID.chicken], settled: false };
        this.cd[ID.chicken] = this.chickenCooldown;
    }
    updateChicken(dt: number) {
        const chicken = this.chicken;
        if (!chicken) return;
        chicken.age += dt;
        if (!chicken.settled && chicken.age >= CHICKEN_IMPACT) {
            chicken.settled = true;
            const rewards = chicken.evolved || this.rng() < this.chickenRetention;
            for (const e of this.enemies) {
                const x = e.x - this.player.x + ANCHOR.x, y = e.y - this.player.y + ANCHOR.y;
                if (e.alive && x + e.r >= SAFE && x - e.r <= W && y + e.r >= 0 && y - e.r <= H)
                    this.damage(e, e.elite ? e.max * .3 : e.hp, rewards, chicken.evolved ? 2 : 1);
            }
            this.onSound('evolve');
        }
        if (chicken.age >= CHICKEN_DURATION) {
            if (chicken.evolved) for (const d of this.drops) if (!d.chest && !d.kind) d.attracted = true;
            this.chicken = null;
        }
    }
    attacks(dt: number) {
        this.updateChicken(dt);
        if (this.levels[ID.chicken] && this.cd[ID.chicken] <= dt && !this.chicken) {
            this.chicken = { age: 0, evolved: this.evolved[ID.chicken], settled: false };
            this.cd[ID.chicken] = this.chickenCooldown + dt;
        }
        if (this.levels[ID.ear] && this.cd[ID.ear] <= dt) {
            this.summonEars(); this.cd[ID.ear] = this.earStats.interval + dt;
        }
        for (const ear of this.ears) {
            const step = Math.min(dt, ear.life), oldX = ear.x, oldY = ear.y;
            ear.x += ear.vx * step; ear.y += ear.vy * step + ear.gravity * step * step / 2;
            ear.vy += ear.gravity * step; ear.life -= dt; ear.angle += step * 9;
            const dx = ear.x - oldX, dy = ear.y - oldY, length2 = dx * dx + dy * dy;
            // Swept collision includes enemy radius and prevents fast ears skipping targets.
            for (const e of this.enemies) {
                if (!e.alive || ear.hit.has(e.uid)) continue;
                const t = length2 ? Math.max(0, Math.min(1, ((e.x - oldX) * dx + (e.y - oldY) * dy) / length2)) : 0;
                if (Math.hypot(e.x - oldX - dx * t, e.y - oldY - dy * t) <= ear.radius + e.r) {
                    ear.hit.add(e.uid); this.damage(e, ear.damage);
                }
            }
        }
        this.ears = this.ears.filter(ear => ear.life > 0);
        for (const p of this.paws) p.age += dt;
        this.paws = this.paws.filter(p => p.age < .55);
        const due = this.pending; this.pending = [];
        for (const p of due) { p.delay -= dt; if (p.delay <= 1e-9) p.run(); else this.pending.push(p); }
        for (const id of this.weapons) this.cd[id] -= dt;
        this.updateNewAbilities(dt);
        if (this.levels[ID.bean] && this.cd[ID.bean] <= 1e-9) {
            if (this.nearestEnemy()) for (let i = 0; i < this.beanStats.count; i++) this.schedule(i * .1, () => this.fireBean());
            this.cd[ID.bean] = this.beanStats.interval;
        }
        if (this.levels[ID.honey] && this.cd[ID.honey] <= 1e-9) { this.summonHoney(); this.cd[ID.honey] = this.honeyStats.interval; }
        if (this.levels[ID.mambo] && this.cd[ID.mambo] <= 1e-9) { this.summonMambo(); this.cd[ID.mambo] = this.mamboStats.interval; }
        if (this.levels[ID.hiss] && this.cd[ID.hiss] <= 0) {
            const l = this.legacyLevel(ID.hiss);
            const targets = this.grid.query(this.player.x, this.player.y, this.hissRange).sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y));
            if (targets.length) {
                for (let i = 0; i <= this.amount; i++) { const e = targets[i % targets.length], angle = Math.atan2(e.y - this.player.y, e.x - this.player.x); this.schedule(i * .15, () => this.hiss(angle)); }
                this.cd[ID.hiss] = (this.evolved[ID.hiss] ? .38 : Math.max(.5, 1.1 - l * .1)) * this.cooldown;
            }
        }
        if (this.levels[ID.aura] && this.cd[ID.aura] <= 0) {
            const targets = this.grid.query(this.player.x, this.player.y, this.auraRange);
            for (const e of targets) this.damage(e, this.auraDamage);
            if (this.evolved[ID.aura] && targets.length) this.player.hp = Math.min(this.maxHP, this.player.hp + 1.5);
            this.cd[ID.aura] = .55 * this.cooldown;
        }
        if (this.levels[ID.claw] && this.cd[ID.claw] <= 0) {
            const targets = this.grid.query(this.player.x, this.player.y, 135 * this.attackRange).sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y));
            if (targets.length) {
                const dir = targets[0].x < this.player.x ? -1 : 1;
                for (let i = 0; i <= this.amount; i++) this.schedule(i * .15, () => this.swipe(i % 2 ? -dir : dir));
                this.cd[ID.claw] = 1.15 * this.cooldown;
            }
        }
        if (this.levels[ID.paw] && this.cd[ID.paw] <= 0) {
            const all = this.visibleEnemies(), available = [...all], l = this.levels[ID.paw];
            if (all.length) {
                for (let i = 0; i < 1 + Math.floor((l - 1) / 2) + this.amount; i++) {
                    if (!available.length) available.push(...all);
                    const e = available.splice(Math.floor(this.rng() * available.length), 1)[0], x = e.x, y = e.y, radius = (30 + 3 * (l - 1)) * this.attackRange, damage = (20 + 5 * (l - 1)) * this.attack;
                    this.pawStrike(x, y, radius, damage);
                    if (this.evolved[ID.paw]) this.schedule(.35, () => this.pawStrike(x, y, radius, damage, Math.PI / 4));
                }
                this.cd[ID.paw] = (4 - .2 * (l - 1)) * this.cooldown;
            }
        }
        if (this.levels[ID.truck] && this.cd[ID.truck] <= 0) {
            this.summonTrucks(); this.cd[ID.truck] = (10 - .5 * (this.levels[ID.truck] - 1)) * this.cooldown;
        }
        for (const t of this.trucks) {
            const step = Math.min(dt, t.life) * 360 * this.projectileSpeed;
            const oldX = t.x, oldY = t.y; t.x += t.dx * step; t.y += t.dy * step; t.life -= dt;
            // Swept rectangle prevents tunnelling and uses the same oriented body as rendering.
            for (const e of this.grid.query((oldX + t.x) / 2, (oldY + t.y) / 2, step / 2 + 90 * this.attackRange)) {
                const ex = e.x - (oldX + t.x) / 2, ey = e.y - (oldY + t.y) / 2;
                if (Math.abs(ex * t.dx + ey * t.dy) > 75 * this.attackRange + step / 2 + e.r || Math.abs(-ex * t.dy + ey * t.dx) > 32.5 * this.attackRange + e.r || t.hit.has(e.uid)) continue;
                t.hit.add(e.uid); this.damage(e, t.damage);
                if (!e.hiss || e.hiss.phase === 'chase') { e.x += t.dx * 45; e.y += t.dy * 45; }
            }
        }
        this.trucks = this.trucks.filter(t => t.life > 0);
        if (this.levels[ID.gum]) {
            if (this.gums.length && !this.evolved[ID.gum]) {
                this.gumLife -= dt;
                if (this.gumLife <= 0) { this.gums = []; this.cd[ID.gum] = 1.5 * this.cooldown; }
            }
            if (!this.gums.length && this.cd[ID.gum] <= 0) {
                this.gums = Array.from({ length: 1 + Math.floor((this.levels[ID.gum] - 1) / 2) + this.amount }, () => ({ x: this.player.x, y: this.player.y, hits: new Map() }));
                this.gumLife = (3 + .25 * (this.levels[ID.gum] - 1)) * this.duration;
            }
            // Permanent gum also receives later quantity upgrades without resetting hit cooldowns.
            if (this.evolved[ID.gum] && this.gums.length) {
                const count = 1 + Math.floor((this.levels[ID.gum] - 1) / 2) + this.amount;
                while (this.gums.length < count) this.gums.push({ x: this.player.x, y: this.player.y, hits: new Map() });
            }
            this.gumAngle = (this.gumAngle + dt * Math.PI * 2 * this.projectileSpeed) % (Math.PI * 2);
            this.gums.forEach((gum, i) => {
                const a = this.gumAngle + i * Math.PI * 2 / this.gums.length;
                gum.x = this.player.x + Math.cos(a) * 85 * this.attackRange; gum.y = this.player.y + Math.sin(a) * 85 * this.attackRange;
                for (const [uid, until] of gum.hits) if (until <= this.time) gum.hits.delete(uid);
                for (const e of this.grid.query(gum.x, gum.y, 12 * this.attackRange)) if (!gum.hits.has(e.uid)) {
                    this.damage(e, (8 + 2 * (this.levels[ID.gum] - 1)) * this.attack); gum.hits.set(e.uid, this.time + .35);
                }
            });
        }
    }
    description(id: number) {
        const l = this.levels[id], fmt = (n: number) => Number(n.toFixed(2));
        if (id === ID.revive) return this.reviveUsed ? '已消耗 · 本局不再获得' : '半血复活一次 · 三秒无敌';
        const passive: Record<number, string> = {
            [ID.range]: `攻击范围（叮咚鸡除外） +${l * 10}%`, [ID.cooldown]: `攻击冷却 −${l * 8}%`, [ID.recovery]: `每秒恢复 ${fmt(l * .35)} 生命`, [ID.health]: `最大生命 +${l * 20}`,
            [ID.attack]: `伤害（叮咚鸡除外） +${l * 10}%`, [ID.amount]: `攻击数量 +${l}（光环、大运、叮咚鸡、曼波除外）`, [ID.move]: `移动速度 / 蜂蜜海移动与成长 +${l * 10}%`, [ID.xp]: `经验获取 +${l * 10}%`, [ID.pickup]: `吸取范围 +${l * 20}%`, [ID.duration]: `糖块 / 卡车 / 猫耳 / 蜂蜜 / 曼波持续 +${l * 10}%`, [ID.projectileSpeed]: `糖块转速 / 卡车车速 / 猫耳速度 / 绿豆速度 / 蜂蜜海移动与成长 +${l * 10}%`,
        };
        if (id === ID.luck) return `道具掉率 +${l * 20}% · 三项/五项宝箱 ${25 + l * 3}%/${5 + l}% · 双倍小米 ${l * 10}%`;
        if (ITEMS[id].kind === 'passive') return passive[id];
        if (id === ID.bean) { const s = this.beanStats; return `${s.count}颗/批 · 伤害${fmt(s.damage)} · 间隔${fmt(s.interval)}秒 · 每颗命中${s.pierce}敌 · 速度${fmt(s.speed)} · 半径${fmt(s.radius)} · 寿命3秒 · 持续时间无效`; }
        if (id === ID.honey) { const s = this.honeyStats; return `${s.count}罐/批 · 每0.5秒伤害${fmt(s.damage)} · 间隔${fmt(s.interval)}秒 · 持续${fmt(s.life)}秒 · 半径${fmt(s.radius)} · ${this.evolved[id] ? '向角色汇聚并扩大至两倍；子弹速度、移动速度增强成长' : '固定地面；子弹速度、移动速度无效'} · 无减速；吸取范围仅为进化条件`; }
        if (id === ID.mambo) { const s = this.mamboStats; return `每1秒伤害${fmt(s.damage)} · 宽度${fmt(s.width)} · 持续${fmt(s.life)}秒 · 间隔${fmt(s.interval)}秒 · ${this.evolved[id] ? '减速50%持续2秒，刷新不叠加；' : ''}数量、子弹速度无效`; }
        if (id === ID.ear) { const s = this.earStats; return `${s.count} 枚${this.evolved[id] ? '径向' : '抛射'}猫耳 · 伤害 ${fmt(s.damage)} · 间隔 ${fmt(s.interval)} 秒 · 寿命 ${fmt(s.life)} 秒 · 半径 ${fmt(s.radius)} · 初速 ${fmt(s.speed)} · 每枚每敌命中一次`; }
        if (id === ID.chicken) return `间隔 ${fmt(this.chickenCooldown)} 秒 · 普通秒杀 / 精英最大生命30% · ${this.evolved[id] ? '稳定掉落、小米×2，结束吸取全部小米' : `整次保留掉落 ${fmt(this.chickenRetention * 100)}%`} · 保留已有物品和精英宝箱 · 仅冷却加成`;
        if (id === ID.paw) return `${1 + Math.floor((l - 1) / 2) + this.amount} 次落爪 · 伤害 ${fmt((20 + 5 * (l - 1)) * this.attack)} · 间隔 ${fmt((4 - .2 * (l - 1)) * this.cooldown)} 秒${this.evolved[id] ? ' · 先竖直、再左下45°二连拍，范围一致' : ''}`;
        if (id === ID.gum) return `${1 + Math.floor((l - 1) / 2) + this.amount} 块糖 · 伤害 ${fmt((8 + 2 * (l - 1)) * this.attack)} · ${this.evolved[id] ? '永久环绕' : `持续 ${fmt((3 + .25 * (l - 1)) * this.duration)} 秒`}`;
        if (id === ID.truck) return `${this.evolved[id] ? '3 辆车并排' : '1 辆车'} · 伤害 ${fmt((60 + 15 * (l - 1)) * this.attack)} · 间隔 ${fmt((10 - .5 * (l - 1)) * this.cooldown)} 秒`;
        const k = this.legacyLevel(id);
        return id === ID.aura ? `每 ${fmt(.55 * this.cooldown)} 秒造成 ${fmt(this.auraDamage)} 伤害 · 半径 ${fmt(this.auraRange)}` : `${1 + this.amount} 次${id === ID.hiss ? '声波' : '挥爪'} · 伤害 ${fmt((id === ID.hiss ? 6 + k * 3 : 17 + k * 10) * this.attack)}`;
    }
    tick(dt: number, input = { x: 0, y: 0 }) {
        if (this.mode === 'chest') { this.chestAge = Math.min(this.chestDuration, this.chestAge + dt); return; }
        if (this.mode !== 'playing')
            return;
        this.bombFlash = Math.max(0, this.bombFlash - dt);
        for (const n of this.numbers) { n.life -= dt; n.y -= dt * 32; }
        this.numbers = this.numbers.filter(n => n.life > 0);
        this.time += dt;
        this.player.x += input.x * CFG.speed * (1 + this.levels[ID.move] * .1) * dt;
        this.player.y += input.y * CFG.speed * (1 + this.levels[ID.move] * .1) * dt;
        this.player.hp = Math.min(this.maxHP, this.player.hp + this.levels[ID.recovery] * .35 * dt);
        this.invulnerable -= dt;
        this.slash = Math.max(0, this.slash - dt);
        const minute = Math.floor(this.time / 60);
        while (this.eliteMinute < minute) {
            this.eliteMinute++;
            this.spawnEnemy(true);
        }
        this.spawn -= dt;
        while (this.spawn <= 0) {
            this.spawnEnemy();
            this.spawn += CFG.spawnInterval(this.time);
        }
        for (const e of this.enemies) {
            if (!e.alive)
                continue;
            const dx = this.player.x - e.x, dy = this.player.y - e.y, d = Math.hypot(dx, dy) || 1;
            const speed = CFG.enemySpeed(this.time, e.elite) * (this.spinosaurusActive ? .3 : (e.slowUntil ?? 0) > this.time ? .5 : 1);
            if (!e.hiss || e.hiss.phase === 'chase') {
                e.x += dx / d * speed * dt;
                e.y += dy / d * speed * dt;
            }
            e.flash = Math.max(0, e.flash - dt);
            if (d > 1500 && !e.elite) {
                e.alive = false;
                continue;
            }
            if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < e.r + 17)
                this.hurtPlayer(CFG.enemyDamage(this.time) * (e.elite ? 2 : 1));
        }
        this.grid.rebuild(this.enemies);
        this.attacks(dt);
        for (const wave of this.waves) {
            wave.radius = Math.min(wave.maxRadius, wave.radius + dt * 360);
            for (const e of this.grid.query(wave.x, wave.y, wave.radius)) {
                const angle = Math.atan2(e.y - wave.y, e.x - wave.x) - wave.angle;
                const delta = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
                const allowance = Math.asin(Math.min(1, e.r / Math.max(1, Math.hypot(e.x - wave.x, e.y - wave.y))));
                if (delta <= wave.halfAngle + allowance && !wave.hit.has(e.uid)) { wave.hit.add(e.uid); this.damage(e, wave.damage); }
            }
        }
        this.waves = this.waves.filter(wave => wave.radius < wave.maxRadius);
        // Resolve after player attacks: killing an elite during its windup cancels the hiss.
        this.advanceEliteHisses(dt);
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i], dist = Math.hypot(d.x - this.player.x, d.y - this.player.y);
            const pickupRadius = (!d.chest && !d.kind ? CFG.ricePickup : CFG.pickup) * (1 + this.levels[ID.pickup] * .2);
            if (dist < pickupRadius || d.attracted) {
                if (dist < 20) {
                    this.drops.splice(i, 1);
                    this.collect(d);
                    if (this.mode !== 'playing') break;
                } else {
                    const step = d.attracted ? Math.min(dist, Math.max(600, dist * 3) * dt) / dist : Math.min(1, dt * 9);
                    d.x += (this.player.x - d.x) * step;
                    d.y += (this.player.y - d.y) * step;
                }
            }
        }
        this.enemies = this.enemies.filter(e => { if (!e.alive) {
            this.pool.push(e);
            return false;
        } return true; });
        // Compact old experience piles, preserving their experience value.
        if (this.drops.length > 700) {
            const bins = new Map<string, Drop>();
            this.drops = this.drops.filter(d => { if (d.chest || d.kind || d.attracted)
                return true; const key = `${Math.floor(d.x / 90)},${Math.floor(d.y / 90)}`; const old = bins.get(key); if (old) {
                old.value += d.value;
                return false;
            } bins.set(key, d); return true; });
        }
        if (this.player.hp <= 0) {
            if (this.owns(ID.revive) && !this.reviveUsed) {
                this.reviveUsed = true; this.player.hp = this.maxHP * .5; this.invulnerable = 3;
                for (const e of this.enemies) {
                    const dx = e.x - this.player.x, dy = e.y - this.player.y, d = Math.hypot(dx, dy);
                    if (d < 150 && (!e.hiss || e.hiss.phase === 'chase')) { e.x += (d ? dx / d : 1) * 100; e.y += (d ? dy / d : 0) * 100; }
                }
                this.onEffect('heal', this.player.x, this.player.y); this.onSound('evolve');
            } else { this.player.hp = 0; this.mode = 'over'; this.won = false; }
        }
        else
            this.checkLevel();
    }
}
