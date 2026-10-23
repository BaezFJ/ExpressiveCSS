import { Component, BaseOptions } from '../core/component';
import { Utils, svgNode } from '../core/utils';

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
  /**
   * Redraws the chart whenever its table changes, once for the edits a
   * script makes in one run, so page script need not call `update()`.
   * `data-watch` on the chart turns it on too. Read when the chart starts.
   */
  watch: boolean;
}

const _defaults: LineChartOptions = {
  min: null,
  max: null,
  watch: false
};

export const COLORS = 4;

/** The least space between two row labels. */
const LABEL_GAP = 4;

/** A label's text width, and where the column it labels starts and ends. */
interface LabelBox {
  width: number;
  start: number;
  end: number;
}

/** Measures each label along the inline axis, which runs leftward in a right-to-left chart. */
function labelBoxes(items: Element[], rtl: boolean): LabelBox[] {
  const range = document.createRange();
  return items.map((item) => {
    range.selectNodeContents(item);
    const width = range.getBoundingClientRect().width;
    const { left, right } = item.getBoundingClientRect();
    return rtl ? { width, start: -right, end: -left } : { width, start: left, end: right };
  });
}

/**
 * Where a kept label's text starts, as the CSS places it: the first and last
 * against the outer ends of their columns, the rest centred on theirs.
 */
function labelStart(boxes: LabelBox[], index: number) {
  const box = boxes[index];
  if (index === 0) return box.start;
  if (index === boxes.length - 1) return box.end - box.width;
  return (box.start + box.end - box.width) / 2;
}

/** Whether keeping every stepth label leaves them apart and inside the chart. */
function labelsFit(boxes: LabelBox[], step: number) {
  const edge = boxes[boxes.length - 1].end;
  let previous = -Infinity;
  for (let index = 0; index < boxes.length; index += step) {
    const start = labelStart(boxes, index);
    if (start < previous + LABEL_GAP || start + boxes[index].width > edge) return false;
    previous = start + boxes[index].width;
  }
  return true;
}

/**
 * How many columns apart the kept labels are: 1 when every label fits its
 * column, else the fewest that keeps them apart. When none does, 1 again,
 * and every label is cut to an ellipsis as before.
 */
function labelStep(boxes: LabelBox[]) {
  if (boxes.every((box) => box.width + LABEL_GAP <= box.end - box.start)) return 1;
  for (let step = 2; step <= boxes.length; step++) {
    if (labelsFit(boxes, step)) return step;
  }
  return 1;
}

/**
 * Keeps every nth column label when they are wider than their columns, so a
 * narrow chart shows whole labels rather than cutting each to an ellipsis.
 * The container gets data-thinned and each hidden label data-skip.
 */
function thinLabels(container: Element, items: Element[]) {
  const step = labelStep(labelBoxes(items, getComputedStyle(container).direction === 'rtl'));
  container.toggleAttribute('data-thinned', step > 1);
  items.forEach((item, index) => item.toggleAttribute('data-skip', index % step > 0));
}

/** Whether the changes reach the data: inside the table, or a table added or removed. */
function tableChanged(records: MutationRecord[], el: Element) {
  const isTable = (node: Node) => node.nodeName === 'TABLE';
  return records.some((record) =>
    record.target !== el || [...record.addedNodes, ...record.removedNodes].some(isTable));
}

/**
 * The legend of a pie or radial chart: an item per row, colored as
 * `colors[i]` when that is set, holding a span for each of `rows[i]`.
 */
export function rowLegend(className: string, colors: (string | undefined)[], rows: string[][]): HTMLUListElement {
  const legend = document.createElement('ul');
  legend.className = className;
  legend.setAttribute('aria-hidden', 'true');
  legend.append(...rows.map((cells, i) => {
    const li = document.createElement('li');
    if (colors[i]) li.dataset.series = colors[i];
    li.append(...cells.map((content) => Object.assign(document.createElement('span'), { textContent: content })));
    return li;
  }));
  return legend;
}

