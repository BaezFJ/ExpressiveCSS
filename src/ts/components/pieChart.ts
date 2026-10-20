import { InitElements, InitElement } from '../core/component';
import { LineChart, LineChartOptions, numberFormat, polarPoint as at, signs, svgNode as node } from './lineChart';

export type PieChartOptions = LineChartOptions;

// ponytail: rows past six repeat the colors; data-other groups the small ones.
const COLORS = 6;
/** The pie's radius in a 100-unit box, leaving room for the active slice to grow. */
const RADIUS = 46;
/** The active slice's scale, as in _pie-chart.scss. */
const GROWN = 1.06;
/** Slices smaller than this share get no .values label. */
const LABEL_SHARE = 0.05;
let _maskId = 0;

/** How many decimals a cell's number has, counting an exponent: "2.5e-3" has 4. */
function decimals(text: string) {
  const [, fraction = '', exponent = '0'] = /(?:\.(\d+))?(?:e([+-]?\d+))?\D*$/i.exec(text)!;
  return Math.max(0, fraction.length - Number(exponent));
}

/**
 * Sets each name's --pie-chart-name-top so neighbours on one side of the pie sit at least
 * --pie-chart-name-step apart, pushed away from the middle line: down below
 * it (`away` 1) and up above it (-1). Each top is the furthest of the natural
 * places of the names before it, plus a step for every name between. An
 * `anchor` is a fixed place before the first name, the unmoved innermost
 * name across the middle line.
 */
function stack(names: [number, HTMLElement][], away: number, anchor?: number) {
  names.sort(([a], [b]) => (a - b) * away);
  const ys = names.map(([y]) => y);
  if (anchor !== undefined) ys.unshift(anchor);
  const first = ys.length - names.length;
  names.forEach(([, name], k) => {
    const tops = ys.slice(0, first + k + 1).map((y, j) =>
      `calc(50cqw + ${y} * var(--pie-chart-name-at) + ${(first + k - j) * away} * var(--pie-chart-name-step))`);
    name.style.setProperty('--pie-chart-name-top', `${away > 0 ? 'max' : 'min'}(${tops.join(', ')})`);
  });
}

/**
 * Pie chart. It reads its <table> like LineChart, but draws each row of the
 * first value column as a slice of the whole, clockwise from the top, with
 * a legend of every row and its share. With `.donut`, a <tfoot> row is the
 * total in the middle. Further columns show in the tooltip. With
 * `data-other`, rows under that percentage of the whole become one row,
 * last, named by `data-other-label` ("Other" by default); the table keeps
 * every row.
 *
 * Re-run `PieChart.init(el)` after changing the table.
 */
export class PieChart extends LineChart {
  // No initializers: LineChart's constructor draws before they would run.
  /** Each row's start and end, as fractions of a turn clockwise from the top. */
  private _turns: [number, number][];
  /** Each row's color, or undefined for a row with no slice. */
  private _colors: (string | undefined)[];
  private _slices: (SVGPathElement | null)[];
  /** Percent formatters by fraction digits, rebuilt once per legend. */
  private _percents: Intl.NumberFormat[];

  protected get _type() {
    return 'pie-chart';
  }

  /** A pie has no value axis. */
  protected get _axis() {
    return false;
  }

  protected get _key() {
    return 'Expressive_PieChart';
  }

  protected get _points() {
    return false;
  }

  protected get _circular() {
    return true;
  }

  static init(el: HTMLElement, options?: Partial<PieChartOptions>): PieChart;
  static init(els: InitElements<InitElement>, options?: Partial<PieChartOptions>): PieChart[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<PieChartOptions> = {}
  ): PieChart | PieChart[] {
    return super.init(els as HTMLElement, options) as PieChart | PieChart[];
  }

  protected _read() {
    super._read();
    const small = this._small();
    if (!small) return;
    const sum = this.series[0].values.reduce<number>((total, value, i) => total + (small[i] ? Math.max(0, value!) : 0), 0);
    const text = this._written(sum, this._rows.filter((_, i) => small[i]).map((row) => row.cells[1]));
    const keep = <T>(list: T[], other: T) => [...list.filter((_, i) => !small[i]), other];
    this.labels = keep(this.labels, this.el.dataset.otherLabel || 'Other');
    // Only the first column adds up; further columns have no value for the group.
    this.series = this.series.map((series, i) => {
      const values = keep(series.values, i ? null : sum);
      return { ...series, values, tops: values, text: keep(series.text, i ? '' : text) };
    });
  }

