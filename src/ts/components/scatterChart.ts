import { svgNode } from '../core/utils';
import { LineChart, LineChartOptions, ChartScale, Series, affix, cellValue, morph, numberFormat, pace, tickText } from './lineChart';

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

/**
 * A drawn point: its row and series, where it sits in the plot, in percent,
 * and its diameter as a share of the largest bubble's.
 */
interface Mark {
  row: number;
  series: Series;
  x: number;
  y: number;
  size: number;
}

/** Points as path data: round caps on zero-length lines. */
const dots = (marks: Mark[]) => marks.map(({ x, y }) => `M${x},${y}h0`).join('');

/** A point's row and series column, which update() matches old and new points by. */
const place = ({ row, series }: Mark) => `${row} ${series.column}`;

/** A CSS time, such as 400ms or 0.4s, in milliseconds. */
const ms = (time: string) => parseFloat(time) * (time.trim().endsWith('ms') ? 1 : 1000);

/**
 * Sizes a bubble, and with motion timing grows or shrinks it from its old
 * point's size. The Web Animations API, since SVG animation cannot reach a
 * size that CSS computes from a token.
 */
function sized(path: SVGElement, size: number, was: Mark | undefined, timing: ReturnType<typeof pace>) {
  path.style.setProperty('--scatter-chart-size', `${size}`);
  if (!timing || !was || was.size === size) return;
  path.animate({ '--scatter-chart-size': [`${was.size}`, `${size}`] }, { duration: ms(timing.dur), easing: `cubic-bezier(${timing.keySplines})` });
}

/**
 * Scatter chart. It reads its <table> like LineChart, but the first value
 * column is the x axis: each row draws one point per later column, at the
 * row's x value and that column's y value. A row without an x value, or a
 * cell without a y value, draws no point.
 *
 * With `.bubble`, the last column sizes each row's points, so their areas
 * follow its values, and a row without a positive size draws no point.
 *
 * Call `update()` after changing the table, or start it with `watch` or
 * `data-watch`.
 */
export class ScatterChart extends LineChart {
  // No initializers: LineChart's constructor draws before they would run.
  /** Each row's x value, or null. */
  private _xs: (number | null)[];
  /** Each row's size: 1 without .bubble, or the last cell's value, null unless positive. */
  private _sizes: (number | null)[];
  /** The x scale. */
  private _xFit: ChartScale;
  /** The signs around the x column's numbers, which its axis labels repeat. */
  private _xAffix: [string, string];
  /** The drawn points, row by row and within a row by series. */
  private _marks: Mark[];
  /** During update(), the points drawn before it, which the new ones move from. */
  private _drawn: Mark[];

  protected get _type() {
    return 'scatter-chart';
  }

  protected get _seriesFrom() {
    return 2;
  }

  protected get _seriesTo() {
    return this._bubble ? -1 : undefined;
  }

  private get _bubble() {
    return this.el.classList.contains('bubble');
  }

  static get defaults(): ScatterChartOptions {
    return { ...LineChart.defaults, xMin: null, xMax: null };
  }

  static key = 'Expressive_ScatterChart';

  /**
   * Reads each row's x value into `_xs` and its size into `_sizes`, which
   * the scales and the points use, and leaves out the values of rows
   * without either, so they neither draw nor stretch a scale. Nothing stacks.
   */
  protected _arrange(series: Series[]) {
    const xs = (this._xs = this._rows.map((row) => cellValue(row.cells[1])));
    const sizes = (this._sizes = this._rows.map((row) => this._size(row)));
    for (const each of series) {
      each.values = each.tops = each.values.map((value, row) => (xs[row] === null || sizes[row] === null ? null : value));
    }
  }

  /** A row's size: 1 without .bubble, or its last cell's value, null unless positive. */
  private _size(row: HTMLTableRowElement) {
    if (!this._bubble) return 1;
    const size = cellValue(row.cells[this._header.length - 1]) ?? 0;
    return size > 0 ? size : null;
  }

  protected get _count() {
    return this._marks?.length ?? 0;
  }

  /** Highlights one point, numbered as `_marks` lists them. Pass -1 to hide the tooltip. */
  show(index: number) {
    if (!this._tooltip || index === this.activeIndex) return;
    this.activeIndex = index;
    const mark = this._marks[index];
    this._cursor.hidden = this._tooltip.hidden = !mark;
    if (mark) this._fill(mark);
  }

