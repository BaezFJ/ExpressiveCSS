import { numberValue } from '../components/lineChart';
import { Utils, controllerFor } from '../core/utils';

/** The rows of a table's bodies that hold records, not a row's detail. */
const ROWS = ':scope > tbody > tr:not(.data-table-detail)';
/** A checkbox in a row's first cell, which selects the row. */
const BOX = ':scope > :first-child input[type="checkbox"]';
/**
 * A column's resize handle: a drag-handle button ending a cell of the first
 * header row, the row whose cells set the widths of a fixed table layout.
 */
const HANDLE = '.data-table > table > thead > tr:first-child > th > button.drag-handle:last-child';
/** How far an arrow key resizes a column; Shift moves four times as far. */
const STEP = 16;
/** How each sort direction orders the rows. */
const ORDER = { ascending: 1, descending: -1 };
/** A menu checkbox item that shows and hides the column of the header cell it names. */
const TOGGLE = '[role="menuitemcheckbox"][data-column]';
/** Marks a cell hidden with its column, so showing the column never shows a cell the author hid. */
const HIDDEN = 'data-column-hidden';

/** The cell of a body row that covers a column, counting colspan. */
function cellAt(row: HTMLTableRowElement, column: number) {
  let end = 0;
  for (const cell of Array.from(row.cells)) {
    end += cell.colSpan;
    if (column < end) return cell;
  }
}

/** A cell's sort text: its `data-value`, or else its text. */
function cellText(row: HTMLTableRowElement, column: number) {
  const cell = cellAt(row, column);
  return (cell?.dataset.value ?? cell?.textContent ?? '').trim();
}

/** Marks the columns a cell covers, in its row and the rows its rowspan reaches. */
function cover(taken: Set<number>[], row: number, column: number, cell: HTMLTableCellElement) {
  for (let r = row; r < row + Math.max(1, cell.rowSpan); r++) {
    for (let c = column; c < column + cell.colSpan; c++) (taken[r] ??= new Set()).add(c);
  }
}

/**
 * The column each header cell starts at. A grouped header's cells sit
 * after the ones a colspan or rowspan carries over, so a cell's place in its
 * row is not its column.
 */
function headerColumns(head: HTMLTableSectionElement) {
  const [taken, columns] = [[] as Set<number>[], new Map<Element, number>()];
  Array.from(head.rows).forEach((row, r) => {
    let column = 0;
    for (const cell of Array.from(row.cells)) {
      while (taken[r]?.has(column)) column++;
      columns.set(cell, column);
      cover(taken, r, column, cell);
      column += cell.colSpan;
    }
  });
  return columns;
}

/**
 * The header cell a column toggle names: a cell of a data table's first
 * header row that spans one column. The id is looked up in the item's own
 * document or shadow root.
 */
function toggledHeader(item: Element) {
  const root = item.getRootNode() as Document | ShadowRoot;
  const header = root.getElementById?.(item.getAttribute('data-column')) as HTMLTableCellElement;
  return header?.matches('.data-table > table > thead > tr:first-child > th') && header.colSpan === 1 ? header : null;
}

/** A column's cells, one per row, leaving out cells that span several columns. */
function columnCells(table: HTMLTableElement, column: number) {
  const head = [...headerColumns(table.tHead)].filter(([, each]) => each === column).map(([cell]) => cell as HTMLTableCellElement);
  const rows = table.querySelectorAll<HTMLTableRowElement>(':scope > tbody > tr, :scope > tfoot > tr');
  return [...head, ...Array.from(rows, (row) => cellAt(row, column))].filter((cell) => cell?.colSpan === 1);
}

function conceal(cell: HTMLTableCellElement) {
  if (cell.hidden) return;
  cell.hidden = true;
  cell.setAttribute(HIDDEN, '');
}

function reveal(cell: HTMLTableCellElement) {
  if (!cell.hasAttribute(HIDDEN)) return;
  cell.hidden = false;
  cell.removeAttribute(HIDDEN);
}

/** Shows or hides the column a toggle names, as its `aria-checked` says. */
function applyToggle(item: Element) {
  const header = toggledHeader(item);
  if (!header) return;
  const table = header.closest('table');
  const show = item.getAttribute('aria-checked') === 'true';
  columnCells(table, headerColumns(table.tHead).get(header)).forEach(show ? reveal : conceal);
  refit(table, header);
}

