import { svgNode } from '../core/utils';
import { LineChart, LineChartOptions, cellValue, morph, pace } from './lineChart';

export type SankeyChartOptions = LineChartOptions;

// ponytail: fixed shares of the plot; tokens if authors ask to tune them.
/** A node's width, in hundredths of the plot's width. */
const NODE_WIDTH = 2;
/** The gap between nodes in a column, in hundredths of the plot's height. */
const NODE_GAP = 4;
// ponytail: nodes past six repeat the colors, as pie chart rows do.
const COLORS = 6;

/** A row that draws a link: its index, its source and target names, and its value. */
interface Flow {
  row: number;
  source: string;
  target: string;
  value: number;
}

/** A node: its name, color, column and size in value units, and where it sits, in hundredths of the plot. */
interface Node {
  name: string;
  color: string;
  column: number;
  size: number;
  x: number;
  top: number;
  height: number;
}

/** A drawn link: its flow, its ends' nodes, its top at each end and its thickness, in hundredths of the plot. */
interface Link {
  flow: Flow;
  source: Node;
  target: Node;
  from: number;
  to: number;
  size: number;
}

/** A tooltip line part. */
const span = (text: string) => Object.assign(document.createElement('span'), { textContent: text });

/** A cell's trimmed text, or '' without the cell. */
const text = (row: HTMLTableRowElement, column: number) => row.cells[column]?.textContent.trim() ?? '';

const sum = (flows: Flow[]) => flows.reduce((total, flow) => total + flow.value, 0);

/** A row's flow, or null for a row without both names or a positive value. */
function flowOf(row: HTMLTableRowElement, index: number): Flow | null {
  // A gap's null becomes 0, which draws nothing.
  const [source, target, value] = [text(row, 0), text(row, 1), Number(cellValue(row.cells[2]))];
  return source && target && value > 0 ? { row: index, source, target, value } : null;
}

/** Whether `from` reaches `to` along the flows, so a flow from `to` to `from` would close a cycle. */
function reaches(flows: Flow[], from: string, to: string, seen = new Set<string>()): boolean {
  if (from === to) return true;
  seen.add(from);
  return flows.some((flow) => flow.source === from && !seen.has(flow.target) && reaches(flows, flow.target, to, seen));
}

/** The rows' flows in table order, leaving out rows without one and any that would close a cycle. */
function flowsOf(rows: HTMLTableRowElement[]) {
  const flows: Flow[] = [];
  rows.forEach((row, index) => {
    const flow = flowOf(row, index);
    if (flow && !reaches(flows, flow.target, flow.source)) flows.push(flow);
  });
  return flows;
}

/** A node's column: 0 without incoming flows, otherwise one past the furthest of its sources. */
function columnOf(name: string, flows: Flow[], columns: Map<string, number>): number {
  if (!columns.has(name)) {
    const sources = flows.filter((flow) => flow.target === name).map((flow) => columnOf(flow.source, flows, columns) + 1);
    columns.set(name, Math.max(0, ...sources));
  }
  return columns.get(name)!;
}

/**
 * The nodes in the order their names first appear, each sized by the larger
 * of its in and out totals, and colored in that order.
 */
function nodesOf(flows: Flow[]): Node[] {
  const columns = new Map<string, number>();
  return [...new Set(flows.flatMap((flow) => [flow.source, flow.target]))].map((name, i) => ({
    name,
    color: String((i % COLORS) + 1),
    column: columnOf(name, flows, columns),
    size: Math.max(sum(flows.filter((flow) => flow.target === name)), sum(flows.filter((flow) => flow.source === name))),
    x: 0,
    top: 0,
    height: 0
  }));
}

/** Sets each node's place: columns spread across the plot, each centred down it, on one scale. */
function place(nodes: Node[]) {
  const count = Math.max(...nodes.map((node) => node.column)) + 1;
  const columns = Array.from({ length: count }, (_, c) => nodes.filter((node) => node.column === c));
  // Gaps take at most half the height, however many nodes a column has.
  const gap = Math.min(NODE_GAP, 50 / Math.max(...columns.map((column) => column.length)));
  const room = (column: Node[]) => 100 - (column.length - 1) * gap;
  const total = (column: Node[]) => column.reduce((height, node) => height + node.size, 0);
  // The tallest column, nodes and gaps, fills the plot.
  const scale = Math.min(...columns.map((column) => room(column) / total(column)));
  columns.forEach((column, c) => {
    let top = (room(column) - total(column) * scale) / 2;
    for (const node of column) {
      Object.assign(node, { x: (c / (count - 1)) * (100 - NODE_WIDTH), top, height: node.size * scale });
      top += node.height + gap;
    }
  });
  return scale;
}

