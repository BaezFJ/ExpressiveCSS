import { LineChart, LineChartOptions } from './lineChart';

export type TreemapChartOptions = LineChartOptions;

/** A rectangle: its inline start, top, width and height. */
type Box = [x: number, y: number, width: number, height: number];

// ponytail: rows past six repeat the colors, so neighbours can match.
const COLORS = 6;

const sum = (areas: number[]) => areas.reduce((total, area) => total + area, 0);

/** The box with its axes swapped, so one strip routine lays out both ways. */
const flip = ([x, y, width, height]: Box): Box => [y, x, height, width];

/** How far the least square of `areas` is from square, in a strip along a side `side` long. */
function worst(areas: number[], side: number) {
  const [total, squared] = [sum(areas) ** 2, side ** 2];
  return Math.max(...areas.map((area) => Math.max((squared * area) / total, total / (squared * area))));
}

/**
 * Lays `areas` out as one strip down the inline start of `free`, or across
 * its top when it is taller than wide, in order, and returns their boxes and
 * the space left beside the strip.
 */
function strip(areas: number[], free: Box): [Box[], Box] {
  if (free[2] < free[3]) {
    const [boxes, rest] = strip(areas, flip(free));
    return [boxes.map(flip), flip(rest)];
  }
  const [x, y, width, height] = free;
  const across = sum(areas) / height;
  let top = y;
  const boxes = areas.map((area): Box => {
    const box: Box = [x, top, across, area / across];
    top += area / across;
    return box;
  });
  return [boxes, [x + across, y, width - across, height]];
}

/**
 * The squarified treemap of Bruls, Huizing and van Wijk: `areas`, largest
 * first and adding up to the free box's area, each join the current strip
 * while that keeps its rectangles nearer square, and the strip is laid down
 * when it would not.
 */
function squarify(areas: number[], free: Box): Box[] {
  const boxes: Box[] = [];
  let row: number[] = [];
  for (const area of areas) {
    const side = Math.min(free[2], free[3]);
    if (row.length && worst([...row, area], side) > worst(row, side)) {
      const [laid, rest] = strip(row, free);
      boxes.push(...laid);
      [free, row] = [rest, []];
    }
    row.push(area);
  }
  return [...boxes, ...strip(row, free)[0]];
}

/**
 * Treemap chart. It reads its <table> like LineChart, but draws each row of
 * the first value column as a rectangle whose area is its share of the
 * whole, filling the plot, the largest at the top inline-start corner. Rows
 * with no positive value draw nothing. Further columns show in the tooltip.
 *
 * Call `update()` after changing the table, or start it with `watch` or
 * `data-watch`.
 */
export class TreemapChart extends LineChart {
  // No initializers: LineChart's constructor draws before they would run.
  /** Each row's positive value, or 0 for a row with no rectangle. */
  private _values: number[];
  /** Each row's rectangle, or null. */
  private _boxes: (HTMLElement | null)[];
  /** Each drawn row's place as fractions of the plot. */
  private _places: Box[];
  /** Lays the rectangles out again when the plot changes shape. */
  private _sizes: ResizeObserver;

  protected get _type() {
    return 'treemap-chart';
  }

  /** Area carries the value, so there is no value axis. */
  protected get _axis() {
    return false;
  }

  protected get _points() {
    return false;
  }

  static key = 'Expressive_TreemapChart';

  destroy() {
    this._sizes?.disconnect();
    super.destroy();
  }

  /** Neither row labels nor a legend: each rectangle carries its name. */
  protected _guides(): Element[] {
    return [];
  }

  /** One rectangle per positive row, in table order, placed by _layout(). */
  protected _draw(): Element {
    this._values = this.series[0].values.map((value) => Math.max(0, value ?? 0));
    const container = document.createElement('div');
    container.className = 'treemap-chart-boxes';
    container.setAttribute('aria-hidden', 'true');
    let drawn = 0;
    this._boxes = this._values.map((value, i) => {
      if (!value) return null;
      const box = document.createElement('div');
      box.className = 'treemap-chart-box';
      box.dataset.series = String((drawn++ % COLORS) + 1);
      const [name, text] = [document.createElement('span'), document.createElement('span')];
      [name.textContent, text.textContent] = [this.labels[i], this.series[0].text[i]];
      box.append(name, text);
      container.append(box);
      return box;
    });
    // The squares depend on the plot's shape, so it goes in the page to be measured.
    this.el.append(this._plot);
    this._layout();
    this._sizes?.disconnect();
    this._sizes = new ResizeObserver(() => this._layout());
    this._sizes.observe(this._plot);
    return container;
  }

  /** Squarifies the positive rows, largest first, equal values in table order, and places their rectangles. */
  private _layout() {
    // A hidden plot has no size; lay it out as a square until it shows.
    const [width, height] = [this._plot.clientWidth || 1, this._plot.clientHeight || 1];
    const rows = this._values.map((_, i) => i).filter((i) => this._values[i]).sort((a, b) => this._values[b] - this._values[a]);
    const scale = (width * height) / sum(this._values);
    const laid = squarify(rows.map((i) => this._values[i] * scale), [0, 0, width, height]);
    this._places = [];
    rows.forEach((row, k) => {
      const [x, y, w, h] = laid[k];
      const place = (this._places[row] = [x / width, y / height, w / width, h / height]);
      Object.assign(this._boxes[row]!.style, {
        insetInlineStart: `${place[0] * 100}%`,
        top: `${place[1] * 100}%`,
        width: `${place[2] * 100}%`,
        height: `${place[3] * 100}%`
      });
    });
  }
}
