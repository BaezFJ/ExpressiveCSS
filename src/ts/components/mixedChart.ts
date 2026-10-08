import { InitElements, InitElement } from '../core/component';
import { ColumnChart } from './columnChart';
import { LineChart, LineChartOptions, Series } from './lineChart';

export type MixedChartOptions = LineChartOptions;

/** Whether a series header cell has a class. */
const has = (series: Series, name: string) => series.className.split(/\s+/).includes(name);

/**
 * Mixed chart. It reads its <table> like LineChart, and draws each series
 * by its header cell's class: `column` as columns from zero, `area` as a
 * line with a fill under it, and anything else as a line. Series with
 * `end` are drawn against a second scale, set by `data-end-min` and
 * `data-end-max`, so values of different sizes or units share the plot.
 *
 * Re-run `MixedChart.init(el)` after changing the table.
 */
export class MixedChart extends ColumnChart {
  protected get _type() {
    return 'mixed-chart';
  }

  protected get _key() {
    return 'Expressive_MixedChart';
  }

  protected get _points() {
    return true;
  }

  static init(el: HTMLElement, options?: Partial<MixedChartOptions>): MixedChart;
  static init(els: InitElements<InitElement>, options?: Partial<MixedChartOptions>): MixedChart[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<MixedChartOptions> = {}
  ): MixedChart | MixedChart[] {
    return super.init(els as HTMLElement, options) as MixedChart | MixedChart[];
  }

  static getInstance(el: HTMLElement): MixedChart {
    return el['Expressive_MixedChart'];
  }

  /** The start scale, then the end scale; each includes zero if it has columns. */
  protected _scale(series: Series[], min: number | null, max: number | null) {
    const end = series.filter((each) => has(each, 'end'));
    const start = series.filter((each) => !end.includes(each));
    const columns = (list: Series[]) => list.some((each) => has(each, 'column'));
    super._scale(end, this._number('endMin'), this._number('endMax'), columns(end));
    return super._scale(start, min, max, columns(start));
  }

  /** Columns behind, then the lines and areas over them. */
  protected _draw(): Element {
    const marks = document.createElement('div');
    marks.className = 'mixed-chart-marks';
    const columns = super._draw(this.series.filter((series) => has(series, 'column')));
    columns.className = 'mixed-chart-columns';
    marks.append(columns, LineChart.prototype['_draw'].call(this, this.series.filter((series) => !has(series, 'column'))));
    return marks;
  }
}