/**
 * Keeps a resized table as wide as its visible columns. A column shown for
 * the first time since the widths were held takes its content's width, no
 * narrower than the minimum token.
 */
function refit(table: HTMLTableElement, header: HTMLTableCellElement) {
  if (table.style.tableLayout !== 'fixed') return;
  if (!header.hidden && !header.style.width) header.style.width = `${Math.max(bounds(header)[0], header.scrollWidth)}px`;
  fit(table);
}

/** The visible cells of a table's first row, which set its column widths under the fixed layout. */
function firstCells(table: HTMLTableElement) {
  return Array.from(table.rows[0]?.cells ?? []).filter((cell) => !cell.hidden);
}

/** Sizes a table to the sum of its columns, so it scrolls once they outgrow the wrapper. */
function fit(table: HTMLTableElement) {
  table.style.width = `${firstCells(table).reduce((sum, cell) => sum + parseFloat(cell.style.width), 0)}px`;
}

/**
 * Holds every column at its current width under the fixed table layout, so
 * resizing one column leaves the others alone. The automatic layout shares a
 * change among all of them.
 */
function freeze(table: HTMLTableElement) {
  if (table.style.tableLayout === 'fixed') return;
  const cells = firstCells(table);
  // Measure every cell before writing any, so no write reflows a later read.
  const sizes = cells.map((cell) => cell.getBoundingClientRect().width);
  cells.forEach((cell, i) => (cell.style.width = `${sizes[i]}px`));
  table.style.tableLayout = 'fixed';
  fit(table);
}

/** The narrowest and widest a column may get: its minimum token, and the wrapper's inner width. */
function bounds(header: HTMLTableCellElement): [number, number] {
  const min = parseFloat(getComputedStyle(header).minWidth) || 0;
  return [min, Math.max(min, header.closest('.data-table').clientWidth)];
}

/** The next of a column's narrow, middle and wide widths, wrapping to narrow. */
function nextStep(header: HTMLTableCellElement) {
  const [min, max] = bounds(header);
  const current = header.getBoundingClientRect().width;
  return [min, (min + max) / 2, max].find((width) => width > current + 1) ?? min;
}

/**
 * The width a key asks for, or undefined for another key. The arrow toward
 * the column's inline-end edge widens it; Home and End jump to the bounds.
 */
function keyWidth(header: HTMLTableCellElement, e: KeyboardEvent) {
  const [min, max] = bounds(header);
  const amount = (e.shiftKey ? 4 : 1) * STEP * (getComputedStyle(header).direction === 'rtl' ? -1 : 1);
  const current = header.getBoundingClientRect().width;
  const widths: Record<string, number> = { ArrowRight: current + amount, ArrowLeft: current - amount, Home: min, End: max };
  return widths[e.key];
}

/**
 * Data tables. In a `.data-table`, a checkbox in the first header cell
 * selects every row, and shows mixed while only some are selected. With
 * `data-sort` on the wrapper, a button in a header cell sorts the rows by
 * that column and moves `aria-sort`. Both fire events from the wrapper:
 * `expressive:change` with the selected rows, and a cancelable
 * `expressive:sort`, which a server-sorted table cancels to sort the rows
 * itself. A `.drag-handle` button ending a header cell resizes its column
 * and fires `expressive:resize` with `{ header, column, width }`. A menu
 * checkbox item with `data-column` naming a first-row header cell's id
 * hides that column while it is unchecked.
 */
export class DataTables {
  private static _initialized = false;
  private static _dragged = false;

  static Init() {
    if (DataTables._initialized || typeof document === 'undefined') return;
    DataTables._initialized = true;
    // A checkbox's input event crosses shadow roots; its change event does not.
    document.addEventListener('input', DataTables._onChange);
    document.addEventListener('click', DataTables._onClick);
    document.addEventListener('pointerdown', DataTables._onPointerDown);
    document.addEventListener('click', DataTables._onHandleClick);
    document.addEventListener('keydown', DataTables._onKeyDown);
    document.addEventListener('expressive:change', DataTables._onToggle);
    Utils.onDocumentReady(() => document.querySelectorAll('.data-table').forEach(DataTables.sync));
  }

