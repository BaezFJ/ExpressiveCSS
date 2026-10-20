import { InitElements, InitElement } from '../core/component';
import { LineChart, LineChartOptions } from './lineChart';

export type HeatmapChartOptions = LineChartOptions;

/**
 * A shade in one of `steps` bands, each side of zero on a diverging scale:
 * the lowest band is the empty color, and the highest is the full color.
 */
function band(level: number, steps: number) {
  return (Math.sign(level) * Math.min(steps - 1, Math.floor(Math.abs(level) * steps))) / (steps - 1);
}

/**
 * Heatmap chart. It reads its <table> like LineChart, but draws every cell
 * as a square of the grid, shaded from the lowest value to the highest, with
 * the row headers beside it and the column headers below. A `data-label` on
 * a header cell replaces its text on the grid; an empty one hides it. The
 * tooltip shows one cell, and the arrow keys move round the grid. With
 * `data-mid` the scale diverges either side of that value, and with
 * `data-steps` the shades fall into that many bands.
 *
 * Re-run `HeatmapChart.init(el)` after changing the table.
 */
export class HeatmapChart extends LineChart {
  // No initializers: LineChart's constructor draws before they would run.
  /** Every cell, row by row. */
  private _cells: HTMLElement[];
  /** Each cell's shade from 0 to 1, or -1 to 1 on a diverging scale, or null for a gap. */
  private _levels: (number | null)[];
  /** The text of the lowest and highest cells, for the legend. */
  private _ends: [string, string];
  /** The shades of the lowest and highest cells, where the legend's gradient runs. */
  private _endLevels: [number, number];

  protected get _type() {
    return 'heatmap-chart';
  }

  /** Color carries the value, so there is no value axis. */
  protected get _axis() {
    return false;
  }

  protected get _key() {
    return 'Expressive_HeatmapChart';
  }

  static init(el: HTMLElement, options?: Partial<HeatmapChartOptions>): HeatmapChart;
  static init(els: InitElements<InitElement>, options?: Partial<HeatmapChartOptions>): HeatmapChart[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<HeatmapChartOptions> = {}
  ): HeatmapChart | HeatmapChart[] {
    return super.init(els as HTMLElement, options) as HeatmapChart | HeatmapChart[];
  }

  static getInstance(el: HTMLElement): HeatmapChart {
    return el['Expressive_HeatmapChart'];
  }

  /** Highlights one cell, numbered row by row. Pass -1 to hide the tooltip. */
  show(index: number) {
    if (!this._tooltip || index === this.activeIndex) return;
    this._activate(this._cells[index], index);
  }

  private _activate(cell: HTMLElement | undefined, index: number) {
    // Measure before the writes below, which would otherwise force a layout.
    const box = cell ? this._box(cell) : null;
    this._cells[this.activeIndex]?.classList.remove('active');
    this.activeIndex = index;
    this._tooltip.hidden = !box;
    if (box) this._fill(cell!, index, box);
  }

  /**
   * A cell's left, top and width in the plot, past any scrolling of the
   * grid, and the plot's width. A key can move to a cell scrolled out of a
   * wide grid, so it scrolls into view first.
   */
  private _box(cell: HTMLElement) {
    if (this._plot.matches(':focus-visible')) cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const [box, plot] = [cell.getBoundingClientRect(), this._plot.getBoundingClientRect()];
    return [box.left - plot.left, box.top - plot.top, box.width, this._plot.clientWidth];
  }

