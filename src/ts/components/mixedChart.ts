import { ColumnChart } from './columnChart';
import { LineChart, LineChartOptions, Series, niceStep, steps } from './lineChart';

export type MixedChartOptions = LineChartOptions;

/** The low end and round step that cover min to max in exactly `parts` steps. */
function fitSteps(min: number, max: number, parts: number): [low: number, step: number] {
  let step = niceStep(max - min, parts);
  // A floored start can leave the top short; the next round step covers it.
  while (Math.floor(min / step) * step + parts * step < max) step = niceStep(step * parts * 1.001, parts);
  return [Math.floor(min / step) * step, step];
}

/** Whether a series header cell has a class. */
const has = (series: Series, name: string) => series.className.split(/\s+/).includes(name);

/**
 * Mixed chart. It reads its <table> like LineChart, and draws each series
 * by its header cell's class: `column` as columns from zero, `area` as a
 * line with a fill under it, and anything else as a line. Series with
 * `end` are drawn against a second scale, set by `data-end-min` and
 * `data-end-max`, so values of different sizes or units share the plot.
 * With `stacked` the columns stack; `points` and `straight` apply to the
 * lines as in LineChart.
 *
 * Call `update()` after changing the table, or start it with `watch` or
 * `data-watch`.
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

  static getInstance(el: HTMLElement): MixedChart {
    return el['Expressive_MixedChart'];
  }

  /**
   * With .stacked, the columns on each scale stack on the ones before them;
   * the lines and areas keep their own values.
   */
  protected _stack(series: Series[]) {
    const columns = series.filter((each) => has(each, 'column'));
    super._stack(columns.filter((each) => !has(each, 'end')));
    super._stack(columns.filter((each) => has(each, 'end')));
  }

  /** The start scale, then the end scale; each includes zero if it has columns. */
  protected _scale(series: Series[], min: number | null, max: number | null) {
    const end = series.filter((each) => has(each, 'end'));
    const start = series.filter((each) => !end.includes(each));
    const columns = (list: Series[]) => list.some((each) => has(each, 'column'));
    const endRange = [this._number('endMin'), this._number('endMax')] as const;
    const y = super._scale(start, min, max, columns(start));
    super._scale(end, ...endRange, columns(end));
    // Only scales the chart chose itself can stretch to line up.
    if ([min, max, ...endRange].every((value) => value === null)) this._align(start, end);
    return y;
  }

  /**
   * With .axis, widens the end scale to as many round steps as the start
   * scale has, so its labels fall on the start scale's grid lines.
   */
  private _align(start: Series[], end: Series[]) {
    const parts = start.length ? start[0].scale.ticks.length - 1 : 0;
    if (parts < 1 || !end.length) return;
    const [low, step] = fitSteps(end[0].scale.min, end[0].scale.max, parts);
    const high = low + parts * step;
    this._apply(end, { min: low, max: high, ticks: steps(low, high, step) });
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
