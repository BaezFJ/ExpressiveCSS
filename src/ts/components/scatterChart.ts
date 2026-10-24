import { svgNode } from '../core/utils';
import { LineChart, LineChartOptions, ChartScale, Series, affix, cellValue, numberFormat, tickText } from './lineChart';

export interface ScatterChartOptions extends LineChartOptions {
  /**
   * Lowest value on the x axis. Defaults to the data minimum less 10% of
   * the range. Overridden by `data-x-min` on the chart.
   */
  xMin: number | null;
  /**
   * Highest value on the x axis. Defaults to the data maximum plus 10% of
   * the range. Overridden by `data-x-max` on the chart.
   */
  xMax: number | null;
}

/** A drawn point: its row and series, and where it sits in the plot, in percent. */
interface Mark {
  row: number;
  series: Series;
  x: number;
  y: number;
}

/**
 * Scatter chart. It reads its <table> like LineChart, but the first value
 * column is the x axis: each row draws one point per later column, at the
 * row's x value and that column's y value. A row without an x value, or a
 * cell without a y value, draws no point.
 *
 * Call `update()` after changing the table, or start it with `watch` or
 * `data-watch`.
 */
export class ScatterChart extends LineChart {
  // No initializers: LineChart's constructor draws before they would run.
  /** Each row's x value, or null. */
  private _xs: (number | null)[];
  /** The x scale. */
  private _xFit: ChartScale;
  /** The signs around the x column's numbers, which its axis labels repeat. */
  private _xAffix: [string, string];
  /** The drawn points, row by row and within a row by series. */
  private _marks: Mark[];

  protected get _type() {
    return 'scatter-chart';
  }

  protected get _seriesFrom() {
    return 2;
  }

  static get defaults(): ScatterChartOptions {
    return { ...LineChart.defaults, xMin: null, xMax: null };
  }

  static key = 'Expressive_ScatterChart';

  /**
   * Leaves out the values of rows without an x value, so they neither draw
   * nor stretch the y scale. Nothing stacks.
   */
  protected _arrange(series: Series[]) {
    const xs = (this._xs = this._rows.map((row) => cellValue(row.cells[1])));
    for (const each of series) {
      each.values = each.tops = each.values.map((value, row) => (xs[row] === null ? null : value));
    }
  }

  protected _read() {
    super._read();
    if (!this.series.length) return;
    this._xFit = this._xScale();
    this._xAffix = affix(this._rows.map((row) => row.cells[1]));
  }

  /** The x scale over the rows with a point, between `xMin` and `xMax` where they are set. */
  private _xScale(): ChartScale {
    const [low, high] = this._xRange();
    const [min, max] = [this._xEnd('xMin'), this._xEnd('xMax')];
    return this._fit(min ?? low, max ?? high, [min !== null, max !== null]);
  }

  /** The x values of the rows with a point, with 10% of their span to spare each side. */
  private _xRange(): [number, number] {
    const xs = this._xs.filter((_, row) => this.series.some((series) => series.values[row] !== null)) as number[];
    if (!xs.length) return [-1, 1];
    const [low, high] = [xs.reduce((a, b) => Math.min(a, b)), xs.reduce((a, b) => Math.max(a, b))];
    const pad = (high - low) * 0.1 || 1;
    return [low - pad, high + pad];
  }

  /** An x scale end from its data attribute or option, or null. */
  private _xEnd(name: 'xMin' | 'xMax') {
    return this._number(name) ?? (this.options as Partial<ScatterChartOptions>)[name] ?? null;
  }

  /** A value's distance across the plot from its inline start, in percent. */
  private _xAt(value: number) {
    const { min, max } = this._xFit;
    const x = ((value - min) / (max - min || 1)) * 100;
    return this._reversed ? 100 - x : x;
  }

  private _layout(): Mark[] {
    return this.labels.flatMap((_, row) => this.series
      .filter((series) => series.values[row] !== null)
      .map((series) => ({ row, series, x: this._xAt(this._xs[row]!), y: series.y(series.values[row]!) })));
  }

  /** One group per series, its points round caps on zero-length lines, so CSS sizes them in pixels. */
  protected _draw(): Element {
    this._marks = this._layout();
    const svg = svgNode('svg', {
      viewBox: '0 0 100 100',
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
      focusable: 'false'
    });
    svg.append(...this.series.map((series) => this._group(series)));
    return svg;
  }

  private _group(series: Series) {
    const group = svgNode('g', {
      class: `scatter-chart-series ${series.className}`.trim(),
      'data-series': series.color
    });
    const d = this._marks.filter((mark) => mark.series === series).map(({ x, y }) => `M${x},${y}h0`).join('');
    group.append(svgNode('path', { class: 'scatter-chart-points', d }));
    return group;
  }

  /** With .axis, the y scale's labels, and the x scale's below the plot with a grid line at each. */
  protected _axes(): Element[] {
    return this._axis ? [...super._axes(), this._xAxis()] : [];
  }

  private _xAxis() {
    const axis = document.createElement('ol');
    axis.className = 'scatter-chart-axis x';
    axis.setAttribute('aria-hidden', 'true');
    const number = numberFormat(this.el, { notation: 'compact', maximumSignificantDigits: 3 });
    for (const tick of this._xFit.ticks) {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = tickText(number, tick, this._xAffix);
      li.style.setProperty('--at', `${this._xAt(tick)}%`);
      li.append(label);
      axis.append(li);
    }
    return axis;
  }

  /** The legend only: the rows have no labels along an axis. */
  protected _guides(): Element[] {
    return this._legend();
  }
}
