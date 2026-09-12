const names = ['hakimi', 'maodie', 'dagoujiao'] as const;
type Sprite = { normal: HTMLCanvasElement; flash: HTMLCanvasElement };
const sprites: (Sprite | undefined)[] = [];

// Shared across renderers. Opaque drafts keep the procedural character visible
// until the artist replaces the same PNG with a transparent cutout.
export const characterSpritesReady = Promise.all(names.map(async (name, type) => {
    try {
        const image = new Image();
        image.src = `${import.meta.env.BASE_URL}assets/characters/${name}.png`;
        await image.decode();
        const source = document.createElement('canvas');
        source.width = image.naturalWidth; source.height = image.naturalHeight;
        const context = source.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(image, 0, 0);
        const { data } = context.getImageData(0, 0, source.width, source.height);
        let left = source.width, top = source.height, right = -1, bottom = -1, transparent = 0;
        for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
            const alpha = data[(y * source.width + x) * 4 + 3];
            if (alpha < 16) transparent++;
            if (alpha > 16) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
        }
        if (transparent < source.width * source.height * .01 || right < left) return false;
        const width = right - left + 1, height = bottom - top + 1;
        const normal = document.createElement('canvas');
        normal.width = normal.height = 256;
        const c = normal.getContext('2d')!;
        const ratio = 240 / Math.max(width, height), w = width * ratio, h = height * ratio;
        c.drawImage(source, left, top, width, height, (256 - w) / 2, 248 - h, w, h);
        const flash = document.createElement('canvas');
        flash.width = flash.height = 256;
        const f = flash.getContext('2d')!;
        f.drawImage(normal, 0, 0);
        f.globalCompositeOperation = 'source-atop';
        f.fillStyle = '#fff6cdbb'; f.fillRect(0, 0, 256, 256);
        sprites[type] = { normal, flash };
        return true;
    } catch {
        return false;
    }
}));

export function characterSprite(type: number, flash: boolean) {
    return flash ? sprites[type]?.flash : sprites[type]?.normal;
}
