export class Sound {
    ctx: AudioContext | null = null;
    muted = false;
    private last = new Map<string, number>();
    unlock() { this.ctx ??= new AudioContext(); void this.ctx.resume(); }
    play(kind: string) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const gap = kind === 'pickup' ? .09 : kind === 'hit' ? .13 : .06;
        if (t - (this.last.get(kind) ?? -Infinity) < gap) return;
        this.last.set(kind, t);
        const notes = ({ hit: [270], hurt: [110], pickup: [740], ui: [480], level: [523, 659, 784], evolve: [523, 659, 784, 1047], chest: [659, 880] } as Record<string, number[]>)[kind] ?? [330];
        notes.forEach((frequency, i) => {
            const start = t + i * .075, duration = kind === 'pickup' || kind === 'ui' ? .08 : .18;
            const o = this.ctx!.createOscillator(), g = this.ctx!.createGain();
            o.type = kind === 'hurt' ? 'sawtooth' : 'triangle';
            o.frequency.setValueAtTime(frequency, start);
            o.frequency.exponentialRampToValueAtTime(kind === 'hurt' ? 45 : kind === 'hit' ? 170 : frequency * 1.12, start + duration);
            g.gain.setValueAtTime(0, start);
            g.gain.linearRampToValueAtTime(kind === 'pickup' ? .015 : .03, start + .006);
            g.gain.exponentialRampToValueAtTime(.001, start + duration);
            o.connect(g); g.connect(this.ctx!.destination);
            o.onended = () => { o.disconnect(); g.disconnect(); };
            o.start(start); o.stop(start + duration + .01);
        });
    }
}
