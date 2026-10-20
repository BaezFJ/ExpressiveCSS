import { InitElements, InitElement } from '../core/component';
import { LineChart, LineChartOptions, numberValue, Series, seriesColor } from './lineChart';

export type ColumnChartOptions = LineChartOptions;

/**
 * A range cell's two ends, low first: data-value="12 28", or text with an
 * en dash, a spaced hyphen or "to" between two numbers, such as "$12–$28".
 * Anything else is a gap.
 */
function rangeValue(cell: HTMLTableCellElement | undefined): [number | null, number | null] {
  const ends = rangeParts(cell).map(numberValue);
  return ends.length === 2 && !ends.includes(null)
    ? [Math.min(ends[0]!, ends[1]!), Math.max(ends[0]!, ends[1]!)]
    : [null, null];
}

/** A range cell's data-value split at spaces, or its text split between the ends. */
function rangeParts(cell: HTMLTableCellElement | undefined): string[] {
  if (!cell) return [];
  return cell.dataset.value?.trim().split(/\s+/) ?? cell.textContent.split(/\s*[–—]\s*|\s+(?:-|to)\s+/);
}

/**
 * Column chart. It reads its <table>, scales, labels and tooltip like
 * LineChart, but draws each row as a group of columns from zero, or one
 * column of segments with `stacked`. A series whose header has `range`
 * reads each cell as two ends and floats a column between them. Columns
 * are HTML clipped to their value, so their rounded corners keep their
 * shape at any size.
 *
 * Call `update()` after changing the table.
 */
export class ColumnChart extends LineChart {
  // No initializers: LineChart's constructor draws before they would run.
  /** The `range` series, whose columns float. */
  private _ranges: Series[];

  protected get _type() {
    return 'column-chart';
  }

  protected get _key() {
    return 'Expressive_ColumnChart';
  }

  protected get _fromZero() {
    return true;
  }

  protected get _points() {
    return false;
  }

  static init(el: HTMLElement, options?: Partial<ColumnChartOptions>): ColumnChart;
  static init(els: InitElements<InitElement>, options?: Partial<ColumnChartOptions>): ColumnChart[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<ColumnChartOptions> = {}
  ): ColumnChart | ColumnChart[] {
    return super.init(els as HTMLElement, options) as ColumnChart | ColumnChart[];
  }

  static getInstance(el: HTMLElement): ColumnChart {
    return el['Expressive_ColumnChart'];
  }

  /** A `range` series' low ends become its base; ranges do not stack. */
  protected _arrange(series: Series[]) {
    const ranges = (this._ranges = series.filter((each) => each.className.split(/\s+/).includes('range')));
    for (const range of ranges) {
      const i = series.indexOf(range);
      const ends = this._rows.map((row) => rangeValue(row.cells[i + 1]));
      range.base = ends.map(([low]) => low);
      range.values = range.tops = ends.map(([, high]) => high);
    }
    super._arrange(series.filter((each) => !ranges.includes(each)));
  }

  protected _draw(drawn = this.series): Element {
    const columns = document.createElement('div');
    columns.className = 'column-chart-columns';
    columns.setAttribute('aria-hidden', 'true');
    const clamp = (value: number, y = drawn[0]?.y ?? this._y) => Math.min(100, Math.max(0, y(value)));
    const stacked = this.el.classList.contains('stacked');
    // Columns grow from zero, or from the plot edge when zero is off the scale.
    columns.style.setProperty('--zero', `${clamp(0)}%`);
    this._plot.style.setProperty('--rows', String(this.labels.length));

    this.labels.forEach((_, index) => {
      const row = document.createElement('div');
      drawn.forEach((series) => {
        // A stacked segment above a gap has no known base, so it is left out.
        const to = series.tops[index];
        const from = series.base?.[index] ?? 0;
        if (stacked && (to === null || from === null)) return;
        const column = document.createElement('span');
        // A gap in a grouped row keeps its empty slot, so the series stay aligned.
        if (to !== null) {
          column.className = series.className;
          column.dataset.series = seriesColor(this.series.indexOf(series));
          // A stacked segment never hangs from zero, so it keeps the top rounding.
          column.classList.toggle('negative', !series.base && to < from);
          column.classList.toggle('floating', this._ranges.includes(series));
          column.style.setProperty('--top', `${clamp(Math.max(from, to), series.y)}%`);
          column.style.setProperty('--bottom', `${100 - clamp(Math.min(from, to), series.y)}%`);
          // The cell text, which a bar chart with .values writes along its bar.
          if (this._horizontal) column.dataset.text = series.text[index];
        }
        row.append(column);
      });
      columns.append(row);
    });
    return columns;
  }
}
