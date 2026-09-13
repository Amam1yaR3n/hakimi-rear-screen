import { Game, SLASH_DURATION, CHICKEN_IMPACT, CHICKEN_DURATION } from './game';
import type { EliteHiss } from './game';
import { W, H, SAFE, ANCHOR, ITEMS, ID, ELITE_HISS } from './config';
import { characterSprite, spinosaurusSprite } from './sprites';
import { drawAbilityIcon } from './icons';
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
    private detailsScroll = 0;
    private detailsMaxScroll = 0;
    readonly detailsViewport = { x: 326, y: 132, w: 520, h: 364 };
    pressed = '';
    private clock = 0;
    private modeAge = 0;
    private lastMode = '';
    private lastX = 0;
    private lastY = 0;
    private motion = 0;
    private lean = 0;
    private hp = 1;
    private xp = 0;
    private shake = 0;
    private notice = '';
    private noticeLife = 0;
    private chestLife = 0;
    private particles: { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }[] = [];
    effect(kind: string, x: number, y: number) {
        if (kind === 'reset') { this.particles = []; this.hp = 1; this.xp = 0; this.lastX = this.lastY = this.motion = this.lean = this.shake = this.noticeLife = 0; this.lastMode = ''; this.chestLife = 0; return; }
        if (kind === 'elite') return;
        if (kind === 'chest') this.chestLife = .6;
        if (kind === 'bomb') this.shake = .22;
        const count = kind === 'kill' ? 7 : kind === 'hit' ? 3 : kind === 'xp' ? 3 : 12;
        const color = kind === 'hit' ? '#fff6d5' : kind === 'heal' ? '#f6b8a8' : kind === 'xp' || kind === 'chest' ? '#ffe28b' : '#d9f4b1';
        for (let i = 0; i < count; i++) {
            const a = i / count * Math.PI * 2 + this.clock, speed = kind === 'xp' ? 22 : 35 + i % 3 * 20;
            this.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 15, life: .38, max: .38, color, size: kind === 'kill' ? 3 : 2 });
        }
        if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
    }
    private entrance(delay = 0) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, (this.modeAge - delay) / .24)), 3); }

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
    ellipse(x: number, y: number, rx: number, ry: number, color: string, stroke = '', width = 2.8) { const c = this.c; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill(); if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = width;
        c.stroke();
    } }
    poly(points: number[][], color: string, stroke = '#242823') { const c = this.c; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = color; c.fill(); if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 2.8;
        c.lineJoin = 'round';
        c.stroke();
    } }
    spinosaurus(x: number, y: number, scale = 1, flash = false, t = 0, movement = 0, lean = 0) {
        const c = this.c, ink = '#202720';
        const fur = flash ? '#fff9d5' : '#969b85', shade = flash ? '#eee6c5' : '#79836e';
        const cream = flash ? '#fffef0' : '#ede9d9', stripe = flash ? '#c8c5a6' : '#626e58';
        c.save(); c.translate(x, y); c.scale(scale, scale);
        c.rotate(lean + Math.sin(t * 7) * .025 * movement);
        c.lineJoin = 'round'; c.lineCap = 'round';
        const finish = (color: string, outlined = true) => {
            c.fillStyle = color; c.fill();
            if (outlined) { c.strokeStyle = ink; c.lineWidth = 2.8; c.stroke(); }
        };
        this.ellipse(0, 28, 39, 7, '#00000028');
        const sprite = spinosaurusSprite(flash);
        if (sprite) {
            // The normalized sprite's feet sit at 248/256; anchor them at y=28.
            const bounce = Math.abs(Math.sin(t * 10)) * 2 * movement;
            c.drawImage(sprite, -48, -65 - bounce, 96, 96);
            c.restore();
            return;
        }
        // A filled, tapering tail keeps the silhouette smooth even at pickup size.
        c.beginPath(); c.moveTo(-25,-15);
        c.bezierCurveTo(-44,-29,-48,-8,-44,11);
        c.quadraticCurveTo(-42,24,-38,23);
        c.quadraticCurveTo(-36,22,-39,13);
        c.bezierCurveTo(-42,-4,-38,-14,-29,-5); c.closePath(); finish(fur);
        const leg = (hipX: number, footX: number, phase: number, far: boolean) => {
            const footY = 25 + Math.sin(t * 10 + phase) * 2 * movement;
            c.beginPath(); c.moveTo(hipX-5,-3);
            c.quadraticCurveTo(hipX-6,10,footX-5,footY);
            c.quadraticCurveTo(footX,footY+5,footX+5,footY);
            c.lineTo(hipX+5,1); c.closePath(); finish(far ? shade : fur);
            this.ellipse(footX+1,footY+1,7,4,far ? shade : cream,ink);
            if (!far) this.line(footX+2,footY,footX+2,footY+2,stripe,1.2);
        };
        leg(-16,-13,1,true); leg(22,31,4,true);
        // One uninterrupted arch replaces the former seven triangular fur spikes.
        c.beginPath(); c.moveTo(-29,7);
        c.bezierCurveTo(-35,-18,-26,-47,-10,-47);
        c.bezierCurveTo(7,-49,13,-32,20,-19);
        c.quadraticCurveTo(32,-8,26,9);
        c.quadraticCurveTo(15,13,4,3);
        c.quadraticCurveTo(-13,-7,-29,7); c.closePath(); finish(fur);
        c.beginPath(); c.moveTo(-22,-1);
        c.quadraticCurveTo(-8,-13,8,-3);
        c.quadraticCurveTo(19,4,24,-7);
        c.quadraticCurveTo(28,7,23,9);
        c.quadraticCurveTo(9,4,4,3);
        c.quadraticCurveTo(-11,-5,-22,2); c.closePath(); finish(cream,false);
        // Three broad tabby marks, inset from the outer contour.
        for (const [sx,sy] of [[-22,-30],[-12,-39],[-1,-35]]) {
            c.beginPath(); c.moveTo(sx-2,sy); c.quadraticCurveTo(sx+1,sy-2,sx+4,sy+1);
            c.lineTo(sx+5,sy+14); c.quadraticCurveTo(sx+1,sy+12,sx-2,sy); c.closePath(); finish(stripe,false);
        }
        leg(-24,-29,0,false); leg(16,22,3,false);
        // Slightly oversized face, folded-out ears and wide eyes sell the bluff.
        this.poly([[15,-8],[10,-27],[28,-18]],fur,ink);
        this.poly([[31,-18],[44,-26],[46,-6]],fur,ink);
        this.poly([[16,-15],[14,-22],[23,-17]],flash ? cream : '#c2b0a1','');
        this.poly([[36,-17],[41,-21],[42,-12]],flash ? cream : '#c2b0a1','');
        this.ellipse(30,-1,20,18,fur,ink);
        this.ellipse(31,8,16,9,cream);
        for (const [sx,sy] of [[23,-16],[30,-17],[36,-15]])
            this.poly([[sx-2,sy],[sx+2,sy],[sx+1,sy+7]],stripe,'');
        for (const ex of [22,38]) {
            this.ellipse(ex,-3,6.2,7,cream,ink,1.8);
            this.ellipse(ex+.5,-2,2.6,4.8,ink);
            this.ellipse(ex-.3,-4,1,1.3,'#fff');
        }
        this.line(16,-12,22,-13,stripe,2);
        this.line(37,-13,43,-11,stripe,2);
        this.poly([[27,4],[34,4],[30.5,8]],flash ? shade : '#806f64','');
        this.line(30.5,8,30.5,10,ink,1.4);
        this.ellipse(30.5,12,3.8,4,ink);
        this.ellipse(30.5,14,2.3,1.3,flash ? cream : '#c49b8d');
        for (const side of [-1,1]) {
            this.line(30+side*12,6,30+side*23,3,cream,1.3);
            this.line(30+side*13,9,30+side*22,11,cream,1.3);
        }
        c.restore();
    }
    character(type: number, x: number, y: number, scale = 1, flash = false, t = 0, movement = 1, lean = 0, hissing = false) {
        const c = this.c;
        c.save();
        c.translate(x, y - Math.abs(Math.sin(t * 10)) * 2.5 * movement);
        c.scale(scale * (1 + (flash ? .07 : 0)), scale * (1 - (flash ? .06 : 0)));
        c.rotate(Math.sin(t * 7) * .035 * movement + lean);
        const outline = '#202720';
        this.ellipse(0, 27, 28, 7, '#00000028');
        const sprite = characterSprite(type, flash, hissing);
        if (sprite) {
            c.drawImage(sprite, -36, -40, 72, 72);
            c.restore();
            return;
        }
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
    button(x: number, y: number, w: number, h: number, label: string, action: string, primary = false) { const hovered = this.hover === action; const c = this.c; c.save(); if (this.pressed === action) { c.translate(x + w / 2, y + h / 2); c.scale(.96, .96); c.translate(-x - w / 2, -y - h / 2); } this.box(x, y, w, h, primary ? (hovered ? '#d5ef94' : '#c1de7a') : (hovered ? '#424b3d' : '#2b332c'), 8, primary ? '' : '#515c49'); this.text(label, x + w / 2, y + h / 2, 14, primary ? '#20271b' : '#dedfcd', 'center', 700); c.restore(); this.buttons.push({ x, y, w, h, action }); }
    icon(id: number, x: number, y: number, size = 29, evolved = false) {
        drawAbilityIcon(this.c, id, x, y, size, evolved);
    }
    catEar(x: number, y: number, radius: number, angle: number) {
        const c = this.c; c.save(); c.translate(x,y); c.rotate(angle); c.scale(radius / 20, radius / 20);
        c.lineJoin = 'round'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(-17,15);
        c.bezierCurveTo(-20,7,-18,-14,-15,-21);
        c.bezierCurveTo(-13,-27,1,-17,8,-8);
        c.quadraticCurveTo(13,1,18,10);
        c.quadraticCurveTo(0,7,-17,15);
        c.fillStyle = '#a9a58c'; c.fill(); c.strokeStyle = '#30332a'; c.stroke();
        c.beginPath(); c.moveTo(-13,8);
        c.quadraticCurveTo(-15,-7,-13,-18);
        c.quadraticCurveTo(-5,-16,4,-5);
        c.quadraticCurveTo(-6,-1,-13,8);
        c.fillStyle = '#e8c1b4'; c.fill();
        c.restore();
    }
    chickenFace(x: number, y: number, scale: number) {
        const c = this.c; c.save(); c.translate(x,y); c.scale(scale,scale);
        this.ellipse(0, 12, 56, 73, '#f7f3e7', '#cac7b9');
        this.ellipse(-17, 2, 7, 10, '#251e1b'); this.ellipse(18, 2, 7, 10, '#251e1b');
        this.ellipse(-19,-1,2,3,'#fff'); this.ellipse(16,-1,2,3,'#fff');
        this.ellipse(0, -55, 18, 28, '#cf2718', '#922114');
        this.ellipse(-3,-67,15,20,'#e6381d');
        this.ellipse(-6,-72,5,7,'#f26c36');
        this.ellipse(0, 33, 23, 27, '#efad09', '#b6740b');
        this.ellipse(-6,25,8,12,'#ffd046');
        c.restore();
    }
    chickenOverlay(g: Game) {
        if (!g.chicken) return;
        const c = this.c, age = g.chicken.age;
        const growth = Math.min(1, age / CHICKEN_IMPACT);
        const fade = age <= CHICKEN_IMPACT ? 1 : Math.max(0, (CHICKEN_DURATION - age) / (CHICKEN_DURATION - CHICKEN_IMPACT));
        c.save(); c.beginPath(); c.rect(SAFE,0,W-SAFE,H); c.clip();
        c.globalAlpha = fade;
        const scale = .15 + 4.7 * growth * growth;
        if (g.chicken.evolved) {
            this.ellipse((SAFE+W)/2,H/2,scale*66,scale*80,'#ffe99b44');
            for (let i=0;i<12;i++) { const a=i*Math.PI/6; this.line((SAFE+W)/2+Math.cos(a)*60,H/2+Math.sin(a)*60,(SAFE+W)/2+Math.cos(a)*420,H/2+Math.sin(a)*420,'#fff0a566',5); }
        }
        this.chickenFace((SAFE+W)/2,H/2,scale); c.restore();
    }
    whitePaw(x: number, y: number, scale: number) {
        const c = this.c; c.save(); c.translate(x, y); c.scale(scale, scale);
        this.box(-15, -61, 30, 57, '#797b66', 10, '#394033');
        for (let i = 0; i < 3; i++) this.line(-13, -51 + i * 11, 10, -46 + i * 11, '#424b3c', 5);
        this.ellipse(1, 6, 24, 16, '#fffdf4', '#575e4d');
        for (let i = 0; i < 3; i++) this.line(-12 + i * 11, 7, -13 + i * 11, 16, '#cecfc2', 1.5);
        c.restore();
    }
    newAttacks(g: Game, ox: number, oy: number) {
        const c = this.c;
        c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
        for (const ear of g.ears) {
            const x = ear.x + ox, y = ear.y + oy;
            if (x + ear.radius < 0 || x - ear.radius > W || y + ear.radius < 0 || y - ear.radius > H) continue;
            this.catEar(x,y,ear.radius,ear.angle);
        }
        for (const t of g.trucks) {
            c.save(); c.translate(t.x + ox, t.y + oy); c.rotate(Math.atan2(t.dy, t.dx)); c.scale(g.attackRange, g.attackRange);
            this.box(-76, -30, 152, 65, '#27362d55', 8);
            for (const x of [-56, 44]) for (const y of [-32, 27]) this.box(x, y, 23, 9, '#25302d', 3);
            this.box(-75, -29, 106, 58, '#d4ddce', 4, '#3a514c');
            for (let x = -60; x < 25; x += 14) this.line(x, -24, x, 24, '#a6b8aa', 2);
            this.box(32, -29, 43, 58, '#438fa9', 6, '#314e50');
            this.box(53, -23, 13, 46, '#c3ecdf', 3);
            this.box(70, -25, 6, 10, '#fff0a5', 2); this.box(70, 15, 6, 10, '#fff0a5', 2);
            // Rear brake lamps and front bumper remain attached to the vehicle's heading.
            this.box(-77, -24, 5, 10, '#d46d56', 1); this.box(-77, 14, 5, 10, '#d46d56', 1);
            this.line(77, -27, 77, 27, '#d0dad2', 4);
            c.restore();
            // Keep lettering upright in all four directions, including vertical travel.
            const labelX = t.x + ox - t.dx * 22 * g.attackRange, labelY = t.y + oy - t.dy * 22 * g.attackRange;
            this.text('大运', labelX, labelY, 18 * g.attackRange, '#46655d', 'center', 900);
        }
        for (const gum of g.gums) {
            c.save(); c.translate(gum.x + ox, gum.y + oy); c.rotate(g.gumAngle); c.scale(g.attackRange, g.attackRange);
            this.ellipse(0, 4, 16, 9, '#75426133');
            this.box(-12, -9, 24, 18, g.evolved[ID.gum] ? '#f8c9e9' : '#efa9ca', 7, '#925573');
            this.line(-6, -4, 4, -4, '#fff0f7', 3); c.restore();
        }
        for (const p of g.paws) {
            const x = p.x + ox, y = p.y + oy, progress = Math.min(1, p.age / .18);
            c.save(); c.globalAlpha = Math.min(1, (.55 - p.age) / .18);
            this.ellipse(x, y, p.radius, p.radius * .6, '#fffce34a', '#f7f3d299');
            if (progress === 1) { c.strokeStyle = '#fffbe8'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, p.radius * (1 + (p.age - .18) * 2), p.radius * .65, 0, 0, Math.PI * 2); c.stroke(); }
            // Only the paw's approach and orientation change; both impacts share the same area.
            c.translate(x, y); c.rotate(p.angle);
            this.whitePaw(0, -(1 - progress) * 130, p.radius / 30); c.restore();
        }
        c.restore();
    }
    clawSwipe(g: Game) {
        const c = this.c;
        const progress = Math.max(0, Math.min(1, 1 - g.slash / SLASH_DURATION));
        // A fast outward swipe followed by a softer return, driven by game time.
        const swing = progress < .45
            ? 1 - Math.pow(1 - progress / .45, 3)
            : Math.pow((1 - progress) / .55, .7);
        const fade = Math.min(1, (1 - progress) / .25);
        const evolved = g.evolved[2];
        c.save();
        c.translate(ANCHOR.x, ANCHOR.y);
        c.scale(g.slashDirection * g.attackRange, g.attackRange);
        c.globalAlpha = fade * .8;
        c.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            c.beginPath();
            c.ellipse(25, 0, 90 - i * 9, 36 - i * 6, -.2,
                -1.1 + progress * .7, -.9 + Math.min(1, progress / .45) * 2.1);
            c.lineWidth = 5 - i * .7;
            c.strokeStyle = evolved ? '#ffbe76' : '#faf8e4';
            c.stroke();
        }
        c.globalAlpha = fade;
        c.translate(25 + swing * 65, -24 + progress * 48);
        c.rotate(-.9 + swing * 1.25 + progress * .5);
        c.scale(evolved ? 1.2 : 1, evolved ? 1.2 : 1);
        const outline = '#30382d', fur = evolved ? '#e7b078' : '#ede9d9';
        this.box(-12, 5, 24, 29, '#969b85', 10, outline);
        this.ellipse(0, 0, 22, 23, fur, outline);
        for (let i = 0; i < 4; i++) {
            const x = -18 + i * 12, y = Math.abs(i - 1.5) * 5 - 20;
            this.poly([[x - 4, y - 4], [x + 1, y - 17], [x + 5, y - 3]], '#fffbed', outline);
            this.ellipse(x, y, 8, 10, fur, outline);
            this.ellipse(x, y + 1, 4, 5, '#dc928c');
        }
        this.ellipse(0, 6, 12, 10, '#dc928c');
        this.ellipse(-6, 2, 7, 7, '#dc928c');
        this.ellipse(6, 2, 7, 7, '#dc928c');
        c.restore();
    }
    private eliteHissPath(hiss: EliteHiss, radius: number) {
        const c = this.c, halfAngle = ELITE_HISS[hiss.kind].halfAngle;
        c.beginPath();
        if (hiss.kind === 'cone') c.moveTo(0, 0);
        c.arc(0, 0, radius, hiss.angle - halfAngle, hiss.angle + halfAngle);
        c.closePath();
    }
    private eliteHisses(g: Game, ox: number, oy: number, released: boolean) {
        const c = this.c;
        for (const e of g.enemies) {
            const hiss = e.hiss;
            if (!e.alive || !hiss || hiss.phase !== (released ? 'recovery' : 'windup')) continue;
            const shape = ELITE_HISS[hiss.kind], x = hiss.x + ox, y = hiss.y + oy;
            // A source outside the screen may still threaten the visible playfield.
            if (x + shape.radius < 0 || x - shape.radius > W || y + shape.radius < 0 || y - shape.radius > H) continue;
            c.save(); c.translate(x, y);
            if (!released) {
                const progress = Math.max(0, Math.min(1, 1 - hiss.remaining / shape.windup));
                this.eliteHissPath(hiss, shape.radius);
                c.fillStyle = '#ed29332e'; c.fill();
                this.eliteHissPath(hiss, shape.radius * Math.sqrt(progress));
                c.fillStyle = '#f52f4248'; c.fill();
                this.eliteHissPath(hiss, shape.radius);
                c.strokeStyle = '#70232be6'; c.lineWidth = 6; c.stroke();
                const pulse = .78 + .22 * Math.sin(progress * Math.PI * 12);
                c.strokeStyle = `rgba(255, 76, 83, ${pulse})`; c.lineWidth = 3; c.stroke();
            } else {
                const progress = Math.max(0, Math.min(1, 1 - hiss.remaining / ELITE_HISS.recovery));
                // The whole warned area flashes at impact; expanding rings are visual only.
                this.eliteHissPath(hiss, shape.radius);
                c.fillStyle = `rgba(255, 102, 70, ${.35 * Math.max(0, 1 - progress * 5)})`; c.fill();
                c.strokeStyle = `rgba(255, 197, 163, ${.8 * (1 - progress)})`; c.lineWidth = 3; c.stroke();
                for (let i = 0; i < 3; i++) {
                    const travel = Math.min(1, progress * 1.5 - i * .14);
                    if (travel <= 0) continue;
                    c.beginPath();
                    c.arc(0, 0, shape.radius * travel, hiss.angle - shape.halfAngle, hiss.angle + shape.halfAngle);
                    c.strokeStyle = i === 0 ? '#fff1d9' : '#ff826f';
                    c.globalAlpha = (1 - progress) * (1 - i * .18);
                    c.lineWidth = 5 - i; c.stroke();
                }
            }
            c.restore();
        }
    }
    draw(g: Game, dt = 1 / 60) {
        const c = this.c;
        this.clock += dt;
        if (this.lastMode !== g.mode) { this.lastMode = g.mode; this.modeAge = 0; if (g.mode === 'evolution') this.shake = .24; }
        this.modeAge += dt;
        const playing = g.mode === 'playing', blend = 1 - Math.exp(-dt * 16);
        const dx = g.player.x - this.lastX, dy = g.player.y - this.lastY;
        this.motion += ((Math.hypot(dx, dy) > .01 ? 1 : 0) - this.motion) * blend;
        this.lean += (Math.sign(dx) * .07 - this.lean) * blend;
        this.lastX = g.player.x; this.lastY = g.player.y;
        this.hp += (Math.max(0, g.player.hp / g.maxHP) - this.hp) * blend;
        this.xp += (Math.min(1, g.xp / g.need) - this.xp) * blend;
        if (playing) {
            this.noticeLife = Math.max(0, this.noticeLife - dt);
            for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
            this.particles = this.particles.filter(p => p.life > 0);
        }
        this.chestLife = Math.max(0, this.chestLife - dt);
        this.shake = Math.max(0, this.shake - dt);

        this.buttons = [];
        c.clearRect(0, 0, W, H);
        c.fillStyle = '#83b65c';
        c.fillRect(0, 0, W, H);
        c.save();
        c.translate(Math.sin(this.clock * 75) * this.shake * 9, Math.cos(this.clock * 63) * this.shake * 6);
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
            const x = sx(d.x), y = sy(d.y) + (d.chest || d.kind ? Math.sin(g.time * 3 + d.x) * 2 : 0);
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
                } else if (d.kind === 'spinosaurus') {
                    this.ellipse(x, y, 22, 22, '#d9eec688', '#efffc9');
                    this.spinosaurus(x - 3, y + 5, .43);
                } else if (d.kind === 'bomb') {
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
        this.honeyGround(g, ox, oy);
        if (g.levels[ID.aura]) this.auraVisual(ANCHOR.x, ANCHOR.y, g.auraRange, g.evolved[ID.aura]);
        this.eliteHisses(g, ox, oy, false);
        for (const e of [...g.enemies].sort((a, b) => a.y - b.y)) {
            if (!e.alive) continue;
            const x = sx(e.x), y = sy(e.y);
            if (x < -50 || x > W + 50 || y < -50 || y > H + 50)
                continue;
            const braced = !!e.hiss && e.hiss.phase !== 'chase';
            this.character(e.elite ? 1 : 2, x, y, e.elite ? 1.05 : .62, e.flash > 0,
                g.time + e.x * .007 + e.y * .009, braced ? 0 : 1, 0, e.hiss?.phase === 'recovery');
            if (g.spinosaurusActive) {
                const top = y - (e.elite ? 48 : 32);
                this.box(x - 5, top - 8, 10, 17, '#303b2de6', 4);
                this.text('!', x, top, 15, '#f2e6a2', 'center', 800);
            }
        }
        if (g.intimidationWave) {
            const age = g.time - g.intimidationWave.startedAt;
            if (age >= 0 && age < .8) {
                c.save(); c.globalAlpha = (1 - age / .8) * .8;
                const radius = 25 + age * 850;
                this.ellipse(sx(g.intimidationWave.x), sy(g.intimidationWave.y), radius, radius, 'transparent', '#f0ffd0');
                c.restore();
            }
        }
        for (const wave of g.waves) {
            c.save();
            c.globalAlpha = Math.min(1, (1 - wave.radius / wave.maxRadius) * 2);
            this.sonicBands(sx(wave.x), sy(wave.y), wave.radius, wave.angle, wave.halfAngle, g.evolved[ID.hiss]);
            c.restore();
        }
        this.newAttacks(g, ox, oy);
        this.foodProjectiles(g, ox, oy);
        this.eliteHisses(g, ox, oy, true);
        if (g.spinosaurusActive) {
            this.spinosaurus(ANCHOR.x, ANCHOR.y, .85, g.invulnerable > 0, g.time, this.motion, this.lean);
        } else this.character(0, ANCHOR.x, ANCHOR.y, .85, g.invulnerable > 0, g.time, this.motion, this.lean);
        if (g.slash) {
            this.clawSwipe(g);
        }
        for (const n of g.numbers) {
            c.save(); c.globalAlpha = Math.min(1, n.life * 4);
            c.font = '800 17px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.strokeStyle = '#334124'; c.lineWidth = 3;
            c.strokeText(String(n.value), sx(n.x), sy(n.y) - 16);
            c.fillStyle = '#fff5cb'; c.fillText(String(n.value), sx(n.x), sy(n.y) - 16); c.restore();
        }
        for (const p of this.particles) {
            c.save(); c.globalAlpha = p.life / p.max;
            this.ellipse(sx(p.x), sy(p.y), p.size, p.size, p.color); c.restore();
        }
        c.restore();
        if (this.noticeLife > 0) { c.save(); c.globalAlpha = Math.min(1, this.noticeLife * 3); this.box(493, 119, 190, 32, '#303b2de8', 10); this.text(this.notice, 588, 135, 16, '#ffe3a1', 'center'); c.restore(); }
        if (g.bombFlash > 0) { c.fillStyle = `rgba(255,232,163,${g.bombFlash * .55})`; c.fillRect(0, 0, W, H); }
        this.chickenOverlay(g);
        this.chestArrows(g, ox, oy);
        this.hud(g);
        if (g.mode !== 'playing' && g.mode !== 'ready') this.buttons = [];
        if (g.mode === 'chest') this.chestPanel(g);
        if (g.mode === 'details') this.detailsPanel(g);
        if (g.mode === 'choice')
            this.choices(g);
        else if (g.mode === 'paused')
            this.panel('稍息，基米。', '', () => { this.button(426, 290, 320, 46, '继续生存', 'resume', true); this.button(426, 350, 320, 40, '重新校准', 'calibrate'); this.button(426, 404, 320, 34, '能力与被动', 'details'); });
        else if (g.mode === 'evolution')
            this.panel('进 化 完 成', ITEMS[g.lastEvolution].name + '  →  ' + ITEMS[g.lastEvolution].evo, () => { this.icon(g.lastEvolution, 560, 255, 54, true); this.text('现在，轮到它们害怕了。', 588, 333, 16, '#c3c9ab', 'center'); this.button(446, 379, 284, 45, '继续生存', 'resume', true); });
        else if (g.mode === 'over')
            this.panel(g.won ? '十分钟，猫还在。' : '这次先活到这里。', g.won ? '生存成功 / SURVIVED' : '挑战结束 / GAME OVER', () => { c.save(); c.globalAlpha = this.entrance(.12); this.text(`${this.time(g.time)}   ·   击败 ${g.kills}   ·   Lv.${g.level}`, 588, 282, 22, '#d3e49e', 'center'); this.text('最佳生存  ' + this.time(Math.max(this.best, g.time)), 588, 324, 13, '#a7b09a', 'center'); c.restore(); c.save(); c.globalAlpha = this.entrance(.24); this.button(446, 369, 284, 46, '再来一局', 'start', true); c.restore(); });
        if (g.mode === 'evolution' && this.modeAge < .7) {
            c.save(); c.globalAlpha = (1 - this.modeAge / .7) * .8;
            for (let i = 0; i < 12; i++) {
                const a = i * Math.PI / 6, r = 35 + this.modeAge * 145;
                this.line(588 + Math.cos(a) * r, 282 + Math.sin(a) * r, 588 + Math.cos(a) * (r + 12), 282 + Math.sin(a) * (r + 12), '#ffe5a0', 3);
            }
            c.restore();
        }
        if (this.chestLife > 0) { c.save(); c.globalAlpha = Math.min(1, this.chestLife * 5); this.text('宝箱开启！', 588, 145 - (1 - this.chestLife / .6) * 10, 19, '#ffe5a0', 'center'); c.restore(); }
        // Physical camera cutouts stay blank and fixed above every canvas effect.
        this.lenses();
    }
    private auraVisual(x: number, y: number, radius: number, evolved: boolean, icon = false) {
        const c = this.c;
        c.save(); c.translate(x, y);
        this.ellipse(0, 0, radius, radius, icon ? '#7961a844' : '#a99bd718');
        // Keep the outer edge on the actual damage radius; all decoration sits inside it.
        c.lineWidth = icon ? 2 : 1.5;
        this.ellipse(0, 0, radius - c.lineWidth / 2, radius - c.lineWidth / 2, 'transparent', '#8873bbaa', c.lineWidth);
        c.lineWidth = icon ? 3 : 5;
        this.ellipse(0, 0, radius * .88, radius * .88, 'transparent', '#cbb9ee77', c.lineWidth);
        c.lineWidth = icon ? 1.5 : 2;
        this.ellipse(0, 0, radius * .73, radius * .73, 'transparent', evolved ? '#dde8a9bb' : '#b7a0db66', c.lineWidth);
        const count = icon ? 4 : 6, size = icon ? 2 : 3.5;
        for (let i = 0; i < count; i++) {
            const angle = i * Math.PI * 2 / count + Math.PI / 6;
            const px = Math.cos(angle) * radius * .8, py = Math.sin(angle) * radius * .8;
            this.poly([[px,py-size],[px+size*.65,py],[px,py+size],[px-size*.65,py]], evolved ? '#f0efc8cc' : '#e5d9f6bb', '');
        }
        if (icon) this.poly([[0,-5],[3,0],[0,5],[-3,0]], evolved ? '#fff4c9' : '#fff0ee', '');
        c.restore();
    }
    private sonicBands(x: number, y: number, radius: number, angle: number, halfAngle: number, evolved: boolean, icon = false) {
        const c = this.c, spacing = icon ? 6 : 15;
        c.save(); c.translate(x, y); c.rotate(angle); c.lineJoin = 'round'; c.lineCap = 'round';
        for (let i = 0; i < (evolved ? 4 : 3); i++) {
            const r = radius - i * spacing;
            if (r <= 1) continue;
            const thickness = Math.min(r * .38, icon ? 3 : 7 - i * .8);
            // A tapered inner curve gives the wave a broad center and fine tips.
            c.beginPath(); c.arc(0, 0, r, -halfAngle, halfAngle);
            for (let step = 16; step >= 0; step--) {
                const t = step / 16, a = -halfAngle + t * halfAngle * 2;
                const inner = r - thickness * (.18 + .82 * Math.sin(Math.PI * t));
                c.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
            }
            c.closePath(); c.fillStyle = i === 0 ? '#e1fff1' : i % 2 ? '#9cdcc6' : '#c4f1dd'; c.fill();
            c.strokeStyle = icon ? '#548a76' : '#69aa9188'; c.lineWidth = icon ? .8 : 1; c.stroke();
        }
        if (radius > spacing) {
            const r = Math.max(2, radius - spacing * 1.5), size = icon ? 1.8 : Math.min(3.5, radius * .035);
            for (const side of [-1, 1]) {
                const a = side * halfAngle * .6;
                this.ellipse(Math.cos(a)*r, Math.sin(a)*r, size*1.6, size, '#d8f8e9aa');
            }
        }
        c.restore();
    }
    honeyJar(x: number, y: number, scale: number, evolved = false) {
        const c = this.c; c.save(); c.translate(x, y); c.scale(scale, scale);
        c.lineWidth = 1.6; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(-7,-11); c.quadraticCurveTo(-12,-8,-12,-3);
        c.lineTo(-11,8); c.quadraticCurveTo(-11,13,-6,13); c.lineTo(6,13);
        c.quadraticCurveTo(11,13,11,8); c.lineTo(12,-3); c.quadraticCurveTo(12,-8,7,-11); c.closePath();
        c.fillStyle = evolved ? '#d99b2e' : '#edb449'; c.fill(); c.strokeStyle = '#795328'; c.stroke();
        this.box(-8,5,16,5,evolved ? '#bf7d25' : '#d79a32',3);
        this.box(-10,-12,20,5,'#f7d987',2,'#795328');
        this.box(-12,-16,24,6,evolved ? '#ecce79' : '#f5dfaa',2,'#795328');
        this.line(-8,-14,7,-14,'#fff2c7',1.5);
        this.box(4,-10,4,9,'#ffdb70',2);
        this.ellipse(6,-1,2,2.5,'#ffdb70');
        this.line(-8,-5,-8,2,'#fff0b5',2);
        this.box(-6,-3,13,11,'#fff0bd',3,'#c9913c');
        this.text('蜜',.5,2.5,9,'#81591e','center');
        c.restore();
    }
    honeyGround(g: Game, ox: number, oy: number) {
        const c = this.c;
        for (const pool of g.honeyPools) {
            const x = pool.x + ox, y = pool.y + oy;
            if (pool.fall > 0) { this.ellipse(x,y,pool.radius,pool.radius,'#e6b44c18','#c9a45755'); continue; }
            c.save(); c.globalAlpha = Math.min(1,pool.life * 3);
            const r = pool.radius;
            // Stable scallops stay within 4% of the circular hit area, without random shimmer.
            c.beginPath();
            for (let i = 0; i <= 64; i++) {
                const a = i / 64 * Math.PI * 2;
                const edge = r * (.98 + .02 * Math.cos(a * 8));
                const px = x + Math.cos(a) * edge, py = y + Math.sin(a) * edge;
                if (i === 0) c.moveTo(px,py); else c.lineTo(px,py);
            }
            c.closePath(); c.fillStyle = pool.evolved ? '#d99a304d' : '#edb64a42'; c.fill();
            c.strokeStyle = '#bb832c99'; c.lineWidth = 1.5; c.stroke();
            this.ellipse(x+r*.12,y+r*.16,r*.66,r*.55,pool.evolved ? '#c8872426' : '#dca03322');
            this.ellipse(x-r*.26,y-r*.32,r*.3,r*.1,'#fff0b77d');
            this.ellipse(x+r*.37,y+r*.24,r*.17,r*.055,'#ffe4a066');
            c.lineWidth = 1;
            for (const [dx,dy,size] of [[-.48,.18,.055],[.2,-.42,.07],[.48,-.12,.04]]) {
                this.ellipse(x+r*dx,y+r*dy,r*size,r*size,'#ffe8a344','#c48c3b88',1);
            }
            if (pool.evolved) {
                c.lineCap = 'round'; c.lineWidth = 2; c.strokeStyle = '#ffe3a077';
                for (let i = 0; i < 2; i++) {
                    c.beginPath(); c.ellipse(x,y,r*(.55+i*.2),r*(.48+i*.2),-.25,.15,1.6); c.stroke();
                }
            }
            c.restore();
        }
        for (const wave of g.mamboWaves) {
            c.save(); c.beginPath(); c.rect(ANCHOR.x-wave.width/2,0,wave.width,H); c.clip();
            c.fillStyle=wave.evolved?'#c790ee25':'#8ed6d51c';c.fillRect(ANCHOR.x-wave.width/2,0,wave.width,H);
            this.line(ANCHOR.x-wave.width/2,0,ANCHOR.x-wave.width/2,H,'#e3b7f777',2);
            this.line(ANCHOR.x+wave.width/2,0,ANCHOR.x+wave.width/2,H,'#b2e9d777',2);
            for(let i=0;i<24;i++) {
                const y=(i*47+g.time*80)%H, x=ANCHOR.x+Math.sin(i*2.4+g.time*3)*wave.width*.38;
                this.text(i%2?'♪':'♫',x,y, wave.evolved?23:17,['#bc85df','#5fbdac','#e7b84b'][i%3],'center');
            }
            c.restore();
        }
    }
    foodProjectiles(g: Game, ox: number, oy: number) {
        for (const b of g.beans) {
            const c=this.c; c.save();c.translate(b.x+ox,b.y+oy);c.rotate(Math.atan2(b.vy,b.vx));
            this.ellipse(0,0,b.radius,b.radius,'#83b644','#45642e');this.line(-b.radius*.4,-b.radius*.2,b.radius*.4,-b.radius*.2,'#e2efb1',1);c.restore();
        }
        for(const p of g.honeyPools) if(p.fall>0) this.honeyJar(p.x+ox,p.y+oy-150*p.fall/.35,Math.max(.6,p.initialRadius/50),p.evolved);
    }
    chestArrows(g: Game, ox: number, oy: number) {
        for (const d of g.drops) {
            if (!d.chest) continue;
            const x = d.x + ox, y = d.y + oy;
            if (x >= SAFE + 14 && x <= W - 14 && y >= 14 && y <= H - 14) continue;
            const dx = x - ANCHOR.x, dy = y - ANCHOR.y;
            const t = Math.min(dx < 0 ? (SAFE + 24 - ANCHOR.x) / dx : dx > 0 ? (W - 24 - ANCHOR.x) / dx : Infinity,
                dy < 0 ? (120 - ANCHOR.y) / dy : dy > 0 ? (H - 26 - ANCHOR.y) / dy : Infinity);
            const px = ANCHOR.x + dx * t, py = ANCHOR.y + dy * t;
            const c = this.c; c.save(); c.translate(px, py); c.rotate(Math.atan2(dy, dx));
            this.poly([[12,0],[-6,-8],[-3,0],[-6,8]], '#ffe59b', '#54412c'); c.restore();
            this.box(px - 9, py + 12, 18, 13, '#d7a442', 3, '#54412c');
            this.line(px,py+15,px,py+21,'#fff0b5',3);
        }
    }
    chestPanel(g: Game) {
        this.backdrop();
        const c = this.c, count = g.chestRewards.length, age = g.chestAge, done = age >= g.chestDuration;
        const color = count === 5 ? '#ffe8a0' : count === 3 ? '#d4c5ff' : '#d6e9b2';
        this.box(298, 111, 582, 370, '#202a20', 18, color);
        this.text(count === 5 ? '金光满箱' : count === 3 ? '惊喜三连' : '宝箱开启', 588, 151, 27, color, 'center', 800);
        const open = Math.min(1, Math.max(0, (age - .3) * 2));
        c.save(); c.beginPath(); c.rect(305,178,568,120); c.clip();
        if (count > 1) for (let i = 0; i < (count === 5 ? 20 : 8); i++) {
            const a = i * Math.PI * 2 / (count === 5 ? 20 : 8) + age * .3;
            c.globalAlpha = .15 + open * .2;
            this.line(588 + Math.cos(a)*38,236+Math.sin(a)*25,588+Math.cos(a)*160,236+Math.sin(a)*110,color,count === 5 ? 5 : 2);
        }
        c.globalAlpha = 1;
        this.ellipse(588,266,58,9,'#111b17');
        this.box(550,223,76,42,count === 5 ? '#c99e46' : '#977548',6,color);
        c.save(); c.translate(550,223); c.rotate(-open*.42); this.box(0,-19-open*12,76,24,count===5?'#e8c96f':'#b79a62',6,color); c.restore();
        this.box(582,235,12,16,color,2);
        if (count === 5) for (let i=0;i<18;i++) {
            const x=345+(i*83%480), y=180+(i*37+age*30)%102;
            this.text('✦',x,y,10+i%3*3,color,'center');
        }
        c.restore();
        const width = count === 5 ? 100 : count === 3 ? 156 : 240, gap = 10, start = 588 - (count*width+(count-1)*gap)/2;
        g.chestRewards.forEach((r,i) => {
            const visible = done || age >= .7+i*(count===5?.65:.55), x=start+i*(width+gap);
            this.box(x,300,width,112,'#303d30',9,visible ? color : '#4d5945');
            if (!visible) { this.text('✦',x+width/2,352,24,'#65715b','center'); return; }
            this.icon(r.id,x+width/2-18,310,36,r.kind==='evolution' || g.evolved[r.id]);
            this.text(r.kind==='heal'?'生命恢复':r.kind==='evolution'?ITEMS[r.id].evo!:ITEMS[r.id].name,x+width/2,365,count===5?12:15,'#f5f0df','center');
            this.text(r.kind==='heal'?'+30 生命':r.kind==='evolution'?'进化完成':`Lv.${r.level-1} → ${r.level}`,x+width/2,391,12,color,'center');
        });
        this.buttons = [{ x: 0, y: 0, w: W, h: H, action: 'chest' }];
    }
    resetDetails() { this.detailsScroll = 0; this.detailsMaxScroll = 0; this.hover = this.pressed = ''; }
    scrollDetails(delta: number) {
        this.detailsScroll = Math.max(0, Math.min(this.detailsMaxScroll, this.detailsScroll + delta));
    }
    detailsContains(x: number, y: number) {
        const v = this.detailsViewport;
        return x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h;
    }
    private detailsPanel(g: Game) {
        const c = this.c, v = this.detailsViewport;
        this.backdrop();
        this.box(306, 61, 560, 457, '#202a20', 16, '#566147');
        this.text('能力与被动', 330, 96, 23, '#e9ead7', 'left', 800);
        this.button(706, 79, 134, 36, '关闭 · 继续', 'resume', true);
        this.line(326, 122, 846, 122, '#465440', 1);
        // Measure with the same font used to draw, so long descriptions never overflow.
        const wrap = (value: string, width: number, size: number) => {
            c.font = `600 ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;
            const lines: string[] = [];
            let line = '';
            for (const char of value) {
                if (line && c.measureText(line + char).width > width) { lines.push(line); line = ''; }
                line += char;
            }
            if (line) lines.push(line);
            return lines;
        };
        type Entry = { id: number; title: string[]; effect: string[]; recipe: string[]; height: number };
        const groups = [
            { label: '能力 · 最多四种', empty: '尚未获得能力', ids: g.weapons },
            { label: '被动 · 数量不限', empty: '尚未获得被动', ids: g.passives },
        ].map(group => ({ ...group, rows: group.ids.map(id => {
            const item = ITEMS[id];
            const title = wrap(`${g.evolved[id] ? item.evo : item.name} · ${item.maxLevel ? `${g.levels[id]}/${item.maxLevel} 级` : '不可升级'}`, 416, 16);
            const effect = wrap(g.description(id) + (item.upgrades && !g.evolved[id] && g.levels[id] < item.maxLevel ? ` · 下一级：${item.upgrades[g.levels[id]]}` : ''), 474, 13);
            const recipe = item.prerequisite === undefined ? [] : wrap(g.evolved[id]
                ? `已进化 · ${ITEMS[item.prerequisite].name} + 满级能力 + 宝箱`
                : `进化：${item.name}八级 + ${ITEMS[item.prerequisite].name}（${g.owns(item.prerequisite) ? '已拥有' : '未拥有'}）+ 宝箱 → ${item.evo}`, 474, 12);
            return { id, title, effect, recipe, height: 24 + Math.max(36, title.length * 22) + 8 + effect.length * 20 + (recipe.length ? 8 + recipe.length * 18 : 0) } satisfies Entry;
        }) }));
        const contentHeight = groups.reduce((height, group) => height + 38 + (group.rows.length ? group.rows.reduce((sum, row) => sum + row.height + 10, 0) : 42), 0);
        this.detailsMaxScroll = Math.max(0, contentHeight - v.h);
        this.scrollDetails(0);
        c.save(); c.beginPath(); c.rect(v.x, v.y, v.w, v.h); c.clip();
        let y = v.y - this.detailsScroll;
        for (const group of groups) {
            this.text(group.label, v.x + 4, y + 18, 14, '#c1de7a');
            y += 38;
            if (!group.rows.length) { this.text(group.empty, v.x + 14, y + 14, 13, '#aebc9c'); y += 42; }
            for (const row of group.rows) {
                if (y + row.height >= v.y && y <= v.y + v.h) {
                    this.box(v.x, y, 502, row.height, '#2c3829', 9);
                    this.icon(row.id, v.x + 14, y + 12, 36, g.evolved[row.id]);
                    row.title.forEach((line, index) => this.text(line, v.x + 62, y + 23 + index * 22, 16, '#f1efdc'));
                    let lineY = y + 12 + Math.max(36, row.title.length * 22) + 18;
                    for (const line of row.effect) { this.text(line, v.x + 14, lineY, 13, '#d3dbc4'); lineY += 20; }
                    if (row.recipe.length) lineY += 8;
                    for (const line of row.recipe) { this.text(line, v.x + 14, lineY, 12, '#aebc9c'); lineY += 18; }
                }
                y += row.height + 10;
            }
        }
        c.restore();
        if (this.detailsMaxScroll > 0) {
            const thumb = Math.max(30, v.h * v.h / contentHeight);
            this.box(v.x + v.w - 7, v.y, 4, v.h, '#35432f', 2);
            this.box(v.x + v.w - 7, v.y + this.detailsScroll / this.detailsMaxScroll * (v.h - thumb), 4, thumb, '#9bad86', 2);
        }
    }
    time(t: number) { return `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`; }
    hud(g: Game) {
        this.cameraRing(143, this.xp, '#bed984');
        this.cameraRing(429, this.hp, this.hp <= .25 ? '#f07868' : '#e7a394');
        this.text(this.time(g.time), SAFE + 16, 27, 27, '#303a2d', 'left', 800);
        this.text('击败 ' + g.kills, 588, 27, 15, '#39442f', 'center');
        this.button(769, 12, 48, 29, '', 'mute');
        this.button(825, 12, 51, 29, '', 'pause');
        const ink = '#eee9d8', c = this.c;
        this.poly([[780,23],[785,23],[791,18],[791,35],[785,30],[780,30]], ink, '');
        if (this.muted) {
            this.line(798,23,805,30,ink,2); this.line(805,23,798,30,ink,2);
        } else {
            c.save(); c.strokeStyle = ink; c.lineWidth = 1.8;
            for (const r of [6,10]) { c.beginPath(); c.arc(791,26.5,r,-.8,.8); c.stroke(); }
            c.restore();
        }
        this.line(846,20,846,33,ink,3); this.line(854,20,854,33,ink,3);
    }
    backdrop() { this.c.fillStyle = '#1e261cc9'; this.c.fillRect(0, 0, W, H); }
    panel(title: string, subtitle: string, body: () => void) { this.backdrop(); this.c.save(); this.c.globalAlpha = this.entrance(); this.box(316, 126, 545, 332, '#202a20', 18, '#566147'); this.text(title, 588, 183, 31, '#e9ead7', 'center', 800); this.text(subtitle, 588, 222, 13, '#aeba98', 'center'); body(); this.c.restore(); }
    choices(g: Game) {
        this.backdrop();
        const width = 170, gap = 14, total = g.choices.length * width + (g.choices.length - 1) * gap, start = SAFE + (W - SAFE - total) / 2;
        const center = SAFE + (W - SAFE) / 2;
        this.c.save(); this.c.globalAlpha = this.entrance();
        this.text(`等级 ${g.level}`, center, 140, 28, '#e9ead7', 'center', 800);
        const barX = center - 120.5, barY = 416;
        this.box(barX, barY, 241, 38, '#f2eddc', 8);
        this.text('能力', barX + 21, barY + 19, 11, '#505943', 'center');
        for (let slot = 0; slot < 4; slot++) {
            const x = barX + 40 + slot * 49, id = g.weapons[slot];
            if (id === undefined) { this.box(x, barY + 4, 29, 29, '#d6d7c6', 6); this.text('＋', x + 14, barY + 19, 14, '#a6ad98', 'center'); }
            else { this.icon(id, x, barY + 4, 29, g.evolved[id]); this.text(g.evolved[id] ? '★' : String(g.levels[id]), x + 37, barY + 19, 11, '#505943', 'center'); }
        }
        this.c.restore();
        g.choices.forEach((id, i) => {
            const x = start + i * (width + gap), item = ITEMS[id];
            this.c.save(); this.c.globalAlpha = this.entrance(i * .055);
            this.box(x, 180, width, 212, this.hover === 'pick:' + id ? '#414d36' : '#2b3528', 12, '#667451');
            this.icon(id, x + 15, 200, 35, g.evolved[id]);
            this.text(item.maxLevel === 0 ? '一次性 · 不可升级' : g.levels[id] ? `lv.${g.levels[id]} → lv.${g.levels[id] + 1}` : '新！', x + width - 12, 218, 12, item.color, 'right');
            this.text(item.name, x + 18, 268, 20, '#f1efdc');
            const lines = (item.upgrades?.[g.levels[id]] ?? item.desc).match(/.{1,12}/gu) ?? [];
            lines.forEach((line, j) => this.text(line, x + 18, 305 + j * 18, 11, '#bfc7ad'));
            this.c.restore();
            this.buttons.push({ x, y: 180, w: width, h: 212, action: 'pick:' + id });
        });
    }
    private cameraRing(y: number, progress: number, color: string) {
        const c = this.c, start = -Math.PI / 2;
        c.save();
        c.lineWidth = 14;
        c.lineCap = 'round';
        c.beginPath(); c.arc(135.6, y, 123.5, 0, Math.PI * 2);
        c.strokeStyle = '#343d30'; c.stroke();
        const value = Math.max(0, Math.min(1, progress));
        if (value > .001) {
            c.beginPath(); c.arc(135.6, y, 123.5, start, start + Math.PI * 2 * value);
            c.strokeStyle = color; c.stroke();
        }
        c.restore();
    }
    lenses() { for (const y of [143, 429]) {
        this.ellipse(135.6, y, 114.4, 114.4, '#111510');
    } }
}
