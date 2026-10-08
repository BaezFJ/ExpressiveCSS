import { InitElements, InitElement } from '../core/component';
import { COLORS, LineChart, LineChartOptions, svgNode as node } from './lineChart';

export type RadialChartOptions = LineChartOptions;

/** The outer ring's outer edge in a 100-unit box. */
const RADIUS = 46;
/** The rings never fill more of the radius than this, leaving a middle. */
const FILL = 0.8;

/**
 * Radial chart. It reads its <table> like LineChart, but draws each row of
 * the first value column as a ring, outermost first, filled clockwise from
 * the top as a share of `data-max` above zero (100 by default). With `.gauge` the rings
 * are half circles over the middle. A <tfoot> row shows in the middle, and
 * a legend lists the rows when there is more than one. Further columns show
 * in the tooltip.
 *
 * Re-run `RadialChart.init(el)` after changing the table or the ring tokens.
 */
export class RadialChart extends LineChart {
  // No initializers: LineChart's constructor draws before they would run.
  /** Each ring's middle radius, and their shared width. */
  private _radii: number[];
  private _width: number;
  /** Each row's share of the maximum, from 0 to 1. */
  private _fractions: number[];
  private _rings: SVGCircleElement[];

  protected get _type() {
    return 'radial-chart';
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
    // LineChart hides the tooltip for -1 and for an index past the last row.
    if (this._tooltip.hidden) return;
    const color = this._color(index);
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

  private _color(index: number) {
    return String((index % COLORS) + 1);
  }

  /** A fraction of the ring as a turn clockwise from the top. */
  private _turn(fraction: number) {
    return this._gauge ? fraction / 2 - 0.25 : fraction;
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
      li.dataset.series = this._color(i);
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
    if (this._gauge && y > 0) return -1;
    // The distance in the SVG's 100-unit box; a gap belongs to a ring beside it.
    const distance = (Math.hypot(x, y) / box.width) * 100;
    const step = this._radii.length > 1 ? this._radii[0] - this._radii[1] : this._width;
    return this._radii.findIndex((r) => Math.abs(distance - r) <= step / 2);
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
    this._width = width;
    this._radii = this.labels.map((_, i) => RADIUS - width / 2 - i * (width + gap));
    // A maximum of zero or less means nothing, so it falls back.
    const max = [parseFloat(this.el.dataset.max ?? ''), this.options.max ?? NaN, 100].find((value) => value > 0)!;
    this._fractions = this.series[0].values.map((value) => Math.min(1, Math.max(0, (value ?? 0) / max)));

    const gauge = this._gauge;
    const svg = node('svg', { viewBox: gauge ? '-50 -50 100 50' : '-50 -50 100 100', focusable: 'false' });
    // A circle starts at three o'clock; turn it to the top, or to nine for a gauge.
    const transform = gauge ? 'rotate(180)' : 'rotate(-90)';
    const span = gauge ? 0.5 : 1;
    this._rings = this._radii.map((r, i) => {
      const length = 2 * Math.PI * r;
      // Round caps reach half the width past each end of a dash, so a capped
      // dash is one width shorter and starts half a width in. One shorter
      // than the width is a dot at the start.
      const circle = (name: string, fraction: number, capped: boolean) => {
        const ring = node('circle', { class: name, r: r.toFixed(3), transform, 'stroke-width': width.toFixed(3) });
        const dash = Math.max(0.001, fraction * span * length - (capped ? width : 0));
        ring.style.setProperty('--radial-chart-dash', `${dash.toFixed(3)} ${length.toFixed(3)}`);
        if (capped) ring.style.setProperty('--radial-chart-offset', (-width / 2).toFixed(3));
        return ring;
      };
      const ring = circle('radial-chart-ring', this._fractions[i], true) as SVGCircleElement;
      ring.dataset.series = this._color(i);
      // An empty ring would still draw its round cap.
      if (!this._fractions[i]) ring.classList.add('empty');
      // Only a gauge's track has ends to round.
      svg.append(circle('radial-chart-track', 1, gauge), ring);
      return ring;
    });

    const rings = document.createElement('div');
    rings.className = 'radial-chart-rings';
    rings.setAttribute('aria-hidden', 'true');
    rings.style.setProperty('--radial-chart-middle', `${(this._radii[count - 1] - this._width / 2) * 2}%`);
    rings.append(svg);

    const total = this._total('radial-chart-total');
    if (total) rings.append(total);
    return rings;
  }
}
