import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export type ConfettiShape = 'square' | 'circle' | 'star';

export interface ConfettiOptions extends BaseOptions {
  /**
   * Pieces per burst.
   * @default 50
   */
  particleCount: number;
  /**
   * Launch direction in degrees. 90 is straight up, 0 is right.
   * @default 90
   */
  angle: number;
  /**
   * How far the pieces fan out from the angle, in degrees.
   * @default 45
   */
  spread: number;
  /**
   * Launch speed in pixels per frame.
   * @default 45
   */
  startVelocity: number;
  /**
   * Share of its speed a piece keeps each frame.
   * @default 0.9
   */
  decay: number;
  /**
   * Pull toward the bottom. 0 floats, 1 is normal.
   * @default 1
   */
  gravity: number;
  /**
   * Sideways push per frame. Negative drifts left.
   * @default 0
   */
  drift: number;
  /**
   * Frames a piece lives while it fades out.
   * @default 200
   */
  ticks: number;
  /**
   * Launch point as fractions of the canvas, 0 to 1. A missing side is
   * 0.5. A trigger element ignores it and launches from its own center.
   * @default { x: 0.5, y: 0.5 }
   */
  origin: { x?: number; y?: number };
  /**
   * CSS colors. Empty uses the theme's primary, secondary and tertiary
   * colors and their containers.
   * @default []
   */
  colors: string[];
  /**
   * @default ['square', 'circle']
   */
  shapes: ConfettiShape[];
  /**
   * Piece size multiplier.
   * @default 1
   */
  scalar: number;
  /**
   * On a canvas, wait for `fire()` instead of bursting once at init.
   * @default false
   */
  manualStart: boolean;
}

const _defaults: ConfettiOptions = {
  particleCount: 50,
  angle: 90,
  spread: 45,
  startVelocity: 45,
  decay: 0.9,
  gravity: 1,
  drift: 0,
  ticks: 200,
  origin: { x: 0.5, y: 0.5 },
  colors: [],
  shapes: ['square', 'circle'],
  scalar: 1,
  manualStart: false
};

const THEME_COLORS = ['primary', 'secondary', 'tertiary', 'primary-container', 'secondary-container', 'tertiary-container'];
// Used when the page has no theme tokens.
const FALLBACK_COLORS = ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'];
const RAD = Math.PI / 180;

interface Piece {
  x: number;
  y: number;
  velocity: number;
  angle: number;
  wobble: number;
  wobbleSpeed: number;
  tilt: number;
  tick: number;
  color: string;
  shape: ConfettiShape;
  options: ConfettiOptions;
}

interface Scene {
  ctx: CanvasRenderingContext2D;
  pieces: Piece[];
  frame: number;
  last: number;
  done: (() => void)[];
  overlay: boolean;
}

const scenes = new Map<HTMLCanvasElement, Scene>();
let overlay: HTMLCanvasElement | null = null;

/**
 * Confetti. Bursts of theme-colored pieces drawn on a canvas.
 *
 * - `Confetti.fire(options)` bursts over the whole viewport.
 * - Any other `.confetti` element bursts from its center when clicked.
 * - A `<canvas class="confetti">` bursts inside its own box, once at init
 *   unless `manualStart`, and again on each `fire()`.
 *
 * The viewport canvas is a manual popover, so it draws above an open modal
 * dialog, and it ignores the pointer. Nothing is drawn when the reader
 * prefers reduced motion.
 */
export class Confetti extends Component<ConfettiOptions> {
  private _onClick = () => { this.fire(); };

  constructor(el: HTMLElement, options: Partial<ConfettiOptions>) {
    super(el, options, Confetti);
    this.el['Expressive_Confetti'] = this;
    this.options = { ...Confetti.defaults, ...options };
    if (!(el instanceof HTMLCanvasElement)) el.addEventListener('click', this._onClick);
    else if (!this.options.manualStart) this.fire();
  }

  static get defaults(): ConfettiOptions {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<ConfettiOptions>): Confetti;
  static init(els: InitElements<InitElement>, options?: Partial<ConfettiOptions>): Confetti[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<ConfettiOptions> = {}
  ): Confetti | Confetti[] {
    return super.init(els, options, Confetti);
  }

  static getInstance(el: HTMLElement): Confetti {
    return el['Expressive_Confetti'];
  }

  /**
   * Bursts over the whole viewport. Resolves when the last piece is gone.
   */
  static fire(options: Partial<ConfettiOptions> = {}): Promise<void> {
    return burst(viewportCanvas, document.body, { ...Confetti.defaults, ...options });
  }

  /**
   * Bursts on this canvas, or from this element's center over the viewport.
   * Resolves when the last piece is gone.
   */
  fire(options: Partial<ConfettiOptions> = {}): Promise<void> {
    const merged = { ...this.options, ...options };
    if (this.el instanceof HTMLCanvasElement) {
      const canvas = this.el;
      return burst(() => canvas, canvas.parentElement ?? document.body, merged);
    }
    const r = this.el.getBoundingClientRect();
    merged.origin = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight };
    return burst(viewportCanvas, this.el.parentElement ?? document.body, merged);
  }

  destroy() {
    this.el.removeEventListener('click', this._onClick);
    if (this.el instanceof HTMLCanvasElement) stop(this.el);
    this.el['Expressive_Confetti'] = undefined;
  }
}

