import { InitElements, InitElement } from '../core/component';
import { LineChart, LineChartOptions, COLORS } from './lineChart';

export type RadarChartOptions = LineChartOptions;

const SVG = 'http://www.w3.org/2000/svg';
/** Grid rings, evenly spaced from the middle to the rim. */
const RINGS = 4;

/**
 * Radar chart. It reads its <table> like LineChart, but each row is a spoke,
 * clockwise from the top, and each value column is a series drawn as a
 * shape joining its values on the spokes, from zero in the middle to the
 * scale's top at the rim. The row labels sit round the rim.
 *
 * Re-run `RadarChart.init(el)` after changing the table.
 */
export class RadarChart extends LineChart {
  protected get _type() {
    return 'radar-chart';
  }

  protected get _key() {
    return 'Expressive_RadarChart';
  }

  /** The scale starts at zero, the middle, so shapes compare by size. */
  protected get _fromZero() {
    return true;
  }

  /** Arrows move round the spokes, so both pairs work; left and right swap in RTL. */
  protected get _arrows(): [string[], string[]] {
    const [next, back] = this._reversed ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft'];
    return [[next, 'ArrowDown'], [back, 'ArrowUp']];
  }

  static init(el: HTMLElement, options?: Partial<RadarChartOptions>): RadarChart;
  static init(els: InitElements<InitElement>, options?: Partial<RadarChartOptions>): RadarChart[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<RadarChartOptions> = {}
  ): RadarChart | RadarChart[] {
    return super.init(els as HTMLElement, options) as RadarChart | RadarChart[];
  }

  static getInstance(el: HTMLElement): RadarChart {
    return el['Expressive_RadarChart'];
  }

  show(index: number) {
    if (!this._tooltip || index === this.activeIndex) return;
    super.show(index);
    if (this._tooltip.hidden) return;
    // The cursor is a spoke turned by --turn; LineChart's points on it keep
    // their top, a share of the radius. The tooltip sits past its tip.
    const turn = this._turn(index);
    for (const part of [this._tooltip, this._cursor]) {
      part.style.removeProperty('left');
      part.style.setProperty('--turn', String(turn));
    }
    // On the right half it opens leftwards, over the chart.
    this._tooltip.classList.toggle('end', turn > 0 && turn < 0.5);
  }

  /** A row's spoke as a fraction of a turn clockwise from the top. */
  private _turn(index: number) {
    return index / this.labels.length;
  }

  /** The legend for more than one series; the labels go round the rim in _draw. */
  protected _guides(): Element[] {
    return super._guides().slice(1);
  }

  /** The nearest spoke to the pointer, by its angle from the middle. */
  protected _indexAt(e: PointerEvent) {
    const box = this._plot.getBoundingClientRect();
    const [x, y] = [e.clientX - box.left - box.width / 2, e.clientY - box.top - box.height / 2];
    const turn = (Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1;
    return Math.round(turn * this.labels.length) % this.labels.length;
  }

  /**
   * An SVG in a -50 to 50 box: the rings and spokes of the grid, then each
   * series' shape, with its points for .points. The rim is the box's edge;
   * the labels round it are HTML.
   */
  protected _draw(): Element {
    const at = (index: number, share: number) => {
      const angle = this._turn(index) * 2 * Math.PI;
      return `${(50 * share * Math.sin(angle)).toFixed(3)},${(-50 * share * Math.cos(angle)).toFixed(3)}`;
    };
    // The rim is the scale's top, so _y is the distance in from the rim.
    const share = (value: number) => Math.min(1, Math.max(0, 1 - this._y(value) / 100));
    const node = (name: string, attributes: Record<string, string>) => {
      const element = document.createElementNS(SVG, name);
      for (const key in attributes) element.setAttribute(key, attributes[key]);
      return element;
    };
    const rows = this.labels.map((_, i) => i);
    const ring = (r: number) => `M${rows.map((i) => at(i, r)).join('L')}Z`;

    const svg = node('svg', { viewBox: '-50 -50 100 100', 'aria-hidden': 'true', focusable: 'false' });
    svg.append(node('path', {
      class: 'radar-chart-grid',
      d: Array.from({ length: RINGS }, (_, r) => ring((r + 1) / RINGS)).join('')
        + rows.map((i) => `M0,0L${at(i, 1)}`).join('')
    }));
    const points = this.el.classList.contains('points');
    this.series.forEach((series, s) => {
      const group = node('g', {
        class: `radar-chart-series ${series.className}`.trim(),
        'data-series': String((s % COLORS) + 1)
      });
      // ponytail: a gap joins the spokes either side of it; mark gaps if charts need them.
      const drawn = rows.filter((i) => series.values[i] !== null);
      const corners = drawn.map((i) => at(i, share(series.values[i]!)));
      group.append(node('path', { class: 'radar-chart-shape', d: corners.length ? `M${corners.join('L')}Z` : '' }));
      // Round caps on zero-length lines, so CSS sizes the points in pixels.
      if (points) group.append(node('path', { class: 'radar-chart-points', d: corners.map((c) => `M${c}h0`).join('') }));
      svg.append(group);
    });

    const labels = document.createElement('ol');
    labels.className = 'radar-chart-axes';
    labels.setAttribute('aria-hidden', 'true');
    this.labels.forEach((text, i) => {
      const li = document.createElement('li');
      li.textContent = text;
      li.style.setProperty('--turn', String(this._turn(i)));
      labels.append(li);
    });

    const web = document.createElement('div');
    web.className = 'radar-chart-web';
    web.append(svg, labels);
    return web;
  }
}
