import { ID } from './config';

// UI artwork only: these paths deliberately do not share battle rendering helpers.
const backgrounds = [
    '#cce5aa', '#d8c9ef', '#f4bfac', '#d5e4e2', '#f3c7d7', '#f4b9b3',
    '#d1e4d8', '#efc4e0', '#bce0ec', '#f2c8ac', '#f0dfac', '#dfc9ec',
    '#cce3b9', '#eee0b5', '#bfe3d9', '#ced5ed', '#c3dbed', '#c7dfce',
    '#e6d2bc', '#f1dfac', '#c4e2bb', '#d8e7ad', '#f2d49c', '#d9c8ed',
];
const paths = new Map<string, Path2D>();
function geometry(data: string) {
    let path = paths.get(data);
    if (!path) { path = new Path2D(data); paths.set(data, path); }
    return path;
}

export function drawAbilityIcon(c: CanvasRenderingContext2D, id: number, x: number, y: number, size: number, evolved: boolean) {
    const ink = '#40534e', cream = '#fff8e7', light = '#fffdf4';
    c.save(); c.translate(x, y); c.scale(size / 40, size / 40);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const shape = (data: string, fill: string, outline = true) => {
        const path = geometry(data);
        c.fillStyle = fill; c.fill(path);
        if (outline) { c.strokeStyle = ink; c.lineWidth = 1.65; c.stroke(path); }
    };
    const stroke = (data: string, color = ink, width = 1.65) => {
        c.strokeStyle = color; c.lineWidth = width; c.stroke(geometry(data));
    };
    const oval = (cx: number, cy: number, rx: number, ry: number, fill: string, outline = false) => {
        c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
        if (outline) { c.strokeStyle = ink; c.lineWidth = 1.65; c.stroke(); }
    };
    c.beginPath(); c.roundRect(0, 0, 40, 40, 8); c.fillStyle = backgrounds[id] ?? '#d5e4d2'; c.fill();
    switch (id) {
        case ID.hiss:
            shape(evolved ? 'M8 16 Q14 20 8 24 L6 22 Q10 20 6 18 Z' : 'M8 17 Q13 20 8 23 L6 21 Q8 20 6 19 Z', cream);
            for (let i = 0; i < 3; i++) {
                const a = 14 + i * 7, top = 14 - i * 4, bottom = 26 + i * 4;
                shape(`M${a} ${top} Q${a + 9} 20 ${a} ${bottom} L${a - (evolved ? 3 : 2)} ${bottom - 2} Q${a + 3} 20 ${a - (evolved ? 3 : 2)} ${top + 2} Z`, i === 1 ? '#79aa88' : evolved ? '#fff0b1' : cream);
            }
            break;
        case ID.aura:
            shape('M20 6 C28 6 34 12 34 20 C34 28 28 34 20 34 C12 34 6 28 6 20 C6 12 12 6 20 6 Z M20 11 C15 11 11 15 11 20 C11 25 15 29 20 29 C25 29 29 25 29 20 C29 15 25 11 20 11 Z', evolved ? '#a18acb' : '#b49cd5');
            stroke('M10 15 Q13 8 21 9', cream, 2);
            shape(evolved ? 'M20 12 Q23 17 27 20 Q23 23 20 28 Q17 23 13 20 Q17 17 20 12 Z' : 'M20 14 Q22 18 25 20 Q22 22 20 26 Q18 22 15 20 Q18 18 20 14 Z', evolved ? '#fff0b8' : cream);
            break;
        case ID.claw:
            for (let i = 0; i < 3; i++) {
                c.save(); c.translate(i * 8 - 1, i === 1 ? -2 : 0);
                shape(evolved ? 'M8 32 Q8 16 20 8 Q14 20 13 29 Q11 32 8 32 Z' : 'M8 32 Q9 17 19 9 Q14 21 13 29 Q11 31 8 32 Z', evolved ? '#fff0ba' : cream);
                shape('M9 30 Q11 20 16 15 Q12 24 12 29 Z', '#e5b78e', false); c.restore();
            }
            break;
        case ID.paw:
            shape(evolved ? 'M13 7 Q19 5 25 7 L26 21 C34 24 34 31 28 33 L13 33 C7 32 6 25 12 22 Z' : 'M14 7 Q19 6 24 7 L25 21 C33 24 33 31 27 33 L13 33 C7 32 7 25 13 22 Z', cream);
            shape('M14 8 L24 8 L25 20 Q20 23 13 21 Z', evolved ? '#87ac98' : '#a7bba7', false);
            stroke('M15 12 L22 13 M15 17 L23 18', '#638b79', 2);
            shape('M10 28 Q17 32 30 28 Q31 32 26 33 L14 33 Q10 33 10 28 Z', '#e3d9bc', false);
            stroke('M17 27 L17 30 M23 27 L23 30', '#a3a58e', 1.3);
            break;
        case ID.gum:
            shape('M6 13 Q11 14 14 18 L26 18 Q29 14 34 13 L32 21 L34 29 Q29 28 26 25 L14 25 Q10 28 6 29 L8 21 Z', '#fff1ea');
            shape('M15 12 L25 12 Q29 12 29 17 L29 26 Q29 30 25 30 L15 30 Q11 30 11 26 L11 17 Q11 12 15 12 Z', evolved ? '#ce7fa8' : '#e999b9');
            shape('M12 23 Q20 27 28 23 L28 26 Q28 29 25 29 L15 29 Q12 29 12 26 Z', '#c17e9c', false);
            stroke(evolved ? 'M16 18 Q20 14 24 18 M16 21 L24 21' : 'M16 17 L24 17', cream, 2);
            break;
        case ID.truck:
            shape('M6 12 Q6 10 9 10 L23 10 Q25 10 25 13 L25 15 L29 15 Q31 15 32 18 L35 24 L35 29 L6 29 Z', evolved ? '#f6e4b4' : cream);
            shape('M25 16 L29 16 Q30 16 31 19 L34 25 L34 28 L25 28 Z', evolved ? '#579ca9' : '#7cb3c1', false);
            shape('M27 18 L29 18 L32 23 L27 23 Z', '#e1f6ee', false);
            stroke('M10 14 L21 14 M10 18 L21 18', '#c6bea1', 1.5);
            shape('M7 25 L24 25 L24 28 L7 28 Z', '#d6cba9', false);
            for (const wx of [12, 29]) { oval(wx, 29, 4, 4, ink); oval(wx, 29, 1.7, 1.7, '#d9e5dd'); }
            if (evolved) stroke('M27 26 L32 26', '#ffdf85', 2);
            break;
        case ID.ear:
            shape(evolved ? 'M8 32 Q5 20 10 6 Q12 3 17 8 Q29 15 33 30 Q20 27 8 32 Z' : 'M8 32 Q6 20 11 7 Q12 5 16 8 Q29 17 32 30 Q20 27 8 32 Z', evolved ? '#fff0cc' : '#f4e7d5');
            shape('M11 26 Q10 17 13 11 Q23 17 27 26 Q19 23 11 26 Z', evolved ? '#db96a6' : '#e9b2b2', false);
            shape('M13 12 Q20 16 26 25 Q20 20 13 21 Z', '#f7ccca', false);
            stroke('M9 30 Q18 26 28 29', '#c6aa92', 1.5);
            break;
        case ID.chicken:
            shape('M12 15 C6 20 6 31 13 33 Q20 36 28 32 C34 28 32 18 26 14 Z', cream);
            shape('M9 27 Q18 33 31 26 Q30 34 21 34 Q12 35 9 27 Z', '#e5d7bc', false);
            shape(evolved ? 'M14 15 Q9 10 13 7 Q16 5 18 9 Q17 3 21 4 Q25 4 24 10 Q28 5 30 9 Q32 14 25 16 Z' : 'M15 15 Q11 10 15 8 Q18 7 19 10 Q18 5 22 6 Q26 7 25 11 Q29 10 28 14 L24 16 Z', evolved ? '#d96e70' : '#e88781');
            oval(14, 22, 1.8, 2.6, ink); oval(26, 22, 1.8, 2.6, ink);
            shape('M20 23 Q26 25 23 29 Q20 32 17 28 Q15 25 20 23 Z', '#edb45c');
            stroke('M18 26 L22 26', '#fff0ba', 1.3);
            break;
        case ID.bean:
            c.save(); c.translate(evolved ? -1 : 0, 0);
            shape('M13 17 C5 17 5 31 12 33 C20 35 24 24 19 20 Q17 17 13 17 Z', evolved ? '#74a778' : '#91b880');
            shape('M11 21 C8 26 10 30 13 30', '#bedba0', false);
            stroke('M15 21 Q12 26 15 29', '#4e8060', 1.4);
            shape('M26 6 C18 6 18 16 22 20 C27 25 34 18 33 12 Q32 6 26 6 Z', evolved ? '#f4e5a4' : '#eaf0b9');
            stroke('M27 10 Q23 13 26 17', '#99ad76', 1.4);
            c.restore();
            break;
        case ID.honey:
            shape(evolved ? 'M12 11 L28 11 L28 16 Q34 20 32 29 Q31 34 26 34 L14 34 Q8 34 8 28 Q7 20 12 16 Z' : 'M13 11 L27 11 L27 16 Q32 19 31 28 Q31 33 26 33 L14 33 Q9 33 9 28 Q8 20 13 16 Z', '#f1b955');
            shape('M10 25 Q20 29 31 24 L30 29 Q30 33 25 33 L15 33 Q10 33 10 28 Z', '#d99c44', false);
            shape('M11 8 Q20 6 29 8 L29 13 Q20 15 11 13 Z', evolved ? '#729f8c' : '#f9e5b0');
            shape('M16 18 L24 18 Q27 18 27 22 L27 26 Q27 28 24 28 L16 28 Q13 28 13 25 L13 22 Q13 18 16 18 Z', cream, false);
            shape(evolved ? 'M20 18 C19 21 16 23 18 25 Q20 28 23 25 C25 23 22 20 20 18 Z' : 'M20 20 Q15 25 20 26 Q25 25 20 20 Z', '#d9a047', false);
            break;
        case ID.mambo:
            shape(evolved ? 'M15 10 L31 6 L31 26 C31 33 20 34 21 28 Q21 24 27 24 L27 14 L16 17 L16 29 C16 36 5 36 6 30 Q6 26 12 26 L12 14 Q12 11 15 10 Z' : 'M15 11 L30 8 L30 26 C30 32 20 33 21 28 Q21 24 27 24 L27 15 L16 18 L16 29 C16 35 6 35 7 30 Q7 26 13 26 L13 14 Q13 12 15 11 Z', evolved ? '#fff0b7' : cream);
            stroke('M16 13 L27 10', '#c0a0ca', 1.4);
            break;
        case ID.cooldown:
            shape('M17 6 L23 6 L23 10 L17 10 Z', '#7eaaa4');
            stroke('M27 10 L30 13', ink, 2.5);
            oval(20, 23, 12, 12, cream, true);
            shape('M20 12 A11 11 0 0 1 31 23 L20 23 Z', '#b5d7c8', false);
            stroke('M20 15 L20 23 L26 26', ink, 2);
            oval(20, 23, 1.8, 1.8, ink);
            break;
        case ID.recovery:
            shape('M17 7 L23 7 Q25 7 25 9 L25 15 L31 15 Q33 15 33 17 L33 23 Q33 25 31 25 L25 25 L25 31 Q25 33 23 33 L17 33 Q15 33 15 31 L15 25 L9 25 Q7 25 7 23 L7 17 Q7 15 9 15 L15 15 L15 9 Q15 7 17 7 Z', cream);
            shape('M16 24 L24 24 L24 30 Q24 32 22 32 L18 32 Q16 32 16 30 Z M25 20 L32 20 L32 23 Q32 24 30 24 L25 24 Z', '#e9c8c6', false);
            stroke('M18 11 L21 11', light, 2);
            break;
        case ID.health:
            shape('M20 33 C16 30 6 23 6 15 C6 6 15 5 20 12 C25 5 34 6 34 15 C34 23 24 30 20 33 Z', '#e98588');
            shape('M9 22 Q21 28 33 15 C32 23 24 30 20 32 Q13 27 9 22 Z', '#ce727e', false);
            stroke('M10 15 Q10 10 15 11', '#ffe3d5', 2.2);
            break;
        case ID.attack:
            shape('M13 25 L27 7 L33 6 L33 12 L18 29 Z', cream);
            shape('M16 26 L32 8 L32 12 L18 28 Z', '#d7c7a0', false);
            shape('M8 29 L12 25 L17 30 L12 34 Q10 35 8 33 Q6 31 8 29 Z', '#a5bda8');
            stroke('M10 22 L22 32', ink, 3);
            break;
        case ID.amount:
            for (const [px, py] of [[7, 13], [17, 8], [27, 13]]) {
                shape(`M${px} ${py + 7} Q${px} ${py + 3} ${px + 3} ${py} Q${px + 6} ${py + 3} ${px + 6} ${py + 7} L${px + 6} 32 L${px} 32 Z`, cream);
                shape(`M${px + 3} ${py + 7} L${px + 6} ${py + 7} L${px + 6} 31 L${px + 3} 31 Z`, '#dbc585', false);
                stroke(`M${px + 1} 27 L${px + 5} 27`, '#a79a72', 1.2);
            }
            break;
        case ID.revive:
            shape('M29 12 A13 13 0 1 0 32 24 L28 23 A9 9 0 1 1 26 15 L22 18 L33 18 L33 7 Z', '#a58bb9');
            shape('M18 15 L23 15 L23 21 L28 21 L28 26 L23 26 L23 31 L18 31 L18 26 L13 26 L13 21 L18 21 Z', cream);
            break;
        case ID.move:
            shape('M14 7 L24 9 L22 22 Q24 25 30 25 Q34 26 33 32 L9 32 Q7 31 9 26 L12 22 Z', cream);
            shape('M10 28 Q19 30 32 28 L32 31 L10 31 Z', '#a6ba8a', false);
            stroke('M17 22 L21 23 M16 25 L20 26', '#8b9c77', 1.4);
            stroke('M6 15 L10 15 M5 20 L9 20', '#6c9476', 2);
            break;
        case ID.xp:
            shape('M20 6 Q21 6 22 9 L25 15 L32 16 Q35 16 32 19 L27 24 L28 31 Q29 34 26 32 L20 29 L14 32 Q11 34 12 31 L13 24 L8 19 Q5 16 8 16 L15 15 L18 9 Q19 6 20 6 Z', '#fff0b2');
            shape('M20 9 L22 19 L31 18 L24 24 L26 31 L20 27 Z', '#e2bf76', false);
            stroke('M15 18 L18 17 L20 12', light, 1.6);
            break;
        case ID.pickup:
            shape('M7 9 L14 9 L14 22 C14 30 26 30 26 22 L26 9 L33 9 L33 22 C33 39 7 39 7 22 Z', '#79b4a4');
            shape('M8 10 L13 10 L13 17 L8 17 Z M27 10 L32 10 L32 17 L27 17 Z', cream, false);
            stroke('M10 23 Q10 31 18 32', '#bce0c9', 1.8);
            shape('M20 10 L23 14 L20 18 L17 14 Z', '#fff0b1');
            break;
        case ID.duration:
            shape('M12 9 L28 9 C28 15 25 17 22 20 C25 23 28 25 28 31 L12 31 C12 25 15 23 18 20 C15 17 12 15 12 9 Z', cream);
            shape('M15 13 L25 13 Q24 16 20 19 Q16 16 15 13 Z M20 23 Q24 25 25 29 L15 29 Q16 25 20 23 Z', '#c0afd8', false);
            stroke('M11 8 L29 8 M11 32 L29 32', '#64768d', 3);
            stroke('M20 20 L20 23', '#a38abc', 1.4);
            break;
        case ID.projectileSpeed:
            shape('M17 12 L25 12 Q28 12 35 20 Q28 28 25 28 L17 28 Q20 20 17 12 Z', cream);
            shape('M20 22 L32 22 Q28 27 25 27 L19 27 Z', '#9abed4', false);
            stroke('M7 14 L13 14 M5 20 L14 20 M7 26 L13 26', '#6b99ac', 2);
            break;
        case ID.range:
            oval(20, 20, 7, 7, cream, true);
            oval(20, 20, 2.5, 2.5, '#7fae96');
            for (let i = 0; i < 4; i++) {
                c.save(); c.translate(20, 20); c.rotate(i * Math.PI / 2);
                stroke('M7 -7 L13 -13 M7 -13 L13 -13 L13 -7', '#5b8e7b', 2); c.restore();
            }
            break;
        case ID.luck:
            stroke('M20 24 Q19 31 26 34', '#5b8d71', 2.3);
            shape('M20 20 C8 22 5 15 9 11 C13 7 18 11 20 16 C18 5 26 4 29 9 C32 14 27 18 23 20 C35 18 36 26 31 29 C26 32 22 27 20 23 C22 35 13 35 10 30 C7 25 13 21 20 20 Z', '#87b98a');
            shape('M20 19 C12 18 9 15 11 12 C14 9 18 14 20 19 Z M22 20 C28 21 33 24 30 27 C27 30 24 25 22 20 Z', '#cce2a6', false);
            stroke('M20 20 L24 12 M20 20 L15 28', '#609778', 1.3);
            break;
    }
    c.restore();
}
