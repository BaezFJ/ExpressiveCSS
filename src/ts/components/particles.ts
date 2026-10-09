import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface ParticlesOptions extends BaseOptions {
  /**
   * Number of particles.
   * @default 100
   */
  quantity: number;
  /**
   * How firmly particles hold their place against the pointer. Lower
   * follows the pointer further.
   * @default 50
   */
  staticity: number;
  /**
   * Frames a particle takes to catch up with the pointer. Higher is slower.
   * @default 50
   */
  ease: number;
  /**
   * Base radius in pixels. Each particle adds 0 or 1 to it.
   * @default 0.4
   */
  size: number;
  /**
   * A CSS color. Empty uses the canvas's CSS `color`, which defaults to the
   * theme's on-surface color.
   * @default ''
   */
  color: string;
  /**
   * Horizontal drift in pixels per frame. Negative drifts left.
   * @default 0
   */
  vx: number;
  /**
   * Vertical drift in pixels per frame. Negative drifts up.
   * @default 0
   */
  vy: number;
}

const _defaults: ParticlesOptions = {
  quantity: 100,
  staticity: 50,
  ease: 50,
  size: 0.4,
  color: '',
  vx: 0,
  vy: 0
};

interface Particle {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

/**
 * Particles. A `<canvas class="particles">` covers its nearest positioned
 * ancestor with slowly drifting dots that lean toward the pointer. Under
 * reduced motion the dots are drawn once and stay still.
 */
export class Particles extends Component<ParticlesOptions> {
  declare el: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D | null;
  private _style: CSSStyleDeclaration;
  private _particles: Particle[] = [];
  private _width = 0;
  private _height = 0;
  private _frame = 0;
  private _last = 0;
  // Pointer offset from the canvas center, kept from its last move inside.
  private _mouse = { x: 0, y: 0 };
  private _still = false;
  private _resizeObserver: ResizeObserver | null = null;

  constructor(el: HTMLElement, options: Partial<ParticlesOptions>) {
    super(el, options, Particles);
    this.el['Expressive_Particles'] = this;
    this.options = { ...Particles.defaults, ...options };
    this._ctx = this.el.getContext('2d');
    if (!this._ctx) return;
    this._style = getComputedStyle(this.el);
    this._still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._reset();
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => {
        if (this.el.clientWidth !== this._width || this.el.clientHeight !== this._height) this._reset();
      });
      this._resizeObserver.observe(this.el);
    }
    if (this._still) return;
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    // ponytail: keeps drawing while scrolled out of view; pause with an
    // IntersectionObserver if pages stack many of these.
    this._frame = requestAnimationFrame((now) => { this._last = now; this._draw(now); });
  }

  static get defaults(): ParticlesOptions {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<ParticlesOptions>): Particles;
  static init(els: InitElements<InitElement>, options?: Partial<ParticlesOptions>): Particles[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<ParticlesOptions> = {}
  ): Particles | Particles[] {
    return super.init(els, options, Particles);
  }

  static getInstance(el: HTMLElement): Particles {
    return el['Expressive_Particles'];
  }

  destroy() {
    cancelAnimationFrame(this._frame);
    this._resizeObserver?.disconnect();
    window.removeEventListener('pointermove', this._onPointerMove);
    if (this._ctx) {
      this._ctx.setTransform(1, 0, 0, 1, 0, 0);
      this._ctx.clearRect(0, 0, this.el.width, this.el.height);
    }
    this.el['Expressive_Particles'] = undefined;
  }

  private _onPointerMove = (e: PointerEvent) => {
    const r = this.el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    if (Math.abs(x) < r.width / 2 && Math.abs(y) < r.height / 2) this._mouse = { x, y };
  };

  // Matches the pixel buffer to the canvas box and scatters a new set.
  private _reset() {
    this._width = this.el.clientWidth;
    this._height = this.el.clientHeight;
    this.el.width = Math.round(this._width * devicePixelRatio);
    this.el.height = Math.round(this._height * devicePixelRatio);
    this._particles = Array.from({ length: this.options.quantity }, () => this._particle());
    if (this._still) {
      for (const p of this._particles) p.alpha = p.targetAlpha;
      this._paint();
    }
  }

  private _particle(): Particle {
    return {
      x: Math.floor(Math.random() * this._width),
      y: Math.floor(Math.random() * this._height),
      translateX: 0,
      translateY: 0,
      size: Math.floor(Math.random() * 2) + this.options.size,
      alpha: 0,
      targetAlpha: Math.round((Math.random() * 0.6 + 0.1) * 10) / 10,
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: 0.1 + Math.random() * 4
    };
  }

  private _draw(now: number) {
    // Frames are counted at 60 per second whatever the display rate.
    const step = Math.min((now - this._last) / (1000 / 60), 4);
    this._last = now;
    const { staticity, ease, vx, vy } = this.options;
    const follow = Math.min(step / ease, 1);
    this._particles = this._particles.map((p) => {
      p.x += (p.dx + vx) * step;
      p.y += (p.dy + vy) * step;
      p.translateX += (this._mouse.x / (staticity / p.magnetism) - p.translateX) * follow;
      p.translateY += (this._mouse.y / (staticity / p.magnetism) - p.translateY) * follow;
      // Fades in, and fades out within 20px of an edge.
      const x = p.x + p.translateX;
      const y = p.y + p.translateY;
      const edge = Math.min(x - p.size, this._width - x - p.size, y - p.size, this._height - y - p.size) / 20;
      p.alpha = edge > 1 ? Math.min(p.alpha + 0.02 * step, p.targetAlpha) : p.targetAlpha * edge;
      const gone = p.x < -p.size || p.x > this._width + p.size || p.y < -p.size || p.y > this._height + p.size;
      return gone ? this._particle() : p;
    });
    this._paint();
    this._frame = requestAnimationFrame((t) => this._draw(t));
  }

  private _paint() {
    const ctx = this._ctx!;
    const dpr = devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.el.width, this.el.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Read every frame, so a theme or color-scheme change applies at once.
    ctx.fillStyle = this.options.color || this._style.color;
    for (const p of this._particles) {
      if (p.alpha <= 0) continue;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x + p.translateX, p.y + p.translateY, p.size, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