/** Each flow's link, stacked in table order down its source's outgoing edge and its target's incoming one. */
function linksOf(flows: Flow[], nodes: Node[], scale: number): Link[] {
  const byName = new Map(nodes.map((node) => [node.name, node]));
  const [out, into] = [new Map<Node, number>(), new Map<Node, number>()];
  const next = (used: Map<Node, number>, node: Node, size: number) => {
    const top = node.top + (used.get(node) ?? 0);
    used.set(node, top - node.top + size);
    return top;
  };
  return flows.map((flow) => {
    const [source, target, size] = [byName.get(flow.source)!, byName.get(flow.target)!, flow.value * scale];
    return { flow, source, target, from: next(out, source, size), to: next(into, target, size), size };
  });
}

/**
 * Sankey chart. Each row of its <table> is a flow: the first cell names the
 * source node, the second the target node, and the third holds the value.
 * Nodes stand in columns, a node with no incoming flow in the first and any
 * other one column past the furthest of its sources, and stack in the order
 * their names first appear. Each link is as thick as its value, and each
 * node as tall as the larger of its in and out totals, on one scale. A row
 * without both names or a positive value, or whose link would close a
 * cycle, draws nothing.
 *
 * Call `update()` after changing the table, or start it with `watch` or
 * `data-watch`.
 */
export class SankeyChart extends LineChart {
  // No initializers: LineChart's constructor draws before they would run.
  private _nodes: Node[];
  /** The drawn links, in table order. */
  private _links: Link[];
  /** The links' paths, in the same order. */
  private _paths: SVGPathElement[];
  /** Each drawn shape's path data, by its link's source and target names or its node's name, which update() moves from. */
  private _shapes: Map<string, string>;

  protected get _type() {
    return 'sankey-chart';
  }

  /** The value column is the one series; the target column is read on its own. */
  protected get _seriesFrom() {
    return 2;
  }

  protected get _seriesTo() {
    return 3;
  }

  /** The links carry the values, so there is no value axis. */
  protected get _axis() {
    return false;
  }

  static key = 'Expressive_SankeyChart';

  /** The links the keys and pointer reach. */
  protected get _count() {
    return this._links?.length ?? 0;
  }

  /** Highlights one link, numbered in table order among those drawn. Pass -1 to hide the tooltip. */
  show(index: number) {
    if (!this._tooltip || index === this.activeIndex) return;
    this._paths[this.activeIndex]?.classList.remove('active');
    this._paths[index]?.classList.add('active');
    this.activeIndex = index;
    const link = this._links[index];
    this._tooltip.hidden = !link;
    if (link) this._fill(link);
  }

  /**
   * Fills the tooltip beside the link's middle: its source and target under
   * their column headers, with their nodes' colors, and the value cell's
   * text, as the author wrote them. Past the middle it opens back over the plot.
   */
  private _fill({ flow, source, target, from, to, size }: Link) {
    const x = this._across((source.x + NODE_WIDTH + target.x) / 2);
    Object.assign(this._tooltip.style, { left: `${x}%`, top: `${(from + to + size) / 2}%` });
    this._tooltip.classList.toggle('end', x > 50);
    const header = this._header.map((cell) => cell.textContent.trim());
    const [sourceName, targetName, value] = [span(header[0]), span(header[1]), span(header[2])];
    sourceName.dataset.series = source.color;
    targetName.dataset.series = target.color;
    value.className = 'value';
    this._tooltip.replaceChildren(sourceName, span(source.name), targetName, span(target.name), value, span(text(this._rows[flow.row], 2)));
  }

  /** The link under the pointer, or -1 off every link. By position, since a touch keeps its first target as it drags. */
  protected _indexAt(e: PointerEvent) {
    const hits = (this.el.getRootNode() as Document | ShadowRoot).elementsFromPoint(e.clientX, e.clientY);
    const link = hits.find((hit) => this._paths.includes(hit as SVGPathElement));
    return this._paths.indexOf(link as SVGPathElement);
  }

