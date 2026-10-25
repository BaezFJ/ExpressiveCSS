import { LineChart, LineChartOptions } from './lineChart';

export type FunnelChartOptions = LineChartOptions;

/**
 * Each value's stage width as a percentage of the largest value, or null
 * for a row with no stage: a gap, zero or a negative value.
 */
function widths(values: (number | null)[]): (number | null)[] {
  const largest = values.reduce<number>((max, value) => Math.max(max, value ?? 0), 0);
  return values.map((value) => (value! > 0 ? (value! / largest) * 100 : null));
}

/** A stage `width` percent of the plot wide, which grows from `from` percent. */
function stage(width: number, from: number | null | undefined) {
  const span = document.createElement('span');
  span.dataset.series = '1';
  span.style.setProperty('--width', String(width));
  if (from != null) span.style.setProperty('--from-width', String(from));
  return span;
}

/**
 * Funnel chart. It reads its <table> like LineChart, but draws each row of
 * the first value column as a stage, top to bottom in table order, as wide
 * as its value against the largest one and centered on the plot. Further
 * columns show in the tooltip. The up and down arrows move the tooltip
 * between rows.
 *
 * Call `update()` after changing the table, or start it with `watch` or
 * `data-watch`.
 */
export class FunnelChart extends LineChart {
  protected get _type() {
    return 'funnel-chart';
  }

  protected get _horizontal() {
    return true;
  }

  /** A funnel has no value axis. */
  protected get _axis() {
    return false;
  }

  protected get _points() {
    return false;
  }

  static key = 'Expressive_FunnelChart';

  /** Every stage is the first series' color, so the tooltip's swatches all match it. */
  protected _read() {
    super._read();
    for (const series of this.series) series.color = '1';
  }

  /** A funnel has one series of stages, so it has no legend. */
  protected _legend(): Element[] {
    return [];
  }

  /**
   * A row per table row, holding its stage. After update(), each stage
   * starts from its old width, which CSS reads as --from-width.
   */
  protected _draw(): Element {
    const stages = document.createElement('div');
    stages.className = 'funnel-chart-stages';
    stages.setAttribute('aria-hidden', 'true');
    this._plot.style.setProperty('--rows', String(this.labels.length));
    const was = widths(this._before[0]?.values ?? []);
    widths(this.series[0].values).forEach((width, i) => {
      const row = document.createElement('div');
      if (width !== null) row.append(stage(width, was[i]));
      stages.append(row);
    });
    return stages;
  }
}
