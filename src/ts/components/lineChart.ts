import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface LineChartOptions extends BaseOptions {
  /**
   * Lowest value on the y axis. Defaults to the data minimum less 10% of
   * the range; a stacked chart starts at zero or its lowest total, and a
   * column chart always includes zero. Overridden by `data-min` on the chart.
   */
  min: number | null;
  /**
   * Highest value on the y axis. Defaults to the data maximum plus 10% of
   * the range. Overridden by `data-max` on the chart.
   */
  max: number | null;
}

const _defaults: LineChartOptions = {
  min: null,
  max: null
};

const SVG = 'http://www.w3.org/2000/svg';
export const COLORS = 4;

/** An SVG element with its attributes. */
export function svgNode(name: string, attributes: Record<string, string> = {}): SVGElement {
  const element = document.createElementNS(SVG, name);
  for (const key in attributes) element.setAttribute(key, attributes[key]);
  return element;
}

/** A point at a turn clockwise from the top and a distance from the middle, as "x,y". */
export function polarPoint(turn: number, r: number): string {
  const angle = turn * 2 * Math.PI;
  return `${(r * Math.sin(angle)).toFixed(3)},${(-r * Math.cos(angle)).toFixed(3)}`;
}

/** A series' color number, for its `data-series`. */
export const seriesColor = (i: number) => String((i % COLORS) + 1);
let _gradientId = 0;

/** Axis steps, as multiples of a power of ten. */
const NICE = [1, 2, 2.5, 5, 10];

/** A round step that cuts `span` into at most `parts` pieces. */
export function niceStep(span: number, parts = 4) {
  const raw = span / parts || 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  return power * NICE.find((multiple) => multiple * power >= raw * (1 - 1e-9))!;
}

/** The multiples of `step` from `low` to `high`, without float error. */
export function steps(low: number, high: number, step: number) {
  const values: number[] = [];
  for (let i = Math.ceil(low / step - 1e-9); i * step <= high + step * 1e-9; i++) {
    values.push(Number((i * step).toPrecision(12)));
  }
  return values;
}

/** A number format in the element's language, or the browser's for an invalid lang attribute. */
export function numberFormat(el: Element, options: Intl.NumberFormatOptions) {
  try {
    return new Intl.NumberFormat(el.closest<HTMLElement>('[lang]')?.lang || undefined, options);
  } catch {
    return new Intl.NumberFormat(undefined, options);
  }
}

/** A y scale's ends, and with .axis the values its labels mark. */
export interface ChartScale {
  min: number;
  max: number;
  ticks: number[];
}

export interface Series {
  name: string;
  /** Header cell classes, such as `dashed`. */
  className: string;
  /** Cell text, shown in the tooltip as the author formatted it. */
  text: string[];
  values: (number | null)[];
  /**
   * Where each value is drawn: the value, or in a stacked chart the running
   * total, which is unknown (null) above a gap.
   */
  tops: (number | null)[];
  /** In a stacked chart, the total of the series below, which this area fills down to. */
  base?: (number | null)[];
  /** The series' y scale: a value's distance down the plot, in percent. */
  y: (value: number) => number;
  scale: ChartScale;
  /**
   * The currency, percent or spacing around the first number written as
   * cell text, such as ['$', ''], which the axis labels repeat.
   */
  affix: [string, string];
}

/**
 * Reads a cell as a number. `data-value` wins over the text, which may carry
 * currency or percent signs, grouping commas and a typographic minus around
 * one number. Anything else, such as "(1,200)" or "3–5", is a gap rather
 * than a guess.
 */