  /** Marks the cell and fills the tooltip beside it, on the side with more room. */
  private _fill(cell: HTMLElement, index: number, [left, top, width, plotWidth]: number[]) {
    cell.classList.add('active');
    const columns = this.series.length;
    const [row, series] = [Math.floor(index / columns), this.series[index % columns]];
    const title = document.createElement('strong');
    title.textContent = this.labels[row];
    const [name, text] = [document.createElement('span'), document.createElement('span')];
    name.textContent = series.name;
    // A gap's swatch is outlined like its cell.
    if (this._levels[index] === null) name.className = 'gap';
    else name.style.setProperty('--level', String(this._levels[index]));
    text.textContent = series.text[row];
    this._tooltip.replaceChildren(title, name, text);

    const end = left + width / 2 > plotWidth / 2;
    this._tooltip.classList.toggle('end', end);
    this._tooltip.style.left = `${left + (end ? 0 : width)}px`;
    this._tooltip.style.top = `${top}px`;
  }

  /** Arrows move the way they point, so left and right swap in RTL. */
  protected _keyTarget(key: string): number | undefined {
    // With nothing shown, Escape is left to a dialog or sheet around the chart.
    if (key === 'Escape') return this.activeIndex < 0 ? undefined : -1;
    const [columns, last] = [this.series.length, this.labels.length - 1];
    const index = Math.max(0, this.activeIndex);
    const [row, column] = [Math.floor(index / columns), index % columns];
    const [next, back] = this._reversed ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft'];
    const to = {
      [next]: [row, column + 1],
      [back]: [row, column - 1],
      ArrowDown: [row + 1, column],
      ArrowUp: [row - 1, column],
      Home: [row, 0],
      End: [row, columns - 1]
    }[key];
    if (!to) return undefined;
    // The first key after focus or Escape shows the first cell.
    if (this.activeIndex < 0) return 0;
    const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
    return clamp(to[0], last) * columns + clamp(to[1], columns - 1);
  }

  /**
   * The cell under the pointer by its position, or -1 off the grid. A touch
   * keeps its first target while it drags, so the target cannot be used. The
   * cells and gaps are even, so each band's edge falls in a gap and a gap
   * counts as the nearer cell.
   */
  protected _indexAt(e: PointerEvent) {
    const [columns, rows] = [this.series.length, this.labels.length];
    const first = this._cells[0].getBoundingClientRect();
    const last = this._cells[this._cells.length - 1].getBoundingClientRect();
    const [left, right] = [Math.min(first.left, last.left), Math.max(first.right, last.right)];
    const [x, y] = [e.clientX, e.clientY];
    if (x < left || x > right || y < first.top || y > last.bottom) return -1;
    const band = (offset: number, size: number, count: number) =>
      Math.min(count - 1, Math.floor((offset / (size || 1)) * count));
    const column = band(x - left, right - left, columns);
    return band(y - first.top, last.bottom - first.top, rows) * columns + (this._reversed ? columns - 1 - column : column);
  }

  /**
   * The legend: a gradient from the lowest cell's shade to the highest's,
   * labelled with their text. A fixed scale wider than the data shows only
   * the part the data uses.
   */
  protected _guides(): Element[] {
    const legend = document.createElement('div');
    legend.className = 'heatmap-chart-legend';
    legend.setAttribute('aria-hidden', 'true');
    const [low, scale, high] = ['span', 'span', 'span'].map((tag) => document.createElement(tag));
    [low.textContent, high.textContent] = this._ends;
    scale.className = 'heatmap-chart-scale';
    if (this._reversed) scale.style.setProperty('--heatmap-chart-to', 'left');
    const [from, to] = this._endLevels;
    scale.style.setProperty('--low', String(from));
    scale.style.setProperty('--high', String(to));
    // On a diverging scale the gradient passes the midpoint's empty color.
    scale.style.setProperty('--mid', `${Math.min(1, Math.max(0, -from / (to - from || 1))) * 100}%`);
    scale.append(...this._bands().filter((level) => level >= from && level <= to).map((level) => {
      const swatch = document.createElement('span');
      swatch.style.setProperty('--level', String(level));
      return swatch;
    }));
    legend.append(low, scale, high);
    return [legend];
  }