  /**
   * Shows on a table's select-all box whether all, some or none of its rows
   * are selected. This runs for the tables in the page when it loads; call
   * it for a `.data-table` rendered later with rows already checked, or
   * after checking rows from script, which fires no change. It also shows
   * and hides the columns that column toggles name, as their
   * `aria-checked` says.
   */
  static sync(wrapper: Element) {
    const table = wrapper.querySelector<HTMLTableElement>(':scope > table');
    if (table) DataTables._select(DataTables._all(table), DataTables._enabled(table), false);
    (wrapper.getRootNode() as ParentNode).querySelectorAll(TOGGLE).forEach((item) => {
      if (wrapper.contains(toggledHeader(item))) applyToggle(item);
    });
  }

  /** A column's width in pixels, read from its header cell. */
  static width(header: Element) {
    return header.getBoundingClientRect().width;
  }

  /**
   * Sets a column's width from its header cell, between the
   * `--md-comp-data-table-column-min-width` token and the wrapper's inner
   * width. It fires no event, so a page can restore saved widths with it.
   */
  static setWidth(header: HTMLTableCellElement, width: number) {
    const table = header.closest('table');
    const [min, max] = bounds(header);
    freeze(table);
    header.style.width = `${Math.round(Math.min(Math.max(width, min), max))}px`;
    fit(table);
  }

  /**
   * A table's select-all box: a checkbox in a header cell of the first
   * column. In a grouped header the first cell of a later row can belong to
   * another column, so the column is counted, not the cell's place.
   */
  private static _all(table: HTMLTableElement) {
    const head = table.tHead;
    const box = 'input[type="checkbox"]';
    const cell = head && [...headerColumns(head)].find(([each, column]) => column === 0 && each.querySelector(box))?.[0];
    return cell?.querySelector<HTMLInputElement>(box);
  }

  /** The selection boxes a select-all box changes: the enabled ones. */
  private static _enabled(table: HTMLTableElement) {
    // :disabled also covers a box inside a disabled fieldset.
    return DataTables._boxes(table).filter((each) => !each.matches(':disabled'));
  }

  /** The selection checkboxes of a table's record rows. */
  private static _boxes(table: HTMLTableElement) {
    return Array.from(table.querySelectorAll<HTMLTableRowElement>(ROWS), (row) =>
      row.querySelector<HTMLInputElement>(BOX)).filter(Boolean);
  }

  private static _onChange = (e: Event) => {
    const box = Utils.eventTarget(e);
    const wrapper = box?.closest('.data-table');
    const table = wrapper?.querySelector<HTMLTableElement>(':scope > table');
    if (!table) return;
    const [all, boxes] = [DataTables._all(table), DataTables._boxes(table)];
    if (box !== all && !boxes.includes(box as HTMLInputElement)) return;
    DataTables._select(all, DataTables._enabled(table), box === all);
    Utils.emit(wrapper, 'change', { selected: boxes.filter((each) => each.checked).map((each) => each.closest('tr')) });
  };

  /**
   * Checks every enabled row when the select-all box changed, then shows on
   * it whether all, some or none of them are checked.
   */
  private static _select(all: HTMLInputElement | null | undefined, boxes: HTMLInputElement[], fromAll: boolean) {
    if (!all) return;
    if (fromAll) boxes.forEach((each) => (each.checked = all.checked));
    const checked = boxes.filter((each) => each.checked).length;
    // Mixed is some but not all: a remainder only when 0 < checked < length.
    all.indeterminate = checked % boxes.length > 0;
    all.checked = checked > 0 && !all.indeterminate;
  }

  private static _onClick = (e: MouseEvent) => {
    const button = Utils.closestInPath(e, '.data-table[data-sort] > table > thead > tr > th > button:not([aria-haspopup], :disabled, [aria-disabled="true"], .drag-handle)');
    if (!button) return;
    const header = button.parentElement as HTMLTableCellElement;
    const wrapper = header.closest('.data-table');
    const direction = header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    header.closest('thead').querySelectorAll('th[aria-sort]').forEach((cell) => cell.removeAttribute('aria-sort'));
    header.setAttribute('aria-sort', direction);
    const column = headerColumns(header.closest('thead')).get(header);
    if (Utils.emit(wrapper, 'sort', { header, column, direction }, true)) {
      DataTables._sort(header.closest('table'), header, column, ORDER[direction]);
    }
  };

  /** Menu's change from a column toggle; a data table's own change has no item. */
  private static _onToggle = (e: CustomEvent<{ item?: Element }>) => {
    const item = e.detail?.item;
    if (item?.matches?.(TOGGLE)) applyToggle(item);
  };