function cellValue(cell: Element | undefined): number | null {
  if (!cell) return null;
  const raw = (cell as HTMLElement).dataset.value ?? cell.textContent;
  const text = raw.replace(/\u2212/g, '-').replace(/[\s%\p{Sc}]/gu, '');
  if (!/^[+-]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?(e[+-]?\d+)?$/i.test(text)) return null;
  // The pattern also lets through "e5" (NaN) and "1e400" (Infinity).
  const value = parseFloat(text.replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

/** The signs around the first value a column spells out in its text, as [prefix, suffix]. */
function affix(cells: (Element | undefined)[]): [string, string] {
  const cell = cells.find((each) => !(each as HTMLElement)?.dataset.value && cellValue(each) !== null);
  const [, prefix, suffix] = /^([\s\p{Sc}]*)[^]*?([\s%\p{Sc}]*)$/u.exec(cell?.textContent.trim() ?? '')!;
  return [prefix, suffix];
}

/**
 * A monotone cubic through the points (Fritsch-Butland tangents), so the
 * curve never overshoots a data point. Bezier curves keep their shape under
 * the plot's non-uniform scaling, so this can be drawn in a 0-100 box.
 */
function monotonePath(points: [number, number][]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0][0]},${points[0][1]}h0`;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    slopes.push((points[i + 1][1] - points[i][1]) / (points[i + 1][0] - points[i][0]));
  }
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === n - 1) return slopes[n - 2];
    const [a, b] = [slopes[i - 1], slopes[i]];
    return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b);
  });
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [[x0, y0], [x1, y1]] = [points[i], points[i + 1]];
    const h = (x1 - x0) / 3;
    d += `C${x0 + h},${y0 + tangents[i] * h} ${x1 - h},${y1 - tangents[i + 1] * h} ${x1},${y1}`;
  }
  return d;
}

/**
 * Line chart. The data is the chart's <table>; this class draws it as an SVG
 * with x labels, a legend for more than one series, and a cursor and tooltip
 * that follow the pointer or the arrow keys. Styling is CSS.
 *
 * Re-run `LineChart.init(el)` after changing the table.
 */
export class LineChart extends Component<LineChartOptions> {
  /** The values' x positions and series, read from the table. */
  labels: string[] = [];
  series: Series[] = [];
  /** The highlighted row, or -1. */
  activeIndex = -1;
  private _generated: Element[] = [];
  /** The table's header cells and body rows, as read. */
  protected _header: HTMLTableCellElement[] = [];
  protected _rows: HTMLTableRowElement[] = [];
  protected _plot: HTMLElement;
  protected _cursor: HTMLElement;
  protected _tooltip: HTMLElement;
  protected _y: (value: number) => number;
  /**
   * Whether the rows run right to left: a horizontal row axis in a
   * right-to-left context, like the labels. Bar chart rows keep their order.
   */
  protected _reversed = false;

  /** The class prefix of the generated parts; ColumnChart reuses this class. */
  protected get _type() {
    return 'line-chart';
  }

  /** Whether the y axis always includes zero, as columns grow from it. */
  protected get _fromZero() {
    return false;
  }

  /**
   * Whether the rows run down the plot and the values across it, as in a
   * bar chart. The rows then keep their order in a right-to-left context.
   */
  protected get _horizontal() {
    return false;
  }

  /**
   * Whether the rows go round a circle, as in a pie or radar chart. The
   * arrows then step round it, wrapping from the last row to the first.
   */
  protected get _circular() {
    return false;
  }

  /** Whether .axis labels the value scale, which a sparkline never does. */
  protected get _axis() {
    return this.el.classList.contains('axis') && !this.el.classList.contains('sparkline');
  }

  /** Whether the cursor marks each series with a point. */
  protected get _points() {
    return true;
  }

  protected get _key() {
    return 'Expressive_LineChart';
  }

  constructor(el: HTMLElement, options: Partial<LineChartOptions>) {
    super(el, options, new.target);
    this.el[this._key] = this;

    this.options = {
      ...new.target.defaults,
      ...options
    };

    this._read();
    if (!this.labels.length || !this.series.length) return;
    this._reversed = !this._horizontal && getComputedStyle(this.el).direction === 'rtl';
    this._render();
    if (!this.el.classList.contains('sparkline')) {
      this._plot.tabIndex = 0;
      // A tap has no move before it, so the press picks the row too.
      this._plot.addEventListener('pointerdown', this._onPointerMove);
      this._plot.addEventListener('pointermove', this._onPointerMove);
      this._plot.addEventListener('pointerleave', this._onLeave);
      this._plot.addEventListener('pointercancel', this._onCancel);
      this._plot.addEventListener('keydown', this._onKeyDown);
      this._plot.addEventListener('focus', this._onFocus);
      this._plot.addEventListener('blur', this._onLeave);
    }
  }

  static get defaults(): LineChartOptions {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<LineChartOptions>): LineChart;
  static init(els: InitElements<InitElement>, options?: Partial<LineChartOptions>): LineChart[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<LineChartOptions> = {}
  ): LineChart | LineChart[] {
    return super.init(els, options, this);
  }

  static getInstance(el: HTMLElement): LineChart {
    return el['Expressive_LineChart'];
  }

  destroy() {
    // The listeners live on the plot, which goes with the generated nodes.
    this._generated.forEach((node) => node.remove());
    this._generated = [];
    this.el[this._key] = undefined;
  }

  /**
   * Highlights one row: moves the cursor and fills the tooltip.
   * Pass -1 to hide them. Does nothing for a chart without data.
   */
  show(index: number) {
    // Skipping a repeat also keeps the live tooltip from re-announcing.
    if (!this._tooltip || index === this.activeIndex) return;
    this.activeIndex = index;
    const hidden = index < 0 || index >= this.labels.length;
    this._cursor.hidden = this._tooltip.hidden = hidden;
    if (hidden) return;

    this._cursor.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = this.labels[index];
    this._tooltip.replaceChildren(title);

    this.series.forEach((series, i) => {
      const value = series.values[index];
      if (value === null) return;
      const color = seriesColor(i);
      const top = series.tops[index];
      if (top !== null && this._points) {
        const dot = document.createElement('span');
        dot.className = series.className;
        dot.dataset.series = color;
        dot.style.top = `${series.y(top)}%`;
        this._cursor.append(dot);
      }
      const name = document.createElement('span');
      name.dataset.series = color;
      name.textContent = series.name;
      const text = document.createElement('span');
      text.textContent = series.text[index];
      this._tooltip.append(name, text);
    });
    this._place(index);
  }

  /**
   * Moves the filled cursor and tooltip to a row: beside its band, with the
   * tooltip opening back over the plot past the middle.
   */
  protected _place(index: number) {
    const x = this._x(index);
    const side = this._horizontal ? 'top' : 'left';
    this._cursor.style[side] = this._tooltip.style[side] = `${x}%`;
    this._tooltip.classList.toggle('end', x > 50);
  }

  private _read() {
    const table = this.el.querySelector<HTMLTableElement>(':scope > table');
    if (!table) return;
    // Without a <thead> the parser puts the header row in the first <tbody>.
    const headerRow = table.tHead?.rows[0] ?? table.rows[0];
    const header = Array.from(headerRow?.cells ?? []);
    const rows = Array.from(table.tBodies)
      .flatMap((body) => Array.from(body.rows))
      .filter((row) => row !== headerRow);
    [this._header, this._rows] = [header, rows];
    this.labels = rows.map((row) => row.cells[0]?.textContent.trim() ?? '');
    this.series = header.slice(1).map((cell, i) => {
      const values = rows.map((row) => cellValue(row.cells[i + 1]));
      return {
        name: cell.textContent.trim(),
        className: cell.className,
        text: rows.map((row) => row.cells[i + 1]?.textContent.trim() ?? ''),
        values,
        tops: values,
        y: undefined,
        scale: undefined,
        affix: affix(rows.map((row) => row.cells[i + 1]))
      };
    });
    const stacked = this.el.classList.contains('stacked');
    if (stacked) {
      // A gap leaves the total unknown, so the series above break there too.
      // ponytail: negative values overlap the band below; diverging stacks if needed.
      const totals: (number | null)[] = this.labels.map(() => 0);
      for (const series of this.series) {
        series.base = [...totals];
        series.tops = series.values.map((value, i) =>
          (totals[i] = value === null || totals[i] === null ? null : totals[i] + value));
      }
    }

    if (this.series.every((series) => series.tops.every((value) => value === null))) this.series = [];
    const option = (name: 'min' | 'max') => this._number(name) ?? this.options[name];
    this._y = this._scale(this.series, option('min'), option('max'));
  }

  /** A number from one of the chart's data attributes, or null. */
  protected _number(name: string) {
    const value = parseFloat(this.el.dataset[name] ?? '');
    return Number.isFinite(value) ? value : null;
  }

  /**
   * Fits a y scale to the series' tops, between `min` and `max` where they
   * are set, and gives it to each series.
   */
  protected _scale(series: Series[], min: number | null, max: number | null, fromZero = this._fromZero) {
    const fixed = [min !== null, max !== null] as const;
    const stacked = this.el.classList.contains('stacked');
    let [low, high] = [Infinity, -Infinity];
    for (const { tops } of series) {
      for (const value of tops) {
        if (value === null) continue;
        low = Math.min(low, value);
        high = Math.max(high, value);
      }
    }
    if (low > high) low = high = 0;
    if (fromZero) {
      // Zero is on the scale, with 10% of the span to spare on each side
      // that has data.
      const [bottom, top] = [Math.min(0, low), Math.max(0, high)];
      const room = (top - (min ?? bottom)) * 0.1 || 1;
      min ??= bottom < 0 ? bottom - room : 0;
      max ??= top + room;
    } else {
      const pad = (high - low) * 0.1 || 1;
      // Stacked areas are read against zero, with the headroom of that span.
      min ??= stacked ? Math.min(0, low) : low - pad;
      max ??= high + (stacked ? (high - min) * 0.1 || 1 : pad);
    }
    return this._apply(series, this._fit(min, max, fixed));
  }

  /**
   * With .axis, widens each end the chart chose to a round step and lists
   * the steps for the labels. An end set by the author stays where it is.
   */
  protected _fit(min: number, max: number, [fixedMin, fixedMax]: readonly boolean[]): ChartScale {
    if (!this._axis) return { min, max, ticks: [] };
    const step = niceStep(max - min);
    const low = fixedMin ? min : Math.floor(min / step + 1e-9) * step;
    const high = fixedMax ? max : Math.ceil(max / step - 1e-9) * step;
    return { min: low, max: high, ticks: steps(low, high, step) };
  }

  /** Gives the series a scale and the y function it draws with. */
  protected _apply(series: Series[], scale: ChartScale) {
    const y = (value: number) => 100 - ((value - scale.min) / (scale.max - scale.min || 1)) * 100;
    for (const each of series) Object.assign(each, { y, scale });
    return y;
  }

  /** Each row sits in the middle of an equal band, beside its label. */
  private _x(index: number) {
    const x = ((index + 0.5) / this.labels.length) * 100;
    return this._reversed ? 100 - x : x;
  }

  private _render() {
    const type = this._type;
    this._plot = document.createElement('div');
    this._plot.className = `${type}-plot`;
    const caption = this.el.querySelector(':scope > figcaption')?.textContent.trim();
    this._plot.setAttribute('role', 'group');
    this._plot.setAttribute('aria-roledescription', type.replace(/-/g, ' '));
    if (caption) this._plot.setAttribute('aria-label', caption);

    this._cursor = document.createElement('div');
    this._cursor.className = `${type}-cursor`;
    this._cursor.hidden = true;
    this._tooltip = document.createElement('div');
    this._tooltip.className = `${type}-tooltip`;
    this._tooltip.hidden = true;
    this._tooltip.setAttribute('aria-live', 'polite');
    this._plot.append(...this._axes(), this._draw(), this._cursor, this._tooltip);

    this._generated = [this._plot, ...this._guides()];
    this.el.append(...this._generated);
  }

  /**
   * The <tfoot> row as a total to show over the plot, its value over its
   * label, or null without one.
   */
  protected _total(className: string): HTMLElement | null {
    const footer = this.el.querySelector<HTMLTableElement>(':scope > table')?.tFoot?.rows[0];
    if (!footer) return null;
    const total = document.createElement('div');
    total.className = className;
    const [label, value] = [document.createElement('span'), document.createElement('strong')];
    label.textContent = footer.cells[0]?.textContent.trim() ?? '';
    value.textContent = footer.cells[1]?.textContent.trim() ?? '';
    total.append(value, label);
    return total;
  }

  /** The parts below the plot: the row labels and the legend. */
  protected _guides(): Element[] {
    const labels = document.createElement('ol');
    labels.className = `${this._type}-labels`;
    labels.setAttribute('aria-hidden', 'true');
    // A loop rather than a spread: a spread of every row overflows the stack.
    for (const text of this.labels) {
      const li = document.createElement('li');
      li.textContent = text;
      labels.append(li);
    }
    return [labels, ...this._legend()];
  }

  /**
   * With .axis, the value labels, behind the marks: the start scale's with
   * a grid line at each, and a mixed chart's end scale on the far side.
   */
  protected _axes(): Element[] {
    if (!this._axis) return [];
    const isEnd = (series: Series) => series.className.split(/\s+/).includes('end');
    const start = this.series.find((series) => !isEnd(series)) ?? this.series[0];
    const end = this.series.find((series) => series.y !== start.y);
    return [start, end].filter(Boolean).map((series, i) => this._valueAxis(series!, i > 0));
  }

  /** One scale's labels, each placed by --at, its value's distance down the plot. */
  private _valueAxis(series: Series, end: boolean) {
    const axis = document.createElement('ol');
    axis.className = `${this._type}-axis${end ? ' end' : ''}`;
    axis.setAttribute('aria-hidden', 'true');
    const number = numberFormat(this.el, { notation: 'compact', maximumSignificantDigits: 3 });
    const [prefix, suffix] = series.affix;
    for (const tick of series.scale.ticks) {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = number.format(tick).replace(/^[-\u2212]?/, (sign) => sign + prefix) + suffix;
      li.style.setProperty('--at', `${series.y(tick)}%`);
      li.append(label);
      axis.append(li);
    }
    return axis;
  }

  /** The series legend, for more than one series. */
  protected _legend(): Element[] {
    if (this.series.length < 2) return [];
    const legend = document.createElement('ul');
    legend.className = `${this._type}-legend`;
    legend.setAttribute('aria-hidden', 'true');
    legend.append(...this.series.map((series, i) => {
      const li = document.createElement('li');
      li.dataset.series = seriesColor(i);
      li.textContent = series.name;
      return li;
    }));
    return [legend];
  }

  /** Draws the series, which fill the plot. */
  protected _draw(drawn = this.series): Element {
    const svg = svgNode('svg', {
      viewBox: '0 0 100 100',
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
      focusable: 'false'
    });

    for (const series of drawn) {
      const group = svgNode('g', {
        class: `${this._type}-series ${series.className}`.trim(),
        'data-series': seriesColor(this.series.indexOf(series))
      });

      // A gap in the data breaks the line into runs of row indexes.
      const runs: number[][] = [[]];
      series.tops.forEach((value, index) => {
        if (value === null) runs.push([]);
        else runs[runs.length - 1].push(index);
      });
      const filled = runs.filter((run) => run.length);
      const points = (run: number[], values: (number | null)[]) =>
        run.map((index): [number, number] => [this._x(index), series.y(values[index]!)]);
      const tops = filled.map((run) => monotonePath(points(run, series.tops)));

      const id = `line-chart-gradient-${++_gradientId}`;
      const gradient = svgNode('linearGradient', { id, x2: '0', y2: '1' });
      gradient.append(svgNode('stop'), svgNode('stop', { offset: '1' }));

      const area = svgNode('path', {
        class: `${this._type}-area`,
        fill: `url(#${id})`,
        // A stacked area runs back along the series below; the reversed curve
        // is the same curve. Its base stops at the plot bottom when the y axis
        // starts above zero.
        d: filled
          .map((run, r) => {
            if (!series.base) return `${tops[r]}V100H${this._x(run[0])}Z`;
            const base = points(run, series.base).map(([x, y]): [number, number] => [x, Math.min(100, y)]);
            return `${tops[r]}L${monotonePath(base.reverse()).slice(1)}Z`;
          })
          .join('')
      });

      const line = svgNode('path', { class: `${this._type}-line`, d: tops.join('') });

      group.append(gradient, area, line);
      svg.append(group);
    }
    return svg;
  }

  private _onPointerMove = (e: PointerEvent) => {
    this.show(this._indexAt(e));
  };

  /** The row under the pointer, or -1. */
  protected _indexAt(e: PointerEvent) {
    const box = this._plot.getBoundingClientRect();
    const fraction = this._horizontal
      ? (e.clientY - box.top) / box.height
      : (e.clientX - box.left) / box.width;
    const index = Math.floor((this._reversed ? 1 - fraction : fraction) * this.labels.length);
    return Math.min(this.labels.length - 1, Math.max(0, index));
  }

  /**
   * For a circular chart, the pointer's position from the plot's middle: a
   * fraction of a turn clockwise from the top, and its distance as a share
   * of the plot's width.
   */
  protected _polarAt(e: PointerEvent): [turn: number, distance: number] {
    const box = this._plot.getBoundingClientRect();
    const [x, y] = [e.clientX - box.left - box.width / 2, e.clientY - box.top - box.height / 2];
    return [(Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1, Math.hypot(x, y) / box.width];
  }

  /** The keys that move to the next row and to the one before. */
  protected get _arrows(): [string[], string[]] {
    // Round a circle both pairs work. The rows run clockwise in RTL too, so
    // right still moves the way the top row turns.
    if (this._circular) return [['ArrowRight', 'ArrowDown'], ['ArrowLeft', 'ArrowUp']];
    // Arrows move the cursor the way they point, so they swap in RTL.
    if (this._horizontal) return [['ArrowDown'], ['ArrowUp']];
    return this._reversed ? [['ArrowLeft'], ['ArrowRight']] : [['ArrowRight'], ['ArrowLeft']];
  }

  private _onFocus = () => {
    // Only keyboard focus picks the first row; a press off the marks, which
    // focuses the plot too, leaves the tooltip hidden.
    if (this.activeIndex < 0 && this._plot.matches(':focus-visible')) this.show(0);
  };

  private _onLeave = (e: Event) => {
    // A touch leaves as it lifts; the tapped row stays until the plot blurs.
    if ((e as PointerEvent).pointerType === 'touch' || this._plot.matches(':focus-visible')) return;
    this.show(-1);
  };

  /** The browser took the touch to scroll the page. */
  private _onCancel = () => {
    this.show(-1);
  };

  /** The index a key moves to, or undefined for a key the chart ignores. */
  protected _keyTarget(key: string): number | undefined {
    const last = this.labels.length - 1;
    const [forward, back] = this._arrows;
    const step = (by: number) => {
      if (!this._circular) return Math.min(last, Math.max(0, this.activeIndex + by));
      // Round a circle the ends meet; from no row, back starts at the last.
      if (this.activeIndex < 0) return by > 0 ? 0 : last;
      return (this.activeIndex + by + last + 1) % (last + 1);
    };
    // With nothing shown, Escape is left to a dialog or sheet around the chart.
    if (key === 'Escape') return this.activeIndex < 0 ? undefined : -1;
    return forward.includes(key) ? step(1)
      : back.includes(key) ? step(-1)
      : { Home: 0, End: last }[key];
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    const next = this._keyTarget(e.key);
    if (next === undefined) return;
    e.preventDefault();
    this.show(next);
  };
}
