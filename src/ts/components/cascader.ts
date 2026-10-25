import { Utils, controllerFor, restoreAttribute } from '../core/utils';
import { Component, BaseOptions } from '../core/component';

/** One option from the author's nested lists. */
interface CascaderNode {
  value: string;
  label: string;
  parent: CascaderNode | null;
  children: CascaderNode[];
  source: HTMLLIElement;
}

/** The input attributes the component sets, put back by destroy(). */
const INPUT_ATTRIBUTES = ['readonly', 'role', 'aria-haspopup', 'aria-expanded', 'aria-controls'];

/** How the input shows a committed path. */
const SEPARATOR = ' / ';

/** An option's own text, without the text of the lists nested in it. */
const ownText = (li: Element) =>
  Array.from(li.childNodes, (node) => (node.nodeName === 'UL' ? ' ' : node.textContent)).join('').replace(/\s+/g, ' ').trim();

/** The options in a list, each with the options nested under it. */
function parse(list: Element | null, parent: CascaderNode | null): CascaderNode[] {
  if (!list) return [];
  return Array.from(list.querySelectorAll<HTMLLIElement>(':scope > li'), (source) => {
    const node: CascaderNode = { value: source.dataset.value ?? '', label: ownText(source), parent, children: [], source };
    node.children = parse(source.querySelector(':scope > ul'), node);
    return node;
  });
}

/** Whether two paths hold the same options. */
const samePath = (a: CascaderNode[], b: CascaderNode[]) => a.length === b.length && a.every((node, i) => node === b[i]);

/** Every option, depth first, which is document order. */
const flatten = (nodes: CascaderNode[]): CascaderNode[] => nodes.flatMap((node) => [node, ...flatten(node.children)]);

/** The options from the first one to `node`. */
function pathTo(node: CascaderNode | undefined): CascaderNode[] {
  const path: CascaderNode[] = [];
  for (let at = node; at; at = at.parent) path.unshift(at);
  return path;
}

export interface CascaderI18nOptions {
  /** What a required field says while no path is chosen. */
  required: string;
}

export interface CascaderOptions extends BaseOptions {
  /**
   * Text the cascader shows.
   * @default { required: 'Choose an option.' }
   */
  i18n: CascaderI18nOptions;
}

const _defaults: CascaderOptions = {
  i18n: { required: 'Choose an option.' }
};

export class Cascader extends Component<CascaderOptions> {
  /** The text input that shows the chosen path. */
  input: HTMLInputElement;
  /** The popover of columns. */
  popover: HTMLElement;
  /** The options from the author's lists. */
  private _options: CascaderNode[];
  /** The chosen path, from the first column to a leaf, or empty. */
  private _path: CascaderNode[] = [];
  /** Whether the popover is open. */
  isOpen = false;
  /** The input's attributes before the component started. */
  private _saved: (string | null)[];
  /** The path shown while the popover is open, which a leaf commits. */
  private _open: CascaderNode[] = [];
  /** The open listbox columns, one per level of the open path. */
  private _columns: HTMLElement[] = [];
  /** Each rendered option's node. */
  private _nodes = new Map<Element, CascaderNode>();
  /** Listeners that last while the popover is open. */
  private _openEvents: AbortController | null = null;
  /** What names the popover and the first column: the input's own aria-labelledby or its label's id. */
  private _labelledBy: string | null;
  /** A label id the component gave, which destroy() takes back. */
  private _stampedLabel: HTMLLabelElement | null = null;
  private _ids = 0;