// `themed` is where the theme colors are read, so a scoped theme applies.
function burst(getCanvas: () => HTMLCanvasElement, themed: Element, o: ConfettiOptions): Promise<void> {
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  const canvas = getCanvas();
  let scene = scenes.get(canvas);
  if (!scene) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve();
    scene = { ctx, pieces: [], frame: 0, last: 0, done: [], overlay: canvas === overlay };
    scenes.set(canvas, scene);
  }
  const { width, height } = fit(canvas);
  const colors = o.colors.length ? o.colors : themeColors(themed);
  const x = (o.origin.x ?? 0.5) * width;
  const y = (o.origin.y ?? 0.5) * height;
  for (let i = 0; i < o.particleCount; i++) {
    scene.pieces.push({
      x, y,
      velocity: o.startVelocity * (0.5 + Math.random()),
      angle: -o.angle * RAD + (0.5 - Math.random()) * o.spread * RAD,
      wobble: Math.random() * 10,
      wobbleSpeed: 0.05 + Math.random() * 0.05,
      tilt: (0.25 + Math.random() / 2) * Math.PI,
      tick: 0,
      color: colors[i % colors.length],
      shape: o.shapes[Math.floor(Math.random() * o.shapes.length)] ?? 'square',
      options: o
    });
  }
  const s = scene;
  if (!s.frame) s.frame = requestAnimationFrame((now) => { s.last = now; draw(canvas, s, now); });
  return new Promise((resolve) => s.done.push(resolve));
}

function draw(canvas: HTMLCanvasElement, scene: Scene, now: number) {
  // Frames are counted at 60 per second whatever the display rate.
  const step = Math.min((now - scene.last) / (1000 / 60), 4);
  scene.last = now;
  const { width, height } = fit(canvas);
  const { ctx } = scene;
  const dpr = canvas.width / (width || 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  scene.pieces = scene.pieces.filter((p) => {
    const o = p.options;
    p.x += (Math.cos(p.angle) * p.velocity + o.drift) * step;
    p.y += (Math.sin(p.angle) * p.velocity + o.gravity * 3) * step;
    p.velocity *= o.decay ** step;
    p.wobble += p.wobbleSpeed * step;
    p.tilt += 0.1 * step;
    p.tick += step;
    if (p.tick >= o.ticks) return false;
    const size = 8 * o.scalar;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(p.x + 10 * o.scalar * Math.cos(p.wobble), p.y + 10 * o.scalar * Math.sin(p.wobble));
    ctx.rotate(p.tilt);
    ctx.scale(1, Math.cos(p.wobble));
    ctx.globalAlpha = 1 - p.tick / o.ticks;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    if (p.shape === 'circle') ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
    else if (p.shape === 'star') star(ctx, size * 0.75);
    else ctx.rect(-size / 2, -size / 2, size, size);
    ctx.fill();
    return true;
  });
  if (scene.pieces.length) scene.frame = requestAnimationFrame((t) => draw(canvas, scene, t));
  else stop(canvas);
}

function stop(canvas: HTMLCanvasElement) {
  const scene = scenes.get(canvas);
  if (!scene) return;
  cancelAnimationFrame(scene.frame);
  scenes.delete(canvas);
  scene.ctx.setTransform(1, 0, 0, 1, 0, 0);
  scene.ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (scene.overlay) {
    canvas.remove();
    overlay = null;
  }
  for (const resolve of scene.done) resolve();
}

function star(ctx: CanvasRenderingContext2D, r: number) {
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const d = i % 2 ? r / 2 : r;
    ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
}

// Matches the canvas's pixel buffer to its box and the screen's pixel ratio.
function fit(canvas: HTMLCanvasElement) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const w = Math.round(width * devicePixelRatio);
  const h = Math.round(height * devicePixelRatio);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { width, height };
}

function viewportCanvas(): HTMLCanvasElement {
  if (overlay?.isConnected) return overlay;
  overlay = document.createElement('canvas');
  overlay.className = 'confetti-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  // Inline, so the overlay works even where the stylesheet does not reach.
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%', margin: '0', padding: '0',
    border: '0', background: 'transparent', pointerEvents: 'none', zIndex: '10001'
  });
  document.body.append(overlay);
  if (typeof overlay.showPopover === 'function') {
    overlay.popover = 'manual';
    overlay.showPopover();
  }
  return overlay;
}

// Resolves each theme color token through `color`, so light-dark() and
// relative colors reach the canvas as plain colors.
function themeColors(themed: Element): string[] {
  const probe = document.createElement('span');
  probe.hidden = true;
  themed.append(probe);
  const style = getComputedStyle(probe);
  const colors = THEME_COLORS.filter((role) => style.getPropertyValue(`--md-sys-color-${role}`).trim()).map((role) => {
    probe.style.color = `var(--md-sys-color-${role})`;
    return getComputedStyle(probe).color;
  });
  probe.remove();
  return colors.length ? colors : FALLBACK_COLORS;
}