  /**
   * Puts the marker on a point, at a bubble's size, and fills the tooltip
   * beside it: the row, its x header and text, the series and its text, and
   * with .bubble the size header and text, as the author wrote them. Past
   * the middle the tooltip opens back over the plot.
   */
  private _fill({ row, series, x, y, size }: Mark) {
    this._cursor.dataset.series = series.color;
    this._cursor.style.setProperty('--scatter-chart-size', `${size}`);
    for (const part of [this._cursor, this._tooltip]) Object.assign(part.style, { left: `${x}%`, top: `${y}%` });
    this._tooltip.classList.toggle('end', x > 50);
    const span = (text: string) => Object.assign(document.createElement('span'), { textContent: text });
    const [title, axis, name] = [document.createElement('strong'), span(this._header[1].textContent.trim()), span(series.name)];
    title.textContent = this.labels[row];
    axis.className = 'x';
    name.dataset.series = series.color;
    this._tooltip.replaceChildren(title, axis, span(this._rows[row].cells[1].textContent.trim()), name, span(series.text[row]), ...this._sizeText(row, span));
  }

  /** With .bubble, the size header, without a swatch, and the row's size text. */
  private _sizeText(row: number, span: (text: string) => HTMLSpanElement) {
    if (!this._bubble) return [];
    const last = this._header.length - 1;
    const header = span(this._header[last].textContent.trim());
    header.className = 'x';
    return [header, span(this._rows[row].cells[last]?.textContent.trim() ?? '')];
  }

  /** The point nearest the pointer, or -1 with none. */
  protected _indexAt(e: PointerEvent) {
    const [plot, box] = [this._plot, this._plot.getBoundingClientRect()];
    const away = ({ x, y }: Mark) => Math.hypot(
      box.left + plot.clientLeft + (x / 100) * plot.clientWidth - e.clientX,
      box.top + plot.clientTop + (y / 100) * plot.clientHeight - e.clientY);
    return this._marks.reduce((nearest, mark, i) => (nearest < 0 || away(mark) < away(this._marks[nearest]) ? i : nearest), -1);
  }

  /**
   * Steps through the points in table order. The arrows keep their meaning
   * in a right-to-left chart, since table order is no direction on screen.
   */
  protected _keyTarget(key: string): number | undefined {
    // With nothing shown, Escape is left to a dialog or sheet around the chart.
    if (key === 'Escape') return this.activeIndex < 0 ? undefined : -1;
    const last = this._marks.length - 1;
    const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[key];
    if (step) return Math.min(last, Math.max(0, this.activeIndex + step));
    return ({ Home: 0, End: last } as Record<string, number>)[key];
  }

  protected _read() {
    [this._drawn, this._marks] = [this._marks ?? [], []];
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

  /** The points, each diameter the square root of its row's share of the largest size drawn, so areas follow sizes. */
  private _layout(): Mark[] {
    const marks = this.labels.flatMap((_, row) => this.series
      .filter((series) => series.values[row] !== null)
      .map((series) => ({ row, series, x: this._xAt(this._xs[row]!), y: series.y(series.values[row]!), size: this._sizes[row]! })));
    const largest = marks.reduce((most, mark) => Math.max(most, mark.size), 0);
    return marks.map((mark) => ({ ...mark, size: Math.sqrt(mark.size / largest) }));
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
    const timing = this._before.length ? pace(this.el) : null;
    const was = new Map(this._drawn.map((old) => [place(old), old]));
    svg.append(...this.series.map((series) => this._group(series, timing, was)));
    return svg;
  }

  /**
   * A series' points, in one path, or with .bubble one path each, largest
   * first so smaller bubbles stay on top.
   */
  private _group(series: Series, timing: ReturnType<typeof pace>, was: Map<string, Mark>) {
    const group = svgNode('g', {
      class: `scatter-chart-series ${series.className}`.trim(),
      'data-series': series.color
    });
    const marks = this._marks.filter((mark) => mark.series === series);
    const sets = this._bubble ? marks.sort((a, b) => b.size - a.size).map((mark) => [mark]) : [marks];
    group.append(...sets.map((set) => this._pointPath(set, timing, was)));
    return group;
  }

  /**
   * A path of points. After update() each moves from where its row's point
   * in the same column was drawn, or appears where it is.
   */
  private _pointPath(marks: Mark[], timing: ReturnType<typeof pace>, was: Map<string, Mark>) {
    const path = svgNode('path', { class: 'scatter-chart-points', d: dots(marks) });
    if (timing) morph(path, dots(marks.map((mark) => was.get(place(mark)) ?? mark)), timing);
    if (this._bubble) sized(path, marks[0].size, was.get(place(marks[0])), timing);
    return path;
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