/** A point at a turn clockwise from the top and a distance from the middle, as "x,y". */
export function polarPoint(turn: number, r: number): string {
  const angle = turn * 2 * Math.PI;
  return `${(r * Math.sin(angle)).toFixed(3)},${(-r * Math.cos(angle)).toFixed(3)}`;
}

/** A series' color number, for its `data-series`. */
export const seriesColor = (i: number) => String((i % COLORS) + 1);
let _gradientId = 0;

/** The series update() moves the marks from: none when the reader asked for less motion. */
const startsFrom = (series: Series[]) =>
  matchMedia('(prefers-reduced-motion: reduce)').matches ? [] : series;

/** A cubic-bezier() easing's four numbers, or the standard curve's for any other easing. */
const splines = (easing: string) => /cubic-bezier\(([^)]*)\)/.exec(easing)?.[1] ?? '0.2, 0, 0, 1';

/**
 * The timing of the paths' motion after update(), from the chart's motion
 * tokens, as the columns' CSS transition reads them. Null for a zero
 * duration, which SVG would take as indefinite and hold the old shape.
 * ponytail: a curve that overshoots is not a valid SVG spline, so the
 * paths then skip their motion; a linear() token gets the standard curve.
 */
function pace(el: Element) {
  const style = getComputedStyle(el);
  const dur = style.getPropertyValue('--md-sys-motion-duration-medium4').trim() || '400ms';
  return parseFloat(dur) > 0 ? { dur, keySplines: splines(style.getPropertyValue('--md-sys-motion-easing-standard')) } : null;
}

/**
 * Moves a path from the path data `from` to its own. SVG animation rather
 * than a CSS transition, since WebKit cannot transition the d property.
 */
function morph(path: SVGElement, from: string, timing: Pace) {
  const to = path.getAttribute('d');
  if (from === to) return;
  path.append(svgNode('animate', { attributeName: 'd', from, to, ...timing, calcMode: 'spline', keyTimes: '0;1', fill: 'remove' }));
}

/** The paths' motion timing. */
type Pace = NonNullable<ReturnType<typeof pace>>;

/** A series' line, the fill under it and its dots, as path data. */
interface Shape {
  line: string;
  area: string;
  dots: string;
}

/** A row's distance down the plot, in percent. */
type RowY = (index: number) => number;

/** The buttons in a chart's generated parts, such as a .toggle legend's. */
const buttons = (nodes: Element[]) => nodes.flatMap((node) => Array.from(node.querySelectorAll('button')));

/**
 * Whether a series has data. Its values, not its tops: stacked over another
 * series' gaps a series can have no top, yet still draws once that one hides.
 */
const drawable = (series: Series) => series.values.some((value) => value !== null);

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
  return new Intl.NumberFormat(Utils.locale(el), options);
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
  /** The series' column in the table, from 1, which tells apart two of one name. */
  column: number;
  /** The `data-series` color number, by its column, so hiding a series shifts none. */
  color: string;
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
  return numberValue((cell as HTMLElement).dataset.value ?? cell.textContent);
}

