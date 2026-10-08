import { InitElements, InitElement } from '../core/component';
import { LineChart, LineChartOptions } from './lineChart';

export type PieChartOptions = LineChartOptions;

const SVG = 'http://www.w3.org/2000/svg';
// ponytail: rows past six repeat the colors; group small parts as "Other".
const COLORS = 6;
/** The pie's radius in a 100-unit box, leaving room for the active slice to grow. */
const RADIUS = 46;
/** The active slice's scale, as in _pie-chart.scss. */
const GROWN = 1.06;
/** Slices smaller than this share get no .values label. */
const LABEL_SHARE = 0.05;
let _maskId = 0;

/**
 * Pie chart. It reads its <table> like LineChart, but draws each row of the
 * first value column as a slice of the whole, clockwise from the top, with
 * a legend of every row and its share. With `.donut`, a <tfoot> row is the
 * total in the middle. Further columns show in the tooltip.
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

  protected get _type() {
    return 'pie-chart';
  }

  protected get _key() {
    return 'Expressive_PieChart';
  }

  protected get _points() {
    return false;
  }

  /**
   * Arrows move round the pie, so both pairs work. The slices run clockwise
   * in RTL too, so right still moves the way the top slice runs.
   */
  protected get _arrows(): [string[], string[]] {
    return [['ArrowRight', 'ArrowDown'], ['ArrowLeft', 'ArrowUp']];
  }

  static init(el: HTMLElement, options?: Partial<PieChartOptions>): PieChart;
  static init(els: InitElements<InitElement>, options?: Partial<PieChartOptions>): PieChart[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<PieChartOptions> = {}
  ): PieChart | PieChart[] {
    return super.init(els as HTMLElement, options) as PieChart | PieChart[];
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

    // CSS places the tooltip on the slice's middle from --turn.
    const middle = (this._turns[index][0] + this._turns[index][1]) / 2;
    this._tooltip.style.removeProperty('left');
    this._tooltip.style.setProperty('--turn', String(middle));
    // On the right half it opens leftwards, over the pie.
    this._tooltip.classList.toggle('end', middle < 0.5);
    const color = this._colors[index];
    this._tooltip.querySelectorAll<HTMLElement>('[data-series]').forEach((span) => {
      if (color) span.dataset.series = color;
      else delete span.dataset.series;
    });
    const share = this._share(index);
    const value = this._tooltip.querySelector('span:nth-of-type(2)');
    if (share && value) value.textContent += ` (${share})`;
  }

  /** The row's share of the whole as a percentage, or '' for none. */
  private _share(index: number) {
    const [start, end] = this._turns[index];
    if (end <= start) return '';
    const share = end - start;
    // Whole percentages, with a tenth below 10% so a small part is not 0%.
    const options = { style: 'percent', maximumFractionDigits: share < 0.1 ? 1 : 0 } as const;
    try {
      return share.toLocaleString(this.el.closest<HTMLElement>('[lang]')?.lang || undefined, options);
    } catch {
      // An invalid lang attribute.
      return share.toLocaleString(undefined, options);
    }
  }

  /** The legend: every row with its color, its cell and its share. */
  protected _guides(): Element[] {
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
    const box = this._plot.getBoundingClientRect();
    const [x, y] = [e.clientX - box.left - box.width / 2, e.clientY - box.top - box.height / 2];
    // The distance in the SVG's 100-unit box.
    const distance = (Math.hypot(x, y) / box.width) * 100;
    const hole = this.el.classList.contains('donut')
      ? parseFloat(getComputedStyle(this.el).getPropertyValue('--md-comp-pie-chart-hole')) || 0
      : 0;
    if (distance < RADIUS * hole) return -1;
    const turn = (Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1;
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
    const drawn = this._turns.filter(([start, end]) => end > start).length;
    let slice = 0;
    this._colors = this._turns.map(([start, end]) => {
      if (end <= start) return undefined;
      const index = slice++;
      return String(index === drawn - 1 && index > 0 && index % COLORS === 0 ? 2 : (index % COLORS) + 1);
    });
    const at = (t: number, r = RADIUS) => {
      const angle = t * 2 * Math.PI;
      return `${(r * Math.sin(angle)).toFixed(3)},${(-r * Math.cos(angle)).toFixed(3)}`;
    };

    const pie = document.createElement('div');
    pie.className = 'pie-chart-pie';
    pie.setAttribute('aria-hidden', 'true');
    const node = (name: string, attributes: Record<string, string>) => {
      const element = document.createElementNS(SVG, name);
      for (const key in attributes) element.setAttribute(key, attributes[key]);
      return element;
    };
    const svg = node('svg', { viewBox: '-50 -50 100 100', focusable: 'false' });
    const id = `pie-chart-mask-${++_maskId}`;
    const area = { x: '-50', y: '-50', width: '100', height: '100' };
    const mask = node('mask', { id, maskUnits: 'userSpaceOnUse', ...area });
    const edges = this._turns.filter(([start, end]) => end > start);
    mask.append(
      node('rect', { ...area, fill: 'white' }),
      node('path', {
        class: 'pie-chart-gaps',
        stroke: 'black',
        d: edges.length > 1 ? edges.map(([start]) => `M0,0L${at(start, 50)}`).join('') : ''
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
          : `M0,0L${at(start)}${arc} ${end - start > 0.5 ? 1 : 0} 1 ${at(end)}Z`
      }) as SVGPathElement;
      slices.append(slice);
      return slice;
    });
    svg.append(mask, slices);
    pie.append(svg);

    if (this.el.classList.contains('values')) {
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
      pie.append(labels);
    }

    const footer = this.el.querySelector<HTMLTableElement>(':scope > table')?.tFoot?.rows[0];
    if (footer) {
      const totalText = document.createElement('div');
      totalText.className = 'pie-chart-total';
      const [label, value] = [document.createElement('span'), document.createElement('strong')];
      label.textContent = footer.cells[0]?.textContent.trim() ?? '';
      value.textContent = footer.cells[1]?.textContent.trim() ?? '';
      totalText.append(value, label);
      pie.append(totalText);
    }
    return pie;
  }
}
