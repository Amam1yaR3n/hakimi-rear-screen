import { CFG, ANCHOR, W, H, SAFE, ITEMS, ID } from './config';
export type Mode = 'ready' | 'playing' | 'paused' | 'details' | 'choice' | 'evolution' | 'chest' | 'over';
export type Enemy = {
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
    kind?: 'heal' | 'magnet' | 'bomb';
    attracted?: boolean;
};
export type Wave = { x: number; y: number; radius: number; maxRadius: number; angle: number; halfAngle: number; damage: number; hit: Set<number> };
export type DamageNumber = { x: number; y: number; value: number; life: number };
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
    bombFlash = 0;
    grid = new SpatialGrid();
    choices: number[] = [];
    spawn = 0;
    eliteMinute = 0;
    cd = ITEMS.map(() => 0);
    nextEnemyId = 1;
    reviveUsed = false;
    pending: { delay: number; run: () => void }[] = [];
    paws: { x: number; y: number; radius: number; age: number }[] = [];
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
    get auraRange() { return (55 + this.legacyLevel(ID.aura) * 9) * this.attackRange; }
    get duration() { return 1 + this.levels[ID.duration] * .1; }
    get projectileSpeed() { return 1 + this.levels[ID.projectileSpeed] * .1; }
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
    for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
    this.choices = options.slice(0, 3); this.mode = 'choice'; this.onSound('level'); }
    upgrade(id: number) {
        if (this.mode !== 'choice' || !this.choices.includes(id) || !this.options().includes(id)) return;
        this.applyUpgrade(id);
        this.mode = 'playing'; this.checkLevel();
    }
    applyUpgrade(id: number) {
        if (!this.owns(id)) (ITEMS[id].kind === 'weapon' ? this.weapons : this.passives).push(id);
        if (ITEMS[id].maxLevel) this.levels[id]++;
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
        const roll = this.rng(), count = roll < .7 ? 1 : roll < .95 ? 3 : 5;
        this.chestRewards = []; this.chestAge = 0; this.choices = [];
        for (let slot = 0; slot < count; slot++) {
            const evolution = this.weapons.find(i => this.levels[i] === ITEMS[i].maxLevel && !this.evolved[i] && this.owns(ITEMS[i].prerequisite!));
            if (evolution !== undefined) {
                this.evolved[evolution] = true; this.lastEvolution = evolution;
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
    } const hp = CFG.enemyHP(this.time) * (elite ? 12 : 1); const e = this.pool.pop() ?? {} as Enemy; Object.assign(e, { uid: this.nextEnemyId++, x: this.player.x + x, y: this.player.y + y, hp, max: hp, r: elite ? 27 : 17, elite, flash: 0, alive: true }); this.enemies.push(e); }
    damage(e: Enemy, n: number) { if (!e.alive)
        return; e.hp -= n; this.onEffect(e.hp <= 0 ? 'kill' : 'hit', e.x, e.y); e.flash = .1; this.numbers.push({ x: e.x, y: e.y - e.r, value: Math.round(n), life: .7 });
        if (this.numbers.length > 180) this.numbers.shift(); if (e.hp <= 0) {
        e.alive = false;
        this.kills++;
        this.drops.push({ x: e.x, y: e.y, chest: e.elite, value: e.elite ? 0 : 2 });
        const roll = this.rng();
        const kind = roll < CFG.itemDrops.heal ? 'heal' : roll < CFG.itemDrops.heal + CFG.itemDrops.magnet ? 'magnet' : roll < CFG.itemDrops.heal + CFG.itemDrops.magnet + CFG.itemDrops.bomb ? 'bomb' : undefined;
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
                if (x + e.r >= SAFE && x - e.r <= W && y + e.r >= 0 && y - e.r <= H) this.damage(e, e.hp);
            }
        } else if (d.chest) this.chest();
        else this.xp += d.value * (1 + this.levels[ID.xp] * .1);
        if (d.kind) this.onSound('chest');
    }
    schedule(delay: number, run: () => void) { if (delay <= 0) run(); else this.pending.push({ delay, run }); }
    visibleEnemies() { return this.enemies.filter(e => e.alive && e.x - this.player.x + ANCHOR.x >= SAFE && e.x - this.player.x + ANCHOR.x <= W && e.y - this.player.y + ANCHOR.y >= 0 && e.y - this.player.y + ANCHOR.y <= H); }
    pawStrike(x: number, y: number, radius: number, damage: number) {
        this.paws.push({ x, y, radius, age: 0 });
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
        for (let i = 0; i < count; i++) this.schedule(i * .4, () => this.trucks.push({ x, y, dx, dy, life: 4 * this.duration, damage: (60 + 15 * (this.levels[ID.truck] - 1)) * this.attack, hit: new Set() }));
    }
    attacks(dt: number) {
        for (const p of this.paws) p.age += dt;
        this.paws = this.paws.filter(p => p.age < .55);
        const due = this.pending; this.pending = [];
        for (const p of due) { p.delay -= dt; if (p.delay <= 1e-9) p.run(); else this.pending.push(p); }
        for (const id of this.weapons) this.cd[id] -= dt;
        if (this.levels[ID.hiss] && this.cd[ID.hiss] <= 0) {
            const l = this.legacyLevel(ID.hiss);
            const targets = this.grid.query(this.player.x, this.player.y, this.hissRange).sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y));
            if (targets.length) {
                for (let i = 0; i <= this.amount; i++) { const e = targets[i % targets.length], angle = Math.atan2(e.y - this.player.y, e.x - this.player.x); this.schedule(i * .15, () => this.hiss(angle)); }
                this.cd[ID.hiss] = (this.evolved[ID.hiss] ? .38 : Math.max(.5, 1.1 - l * .1)) * this.cooldown;
            }
        }
        if (this.levels[ID.aura] && this.cd[ID.aura] <= 0) {
            const l = this.legacyLevel(ID.aura), targets = this.grid.query(this.player.x, this.player.y, this.auraRange);
            for (const e of targets) this.damage(e, (5 + l * 3) * this.attack);
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
                    if (this.evolved[ID.paw]) this.schedule(.35, () => this.pawStrike(x, y, radius, damage));
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
                t.hit.add(e.uid); this.damage(e, t.damage); e.x += t.dx * 45; e.y += t.dy * 45;
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
            [ID.range]: `全部能力攻击范围 +${l * 10}%`, [ID.cooldown]: `攻击冷却 −${l * 8}%`, [ID.recovery]: `每秒恢复 ${fmt(l * .35)} 生命`, [ID.health]: `最大生命 +${l * 20}`,
            [ID.attack]: `全部能力伤害 +${l * 10}%`, [ID.amount]: `攻击数量 +${l}（光环、大运除外）`, [ID.move]: `移动速度 +${l * 10}%`, [ID.xp]: `经验获取 +${l * 10}%`, [ID.pickup]: `吸取范围 +${l * 20}%`, [ID.duration]: `糖块存在 / 卡车寿命 +${l * 10}%`, [ID.projectileSpeed]: `糖块转速 / 卡车车速 +${l * 10}%`,
        };
        if (ITEMS[id].kind === 'passive') return passive[id];
        if (id === ID.paw) return `${1 + Math.floor((l - 1) / 2) + this.amount} 次落爪 · 伤害 ${fmt((20 + 5 * (l - 1)) * this.attack)} · 间隔 ${fmt((4 - .2 * (l - 1)) * this.cooldown)} 秒${this.evolved[id] ? ' · 二连拍' : ''}`;
        if (id === ID.gum) return `${1 + Math.floor((l - 1) / 2) + this.amount} 块糖 · 伤害 ${fmt((8 + 2 * (l - 1)) * this.attack)} · ${this.evolved[id] ? '永久环绕' : `持续 ${fmt((3 + .25 * (l - 1)) * this.duration)} 秒`}`;
        if (id === ID.truck) return `${(this.evolved[id] ? 3 : 1)} 辆车 · 伤害 ${fmt((60 + 15 * (l - 1)) * this.attack)} · 间隔 ${fmt((10 - .5 * (l - 1)) * this.cooldown)} 秒`;
        const k = this.legacyLevel(id);
        return id === ID.aura ? `每 ${fmt(.55 * this.cooldown)} 秒造成 ${fmt((5 + k * 3) * this.attack)} 伤害` : `${1 + this.amount} 次${id === ID.hiss ? '声波' : '挥爪'} · 伤害 ${fmt((id === ID.hiss ? 6 + k * 3 : 17 + k * 10) * this.attack)}`;
    }
    tick(dt: number, input = { x: 0, y: 0 }) {
        if (this.mode === 'chest') { this.chestAge = Math.min(this.chestDuration, this.chestAge + dt); return; }
        if (this.mode !== 'playing')
            return;
        this.bombFlash = Math.max(0, this.bombFlash - dt);
        for (const n of this.numbers) { n.life -= dt; n.y -= dt * 32; }
        this.numbers = this.numbers.filter(n => n.life > 0);
        this.time += dt;
        if (this.time >= CFG.duration) {
            this.time = CFG.duration;
            this.won = true;
            this.mode = 'over';
            return;
        }
        this.player.x += input.x * CFG.speed * (1 + this.levels[ID.move] * .1) * dt;
        this.player.y += input.y * CFG.speed * (1 + this.levels[ID.move] * .1) * dt;
        this.player.hp = Math.min(this.maxHP, this.player.hp + this.levels[ID.recovery] * .35 * dt);
        this.invulnerable -= dt;
        this.slash = Math.max(0, this.slash - dt);
        const minute = Math.floor(this.time / 60);
        while (this.eliteMinute < minute) {
            this.eliteMinute++;
            this.spawnEnemy(true);
            this.onEffect('elite', this.player.x, this.player.y);
            this.onSound('chest');
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
            const speed = CFG.enemySpeed(this.time, e.elite);
            e.x += dx / d * speed * dt;
            e.y += dy / d * speed * dt;
            e.flash = Math.max(0, e.flash - dt);
            if (d > 1500 && !e.elite) {
                e.alive = false;
                continue;
            }
            if (d < e.r + 17 && this.invulnerable <= 0) {
                this.player.hp -= CFG.enemyDamage(this.time) * (e.elite ? 2 : 1);
                this.invulnerable = .55;
                this.onSound('hurt');
            }
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
                    if (d < 150) { e.x += (d ? dx / d : 1) * 100; e.y += (d ? dy / d : 0) * 100; }
                }
                this.onEffect('heal', this.player.x, this.player.y); this.onSound('evolve');
            } else { this.player.hp = 0; this.mode = 'over'; this.won = false; }
        }
        else
            this.checkLevel();
    }
}
