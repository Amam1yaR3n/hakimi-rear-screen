export class Input {
    keys = new Set<string>();
    raw = { x: 0, y: 0 };
    base = { x: 0, y: 0 };
    vector = { x: 0, y: 0 };
    received = false;
    active = false;
    pendingCalibration = true;
    message = '';
    mobile = /Android|iPhone|iPad/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
    constructor() {
        window.addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key))
            e.preventDefault(); this.keys.add(e.key.toLowerCase()); });
        window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
        window.addEventListener('blur', () => this.keys.clear());
        window.addEventListener('deviceorientation', e => { if (e.beta === null || e.gamma === null)
            return; const angle = (screen.orientation?.angle ?? 0) * Math.PI / 180; this.raw = { x: e.gamma * Math.cos(angle) + e.beta * Math.sin(angle), y: e.beta * Math.cos(angle) - e.gamma * Math.sin(angle) }; this.received = true; if (this.pendingCalibration)
            this.calibrate(); });
        screen.orientation?.addEventListener('change', () => { this.pendingCalibration = true; });
    }
    async enable() {
        this.message = '';
        this.pendingCalibration = true;
        try {
            const api = DeviceOrientationEvent as unknown as {
                requestPermission?: () => Promise<string>;
            };
            if (api.requestPermission && await api.requestPermission() !== 'granted')
                throw Error('传感器权限被拒绝，请在浏览器设置中允许后重试。');
            this.active = true;
        }
        catch (e) {
            this.message = e instanceof Error ? e.message : '当前浏览器不支持方向传感器';
            return !this.mobile;
        }
        if (this.mobile) {
            await new Promise(r => setTimeout(r, 1100));
            if (!this.received) {
                this.message = window.isSecureContext ? '未收到方向传感器数据，请使用支持传感器的浏览器。' : '手机传感器需要 HTTPS 安全连接。';
                return false;
            }
        }
        this.calibrate();
        return true;
    }
    calibrate() { this.base = { ...this.raw }; this.vector = { x: 0, y: 0 }; this.pendingCalibration = !this.received; }
    read(dt: number) {
        let x = 0, y = 0;
        if (this.active && this.received) {
            const dead = (v: number) => Math.abs(v) < 2 ? 0 : Math.sign(v) * Math.min(1, (Math.abs(v) - 2) / 16);
            x = dead(this.raw.x - this.base.x);
            y = dead(this.raw.y - this.base.y);
        }
        if (this.keys.size) {
            x = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'));
            y = Number(this.keys.has('s') || this.keys.has('arrowdown')) - Number(this.keys.has('w') || this.keys.has('arrowup'));
        }
        const length = Math.hypot(x, y);
        if (length > 1) {
            x /= length;
            y /= length;
        }
        const k = 1 - Math.exp(-dt * 14);
        this.vector.x += (x - this.vector.x) * k;
        this.vector.y += (y - this.vector.y) * k;
        return this.vector;
    }
}
