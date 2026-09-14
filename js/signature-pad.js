// Minimal signature pad on a <canvas>. Works with mouse, touch, and stylus via
// Pointer Events. Strokes are kept so the drawing survives a resize.

export class SignaturePad {
  constructor(canvas, { lineWidth = 2.2, color = '#1c2430' } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lineWidth = lineWidth;
    this.color = color;
    this.strokes = [];
    this.current = null;

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => this.#down(e));
    canvas.addEventListener('pointermove', (e) => this.#move(e));
    canvas.addEventListener('pointerup', (e) => this.#up(e));
    canvas.addEventListener('pointercancel', (e) => this.#up(e));
    canvas.addEventListener('pointerleave', (e) => this.#up(e));
    this.resize();
    if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.#redraw();
  }

  clear() { this.strokes = []; this.current = null; this.#redraw(); }
  isEmpty() { return this.strokes.length === 0; }

  /** PNG data URL, or null when nothing was drawn. */
  toDataURL() {
    if (this.isEmpty()) return null;
    // Export at a fixed, modest size so the stored string stays small.
    const out = document.createElement('canvas');
    out.width = 600; out.height = 200;
    const ctx = out.getContext('2d');
    const { width, height } = this.canvas.getBoundingClientRect();
    const scale = Math.min(out.width / width, out.height / height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.scale(scale, scale);
    this.#paint(ctx);
    return out.toDataURL('image/png');
  }

  #point(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  #down(e) {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.current = [this.#point(e)];
    this.strokes.push(this.current);
    this.#redraw();
  }
  #move(e) {
    if (!this.current) return;
    e.preventDefault();
    this.current.push(this.#point(e));
    this.#redraw();
  }
  #up() {
    if (this.current && this.current.length === 1) this.current.push({ ...this.current[0], x: this.current[0].x + 0.5 });
    this.current = null;
  }
  #redraw() {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, width, height);
    this.#paint(this.ctx);
  }
  #paint(ctx) {
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.color;
    for (const s of this.strokes) {
      if (s.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
      ctx.stroke();
    }
  }
}