  /**
   * The group's sum written like its cells: with their signs, and to their
   * decimals, or compact when data-value stands behind text such as "$38M".
   */
  private _written(sum: number, cells: HTMLTableCellElement[]) {
    const texts = cells.map((cell) => cell.textContent.trim());
    const [prefix, suffix] = signs(texts[0]);
    return `${prefix}${numberFormat(this.el, this._precision(texts, cells)).format(sum)}${suffix}`;
  }

  private _precision(texts: string[], cells: HTMLTableCellElement[]): Intl.NumberFormatOptions {
    if (cells.some((cell) => cell.dataset.value)) return { notation: 'compact', maximumSignificantDigits: 3 };
    const digits = Math.max(0, ...texts.map(decimals));
    // Older engines take at most 20 fraction digits; past that, keep the sum's first digits.
    return digits > 20 ? { maximumSignificantDigits: 3 } : { maximumFractionDigits: digits };
  }

  /**
   * Which rows data-other groups: those with a value under that percentage
   * of the whole. Null when it groups nothing, as one small row is clearer
   * by its own name.
   */
  private _small() {
    const percent = this._number('other');
    const values = this.series[0]?.values.map((value) => (value === null ? null : Math.max(0, value)));
    if (!values || !(percent! > 0)) return null;
    const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    // A row exactly at the percentage stays, despite rounding in the division.
    const small = values.map((value) => value !== null && (value / total) * 100 < percent! - 1e-9);
    return small.filter(Boolean).length > 1 ? small : null;
  }

  static getInstance(el: HTMLElement): PieChart {
    return el['Expressive_PieChart'];
  }

  show(index: number) {
    if (!this._tooltip || index === this.activeIndex) return;
    super.show(index);
    this._slices.forEach((slice, i) => slice?.classList.toggle('active', i === index));
    // LineChart hides the tooltip for -1 and for an index past the last row.
    if (this._tooltip.hidden) return;

    const color = this._colors[index];
    this._tooltip.querySelectorAll<HTMLElement>('[data-series]').forEach((span) => {
      if (color) span.dataset.series = color;
      else delete span.dataset.series;
    });
    const share = this._share(index);
    const value = this._tooltip.querySelector('span:nth-of-type(2)');
    if (share && value) value.textContent += ` (${share})`;
  }

  /** CSS places the tooltip on the slice's middle from --turn. */
  protected _place(index: number) {
    const middle = (this._turns[index][0] + this._turns[index][1]) / 2;
    this._tooltip.style.setProperty('--turn', String(middle));
    // On the right half it opens leftwards, over the pie.
    this._tooltip.classList.toggle('end', middle < 0.5);
  }

  /** The row's share of the whole as a percentage, or '' for none. */
  private _share(index: number) {
    const [start, end] = this._turns[index];
    if (end <= start) return '';
    const share = end - start;
    // Whole percentages, with a tenth below 10% so a small part is not 0%.
    const digits = share < 0.1 ? 1 : 0;
    (this._percents ??= [])[digits] ??= this._percent(digits);
    return this._percents[digits].format(share);
  }

  private _percent(digits: number) {
    return numberFormat(this.el, { style: 'percent', maximumFractionDigits: digits });
  }

  // ponytail: names only move up or down their side, so many thin slices
  // near the top or bottom run into the caption or legend; group them as "Other".
  /**
   * Each slice's row name outside it, on the slice's middle, with a leader
   * line back to the slice. Names on the right half run rightwards and those
   * on the left run leftwards.
   */
  private _names() {
    const names = document.createElement('div');
    names.className = 'pie-chart-names';
    // Right above, right below, left above and left below the middle line.
    const sides: [number, HTMLElement][][] = [[], [], [], []];
    this._turns.forEach(([start, end], i) => {
      if (end <= start) return;
      const turn = (start + end) / 2;
      const y = -Math.cos(turn * 2 * Math.PI);
      const name = document.createElement('span');
      name.dataset.series = this._colors[i];
      name.style.setProperty('--turn', String(turn));
      name.classList.toggle('end', turn >= 0.5);
      // The text is cut short inside the name, which draws the leader line.
      const text = document.createElement('span');
      text.textContent = this.labels[i];
      name.append(text);
      names.append(name);
      sides[(turn >= 0.5 ? 2 : 0) + Number(y >= 0)].push([y, name]);
    });
    // Names below the line start a step under the innermost name above it.
    for (const i of [0, 2]) {
      stack(sides[i], -1);
      stack(sides[i + 1], 1, sides[i][0]?.[0]);
    }
    return names;
  }

