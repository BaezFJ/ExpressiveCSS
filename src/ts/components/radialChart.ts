import { InitElements, InitElement } from '../core/component';
import { LineChart, LineChartOptions, seriesColor, svgNode as node } from './lineChart';

export type RadialChartOptions = LineChartOptions;

/** The outer ring's outer edge in a 100-unit box. */
const RADIUS = 46;
/** The rings never fill more of the radius than this, leaving a middle. */
const FILL = 0.8;

/**
 * Radial chart. It reads its <table> like LineChart, but draws each row of
 * the first value column as a ring, outermost first, filled clockwise from
 * the top as a share of `data-max` above zero (100 by default). With `.gauge` the rings
 * are half circles over the middle. With `.labels` they are three quarters
 * of a circle, leaving the top left quarter for each row's name at the
 * ring's start; a gauge's names hang under its base line instead.
 * `data-segments` splits each ring into that many segments, filled whole,
 * and `.gradient` shades each fill along the ring, from a light tint at its
 * start to its full color at its end. A <tfoot>
 * row shows in the middle, and
 * a legend lists the rows when there is more than one. Further columns show
 * in the tooltip.
 *
 * Call `update()` after changing the ring tokens, and after changing the table
 * unless it was started with `watch` or `data-watch`.
 */
export class RadialChart extends LineChart {
  // No initializers: LineChart's constructor draws before they would run.
  /** Each ring's middle radius, and their shared width. */
  private _radii: number[];
  private _width: number;
  /** The gap between rings, and between segments. */
  private _gap: number;
  /** Each row's share of the maximum, from 0 to 1. */
  private _fractions: number[];
  private _rings: SVGCircleElement[];
  /** With .gradient, each ring's fill drawn again as a conic gradient, or null for none. */
  private _sweeps: (HTMLElement | null)[];

  protected get _type() {
    return 'radial-chart';
  }

  /** The rings fill to data-max, so there is no value axis. */
  protected get _axis() {
    return false;
  }

  protected get _key() {
    return 'Expressive_RadialChart';
  }

  protected get _points() {
    return false;
  }

  protected get _circular() {
    return true;
  }

  private get _gauge() {
    return this.el.classList.contains('gauge');
  }

  /** Whether .labels names the rings, which a sparkline never does. */
  private get _labeled() {
    const list = this.el.classList;
    return list.contains('labels') && !list.contains('sparkline');
  }

  /** How much of a circle a full ring spans. */
  private get _span() {
    if (this._gauge) return 0.5;
    return this._labeled ? 0.75 : 1;
  }

  /** The number of segments data-segments asks for, or 0 for whole rings. */
  private get _segments() {
    const segments = Math.round(this._number('segments') ?? 0);
    return segments > 1 ? segments : 0;
  }

  /** A share as drawn: with segments, to the nearest whole segment. */
  private _lit(fraction: number) {
    const segments = this._segments;
    return segments ? Math.round(fraction * segments) / segments : fraction;
  }

  /**
   * A ring's dash pattern for a share of its span. Round caps reach half the
   * width past each end of a dash, so a capped dash is one width shorter and
   * its gap one width longer; one shorter than the width is a dot. With
   * segments, each lit segment is a dash with the ring gap after it, and
   * the last gap runs out the circle so the pattern does not repeat.
   */
  private _dash(fraction: number, length: number, capped: boolean) {
    const [cap, segments, span] = [capped ? this._width : 0, this._segments, this._span * length];
    if (!segments) return `${Math.max(0.001, fraction * span - cap).toFixed(3)} ${length.toFixed(3)}`;
    // A dash and its gap make one segment, even where a small ring leaves
    // too little room for the gap and the caps.
    const size = span / segments;
    const dash = Math.max(0.001, size - this._gap - cap);
    const lit = Array.from({ length: Math.round(fraction * segments) }, () => `${dash.toFixed(3)} ${(size - dash).toFixed(3)}`);
    return `${lit.join(' ').replace(/ [\d.]+$/, '') || 0} ${length.toFixed(3)}`;
  }

  /** The distance between rings' middles, or one ring's width. */
  private get _step() {
    return this._radii.length > 1 ? this._radii[0] - this._radii[1] : this._width;
  }

  static init(el: HTMLElement, options?: Partial<RadialChartOptions>): RadialChart;
  static init(els: InitElements<InitElement>, options?: Partial<RadialChartOptions>): RadialChart[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<RadialChartOptions> = {}
  ): RadialChart | RadialChart[] {
    return super.init(els as HTMLElement, options) as RadialChart | RadialChart[];
  }

