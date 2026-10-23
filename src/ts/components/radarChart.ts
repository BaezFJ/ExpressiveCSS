import { LineChart, LineChartOptions, polarPoint, Series } from './lineChart';
import { svgNode as node } from '../core/utils';

export type RadarChartOptions = LineChartOptions;

/** Grid rings, evenly spaced from the middle to the rim. */
const RINGS = 4;

/**
 * A series' rows split at its gaps into runs, the last carrying on round
 * past the top spoke into the first.
 */
function runs(values: (number | null)[]) {
  const list: number[][] = [[]];
  values.forEach((value, i) => (value === null ? list.push([]) : list[list.length - 1].push(i)));
  if (list.length > 1) list[0] = [...list.pop()!, ...list[0]];
  return list.filter((run) => run.length);
}

// A run of corners as a path: closed round a whole shape; open where a gap
// breaks it, a dot for a lone corner; and filled as a wedge from the middle.
const closed = (corners: string[]) => `M${corners.join('L')}Z`;
const open = (corners: string[]) => `M${corners.join('L')}${corners.length > 1 ? '' : 'h0'}`;
const wedge = (corners: string[]) => `M0,0L${corners.join('L')}Z`;

/**
 * Radar chart. It reads its <table> like LineChart, but each row is a spoke,
 * clockwise from the top, and each value column is a series drawn as a
 * shape joining its values on the spokes, from zero in the middle to the
 * scale's top at the rim. The row labels sit round the rim.
 *
 * Call `update()` after changing the table, or start it with `watch` or
 * `data-watch`.
 */
export class RadarChart extends LineChart {
  protected get _type() {
    return 'radar-chart';
  }

  /** The scale starts at zero, the middle, so shapes compare by size. */
  protected get _fromZero() {
    return true;
  }

  protected get _circular() {
    return true;
  }

  static key = 'Expressive_RadarChart';

  /**
   * The cursor is a spoke turned by --turn, and the tooltip sits past its
   * tip. LineChart's points on the spoke keep their top, a share of the
   * radius, which stops at the rim and the middle like the shapes.
   */
  protected _place(index: number) {
    for (const dot of this._cursor.children as HTMLCollectionOf<HTMLElement>) {
      dot.style.top = `${Math.min(100, Math.max(0, parseFloat(dot.style.top)))}%`;
    }
    const turn = this._turn(index);
    this._cursor.style.setProperty('--turn', String(turn));
    this._tooltip.style.setProperty('--turn', String(turn));
    // On the right half it opens leftwards, over the chart.
    this._tooltip.classList.toggle('end', turn > 0 && turn < 0.5);
  }

  /** A row's spoke as a fraction of a turn clockwise from the top. */
  private _turn(index: number) {
    return index / this.labels.length;
  }

  /** Only the legend; the labels go round the rim in _draw. */
  protected _guides(): Element[] {
    return this._legend();
  }

  /** The nearest spoke to the pointer, by its angle from the middle. */
  protected _indexAt(e: PointerEvent) {
    const [turn] = this._polarAt(e);
    return Math.round(turn * this.labels.length) % this.labels.length;
  }

  /** The grid rings' shares of the radius: one per .axis label above zero, or quarters. */
  private _rings(share: (value: number) => number) {
    if (!this._axis) return Array.from({ length: RINGS }, (_, r) => (r + 1) / RINGS);
    return this.series[0].scale.ticks.filter((tick) => tick > 0).map(share);
  }

  /**
   * One series' group: its outline, broken at a gap like a line chart's,
   * its .area fill and its .points.
   */
  private _series(series: Series, corner: (index: number) => string) {
    const group = node('g', {
      class: `radar-chart-series ${series.className}`.trim(),
      'data-series': series.color
    });
    const lines = runs(series.values).map((run) => run.map(corner));
    const [outline, fill] = series.values.includes(null) ? [open, wedge] : [closed, closed];
    group.append(node('path', { class: 'radar-chart-shape', d: lines.map(outline).join('') }));
    const list = this.el.classList;
    if (list.contains('area')) group.append(node('path', { class: 'radar-chart-area', d: lines.map(fill).join('') }));
    // Round caps on zero-length lines, so CSS sizes the points in pixels.
    if (list.contains('points')) group.append(node('path', { class: 'radar-chart-points', d: lines.flat().map((c) => `M${c}h0`).join('') }));
    return group;
  }

  /**
   * An SVG in a -50 to 50 box: the rings and spokes of the grid, then each
   * series' shape, with its points for .points. The rim is the box's edge;
   * the labels round it are HTML.
   */
  protected _draw(): Element {
    const at = (index: number, share: number) => polarPoint(this._turn(index), 50 * share);
    // The rim is the scale's top, so _y is the distance in from the rim.
    const share = (value: number) => Math.min(1, Math.max(0, 1 - this._y(value) / 100));
    const rows = this.labels.map((_, i) => i);
    const ring = (r: number) => `M${rows.map((i) => at(i, r)).join('L')}Z`;

    const svg = node('svg', { viewBox: '-50 -50 100 100', 'aria-hidden': 'true', focusable: 'false' });
    svg.append(node('path', {
      class: 'radar-chart-grid',
      d: this._rings(share).map(ring).join('')
        + rows.map((i) => `M0,0L${at(i, 1)}`).join('')
    }));
    this.series.forEach((series) => svg.append(this._series(series, (i) => at(i, share(series.values[i]!)))));

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
