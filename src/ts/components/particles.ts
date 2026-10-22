import { Component, BaseOptions } from '../core/component';

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
  private _visible = true;
  private _motion: MediaQueryList | null = null;
  private _scheme: MediaQueryList | null = null;
  private _theme: MutationObserver | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _visibility: IntersectionObserver | null = null;

  constructor(el: HTMLElement, options: Partial<ParticlesOptions>) {
    super(el, options);
    this._ctx = this.el.getContext('2d');
    if (!this._ctx) return;
    this._style = getComputedStyle(this.el);
    this._motion = matchMedia('(prefers-reduced-motion: reduce)');
    this._motion.addEventListener('change', this._onMotion);
    // Still dots are painted once, so a theme or color-scheme change
    // repaints them. Moving ones read the color every frame anyway.
    this._scheme = matchMedia('(prefers-color-scheme: dark)');
    this._scheme.addEventListener('change', this._repaint);
    this._theme = new MutationObserver(this._repaint);
    this._theme.observe(document.documentElement, { attributes: true, attributeFilter: ['theme'], subtree: true });
    this._still = this._motion.matches;
    this._reset();
    this._resizeObserver = new ResizeObserver(() => {
      if (this.el.clientWidth !== this._width || this.el.clientHeight !== this._height) this._reset();
    });
    this._resizeObserver.observe(this.el);
    // Animates only while on screen. A canvas scrolled away, hidden or
    // removed without destroy() stops drawing and following the pointer.
    // Entries arrive oldest first, so the last one is the current state.
    this._visibility = new IntersectionObserver((entries) => {
      this._visible = entries[entries.length - 1].isIntersecting;
      this._animate();
    });
    this._visibility.observe(this.el);
  }

  static get defaults(): ParticlesOptions {
    return _defaults;
  }

  static key = 'Expressive_Particles';

  destroy() {
    this._stop();
    this._motion?.removeEventListener('change', this._onMotion);
    this._scheme?.removeEventListener('change', this._repaint);
    this._theme?.disconnect();
    this._resizeObserver?.disconnect();
    this._visibility?.disconnect();
    if (this._ctx) {
      this._ctx.setTransform(1, 0, 0, 1, 0, 0);
      this._ctx.clearRect(0, 0, this.el.width, this.el.height);
    }
    super.destroy();
  }

  private _animate() {
    if (this._visible && !this._still) this._start();
    else this._stop();
  }

  private _onMotion = () => {
    this._still = this._motion.matches;
    if (this._still) {
      for (const p of this._particles) p.alpha = p.targetAlpha;
      this._paint();
    }
    this._animate();
  };

  private _repaint = () => {
    if (this._still) this._paint();
  };

  private _start() {
    if (this._frame) return;
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    this._frame = requestAnimationFrame((now) => { this._last = now; this._draw(now); });
  }

  private _stop() {
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    window.removeEventListener('pointermove', this._onPointerMove);
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
