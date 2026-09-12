import { Game } from './game';
import { W, H, SAFE, ANCHOR, ITEMS } from './config';
export type Button = {
    x: number;
    y: number;
    w: number;
    h: number;
    action: string;
};
export class Renderer {
    buttons: Button[] = [];
    hover = '';
    message = '';
    best = 0;
    muted = false;
    constructor(public c: CanvasRenderingContext2D) { }
    box(x: number, y: number, w: number, h: number, color: string, r = 10, stroke = '') { const c = this.c; c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = color; c.fill(); if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 2;
        c.stroke();
    } }
    text(s: string, x: number, y: number, size = 14, color = '#eee9d8', align: CanvasTextAlign = 'left', weight = 600) { const c = this.c; c.fillStyle = color; c.font = `${weight} ${size}px "PingFang SC","Microsoft YaHei",sans-serif`; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y); }
    line(x: number, y: number, x2: number, y2: number, color: string, width = 2) { const c = this.c; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
    ellipse(x: number, y: number, rx: number, ry: number, color: string, stroke = '') { const c = this.c; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill(); if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 2.8;
        c.stroke();
    } }
    poly(points: number[][], color: string, stroke = '#242823') { const c = this.c; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = color; c.fill(); if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 2.8;
        c.lineJoin = 'round';
        c.stroke();
    } }
    character(type: number, x: number, y: number, scale = 1, flash = false, t = 0) {
        const c = this.c;
        c.save();
        c.translate(x, y);
        c.scale(scale, scale);
        c.rotate(Math.sin(t * 7) * .035);
        const outline = '#202720';
        this.ellipse(0, 27, 28, 7, '#00000028');
        if (type === 2) {
            this.ellipse(-14, 21, 8, 12, '#bb8550', outline);
            this.ellipse(14, 21, 8, 12, '#bb8550', outline);
            this.ellipse(-24, -8, 9, 20, '#a87143', outline);
            this.ellipse(24, -8, 9, 20, '#a87143', outline);
            this.ellipse(0, -1, 26, 29, flash ? '#fff6cd' : '#c8955f', outline);
            this.line(-19, -16, -7, -13, outline, 4);
            this.line(7, -13, 19, -16, outline, 4);
            this.ellipse(-12, -10, 4, 3, outline);
            this.ellipse(12, -10, 4, 3, outline);
            this.ellipse(0, 12, 17, 21, '#301e25', outline);
            this.ellipse(0, 23, 10, 7, '#d16f76');
            for (let i = 0; i < 4; i++)
                this.poly([[-13 + i * 7, 0], [-8 + i * 7, 0], [-10 + i * 7, 8]], '#f5ead0', '');
            this.ellipse(0, -4, 10, 7, outline);
        }
        else {
            const orange = type === 1, col = flash ? '#fff9d5' : orange ? '#cf9555' : '#969b85';
            this.ellipse(-12, 24, 8, 9, orange ? '#ce975d' : '#e2dfcc', outline);
            this.ellipse(12, 24, 8, 9, orange ? '#ce975d' : '#e2dfcc', outline);
            this.poly(orange ? [[-27, -5], [-35, -17], [-8, -20]] : [[-27, -8], [-30, -32], [-8, -21]], col);
            this.poly(orange ? [[27, -5], [35, -17], [8, -20]] : [[27, -8], [30, -32], [8, -21]], col);
            this.ellipse(0, 0, 31, 29, col, outline);
            this.ellipse(0, 12, 26, 17, orange ? '#e2b981' : '#ede9d9');
            for (let k = -1; k <= 1; k++)
                this.line(k * 10, -25, k * 8, -13, orange ? '#9c693f' : '#666e59', 4);
            this.line(-28, -4, -20, 0, orange ? '#ac783e' : '#606c58', 3);
            this.line(28, -4, 20, 0, orange ? '#ac783e' : '#606c58', 3);
            if (orange) {
                this.ellipse(-13, -4, 9, 10, '#eee0b7', outline);
                this.ellipse(13, -4, 9, 10, '#eee0b7', outline);
                this.ellipse(-11, -3, 6, 8, outline);
                this.ellipse(11, -3, 6, 8, outline);
                this.line(-25, -16, -5, -11, outline, 3);
                this.line(5, -11, 25, -16, outline, 3);
            }
            else {
                this.ellipse(-13, -4, 10, 11, outline);
                this.ellipse(13, -4, 10, 11, outline);
                this.ellipse(-16, -8, 2.6, 2.6, '#fff');
                this.ellipse(10, -8, 2.6, 2.6, '#fff');
            }
            this.poly([[-4, 7], [4, 7], [0, 11]], orange ? '#865345' : '#686b62', '');
            this.line(0, 11, -5, 15, outline, 1.5);
            this.line(0, 11, 5, 15, outline, 1.5);
            if (orange) {
                for (const side of [-1, 1]) {
                    this.line(side * 15, 11, side * 36, 7, '#ece0bc', 1);
                    this.line(side * 16, 15, side * 36, 18, '#ece0bc', 1);
                }
            }
        }
        c.restore();
    }
    button(x: number, y: number, w: number, h: number, label: string, action: string, primary = false) { const hovered = this.hover === action; this.box(x, y, w, h, primary ? (hovered ? '#d5ef94' : '#c1de7a') : (hovered ? '#424b3d' : '#2b332c'), 8, primary ? '' : '#515c49'); this.text(label, x + w / 2, y + h / 2, 14, primary ? '#20271b' : '#dedfcd', 'center', 700); this.buttons.push({ x, y, w, h, action }); }
    icon(id: number, x: number, y: number, size = 29) { const item = ITEMS[id]; this.box(x, y, size, size, item.color, 6); this.text(item.short, x + size / 2, y + size / 2, size * .48, '#252a24', 'center', 900); }
    draw(g: Game) {
        const c = this.c;
        this.buttons = [];
        c.clearRect(0, 0, W, H);
        c.fillStyle = '#83b65c';
        c.fillRect(0, 0, W, H);
        // Seamless green meadow with grass tufts and clover.
        const ox = ANCHOR.x - g.player.x, oy = ANCHOR.y - g.player.y;
        for (let iy = Math.floor(-oy / 64); iy < (H - oy) / 64 + 1; iy++)
            for (let ix = Math.floor(-ox / 64); ix < (W - ox) / 64 + 1; ix++) {
                const hash = Math.abs(Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453) % 1, x = ix * 64 + ox, y = iy * 64 + oy;
                if (hash < .42) {
                    this.line(x + 12, y + 10, x + 9, y + 5, '#589044', 2);
                    this.line(x + 12, y + 10, x + 17, y + 3, '#589044', 2);
                }
                else if (hash > .82)
                    this.ellipse(x + 15, y + 18, 6, 3, '#a0c877');
            }
        const sx = (x: number) => x + ox, sy = (y: number) => y + oy;
        for (const d of g.drops) {
            const x = sx(d.x), y = sy(d.y);
            if (x < -20 || x > W + 20 || y < -20 || y > H + 20)
                continue;
            if (d.kind) {
                this.ellipse(x, y + 13, 16, 5, '#254b352d');
                if (d.kind === 'heal') {
                    c.save(); c.translate(x, y); c.rotate(.3);
                    this.box(-8, -19, 16, 34, '#efb29c', 3, '#814e3a');
                    this.box(-8, -19, 16, 5, '#fff0d4', 1);
                    this.text('猫', 0, -5, 10, '#653d2d', 'center');
                    this.text('条', 0, 7, 10, '#653d2d', 'center'); c.restore();
                } else if (d.kind === 'magnet') {
                    this.ellipse(x, y, 19, 19, '#e2ffff66', '#bff6eb');
                    this.box(x - 12, y - 12, 24, 24, '#ff6900', 8);
                    // Xiaomi's geometric mi mark.
                    this.line(x - 7, y + 5, x - 7, y - 5, '#fff', 2.5);
                    this.line(x - 7, y - 5, x + 1, y - 5, '#fff', 2.5);
                    this.line(x + 1, y - 5, x + 1, y + 5, '#fff', 2.5);
                    this.line(x - 3, y - 1, x - 3, y + 5, '#fff', 2.5);
                    this.line(x + 6, y - 5, x + 6, y + 5, '#fff', 2.5);
                } else {
                    this.line(x + 3, y - 12, x + 10, y - 21, '#5a3a22', 3);
                    this.ellipse(x + 11, y - 22, 4, 4, '#ffdc70');
                    this.ellipse(x, y, 14, 14, '#30363c', '#141e26');
                    this.ellipse(x - 5, y - 5, 4, 3, '#89929a');
                }
            } else if (d.chest) {
                this.box(x - 13, y - 10, 26, 22, '#d7a442', 4, '#54412c');
                this.line(x - 13, y - 2, x + 13, y - 2, '#54412c');
                this.box(x - 3, y - 5, 6, 9, '#fff0a7', 1);
            }
            else {
                c.save();
                c.translate(x, y);
                c.rotate(.5);
                this.ellipse(0, 0, 3.5, 6, '#e2b951', '#8e7338');
                c.restore();
            }
        }
        if (g.levels[1]) {
            const radius = 55 + g.levels[1] * 9;
            this.ellipse(ANCHOR.x, ANCHOR.y, radius, radius, g.evolved[1] ? '#a0ac623a' : '#a99bd72b');
            c.strokeStyle = '#9985bb88';
            c.lineWidth = 2;
            c.beginPath();
            c.arc(ANCHOR.x, ANCHOR.y, radius, 0, Math.PI * 2);
            c.stroke();
        }
        for (const e of [...g.enemies].sort((a, b) => a.y - b.y)) {
            const x = sx(e.x), y = sy(e.y);
            if (x < -50 || x > W + 50 || y < -50 || y > H + 50)
                continue;
            this.character(e.elite ? 1 : 2, x, y, e.elite ? 1.05 : .62, e.flash > 0, g.time);
            if (e.elite) {
                this.box(x - 27, y - 43, 54, 5, '#523e34', 2);
                this.box(x - 27, y - 43, 54 * Math.max(0, e.hp / e.max), 5, '#be684d', 2);
            }
        }
        for (const wave of g.waves) {
            c.save();
            c.globalAlpha = Math.min(1, (1 - wave.radius / wave.maxRadius) * 2);
            for (let i = 0; i < 3; i++) {
                const radius = wave.radius - i * 15;
                if (radius <= 0) continue;
                c.beginPath(); c.arc(sx(wave.x), sy(wave.y), radius, wave.angle - wave.halfAngle, wave.angle + wave.halfAngle);
                c.strokeStyle = i === 0 ? '#f0fff6' : '#b5f1df';
                c.lineWidth = 4 - i;
                c.stroke();
            }
            c.restore();
        }
        this.character(0, ANCHOR.x, ANCHOR.y, .85, g.invulnerable > 0, g.time * (Math.abs(g.player.x) + Math.abs(g.player.y) > 0 ? 1 : 0));
        if (g.slash) {
            c.save();
            c.translate(ANCHOR.x, ANCHOR.y);
            c.scale(g.slashDirection, 1);
            for (let i = 0; i < 3; i++) {
                c.beginPath();
                c.ellipse(25, 0, 90 - i * 9, 36 - i * 6, -.2, -1, 1);
                c.lineWidth = 5;
                c.strokeStyle = g.evolved[2] ? '#dc704d' : '#faf8e4';
                c.stroke();
            }
            c.restore();
        }
        this.box(ANCHOR.x - 24, ANCHOR.y + 34, 48, 6, '#383d31', 3);
        this.box(ANCHOR.x - 23, ANCHOR.y + 35, 46 * g.player.hp / g.maxHP, 4, '#afce6d', 2);
        for (const n of g.numbers) {
            c.save(); c.globalAlpha = Math.min(1, n.life * 4);
            c.font = '800 17px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.strokeStyle = '#334124'; c.lineWidth = 3;
            c.strokeText(String(n.value), sx(n.x), sy(n.y) - 16);
            c.fillStyle = '#fff5cb'; c.fillText(String(n.value), sx(n.x), sy(n.y) - 16); c.restore();
        }
        if (g.bombFlash > 0) { c.fillStyle = `rgba(255,232,163,${g.bombFlash * 1.3})`; c.fillRect(SAFE, 0, W - SAFE, H); }
        this.hud(g);
        if (g.mode === 'choice')
            this.choices(g);
        else if (g.mode === 'paused')
            this.panel('稍息，基米。', '保持舒服的握姿，继续时会重新校准', () => { this.button(426, 290, 320, 46, '继续生存', 'resume', true); this.button(426, 350, 154, 40, '重新校准', 'calibrate'); this.button(592, 350, 154, 40, this.muted ? '开启声音' : '关闭声音', 'mute'); });
        else if (g.mode === 'evolution')
            this.panel('进 化 完 成', ITEMS[g.lastEvolution].name + '  →  ' + ITEMS[g.lastEvolution].evo, () => { this.icon(g.lastEvolution, 560, 255, 54); this.text('现在，轮到它们害怕了。', 588, 333, 16, '#c3c9ab', 'center'); this.button(446, 379, 284, 45, '继续生存', 'resume', true); });
        else if (g.mode === 'over')
            this.panel(g.won ? '十分钟，猫还在。' : '这次先活到这里。', g.won ? '生存成功 / SURVIVED' : '挑战结束 / GAME OVER', () => { this.text(`${this.time(g.time)}   ·   击败 ${g.kills}   ·   Lv.${g.level}`, 588, 282, 22, '#d3e49e', 'center'); this.text('最佳生存  ' + this.time(Math.max(this.best, g.time)), 588, 324, 13, '#a7b09a', 'center'); this.button(446, 369, 284, 46, '再来一局', 'start', true); });
        this.lenses();
    }
    time(t: number) { return `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`; }
    hud(g: Game) {
        this.box(SAFE + 12, 10, W - SAFE - 24, 15, '#343d30', 6);
        this.box(SAFE + 14, 12, (W - SAFE - 28) * Math.min(1, g.xp / g.need), 11, '#bed984', 4);
        this.text('Lv.' + g.level, 874, 18, 10, '#faf7e9', 'right');
        this.box(281, 34, 166, 80, '#f2eddcdd', 8);
        for (let slot = 0; slot < 3; slot++) {
            const x = 291 + slot * 49;
            for (let row = 0; row < 2; row++) {
                const id = (row === 0 ? g.weapons : g.passives)[slot], y = 42 + row * 35;
                if (id === undefined) {
                    this.box(x, y, 29, 29, '#d6d7c6', 6);
                    this.text('＋', x + 14, y + 14, 14, '#a6ad98', 'center');
                }
                else {
                    this.icon(id, x, y);
                    this.text(g.evolved[id] ? '★' : String(g.levels[id]), x + 37, y + 16, 11, '#505943', 'center');
                }
            }
        }
        this.text(this.time(g.time), 588, 53, 27, '#303a2d', 'center', 800);
        this.text('击败 ' + g.kills, 875, 51, 15, '#39442f', 'right');
        this.button(769, 75, 48, 29, this.muted ? '音 ×' : '音 ♪', 'mute');
        this.button(825, 75, 51, 29, '暂停', 'pause');
    }
    backdrop() { this.c.fillStyle = '#1e261cc9'; this.c.fillRect(SAFE, 0, W - SAFE, H); }
    panel(title: string, subtitle: string, body: () => void) { this.backdrop(); this.box(316, 126, 545, 332, '#202a20', 18, '#566147'); this.text(title, 588, 183, 31, '#e9ead7', 'center', 800); this.text(subtitle, 588, 222, 13, '#aeba98', 'center'); body(); }
    choices(g: Game) {
        this.backdrop();
        const width = 170, gap = 14, total = g.choices.length * width + (g.choices.length - 1) * gap, start = SAFE + (W - SAFE - total) / 2;
        g.choices.forEach((id, i) => {
            const x = start + i * (width + gap), item = ITEMS[id];
            this.box(x, 180, width, 212, this.hover === 'pick:' + id ? '#414d36' : '#2b3528', 12, '#667451');
            this.icon(id, x + 15, 200, 35);
            this.text(g.levels[id] ? `lv.${g.levels[id]} → lv.${g.levels[id] + 1}` : '新！', x + width - 12, 218, 12, item.color, 'right');
            this.text(item.name, x + 18, 268, 20, '#f1efdc');
            this.text(item.desc.slice(0, 10), x + 18, 315, 11, '#bfc7ad');
            if (item.desc.length > 10) this.text(item.desc.slice(10), x + 18, 334, 11, '#bfc7ad');
            this.buttons.push({ x, y: 180, w: width, h: 212, action: 'pick:' + id });
        });
    }
    lenses() { for (const y of [143, 429]) {
        this.ellipse(135.6, y, 114.4, 114.4, '#111510');
        this.ellipse(135.6, y, 105, 105, '#1d221c', '#353d30');
        this.ellipse(135.6, y, 87, 87, '#111610');
        this.ellipse(135.6, y, 52, 52, '#151f1b', '#25352d');
        this.ellipse(135.6, y, 31, 31, '#0c1413');
        this.ellipse(123, y - 14, 9, 13, '#36554a55');
        this.text('CAMERA', 135.6, y + 77, 8, '#525c4a', 'center');
    } }
}