  constructor(el: HTMLElement, options: Partial<CascaderOptions> = {}) {
    super(el, options);
    this.input = this.el.querySelector<HTMLInputElement>(':scope > input');
    this._options = parse(this.el.querySelector(':scope > .cascader-options'), null);
    if (!this.input) return;
    this._saved = INPUT_ATTRIBUTES.map((name) => this.input.getAttribute(name));
    this.popover = document.createElement('div');
    this.popover.id = `cascader-${Utils.guid()}`;
    this.popover.className = 'cascader-popover';
    this.popover.setAttribute('popover', 'manual');
    this.popover.setAttribute('role', 'dialog');
    this.el.append(this.popover);
    this._labelledBy = this.input.getAttribute('aria-labelledby') ?? this._labelId();
    this._name(this.popover);
    this.input.readOnly = true;
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-haspopup', 'dialog');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-controls', this.popover.id);
    this._path = this._startingPath();
    this._show();
    const { signal } = this._events;
    this.input.addEventListener('click', this._handleInputClick, { signal });
    this.popover.addEventListener('click', this._handleOptionClick, { signal });
  }

  static get defaults(): CascaderOptions {
    return _defaults;
  }

  static key = 'Expressive_Cascader';

  /** The values of the chosen path, from the first column on. */
  get value(): string[] {
    return this._path.map((node) => node.value);
  }

  /** Opens the popover at the chosen path, with focus on its leaf or on the first option. */
  open() {
    if (this.isOpen || this.input.matches(':disabled')) return;
    this.isOpen = true;
    this._columns = [this._addColumn(this._options, null)];
    this._open = [];
    this._path.forEach((node, level) => this._choose(level, node));
    this._showPopover();
    this._focus(this._optionFor(this._path.at(-1)) ?? this._columns[0].querySelector('[role="option"]'));
  }

  /** Closes the popover, keeping the chosen path. */
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._openEvents.abort();
    this.popover.hidePopover?.();
    this.popover.replaceChildren();
    this._columns = [];
    this._nodes.clear();
    this.input.setAttribute('aria-expanded', 'false');
  }

  destroy() {
    if (this.input) {
      this.close();
      this._stampedLabel?.removeAttribute('id');
      this.popover.remove();
      INPUT_ATTRIBUTES.forEach((name, i) => restoreAttribute(this.input, name, this._saved[i]));
    }
    super.destroy();
  }

  /** The path to the first leaf marked data-selected; a marked branch does not count. */
  private _startingPath() {
    return pathTo(flatten(this._options).find((node) => !node.children.length && node.source.hasAttribute('data-selected')));
  }

  /** Shows the popover anchored to the input, until a press outside closes it. */
  private _showPopover() {
    (this.popover as HTMLElement & { showPopover(options?: { source?: HTMLElement }): void }).showPopover?.({ source: this.input });
    this.input.setAttribute('aria-expanded', 'true');
    this._openEvents = controllerFor(this.el);
    document.addEventListener('pointerdown', this._handleOutsidePointer, { capture: true, signal: this._openEvents.signal });
  }

  /** The id of the input's first label, given one if it has none, or null. */
  private _labelId() {
    const label = this.input.labels?.[0];
    if (!label) return null;
    if (!label.id) {
      label.id = `${this.popover.id}-label`;
      this._stampedLabel = label;
    }
    return label.id;
  }

  /** Names the popover or the first column after the field. */
  private _name(el: HTMLElement) {
    if (this._labelledBy) el.setAttribute('aria-labelledby', this._labelledBy);
    else restoreAttribute(el, 'aria-label', this.input.getAttribute('aria-label'));
  }

  /** A listbox of `nodes`, named after the option that opened it, or after the field for the first. */
  private _addColumn(nodes: CascaderNode[], opener: CascaderNode | null) {
    const column = document.createElement('ul');
    column.setAttribute('role', 'listbox');
    if (opener) column.setAttribute('aria-labelledby', this._optionFor(opener).id);
    else this._name(column);
    column.append(...nodes.map((node) => this._addOption(node)));
    column.firstElementChild?.setAttribute('tabindex', '0');
    this.popover.append(column);
    return column;
  }

  private _addOption(node: CascaderNode) {
    const option = document.createElement('li');
    option.id = `${this.popover.id}-${this._ids++}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.tabIndex = -1;
    option.textContent = node.label;
    if (node.children.length) {
      const chevron = document.createElement('span');
      chevron.className = 'cascader-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      option.append(chevron);
    }
    this._nodes.set(option, node);
    return option;
  }

  /** The rendered option for `node`, if it is shown. */
  private _optionFor(node: CascaderNode | undefined): HTMLElement | undefined {
    for (const [option, shown] of this._nodes) if (shown === node) return option as HTMLElement;
    return undefined;
  }

  /**
   * Puts `node` on the open path at `level`: it is selected in its column,
   * the columns after it go, and a branch shows its children next.
   */
  private _choose(level: number, node: CascaderNode) {
    this._open = [...this._open.slice(0, level), node];
    this._columns.splice(level + 1).forEach((column) => column.remove());
    this._columns[level].querySelectorAll('[role="option"]').forEach((option) => {
      const selected = this._nodes.get(option) === node;
      option.setAttribute('aria-selected', String(selected));
      option.setAttribute('tabindex', selected ? '0' : '-1');
    });
    if (node.children.length) this._columns.push(this._addColumn(node.children, node));
  }

  /** Moves focus to an option and makes it its column's tab stop. */
  private _focus(option: Element | null | undefined) {
    if (!(option instanceof HTMLElement)) return;
    option.parentElement.querySelectorAll('[tabindex="0"]').forEach((other) => other.setAttribute('tabindex', '-1'));
    option.tabIndex = 0;
    option.focus();
  }

  /** Commits the open path, ending at a leaf: the input shows it, and changes to it fire input and change. */
  private _commit() {
    const changed = !samePath(this._open, this._path);
    this._path = this._open;
    this._show();
    this.close();
    this.input.focus();
    if (!changed) return;
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Chooses an option: a branch opens its children, and a leaf commits the path. */
  private _pick(option: Element) {
    const node = this._nodes.get(option);
    this._choose(this._columns.indexOf(option.parentElement), node);
    if (!node.children.length) this._commit();
  }

  _handleInputClick = () => {
    if (this.isOpen) this.close();
    else this.open();
  };

  /** A click on a branch keeps focus on it; one on a leaf commits. */
  _handleOptionClick = (e: MouseEvent) => {
    const option = (e.target as Element).closest('[role="option"]');
    if (!option) return;
    this._focus(option);
    this._pick(option);
  };

  /** A press outside the field and the popover closes it, leaving focus where the press puts it. */
  _handleOutsidePointer = (e: PointerEvent) => {
    const target = Utils.eventTarget(e);
    if (!this.el.contains(target)) this.close();
  };

  /** Shows the chosen path's labels in the input. */
  private _show() {
    this.input.value = this._path.map((node) => node.label).join(SEPARATOR);
  }
}