  static getInstance(el: HTMLElement): RadialChart {
    return el['Expressive_RadialChart'];
  }

  show(index: number) {
    if (!this._tooltip || index === this.activeIndex) return;
    super.show(index);
    this._rings.forEach((ring, i) => ring.classList.toggle('active', i === index));
    this._sweeps.forEach((sweep, i) => sweep?.classList.toggle('active', i === index));
    // LineChart hides the tooltip for -1 and for an index past the last row.
    if (this._tooltip.hidden) return;
    const color = seriesColor(index);
    this._tooltip.querySelectorAll<HTMLElement>('[data-series]').forEach((span) => {
      span.dataset.series = color;
    });
  }

  /** The tooltip sits where the ring's fill ends. */
  protected _place(index: number) {
    const turn = this._turn(this._fractions[index]);
    const r = this._radii[index];
    const [x, y] = [r * Math.sin(turn * 2 * Math.PI), -r * Math.cos(turn * 2 * Math.PI)];
    this._tooltip.style.left = `${50 + x}%`;
    this._tooltip.style.top = `${((50 + y) / (this._gauge ? 50 : 100)) * 100}%`;
    // On the right half it opens leftwards, over the rings.
    this._tooltip.classList.toggle('end', x > 0);
  }

  /** A fraction of the ring as a turn clockwise from the top. */
  private _turn(fraction: number) {
    // A gauge starts at nine o'clock.
    return fraction * this._span - (this._gauge ? 0.25 : 0);
  }

  /** For more than one row, a legend of every row with its color and cell. */
  protected _guides(): Element[] {
    if (this.labels.length < 2) return [];
    const legend = document.createElement('ul');
    legend.className = 'radial-chart-legend';
    legend.setAttribute('aria-hidden', 'true');
    const text = this.series[0].text;
    legend.append(...this.labels.map((label, i) => {
      const li = document.createElement('li');
      li.dataset.series = seriesColor(i);
      const [name, value] = [label, text[i]].map((content) => {
        const span = document.createElement('span');
        span.textContent = content;
        return span;
      });
      li.append(name, value);
      return li;
    }));
    return [legend];
  }

  /** The ring under the pointer by its distance from the middle, or -1. */
  protected _indexAt(e: PointerEvent) {
    const box = this._plot.getBoundingClientRect();
    // The middle is half the width down in both shapes.
    const [x, y] = [e.clientX - box.left - box.width / 2, e.clientY - box.top - box.width / 2];
    if (this._gauge && y > 0) return this._nameAt(e);
    // A gap belongs to a ring beside it.
    const distance = this._distance(x, y, box.width);
    return this._radii.findIndex((r) => Math.abs(distance - r) <= this._step / 2);
  }

  /**
   * How far a point is from the middle in the SVG's 100-unit box. In the
   * top left quarter .labels leaves empty, the names run straight across,
   * so only the height counts and a name picks its own ring.
   */
  private _distance(x: number, y: number, width: number) {
    // Only three-quarter rings leave that quarter empty.
    if (this._span === 0.75 && x < 0 && y < 0) return (-y / width) * 100;
    return (Math.hypot(x, y) / width) * 100;
  }

  /** Under a gauge's base line, the ring whose name is under the pointer, or -1. */
  private _nameAt(e: PointerEvent) {
    const name = (e.target as Element).closest('.radial-chart-names > span');
    return name ? [...name.parentElement!.children].indexOf(name) : -1;
  }

  /** The rings' turn, from three o'clock to the top or, for a gauge, to nine, and the SVG's box. */
  private get _frame(): [transform: string, viewBox: string] {
    return this._gauge ? ['rotate(180)', '-50 -50 100 50'] : ['rotate(-90)', '-50 -50 100 100'];
  }

  /**
   * With .gradient, a ring's fill drawn again in HTML: a conic gradient from
   * a tint of its colour at the ring's start to the full colour where the
   * fill ends, masked to the fill's own dash, so it follows the ring round.
   * An SVG stroke takes no conic gradient.
   */
  private _sweep(r: number, i: number, length: number) {
    const fraction = this._fractions[i];
    if (!fraction || !this.el.classList.contains('gradient')) return null;
    const [transform, viewBox] = this._frame;
    const width = this._width.toFixed(3);
    const dash = this._dash(fraction, length, true);
    const image = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'><circle r='${r.toFixed(3)}' stroke-width='${width}' transform='${transform}' stroke-dasharray='${dash}' stroke-dashoffset='${(-this._width / 2).toFixed(3)}' stroke-linecap='round' fill='none' stroke='black'/></svg>`;
    const sweep = document.createElement('div');
    sweep.className = 'radial-chart-sweep';
    sweep.dataset.series = seriesColor(i);
    sweep.style.setProperty('--radial-chart-shape', `url("data:image/svg+xml,${encodeURIComponent(image)}")`);
    sweep.style.setProperty('--radial-chart-from', `${this._turn(0)}turn`);
    sweep.style.setProperty('--radial-chart-to', `${fraction * this._span}turn`);
    return sweep;
  }

