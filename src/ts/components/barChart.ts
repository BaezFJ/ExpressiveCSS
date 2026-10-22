import { ColumnChart, ColumnChartOptions } from './columnChart';

export type BarChartOptions = ColumnChartOptions;

/**
 * Bar chart. A column chart turned on its side: each row of the <table> is
 * a band of bars that grow from zero along the inline axis, with its label
 * beside it. The up and down arrows move the tooltip between rows.
 *
 * Call `update()` after changing the table, or start it with `watch` or
 * `data-watch`.
 */
export class BarChart extends ColumnChart {
  protected get _type() {
    return 'bar-chart';
  }

  protected get _horizontal() {
    return true;
  }

  static key = 'Expressive_BarChart';

  /**
   * The column chart's spans; CSS reads their --top and --bottom across the
   * plot. With .values, a copy of the bars without their clipping holds each
   * cell's text, so text longer than a short bar can run past its end.
   */
  protected _draw(): Element {
    const bars = super._draw() as HTMLElement;
    bars.className = 'bar-chart-bars';
    // Read here rather than with :dir(), which misses CSS `direction`.
    bars.classList.toggle('rtl', getComputedStyle(this.el).direction === 'rtl');
    if (!this.el.classList.contains('values')) return bars;

    const values = bars.cloneNode(true) as HTMLElement;
    values.classList.replace('bar-chart-bars', 'bar-chart-values');
    values.querySelectorAll<HTMLElement>('span[data-text]').forEach((span) => {
      span.textContent = span.dataset.text;
    });
    const layers = document.createElement('div');
    layers.className = 'bar-chart-layers';
    layers.append(bars, values);
    return layers;
  }
}
