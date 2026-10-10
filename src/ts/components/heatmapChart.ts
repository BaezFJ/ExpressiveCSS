import { InitElements, InitElement } from '../core/component';
import { LineChart, LineChartOptions } from './lineChart';

export type HeatmapChartOptions = LineChartOptions;

/**
 * Heatmap chart. It reads its <table> like LineChart, but draws every cell
 * as a square of the grid, shaded from the lowest value to the highest, with
 * the row headers beside it and the column headers below. A `data-label` on
 * a header cell replaces its text on the grid; an empty one hides it. The
 * tooltip shows one cell, and the arrow keys move round the grid.
 *
 * Re-run `HeatmapChart.init(el)` after changing the table.
 */
export class HeatmapChart extends LineChart {
  // No initializers: LineChart's constructor draws before they would run.
  /** Every cell, row by row. */
  private _cells: HTMLElement[];
  /** Each cell's shade from 0 to 1, or null for a gap. */
  private _levels: (number | null)[];
  /** The text of the lowest and highest cells, for the legend. */
  private _ends: [string, string];
  /** The shades of the lowest and highest cells, where the legend's gradient runs. */
  private _endLevels: [number, number];

  protected get _type() {
    return 'heatmap-chart';
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
    const cell = this._cells[index];
    // Measure before the writes below, which would otherwise force a layout.
    const [left, top, width, plotWidth] = cell
      ? [cell.offsetLeft, cell.offsetTop, cell.offsetWidth, this._plot.clientWidth]
      : [];
    this._cells[this.activeIndex]?.classList.remove('active');
    this.activeIndex = index;
    this._tooltip.hidden = !cell;
    if (!cell) return;
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

    // Beside the cell, on the side with more room.
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
    scale.style.setProperty('--low', String(this._endLevels[0]));
    scale.style.setProperty('--high', String(this._endLevels[1]));
    legend.append(low, scale, high);
    return [legend];
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
    const option = (name: 'min' | 'max') => {
      const value = parseFloat(this.el.dataset[name] ?? '');
      return Number.isFinite(value) ? value : this.options[name];
    };
    const [min, max] = [option('min') ?? low, option('max') ?? high];
    const shade = (value: number) => Math.min(1, Math.max(0, (value - min) / (max - min || 1)));
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
    return grid;
  }
}
