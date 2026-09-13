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
game.onEffect = (kind, x, y) => render.effect(kind, x, y);
game.onSound = k => sound.play(k);
function openDetails() {
    if (game.mode !== 'playing' && game.mode !== 'paused') return;
    game.mode = 'details';
    render.resetDetails();
}
let busy = false;
async function action(id: string) {
    if (busy)
        return;
    if (id !== 'mute') sound.play('ui');
    if (id === 'start') {
        busy = true;
        sound.unlock();
        game.start();
        void input.enable().finally(() => { busy = false; });
    }
    if (id === 'chest') { game.advanceChest(); if (game.mode === 'playing') input.calibrate(); }
    if (id === 'details') openDetails();
    if (id === 'pause' && game.mode === 'playing')
        game.mode = 'paused';
    if (id === 'resume' && (game.mode === 'paused' || game.mode === 'details' || game.mode === 'evolution')) {
        if (detailsDrag) {
            const pointerId = detailsDrag.id;
            detailsDrag = undefined;
            if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
        }
        input.keys.clear();
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
function point(e: { clientX: number; clientY: number }) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
let detailsDrag: { id: number; lastY: number } | undefined;
const buttonAt = (p: { x: number; y: number }) => render.buttons.find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
canvas.addEventListener('pointermove', e => {
    const p = point(e);
    if (detailsDrag?.id === e.pointerId && game.mode === 'details') {
        render.scrollDetails(detailsDrag.lastY - p.y);
        detailsDrag.lastY = p.y;
        return;
    }
    render.hover = buttonAt(p)?.action ?? '';
    canvas.style.cursor = render.hover ? 'pointer' : 'default';
});
canvas.addEventListener('pointerdown', e => {
    const p = point(e);
    if (detailsDrag) return;
    if (game.mode === 'details' && render.detailsContains(p.x, p.y) && !detailsDrag) {
        detailsDrag = { id: e.pointerId, lastY: p.y };
        canvas.setPointerCapture(e.pointerId);
        render.pressed = '';
        return;
    }
    render.pressed = buttonAt(p)?.action ?? '';
});
const cancelPointer = (e: PointerEvent) => {
    if (detailsDrag?.id === e.pointerId) detailsDrag = undefined;
    render.pressed = '';
};
window.addEventListener('pointerup', cancelPointer);
canvas.addEventListener('pointercancel', cancelPointer);
canvas.addEventListener('lostpointercapture', cancelPointer);
canvas.addEventListener('pointerup', e => {
    if (detailsDrag?.id === e.pointerId) {
        detailsDrag = undefined;
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
        render.pressed = '';
        return;
    }
    const pressed = render.pressed;
    render.pressed = '';
    if (game.mode === 'ready') { void action('start'); return; }
    if (game.mode === 'chest') { void action('chest'); return; }
    const b = buttonAt(point(e));
    if (b && (game.mode !== 'details' || pressed === b.action)) void action(b.action);
});
canvas.addEventListener('wheel', e => {
    if (game.mode !== 'details') return;
    e.preventDefault();
    const p = point(e);
    if (!render.detailsContains(p.x, p.y)) return;
    const scale = e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? render.detailsViewport.h : H / canvas.getBoundingClientRect().height;
    render.scrollDetails(e.deltaY * scale);
}, { passive: false });
window.addEventListener('keydown', e => {
    if (game.mode === 'details') {
        const delta = e.key === 'ArrowDown' ? 36 : e.key === 'ArrowUp' ? -36 : e.key === 'PageDown' ? 320 : e.key === 'PageUp' ? -320 : e.key === 'Home' ? -Infinity : e.key === 'End' ? Infinity : undefined;
        input.keys.delete(e.key.toLowerCase());
        if (delta !== undefined) { e.preventDefault(); render.scrollDetails(delta); return; }
        if (e.key === 'Tab') { e.preventDefault(); render.hover = 'resume'; return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void action('resume'); return; }
    }
    if (game.mode === 'ready' && ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) void action('start'); if (e.key === 'Escape') {
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