  private static _onPointerDown = (e: PointerEvent) => {
    const handle = Utils.closestInPath(e, HANDLE) as HTMLElement;
    if (handle && e.button === 0) DataTables._drag(handle, e);
  };

  /**
   * Moves a column's inline-end edge with the pointer. A few pixels of
   * travel is still a click.
   */
  private static _drag(handle: HTMLElement, start: PointerEvent) {
    const header = handle.parentElement as HTMLTableCellElement;
    const from = DataTables.width(header);
    const sign = getComputedStyle(header).direction === 'rtl' ? -1 : 1;
    DataTables._dragged = false;
    handle.setPointerCapture(start.pointerId);
    const drag = controllerFor(handle);
    const { signal } = drag;
    handle.addEventListener('pointermove', (e) => {
      const delta = e.clientX - start.clientX;
      if (Math.abs(delta) < 4 && !DataTables._dragged) return;
      DataTables._dragged = true;
      DataTables.setWidth(header, from + sign * delta);
    }, { signal });
    const end = () => {
      drag.abort();
      if (DataTables._dragged) DataTables._resized(header, from);
    };
    handle.addEventListener('pointerup', end, { signal });
    handle.addEventListener('pointercancel', end, { signal });
  }

  /**
   * Steps a column through narrow, middle and wide: the single-pointer
   * alternative to dragging. The click that ends a mouse drag is not a
   * request to step; a keyboard click (detail 0) always is.
   */
  private static _onHandleClick = (e: MouseEvent) => {
    const handle = Utils.closestInPath(e, HANDLE);
    if (!handle || (e.detail !== 0 && DataTables._dragged)) return;
    const header = handle.parentElement as HTMLTableCellElement;
    DataTables._resizeTo(header, nextStep(header));
  };

  private static _onKeyDown = (e: KeyboardEvent) => {
    const handle = Utils.closestInPath(e, HANDLE);
    if (!handle || !Utils.plainKey(e)) return;
    const header = handle.parentElement as HTMLTableCellElement;
    const width = keyWidth(header, e);
    if (width === undefined) return;
    e.preventDefault();
    DataTables._resizeTo(header, width);
  };

  /** Sets a column's width and fires `expressive:resize` if it changed. */
  private static _resizeTo(header: HTMLTableCellElement, width: number) {
    const from = DataTables.width(header);
    DataTables.setWidth(header, width);
    DataTables._resized(header, from);
  }

  /** Fires `expressive:resize` from the wrapper when a column's width moved off `from`. */
  private static _resized(header: HTMLTableCellElement, from: number) {
    const width = DataTables.width(header);
    if (Math.abs(width - from) < 0.5) return;
    const column = headerColumns(header.closest('thead')).get(header);
    Utils.emit(header.closest('.data-table'), 'resize', { header, column, width });
  }

  /**
   * Reorders each body's rows by one column. A detail row moves with the
   * row before it.
   */
  private static _sort(table: HTMLTableElement, header: HTMLTableCellElement, column: number, order: number) {
    const compare = DataTables._compare(table, header);
    for (const body of Array.from(table.tBodies)) {
      const groups = DataTables._groups(body);
      groups.sort(([a], [b]) => order * compare(cellText(a, column), cellText(b, column)));
      body.append(...groups.flat());
    }
  }

  /**
   * How a column compares: a `.numeric` header's as numbers, as a chart
   * reads them, with text that is not a number first; any other as text in
   * the page's language, with digit runs as numbers.
   */
  private static _compare(table: HTMLTableElement, header: HTMLTableCellElement) {
    if (!header.classList.contains('numeric')) return new Intl.Collator(Utils.locale(table), { numeric: true, sensitivity: 'base' }).compare;
    const number = (text: string) => numberValue(text) ?? -Infinity;
    return (a: string, b: string) => number(a) - number(b);
  }

  /** A body's rows in groups: each record row with the detail rows after it. */
  private static _groups(body: HTMLTableSectionElement) {
    const groups: HTMLTableRowElement[][] = [];
    for (const row of Array.from(body.rows)) {
      if (groups.length && row.classList.contains('data-table-detail')) groups[groups.length - 1].push(row);
      else groups.push([row]);
    }
    return groups;
  }
}
