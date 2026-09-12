export class Sound {
    ctx: AudioContext | null = null;
    muted = false;
    last = 0;
    unlock() { this.ctx ??= new AudioContext(); void this.ctx.resume(); }
    play(kind: string) { if (!this.ctx || this.muted)
        return; const t = this.ctx.currentTime; if (kind === 'hit' && t - this.last < .13)
        return; this.last = t; const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = kind === 'hurt' ? 'sawtooth' : 'triangle'; o.frequency.setValueAtTime(({ hit: 270, hurt: 110, level: 660, evolve: 880, chest: 520 } as Record<string, number>)[kind] ?? 330, t); o.frequency.exponentialRampToValueAtTime(kind === 'hurt' ? 45 : 440, t + .12); g.gain.setValueAtTime(.035, t); g.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + .21); }
}
