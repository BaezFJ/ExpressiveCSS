import { InitElements, InitElement } from '../core/component';
import { COLORS, LineChart, LineChartOptions } from './lineChart';

export type ColumnChartOptions = LineChartOptions;

/**
 * Column chart. It reads its <table>, scales, labels and tooltip like
 * LineChart, but draws each row as a group of columns from zero, or one
 * column of segments with `stacked`. Columns are HTML clipped to their
 * value, so their rounded corners keep their shape at any size.
 *
 * Re-run `ColumnChart.init(el)` after changing the table.
 */
export class ColumnChart extends LineChart {
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

  protected _draw(drawn = this.series): Element {
    const columns = document.createElement('div');
    columns.className = 'column-chart-columns';
    columns.setAttribute('aria-hidden', 'true');
    const clamp = (value: number, y = drawn[0]?.y ?? this._y) => Math.min(100, Math.max(0, y(value)));
    // Columns grow from zero, or from the plot edge when zero is off the scale.
    columns.style.setProperty('--zero', `${clamp(0)}%`);
    this._plot.style.setProperty('--rows', String(this.labels.length));

    this.labels.forEach((_, index) => {
      const row = document.createElement('div');
      drawn.forEach((series) => {
        // A stacked segment above a gap has no known base, so it is left out.
        const to = series.tops[index];
        const from = series.base?.[index] ?? 0;
        if (series.base && (to === null || from === null)) return;
        const column = document.createElement('span');
        // A gap in a grouped row keeps its empty slot, so the series stay aligned.
        if (to !== null) {
          column.className = series.className;
          column.dataset.series = String((this.series.indexOf(series) % COLORS) + 1);
          // A stacked segment never hangs from zero, so it keeps the top rounding.
          column.classList.toggle('negative', !series.base && to < from);
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