/** Reads text as one number, as cellValue does, or null. */
export function numberValue(raw: string): number | null {
  const text = raw.replace(/\u2212/g, '-').replace(/[\s%\p{Sc}]/gu, '');
  if (!/^[+-]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?(e[+-]?\d+)?$/i.test(text)) return null;
  // The pattern also lets through "e5" (NaN) and "1e400" (Infinity).
  const value = parseFloat(text.replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

/** The currency, percent and spacing around a cell's number, as [prefix, suffix]. */
export function signs(text: string): [string, string] {
  // Each end is read from its own side, so a long run of spaces stays linear.
  const prefix = /^[\s\p{Sc}]*/u.exec(text)![0];
  const end = (chars: string) => [...chars].reverse().join('');
  return [prefix, end(/^[\s%\p{Sc}]*/u.exec(end(text.slice(prefix.length)))![0])];
}

/** The signs around the first value a column spells out in its text. */
function affix(cells: (Element | undefined)[]): [string, string] {
  const cell = cells.find((each) => !(each as HTMLElement)?.dataset.value && cellValue(each) !== null);
  return signs(cell?.textContent.trim() ?? '');
}

/** Straight lines through the points; one point is a dot. */
function straightPath(points: [number, number][]): string {
  return `M${points.join('L')}${points.length > 1 ? '' : 'h0'}`;
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
 * Call `update()` after changing the table, or start it with `watch` or
 * `data-watch`.
 */
export class LineChart extends Component<LineChartOptions> {
  /** The values' x positions and series, read from the table. */
  labels: string[] = [];
  series: Series[] = [];
  /** The highlighted row, or -1. */
  activeIndex = -1;
  private _generated: Element[] = [];
  /** Watches the row labels' width, to thin them on a narrow chart. */
  private _labelSizes: ResizeObserver | null = null;
  /** With `watch`, redraws the chart when its table changes. */
  private _tableWatch: MutationObserver | null = null;
  /** Every series in the table, shown or not, as the legend lists them. */
  protected _all: Series[] = [];
  /**
   * During update(), the series drawn before it, which the new marks move
   * from. Empty otherwise, and when the reader prefers less motion.
   */
  protected _before: Series[] = [];
  /** The columns of the series a .toggle legend hid, kept through update(). */
  private _hidden = new Set<number>();
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

  /** How many rows `show()` can highlight. */
  protected get _count() {
    return this.labels.length;
  }

  constructor(el: HTMLElement, options: Partial<LineChartOptions>) {
    super(el, options);

    this._build();
    this._listen();
    if (this.options.watch || this.el.hasAttribute('data-watch')) {
      this._tableWatch = new MutationObserver((records) => tableChanged(records, this.el) && this.update());
    }
    this._watch();
  }

  /**
   * Observes the table as it is now, and the chart for a table added or
   * replaced. Reconnecting drops the changes already queued, which the
   * caller has just drawn.
   */
  private _watch() {
    if (!this._tableWatch) return;
    this._tableWatch.disconnect();
    this._tableWatch.observe(this.el, { childList: true });
    const table = this.el.querySelector(':scope > table');
    if (table) {
      this._tableWatch.observe(table, {
        subtree: true,
        childList: true,
        characterData: true,
        attributeFilter: ['data-value', 'class', 'data-label']
      });
    }
  }

  /** Reads the table and draws it, when it has data. */
  private _build() {
    this._read();
    if (!this.labels.length || !this.series.length) return;
    this._reversed = !this._horizontal && getComputedStyle(this.el).direction === 'rtl';
    this._render();
  }

  /** Whether the pointer and keys pick rows, which a sparkline's do not. */
  private get _interactive() {
    return !this.el.classList.contains('sparkline');
  }

  /** Lets the pointer and keys pick rows on the plot. */
  private _listen() {
    if (this._plot && this._interactive) {
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

  static key = 'Expressive_LineChart';

  destroy() {
    // The listeners live on the plot, which goes with the generated nodes.
    this._generated.forEach((node) => node.remove());
    this._generated = [];
    this._labelSizes?.disconnect();
    this._tableWatch?.disconnect();
    super.destroy();
  }

  /**
   * Redraws the chart from its table as it is now. Focus stays on the chart,
   * on the same legend button when one had it, and the highlighted row stays
   * where the table still has it.
   */
  update() {
    if ((this.constructor as typeof LineChart).getInstance(this.el) !== this) return;
    const old = this._generated;
    // Inside a shadow root, the document's active element is the host.
    const active = (this.el.getRootNode() as Document | ShadowRoot).activeElement;
    const [index, focused] = [this.activeIndex, old.some((node) => node.contains(active))];
    const button = buttons(old).indexOf(active as HTMLButtonElement);
    this._generated = [];
    this.activeIndex = -1;
    this._plot = this._cursor = this._tooltip = undefined;
    this._before = startsFrom(this.series);
    this._build();
    this._before = [];
    // Focus moves before the old plot goes, so a keyboard focus ring carries
    // over, and before the listeners, so focusing picks no row of its own.
    if (focused) (buttons(this._generated)[button] ?? this._plot)?.focus({ preventScroll: true });
    old.forEach((node) => node.remove());
    this._listen();
    this.show(Math.min(index, this._count - 1));
    this._watch();
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

    this.series.forEach((series) => {
      const value = series.values[index];
      if (value === null) return;
      const color = series.color;
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

  protected _read() {
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
        column: i + 1,
        color: seriesColor(i),
        text: rows.map((row) => row.cells[i + 1]?.textContent.trim() ?? ''),
        values,
        tops: values,
        y: undefined,
        scale: undefined,
        affix: affix(rows.map((row) => row.cells[i + 1]))
      };
    });
    this._all = this.series;
    this.series = this._shown(this._all);
    const option = (name: 'min' | 'max') => this._number(name) ?? this.options[name];
    this._y = this._scale(this.series, option('min'), option('max'));
  }

  /**
   * The series to draw, arranged: those the legend has not hidden, or none
   * without data. When the ones shown hold no data, as after the table
   * changed, the hidden ones come back, so the legend never hides the only
   * data there is.
   */
  private _shown(all: Series[]): Series[] {
    const shown = all.filter((series) => !this._hidden.has(series.column));
    this._arrange(shown);
    if (shown.some(drawable)) return shown;
    if (!this._hidden.size) return [];
    this._hidden.clear();
    return this._shown(all);
  }

  /** Turns the values read into what is drawn: with .stacked, running totals. */
  protected _arrange(series: Series[]) {
    if (this.el.classList.contains('stacked')) this._stack(series);
  }

  /**
   * Stacks each series on the ones before it: its tops become running
   * totals and its base the total below. A gap leaves the total unknown, so
   * the series above break there too.
   */
  protected _stack(series: Series[]) {
    // ponytail: negative values overlap the band below; diverging stacks if needed.
    const totals: (number | null)[] = this.labels.map(() => 0);
    for (const each of series) {
      each.base = [...totals];
      each.tops = each.values.map((value, i) =>
        (totals[i] = value === null || totals[i] === null ? null : totals[i] + value));
    }
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
    // A base below zero, such as a range's low end, needs room on the scale too.
    for (const { tops, base = [] } of series) {
      for (const value of [...tops, ...base]) {
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
    if (this._interactive) this._plot.tabIndex = 0;

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
      // In a span, so a kept label can overflow its column centred.
      li.append(document.createElement('span'));
      li.firstChild.textContent = text;
      labels.append(li);
    }
    this._observeLabels(labels, Array.from(labels.children));
    return [labels, ...this._legend()];
  }

  /**
   * Thins the column labels in container whenever its width changes. A bar
   * chart's labels run down instead, and no labels leaves nothing to watch.
   */
  protected _observeLabels(container: HTMLElement, items: Element[]) {
    this._labelSizes?.disconnect();
    if (this._horizontal || !items.length) return;
    this._labelSizes = new ResizeObserver(() => thinLabels(container, items));
    this._labelSizes.observe(container);
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

  /**
   * The series legend, for more than one series. With .toggle each item is
   * a button that shows or hides its series, and the scale refits.
   */
  protected _legend(): Element[] {
    if (this._all.length < 2) return [];
    const toggle = this.el.classList.contains('toggle');
    const legend = document.createElement('ul');
    legend.className = `${this._type}-legend`;
    if (!toggle) legend.setAttribute('aria-hidden', 'true');
    legend.append(...this._all.map((series) => {
      const li = document.createElement('li');
      li.dataset.series = series.color;
      li.append(toggle ? this._toggle(series) : series.name);
      return li;
    }));
    return [legend];
  }

  /** A button that shows or hides a series, though never the last one shown. */
  private _toggle(series: Series) {
    const button = document.createElement('button');
    const shown = this.series.includes(series);
    button.type = 'button';
    button.className = 'chart-toggle';
    button.textContent = series.name;
    button.setAttribute('aria-pressed', String(shown));
    // The last series shown with data stays, so the chart never empties.
    if (shown && drawable(series) && this.series.filter(drawable).length < 2) button.setAttribute('aria-disabled', 'true');
    button.addEventListener('click', () => {
      if (button.hasAttribute('aria-disabled')) return;
      if (shown) this._hidden.add(series.column);
      else this._hidden.delete(series.column);
      this.update();
    });
    return button;
  }

  /** Draws the series, which fill the plot. */
  protected _draw(drawn = this.series): Element {
    const svg = svgNode('svg', {
      viewBox: '0 0 100 100',
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
      focusable: 'false'
    });
    const timing = this._before.length ? pace(this.el) : null;
    const starts = timing ? this._starts(drawn) : [];
    svg.append(...drawn.map((series, i) => this._line(series, starts[i], timing)));
    return svg;
  }

  /**
   * After update(), the shape each series moves from: where it was drawn,
   * and for a row it had no value at, its base. That is the plot bottom,
   * or in a stack where the series below starts, so the stack stays joined.
   */
  private _starts(drawn: Series[]): Shape[] {
    let below: RowY | undefined;
    return drawn.map((series) => {
      const base: RowY = !series.base ? () => 100 : below ?? this._baseY(series);
      below = this._was(series, base);
      return this._shape(series, below, base);
    });
  }

  /** Where a series drew each row before update(), or its base for a row it had no value at. */
  private _was(series: Series, base: RowY): RowY {
    const old = this._before.find((each) => each.column === series.column);
    return (index) => {
      const top = old?.tops[index] ?? null;
      return top === null ? base(index) : old!.y(top);
    };
  }

  /** Where a stacked area's base runs: the series below, or the plot bottom when zero is off the scale. */
  private _baseY(series: Series): RowY {
    return (index) => Math.min(100, series.y(series.base![index]!));
  }

  /**
   * A series' paths, with its rows at `top` and a stacked area's base at
   * `base`. The line is smooth, or with .straight straight, and a gap in the
   * data breaks it into runs.
   */
  private _shape(series: Series, top: RowY, base: RowY): Shape {
    const runs: number[][] = [[]];
    series.tops.forEach((value, index) => {
      if (value === null) runs.push([]);
      else runs[runs.length - 1].push(index);
    });
    const filled = runs.filter((run) => run.length);
    const points = (run: number[], y: RowY) => run.map((index): [number, number] => [this._x(index), y(index)]);
    const curve = this.el.classList.contains('straight') ? straightPath : monotonePath;
    const tops = filled.map((run) => curve(points(run, top)));
    return {
      line: tops.join(''),
      // A stacked area runs back along the series below; the reversed curve
      // is the same curve.
      area: filled
        .map((run, r) => series.base
          ? `${tops[r]}L${curve(points(run, base).reverse()).slice(1)}Z`
          : `${tops[r]}V100H${this._x(run[0])}Z`)
        .join(''),
      // Round caps on zero-length lines, so CSS sizes the dots in pixels.
      dots: filled.flatMap((run) => points(run, top)).map(([x, y]) => `M${x},${y}h0`).join('')
    };
  }

  /**
   * One series' group: its line, the fill under it, and with .points a dot
   * at each value. After update() each path moves from its `from` shape.
   */
  private _line(series: Series, from?: Shape, timing?: Pace | null) {
    const group = svgNode('g', {
      class: `${this._type}-series ${series.className}`.trim(),
      'data-series': series.color
    });
    const shape = this._shape(series, (index) => series.y(series.tops[index]!), this._baseY(series));

    const id = `line-chart-gradient-${++_gradientId}`;
    const gradient = svgNode('linearGradient', { id, x2: '0', y2: '1' });
    gradient.append(svgNode('stop'), svgNode('stop', { offset: '1' }));

    const path = (part: keyof Shape, name: string, attributes: Record<string, string> = {}) => {
      const node = svgNode('path', { class: `${this._type}-${name}`, d: shape[part], ...attributes });
      // A start shape comes with the timing it moves on.
      if (from) morph(node, from[part], timing!);
      return node;
    };
    group.append(gradient, path('area', 'area', { fill: `url(#${id})` }), path('line', 'line'));
    if (this.el.classList.contains('points')) group.append(path('dots', 'points'));
    return group;
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