  /** The legend: every row with its color, its cell and its share. */
  protected _guides(): Element[] {
    // A redraw picks up a changed lang attribute.
    this._percents = [];
    const legend = document.createElement('ul');
    legend.className = 'pie-chart-legend';
    legend.setAttribute('aria-hidden', 'true');
    const text = this.series[0].text;
    legend.append(...this.labels.map((label, i) => {
      const li = document.createElement('li');
      if (this._colors[i]) li.dataset.series = this._colors[i];
      const [name, value, share] = [label, text[i], this._share(i)].map((content) => {
        const span = document.createElement('span');
        span.textContent = content;
        return span;
      });
      li.append(name, value, share);
      return li;
    }));
    return [legend];
  }

  /** The row under the pointer by its angle from the middle, or -1 off the slices. */
  protected _indexAt(e: PointerEvent) {
    const [turn, share] = this._polarAt(e);
    // The distance in the SVG's 100-unit box.
    const distance = share * 100;
    const hole = this.el.classList.contains('donut')
      ? parseFloat(getComputedStyle(this.el).getPropertyValue('--md-comp-pie-chart-hole')) || 0
      : 0;
    if (distance < RADIUS * hole) return -1;
    const index = this._turns.findIndex(([start, end]) => start <= turn && turn < end);
    // The active slice is drawn larger, so the pointer stays on it to its edge.
    return distance > RADIUS * (index === this.activeIndex ? GROWN : 1) ? -1 : index;
  }

  /**
   * An SVG of slices in a -50 to 50 box, under a mask that cuts the gaps
   * between them and the donut's hole, which CSS sizes. The values and the
   * total are HTML over it.
   */
  protected _draw(): Element {
    const values = this.series[0].values.map((value) => Math.max(0, value ?? 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    let turn = 0;
    this._turns = values.map((value) => [turn, (turn += total ? value / total : 0)]);
    // Colors go round the drawn slices; the last skips the first's color beside it.
    const drawn = this._turns.filter(([start, end]) => end > start);
    let slice = 0;
    this._colors = this._turns.map(([start, end]) => {
      if (end <= start) return undefined;
      const index = slice++;
      return String(index === drawn.length - 1 && index > 0 && index % COLORS === 0 ? 2 : (index % COLORS) + 1);
    });

    const pie = document.createElement('div');
    pie.className = 'pie-chart-pie';
    pie.setAttribute('aria-hidden', 'true');
    const svg = node('svg', { viewBox: '-50 -50 100 100', focusable: 'false' });
    const id = `pie-chart-mask-${++_maskId}`;
    const area = { x: '-50', y: '-50', width: '100', height: '100' };
    const mask = node('mask', { id, maskUnits: 'userSpaceOnUse', ...area });
    mask.append(
      node('rect', { ...area, fill: 'white' }),
      node('path', {
        class: 'pie-chart-gaps',
        stroke: 'black',
        d: drawn.length > 1 ? drawn.map(([start]) => `M0,0L${at(start, 50)}`).join('') : ''
      }),
      node('circle', { class: 'pie-chart-hole', r: String(RADIUS), fill: 'black' })
    );

    const slices = node('g', { mask: `url(#${id})` });
    const arc = `A${RADIUS},${RADIUS} 0`;
    this._slices = this._turns.map(([start, end], i) => {
      if (end <= start) return null;
      const slice = node('path', {
        class: 'pie-chart-slice',
        'data-series': this._colors[i],
        // A whole circle is two half arcs; one arc cannot end where it starts.
        d: end - start >= 1
          ? `M0,${-RADIUS}${arc} 1 1 0,${RADIUS}${arc} 1 1 0,${-RADIUS}Z`
          : `M0,0L${at(start, RADIUS)}${arc} ${end - start > 0.5 ? 1 : 0} 1 ${at(end, RADIUS)}Z`
      }) as SVGPathElement;
      slices.append(slice);
      return slice;
    });
    svg.append(mask, slices);
    pie.append(svg, ...this._texts());

    const middle = this._total('pie-chart-total');
    if (middle) pie.append(middle);
    return pie;
  }

  /** The .values shares on the slices and the .labels names outside them. */
  private _texts(): Element[] {
    const texts: Element[] = [];
    if (this.el.classList.contains('values')) texts.push(this._values());
    if (this.el.classList.contains('labels') && !this.el.classList.contains('sparkline')) texts.push(this._names());
    return texts;
  }

  /** Each slice's share on it, except on slices too thin to hold it. */
  private _values() {
    const labels = document.createElement('div');
    labels.className = 'pie-chart-values';
    this._turns.forEach(([start, end], i) => {
      if (end - start < LABEL_SHARE) return;
      const label = document.createElement('span');
      label.dataset.series = this._colors[i];
      label.style.setProperty('--turn', String((start + end) / 2));
      label.textContent = this._share(i);
      labels.append(label);
    });
    return labels;
  }
}
