import './style.css';
import { Game } from './game';
import { Input } from './input';
import { Renderer } from './render';
import { Sound } from './audio';
import { W, H, ITEMS } from './config';
const canvas = document.querySelector('canvas')!;
const context = canvas.getContext('2d')!;
const game = new Game(), input = new Input(), sound = new Sound(), render = new Renderer(context);
let best = 0;
try {
    best = Number(localStorage.getItem('hakimi.best')) || 0;
    sound.muted = localStorage.getItem('hakimi.muted') === 'true';
}
catch { }
render.best = best;
function resize() { const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = W * dpr; canvas.height = H * dpr; context.setTransform(dpr, 0, 0, dpr, 0, 0); }
resize();
window.addEventListener('resize', resize);
game.onEffect = (kind, x, y) => render.effect(kind, x, y);
game.onSound = k => sound.play(k);
const details = document.createElement('section');
details.className = 'ability-details'; details.hidden = true; details.setAttribute('role', 'dialog'); details.setAttribute('aria-modal', 'true'); details.setAttribute('aria-label', '能力与被动');
document.body.append(details);
function openDetails() {
    if (game.mode !== 'playing') return;
    game.mode = 'details';
    details.replaceChildren();
    const header = document.createElement('header'), title = document.createElement('h2'), close = document.createElement('button');
    title.textContent = '能力与被动'; close.textContent = '关闭 · 继续'; close.onclick = () => void action('resume');
    header.append(title, close); details.append(header);
    const content = document.createElement('div'); content.className = 'ability-content';
    for (const [label, ids] of [['能力 · 最多四种', game.weapons], ['被动 · 数量不限', game.passives]] as const) {
        const heading = document.createElement('h3'); heading.textContent = label; content.append(heading);
        if (!ids.length) { const empty = document.createElement('p'); empty.textContent = '尚未获得被动'; content.append(empty); }
        for (const id of ids) {
            const item = ITEMS[id], row = document.createElement('article'), name = document.createElement('strong'), effect = document.createElement('p');
            name.textContent = `${game.evolved[id] ? item.evo : item.name} · ${item.maxLevel ? `${game.levels[id]}/${item.maxLevel} 级` : '不可升级'}`;
            const badge = document.createElement('canvas'); badge.width = badge.height = 72;
            badge.style.cssText = 'width:36px;height:36px;float:left;margin-right:10px';
            badge.setAttribute('role', 'img'); badge.setAttribute('aria-label', item.name);
            new Renderer(badge.getContext('2d')!).icon(id, 0, 0, 72);
            effect.textContent = game.description(id); row.append(badge, name, effect);
            if (item.prerequisite !== undefined) {
                const recipe = document.createElement('p'); recipe.className = 'recipe';
                recipe.textContent = game.evolved[id] ? `已进化 · ${item.desc}` : `进化：${item.name}八级 + ${ITEMS[item.prerequisite].name}（${game.owns(item.prerequisite) ? '已拥有' : '未拥有'}）+ 宝箱 → ${item.evo}`;
                row.append(recipe);
            }
            content.append(row);
        }
    }
    details.append(content); details.hidden = false; close.focus();
}
details.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); details.querySelector('button')?.focus(); } });
let busy = false;
async function action(id: string) {
    if (busy)
        return;
    if (id !== 'mute') sound.play('ui');
    if (id === 'start') {
        busy = true;
        sound.unlock();
        details.hidden = true;
        game.start();
        void input.enable().finally(() => { busy = false; });
    }
    if (id === 'chest') { game.advanceChest(); if (game.mode === 'playing') input.calibrate(); }
    if (id === 'details') openDetails();
    if (id === 'pause' && game.mode === 'playing')
        game.mode = 'paused';
    if (id === 'resume' && (game.mode === 'paused' || game.mode === 'details' || game.mode === 'evolution')) {
        details.hidden = true;
        input.calibrate();
        game.mode = 'playing';
        game.checkLevel();
    }
    if (id === 'calibrate') {
        input.calibrate();
    }
    if (id === 'mute') {
        sound.muted = !sound.muted;
        try {
            localStorage.setItem('hakimi.muted', String(sound.muted));
        }
        catch { }
    }
    if (id.startsWith('pick:')) {
        game.upgrade(Number(id.split(':')[1]));
        input.calibrate();
    }
}
function point(e: PointerEvent) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
canvas.addEventListener('pointermove', e => { const p = point(e); render.hover = render.buttons.find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h)?.action ?? ''; canvas.style.cursor = render.hover ? 'pointer' : 'default'; });
canvas.addEventListener('pointerdown', e => { const p = point(e); render.pressed = render.buttons.find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h)?.action ?? ''; });
window.addEventListener('pointerup', () => { render.pressed = ''; });
canvas.addEventListener('pointercancel', () => { render.pressed = ''; });
canvas.addEventListener('pointerup', e => { render.pressed = '';  if (game.mode === 'ready') { void action('start'); return; } const p = point(e); const b = render.buttons.find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); if (b)
    void action(b.action); });
window.addEventListener('keydown', e => { if (game.mode === 'ready' && ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) void action('start'); if (e.key === 'Escape') {
    if (game.mode === 'playing')
        game.mode = 'paused';
    else if (game.mode === 'paused' || game.mode === 'details')
        void action('resume');
} });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'playing')
    game.mode = 'paused'; });
window.addEventListener('blur', () => { if (game.mode === 'playing')
    game.mode = 'paused'; });
let previous = performance.now(), accumulator = 0;
function frame(now: number) { const elapsed = Math.min(.1, (now - previous) / 1000); previous = now; accumulator += elapsed; while (accumulator >= 1 / 60) {
    game.tick(1 / 60, input.read(1 / 60));
    accumulator -= 1 / 60;
} if (game.mode === 'over' && game.time > best) {
    best = game.time;
    render.best = best;
    try {
        localStorage.setItem('hakimi.best', String(best));
    }
    catch { }
} render.muted = sound.muted; render.draw(game, elapsed); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
// Readable development hook for deterministic browser verification; omitted in production.
if (import.meta.env.DEV)
    Object.assign(window, { __hakimi: { game, input, render, action } });