  /** With data-steps, every band's shade from the lowest to the highest; otherwise none. */
  private _bands() {
    const steps = this._steps;
    if (!steps) return [];
    return Array.from({ length: 2 * steps - 1 }, (_, k) => (k - steps + 1) / (steps - 1));
  }

  /** The number of bands data-steps asks for, or 0 for a smooth scale. */
  private get _steps() {
    const steps = Math.round(this._number('steps') ?? 0);
    return steps > 1 ? steps : 0;
  }

  /**
   * How a value shades its cell: from 0 at the scale's low end to 1 at its
   * high end, or with data-mid from -1 to 1 either side of that midpoint,
   * as far as the further end. With data-steps the shades fall into bands.
   */
  private _shade(low: number, high: number) {
    const option = (name: 'min' | 'max', fallback: number) => this._number(name) ?? this.options[name] ?? fallback;
    const [min, max, mid] = [option('min', low), option('max', high), this._number('mid')];
    const clamp = (value: number, floor: number) => Math.min(1, Math.max(floor, value));
    const level = mid === null
      ? (value: number) => clamp((value - min) / (max - min || 1), 0)
      : (value: number) => clamp((value - mid) / (Math.max(max - mid, mid - min) || 1), -1);
    const steps = this._steps;
    return steps ? (value: number) => band(level(value), steps) : level;
  }

  /**
   * A grid of the row headers and cells, row by row, with the column headers
   * below. Each cell's --level shades it in CSS.
   */
  protected _draw(): Element {
    const columns = this.series.length;
    let [low, high] = [Infinity, -Infinity];
    this._ends = ['', ''];
    this.series.forEach((series) => series.values.forEach((value, row) => {
      if (value === null) return;
      if (value < low) [low, this._ends[0]] = [value, series.text[row]];
      if (value > high) [high, this._ends[1]] = [value, series.text[row]];
    }));
    const shade = this._shade(low, high);
    this._endLevels = [shade(low), shade(high)];

    const grid = document.createElement('div');
    grid.className = 'heatmap-chart-grid';
    grid.setAttribute('aria-hidden', 'true');
    grid.style.setProperty('--columns', String(columns));
    grid.style.setProperty('--rows', String(this.labels.length));
    const span = (className: string, text = '') => {
      const element = document.createElement('span');
      element.className = className;
      element.textContent = text;
      return element;
    };
    const label = (cell: HTMLTableCellElement | undefined) =>
      cell?.dataset.label ?? cell?.textContent.trim() ?? '';
    const values = this.el.classList.contains('values');

    this._cells = [];
    this._levels = [];
    this.labels.forEach((_, row) => {
      grid.append(span('heatmap-chart-row', label(this._rows[row].cells[0])));
      this.series.forEach((series) => {
        const value = series.values[row];
        const level = value === null ? null : shade(value);
        const cell = span('heatmap-chart-cell', values ? series.text[row] : '');
        if (level === null) cell.classList.add('gap');
        else cell.style.setProperty('--level', String(level));
        this._cells.push(cell);
        this._levels.push(level);
        grid.append(cell);
      });
    });

    // A column label runs on over the empty labels after it.
    const labels = this._header.slice(1, columns + 1).map(label);
    labels.forEach((text, column) => {
      if (!text) return;
      let end = column + 1;
      while (end < columns && !labels[end]) end++;
      const element = span('heatmap-chart-column', text);
      element.classList.toggle('run', end > column + 1);
      element.style.gridArea = `${this.labels.length + 1} / ${column + 2} / auto / ${end + 2}`;
      grid.append(element);
    });

    // The grid scrolls sideways when its cells would be too narrow. The
    // plot is the one Tab stop, so the scroll box is not another, and a
    // press that focuses it hands focus on to the plot.
    const scroll = document.createElement('div');
    scroll.className = 'heatmap-chart-scroll';
    scroll.tabIndex = -1;
    scroll.addEventListener('focus', () => this._plot.focus());
    scroll.append(grid);
    return scroll;
  }
}
