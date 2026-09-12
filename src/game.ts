import { CFG, ANCHOR, W, H, SAFE, EVOLUTION_PASSIVE } from './config';
export type Mode = 'ready' | 'playing' | 'paused' | 'choice' | 'evolution' | 'over';
export type Enemy = {
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
export type Wave = { x: number; y: number; radius: number; maxRadius: number; angle: number; halfAngle: number; damage: number; hit: Set<Enemy> };
export type DamageNumber = { x: number; y: number; value: number; life: number };
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
    levels = [1, 0, 0, 0, 0, 0];
    evolved = [false, false, false];
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
    cd = [0, 0, 0];
    invulnerable = 0;
    slash = 0;
    slashDirection = 1;
    lastEvolution = 0;
    won = false;
    onSound = (s: string) => { };
    rng = () => Math.random();
    get maxHP() { return CFG.baseHP + this.levels[5] * 20; }
    get need() { return CFG.xpNeed(this.level); }
    get cooldown() { return 1 - this.levels[3] * .08; }
    start() { const sound = this.onSound; Object.assign(this, new Game()); this.onSound = sound; this.mode = 'playing'; }
    options() { return this.levels.map((_, i) => i).filter(i => this.levels[i] < 5 && !this.evolved[i]); }
    offer() { const options = this.options(); if (!options.length) {
        this.player.hp = Math.min(this.maxHP, this.player.hp + 30);
        return;
    } this.choices = options.sort(() => this.rng() - .5).slice(0, 3); this.mode = 'choice'; this.onSound('level'); }
    upgrade(id: number) { if (!this.choices.includes(id) || this.mode !== 'choice')
        return; if (!this.levels[id])
        (id < 3 ? this.weapons : this.passives).push(id); this.levels[id]++; if (id === 5)
        this.player.hp += 20; this.mode = 'playing'; this.checkLevel(); }
    checkLevel() { if (this.mode !== 'playing')
        return; if (this.xp >= this.need) {
        this.xp -= this.need;
        this.level++;
        this.offer();
    } }
    chest() { const id = this.weapons.find(i => this.levels[i] === 5 && !this.evolved[i] && this.levels[EVOLUTION_PASSIVE[i]] > 0); if (id !== undefined) {
        this.evolved[id] = true;
        this.lastEvolution = id;
        this.mode = 'evolution';
        this.onSound('evolve');
    }
    else
        this.offer(); }
    spawnEnemy(elite = false) { if (!elite && this.enemies.length >= CFG.enemyCap)
        return; const side = Math.floor(this.rng() * 4); let x = -ANCHOR.x - 45, y = -ANCHOR.y - 45; if (side === 0 || side === 1) {
        x += this.rng() * (W + 90);
        y = side === 0 ? y : H - ANCHOR.y + 45;
    }
    else {
        y += this.rng() * (H + 90);
        x = side === 2 ? x : W - ANCHOR.x + 45;
    } const hp = CFG.enemyHP(this.time) * (elite ? 12 : 1); const e = this.pool.pop() ?? {} as Enemy; for (const wave of this.waves) wave.hit.delete(e); Object.assign(e, { x: this.player.x + x, y: this.player.y + y, hp, max: hp, r: elite ? 27 : 17, elite, flash: 0, alive: true }); this.enemies.push(e); }
    damage(e: Enemy, n: number) { if (!e.alive)
        return; e.hp -= n; e.flash = .1; this.numbers.push({ x: e.x, y: e.y - e.r, value: Math.round(n), life: .7 });
        if (this.numbers.length > 180) this.numbers.shift(); if (e.hp <= 0) {
        e.alive = false;
        this.kills++;
        this.drops.push({ x: e.x, y: e.y, chest: e.elite, value: e.elite ? 0 : 2 });
        const roll = this.rng();
        const kind = roll < .035 ? 'heal' : roll < .055 ? 'magnet' : roll < .07 ? 'bomb' : undefined;
        if (kind) this.drops.push({ x: e.x + 12, y: e.y, chest: false, value: 0, kind });
    } }
    collect(d: Drop) {
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
        else this.xp += d.value;
        if (d.kind) this.onSound('chest');
    }
    tick(dt: number, input = { x: 0, y: 0 }) {
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
        this.player.x += input.x * CFG.speed * dt;
        this.player.y += input.y * CFG.speed * dt;
        this.player.hp = Math.min(this.maxHP, this.player.hp + this.levels[4] * .35 * dt);
        this.invulnerable -= dt;
        this.slash = Math.max(0, this.slash - dt);
        const minute = Math.floor(this.time / 60);
        while (this.eliteMinute < minute) {
            this.eliteMinute++;
            this.spawnEnemy(true);
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
            const speed = e.elite ? 52 : 42 + Math.min(45, this.time * .08);
            e.x += dx / d * speed * dt;
            e.y += dy / d * speed * dt;
            e.flash = Math.max(0, e.flash - dt);
            if (d > 1500 && !e.elite) {
                e.alive = false;
                continue;
            }
            if (d < e.r + 17 && this.invulnerable <= 0) {
                this.player.hp -= CFG.contactDamage * (e.elite ? 2 : 1);
                this.invulnerable = .55;
                this.onSound('hurt');
            }
        }
        this.grid.rebuild(this.enemies);
        for (let i = 0; i < 3; i++)
            this.cd[i] -= dt;
        if (this.cd[0] <= 0) {
            const maxRadius = 105 + (this.levels[0] - 1) * 6 + (this.evolved[0] ? 12 : 0);
            const halfAngle = (32 + (this.levels[0] - 1) * 2 + (this.evolved[0] ? 3 : 0)) * Math.PI / 180;
            const target = this.grid.query(this.player.x, this.player.y, maxRadius).sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y))[0];
            if (target) {
                this.waves.push({ x: this.player.x, y: this.player.y, radius: 0, maxRadius, angle: Math.atan2(target.y - this.player.y, target.x - this.player.x), halfAngle, damage: 6 + this.levels[0] * 3, hit: new Set() });
                this.cd[0] = (this.evolved[0] ? .38 : Math.max(.5, 1.1 - this.levels[0] * .1)) * this.cooldown;
                this.onSound('hit');
            }
        }
        if (this.levels[1] && this.cd[1] <= 0) {
            let hits = 0;
            for (const e of this.grid.query(this.player.x, this.player.y, 55 + this.levels[1] * 9)) {
                this.damage(e, 5 + this.levels[1] * 3);
                hits++;
            }
            if (this.evolved[1] && hits)
                this.player.hp = Math.min(this.maxHP, this.player.hp + 1.5);
            this.cd[1] = .55 * this.cooldown;
        }
        if (this.levels[2] && this.cd[2] <= 0) {
            const targets = this.grid.query(this.player.x, this.player.y, 135);
            if (targets.length) {
                const near = targets.sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y))[0];
                this.slashDirection = near.x < this.player.x ? -1 : 1;
                this.slash = .23;
                for (const e of targets)
                    if ((e.x - this.player.x) * this.slashDirection >= -20 && Math.abs(e.y - this.player.y) < 52) {
                        const crit = this.evolved[2] && this.rng() < .4;
                        this.damage(e, (17 + this.levels[2] * 10) * (crit ? 2 : 1));
                        if (crit)
                            this.player.hp = Math.min(this.maxHP, this.player.hp + 3);
                    }
                this.cd[2] = 1.15 * this.cooldown;
            }
        }
        for (const wave of this.waves) {
            wave.radius = Math.min(wave.maxRadius, wave.radius + dt * 360);
            for (const e of this.grid.query(wave.x, wave.y, wave.radius)) {
                const angle = Math.atan2(e.y - wave.y, e.x - wave.x) - wave.angle;
                const delta = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
                const allowance = Math.asin(Math.min(1, e.r / Math.max(1, Math.hypot(e.x - wave.x, e.y - wave.y))));
                if (delta <= wave.halfAngle + allowance && !wave.hit.has(e)) { wave.hit.add(e); this.damage(e, wave.damage); }
            }
        }
        this.waves = this.waves.filter(wave => wave.radius < wave.maxRadius);
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i], dist = Math.hypot(d.x - this.player.x, d.y - this.player.y);
            const pickupRadius = !d.chest && !d.kind ? CFG.ricePickup : CFG.pickup;
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
            this.player.hp = 0;
            this.mode = 'over';
            this.won = false;
        }
        else
            this.checkLevel();
    }
}
