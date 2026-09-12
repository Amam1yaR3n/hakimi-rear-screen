import './style.css';
import { Game } from './game';
import { Input } from './input';
import { Renderer } from './render';
import { Sound } from './audio';
import { W, H } from './config';
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
game.onSound = k => sound.play(k);
let busy = false;
async function action(id: string) {
    if (busy)
        return;
    if (id === 'start') {
        busy = true;
        sound.unlock();
        game.start();
        void input.enable().finally(() => { busy = false; });
    }
    if (id === 'pause' && game.mode === 'playing')
        game.mode = 'paused';
    if (id === 'resume' && (game.mode === 'paused' || game.mode === 'evolution')) {
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
canvas.addEventListener('pointerup', e => { if (game.mode === 'ready') { void action('start'); return; } const p = point(e); const b = render.buttons.find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); if (b)
    void action(b.action); });
window.addEventListener('keydown', e => { if (game.mode === 'ready' && ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) void action('start'); if (e.key === 'Escape') {
    if (game.mode === 'playing')
        game.mode = 'paused';
    else if (game.mode === 'paused')
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
} render.muted = sound.muted; render.draw(game); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
// Readable development hook for deterministic browser verification; omitted in production.
if (import.meta.env.DEV)
    Object.assign(window, { __hakimi: { game, input, render, action } });