  /**
   * Steps through the links in table order. The arrows keep their meaning
   * in a right-to-left chart, since table order is no direction on screen.
   */
  protected _keyTarget(key: string): number | undefined {
    // With nothing shown, Escape is left to a dialog or sheet around the chart.
    if (key === 'Escape') return this.activeIndex < 0 ? undefined : -1;
    const last = this._links.length - 1;
    const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[key];
    if (step) return Math.min(last, Math.max(0, this.activeIndex + step));
    return ({ Home: 0, End: last } as Record<string, number>)[key];
  }

  /** Reads the flows and lays out their nodes and links. Without a link to draw, the chart draws nothing. */
  protected _read() {
    super._read();
    const flows = flowsOf(this._rows);
    if (!flows.length) {
      [this.series, this._nodes, this._links] = [[], [], []];
      return;
    }
    this._nodes = nodesOf(flows);
    this._links = linksOf(flows, this._nodes, place(this._nodes));
  }

  /** An x position in hundredths of the plot, mirrored in a right-to-left chart. */
  private _across(x: number) {
    return this._reversed ? 100 - x : x;
  }

  /** A node as path data: a rectangle. */
  private _nodePath({ x, top, height }: Node) {
    const [start, end] = [this._across(x), this._across(x + NODE_WIDTH)];
    return `M${start},${top}H${end}V${top + height}H${start}Z`;
  }

  /** A link as path data: two curves from the source's edge to the target's, closed between them. */
  private _linkPath({ source, target, from, to, size }: Link) {
    const [x0, x1] = [source.x + NODE_WIDTH, target.x];
    const [start, middle, end] = [this._across(x0), this._across((x0 + x1) / 2), this._across(x1)];
    return `M${start},${from}C${middle},${from} ${middle},${to} ${end},${to}`
      + `V${to + size}C${middle},${to + size} ${middle},${from + size} ${start},${from + size}Z`;
  }

  /**
   * The links, then the nodes over their ends. Neither has a stroke, so the
   * stretched SVG keeps their sizes. After update(), each shape still in the
   * table moves from where it was: a link found by its source and target
   * names, a node by its name.
   */
  protected _draw(): Element {
    const svg = svgNode('svg', {
      viewBox: '0 0 100 100',
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
      focusable: 'false'
    });
    const [was, timing] = [this._shapes ?? new Map<string, string>(), this._before.length ? pace(this.el) : null];
    this._shapes = new Map();
    const shape = (className: string, key: string, color: string, d: string) => {
      const path = svgNode('path', { class: className, 'data-series': color, d }) as SVGPathElement;
      if (timing && was.has(key)) morph(path, was.get(key)!, timing);
      this._shapes.set(key, d);
      return path;
    };
    this._paths = this._links.map((link) =>
      shape('sankey-chart-link', JSON.stringify([link.source.name, link.target.name]), link.source.color, this._linkPath(link)));
    const nodes = this._nodes.map((node) => shape('sankey-chart-node', JSON.stringify(node.name), node.color, this._nodePath(node)));
    svg.append(...this._paths, ...nodes);
    return svg;
  }

  /**
   * The node names, over the drawing, each level with its node and toward
   * the plot's middle: after the node, or before it in the last column.
   * They are placed from the inline start, so they need no mirroring.
   */
  protected _axes(): Element[] {
    const names = document.createElement('div');
    names.className = 'sankey-chart-names';
    names.setAttribute('aria-hidden', 'true');
    const last = Math.max(...this._nodes.map((node) => node.column));
    names.append(...this._nodes.map((node) => this._name(node, node.column === last)));
    return [names];
  }

  private _name({ name, x, top, height }: Node, last: boolean) {
    const span = document.createElement('span');
    span.className = last ? 'sankey-chart-name end' : 'sankey-chart-name';
    span.textContent = name;
    span.style.setProperty('--sankey-chart-x', `${last ? x : x + NODE_WIDTH}%`);
    span.style.setProperty('--sankey-chart-y', `${top + height / 2}%`);
    return span;
  }

  /** No row labels or legend: the nodes carry the names. */
  protected _guides(): Element[] {
    return [];
  }
}