  /**
   * With .labels, each row's name left of its ring's start at the top,
   * ending at the middle line. CSS shrinks the text to fit crowded rings.
   * A gauge's names hang under its base line in a row each, innermost
   * first, starting below their rings' starts.
   */
  private _names(): Element[] {
    if (!this._labeled) return [];
    const count = this._radii.length;
    const names = document.createElement('div');
    names.className = 'radial-chart-names';
    names.style.setProperty('--radial-chart-step', this._step.toFixed(3));
    // The plot leaves room under a gauge for the rows.
    this._plot.style.setProperty('--radial-chart-rows', String(count));
    names.append(...this._radii.map((r, i) => {
      const name = document.createElement('span');
      // The ring's top, or a gauge ring's start along the base line.
      name.style.setProperty('--radial-chart-at', `${(50 - r).toFixed(3)}%`);
      name.style.setProperty('--radial-chart-row', String(count - 1 - i));
      name.textContent = this.labels[i];
      return name;
    }));
    return [names];
  }

  /**
   * An SVG of rings in a -50 to 50 box, the top half for a gauge. Each row
   * is a track circle and a fill circle whose dash is its share; CSS draws
   * them from --radial-chart-dash. The total is HTML over it.
   */
  protected _draw(): Element {
    const style = getComputedStyle(this.el);
    const token = (name: string, fallback: number) => {
      const value = parseFloat(style.getPropertyValue(`--md-comp-radial-chart-${name}`));
      return Number.isFinite(value) ? value : fallback;
    };
    const count = this.labels.length;
    let [width, gap] = [Math.max(0, token('thickness', 8)), Math.max(0, token('gap', 2))];
    // Too many rings to leave a middle thin, with their gaps, to fit.
    // ponytail: past about 18 rings they are hairlines; that many values want a bar chart.
    const scale = Math.min(1, (RADIUS * FILL) / (count * width + (count - 1) * gap || 1));
    [width, gap] = [width * scale, gap * scale];
    [this._width, this._gap] = [width, gap];
    this._radii = this.labels.map((_, i) => RADIUS - width / 2 - i * (width + gap));
    // A maximum of zero or less means nothing, so it falls back.
    const max = [parseFloat(this.el.dataset.max ?? ''), this.options.max ?? NaN, 100].find((value) => value > 0)!;
    this._fractions = this.series[0].values.map((value) => this._lit(Math.min(1, Math.max(0, (value ?? 0) / max))));

    const [transform, viewBox] = this._frame;
    const svg = node('svg', { viewBox, focusable: 'false' });
    const span = this._span;
    this._sweeps = [];
    this._rings = this._radii.map((r, i) => {
      const length = 2 * Math.PI * r;
      // A capped dash starts half a width in, where its round cap ends.
      const circle = (name: string, fraction: number, capped: boolean) => {
        const ring = node('circle', { class: name, r: r.toFixed(3), transform, 'stroke-width': width.toFixed(3) });
        ring.style.setProperty('--radial-chart-dash', this._dash(fraction, length, capped));
        if (capped) {
          ring.style.setProperty('--radial-chart-offset', (-width / 2).toFixed(3));
          ring.classList.add('capped');
        }
        return ring;
      };
      const ring = circle('radial-chart-ring', this._fractions[i], true) as SVGCircleElement;
      ring.dataset.series = seriesColor(i);
      // An empty ring would still draw its round cap.
      if (!this._fractions[i]) ring.classList.add('empty');
      // Only a track short of a whole circle, or in segments, has ends to round.
      svg.append(circle('radial-chart-track', 1, span < 1 || !!this._segments), ring);
      this._sweeps.push(this._sweep(r, i, length));
      return ring;
    });

    const rings = document.createElement('div');
    rings.className = 'radial-chart-rings';
    rings.setAttribute('aria-hidden', 'true');
    rings.style.setProperty('--radial-chart-middle', `${(this._radii[count - 1] - this._width / 2) * 2}%`);
    rings.append(svg, ...this._sweeps.filter((sweep) => sweep !== null), ...this._names());

    const total = this._total('radial-chart-total');
    if (total) rings.append(total);
    return rings;
  }
}
