import { svgNode } from '../core/utils';
import { LineChart, LineChartOptions, cellValue } from './lineChart';

export type SankeyChartOptions = LineChartOptions;

// ponytail: fixed shares of the plot; tokens if authors ask to tune them.
/** A node's width, in hundredths of the plot's width. */
const NODE_WIDTH = 2;
/** The gap between nodes in a column, in hundredths of the plot's height. */
const NODE_GAP = 4;

/** A row that draws a link: its index, its source and target names, and its value. */
interface Flow {
  row: number;
  source: string;
  target: string;
  value: number;
}

/** A node: its name, column and size in value units, and where it sits, in hundredths of the plot. */
interface Node {
  name: string;
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

/** The nodes in the order their names first appear, each sized by the larger of its in and out totals. */
function nodesOf(flows: Flow[]): Node[] {
  const columns = new Map<string, number>();
  return [...new Set(flows.flatMap((flow) => [flow.source, flow.target]))].map((name) => ({
    name,
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

  /** The links, then the nodes over their ends. Neither has a stroke, so the stretched SVG keeps their sizes. */
  protected _draw(): Element {
    const svg = svgNode('svg', {
      viewBox: '0 0 100 100',
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
      focusable: 'false'
    });
    const links = this._links.map((link) => svgNode('path', { class: 'sankey-chart-link', d: this._linkPath(link) }));
    const nodes = this._nodes.map((node) => svgNode('path', { class: 'sankey-chart-node', d: this._nodePath(node) }));
    svg.append(...links, ...nodes);
    return svg;
  }

  /** No row labels or legend: the nodes carry the names. */
  protected _guides(): Element[] {
    return [];
  }
}
