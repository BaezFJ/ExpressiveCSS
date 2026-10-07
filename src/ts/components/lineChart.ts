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
let _gradientId = 0;

interface Series {
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
  if (!/^[+-]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?(e[+-]?\d+)?$/i.test(text) || !/\d/.test(text)) return null;
  return parseFloat(text.replace(/,/g, ''));
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
  private _cursor: HTMLElement;
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

    const x = this._x(index);
    const side = this._horizontal ? 'top' : 'left';
    this._cursor.style[side] = this._tooltip.style[side] = `${x}%`;
    this._tooltip.classList.toggle('end', x > 50);
    this._cursor.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = this.labels[index];
    this._tooltip.replaceChildren(title);

    this.series.forEach((series, i) => {
      const value = series.values[index];
      if (value === null) return;
      const color = String((i % COLORS) + 1);
      const top = series.tops[index];
      if (top !== null && this._points) {
        const dot = document.createElement('span');
        dot.dataset.series = color;
        dot.style.top = `${this._y(top)}%`;
        this._cursor.append(dot);
      }
      const name = document.createElement('span');
      name.dataset.series = color;
      name.textContent = series.name;
      const text = document.createElement('span');
      text.textContent = series.text[index];
      this._tooltip.append(name, text);
    });
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
        tops: values
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

    let [low, high] = [Infinity, -Infinity];
    for (const series of this.series) {
      for (const value of series.tops) {
        if (value === null) continue;
        low = Math.min(low, value);
        high = Math.max(high, value);
      }
    }
    if (low > high) this.series = [];
    const option = (name: 'min' | 'max') => {
      const value = parseFloat(this.el.dataset[name] ?? '');
      return Number.isFinite(value) ? value : this.options[name];
    };
    let [min, max] = [option('min'), option('max')];
    if (this._fromZero) {
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
    this._y = (value) => 100 - ((value - min) / (max - min || 1)) * 100;
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
    this._plot.append(this._draw(), this._cursor, this._tooltip);

    this._generated = [this._plot, ...this._guides()];
    this.el.append(...this._generated);
  }

  /** The row labels and, for more than one series, the legend. */
  protected _guides(): Element[] {
    const type = this._type;
    const labels = document.createElement('ol');
    labels.className = `${type}-labels`;
    labels.setAttribute('aria-hidden', 'true');
    // A loop rather than a spread: a spread of every row overflows the stack.
    for (const text of this.labels) {
      const li = document.createElement('li');
      li.textContent = text;
      labels.append(li);
    }
    if (this.series.length < 2) return [labels];

    const legend = document.createElement('ul');
    legend.className = `${type}-legend`;
    legend.setAttribute('aria-hidden', 'true');
    legend.append(...this.series.map((series, i) => {
      const li = document.createElement('li');
      li.dataset.series = String((i % COLORS) + 1);
      li.textContent = series.name;
      return li;
    }));
    return [labels, legend];
  }

  /** Draws the series, which fill the plot. */
  protected _draw(): Element {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    this.series.forEach((series, i) => {
      const group = document.createElementNS(SVG, 'g');
      group.setAttribute('class', `line-chart-series ${series.className}`.trim());
      group.dataset.series = String((i % COLORS) + 1);

      // A gap in the data breaks the line into runs of row indexes.
      const runs: number[][] = [[]];
      series.tops.forEach((value, index) => {
        if (value === null) runs.push([]);
        else runs[runs.length - 1].push(index);
      });
      const filled = runs.filter((run) => run.length);
      const points = (run: number[], values: (number | null)[]) =>
        run.map((index): [number, number] => [this._x(index), this._y(values[index]!)]);
      const tops = filled.map((run) => monotonePath(points(run, series.tops)));

      const id = `line-chart-gradient-${++_gradientId}`;
      const gradient = document.createElementNS(SVG, 'linearGradient');
      gradient.id = id;
      gradient.setAttribute('x2', '0');
      gradient.setAttribute('y2', '1');
      gradient.append(document.createElementNS(SVG, 'stop'), document.createElementNS(SVG, 'stop'));
      gradient.lastElementChild.setAttribute('offset', '1');

      const area = document.createElementNS(SVG, 'path');
      area.setAttribute('class', 'line-chart-area');
      area.setAttribute('fill', `url(#${id})`);
      // A stacked area runs back along the series below; the reversed curve
      // is the same curve. Its base stops at the plot bottom when the y axis
      // starts above zero.
      area.setAttribute('d', filled
        .map((run, r) => {
          if (!series.base) return `${tops[r]}V100H${this._x(run[0])}Z`;
          const base = points(run, series.base).map(([x, y]): [number, number] => [x, Math.min(100, y)]);
          return `${tops[r]}L${monotonePath(base.reverse()).slice(1)}Z`;
        })
        .join(''));

      const line = document.createElementNS(SVG, 'path');
      line.setAttribute('class', 'line-chart-line');
      line.setAttribute('d', tops.join(''));

      group.append(gradient, area, line);
      svg.append(group);
    });
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

  /** The keys that move to the next row and to the one before. */
  protected get _arrows(): [string[], string[]] {
    // Arrows move the cursor the way they point, so they swap in RTL.
    if (this._horizontal) return [['ArrowDown'], ['ArrowUp']];
    return this._reversed ? [['ArrowLeft'], ['ArrowRight']] : [['ArrowRight'], ['ArrowLeft']];
  }

  private _onFocus = () => {
    if (this.activeIndex < 0) this.show(0);
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
    const step = (by: number) => Math.min(last, Math.max(0, this.activeIndex + by));
    return forward.includes(key) ? step(1)
      : back.includes(key) ? step(-1)
      : { Home: 0, End: last, Escape: -1 }[key];
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    const next = this._keyTarget(e.key);
    if (next === undefined) return;
    e.preventDefault();
    this.show(next);
  };
}
