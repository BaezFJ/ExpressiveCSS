import { Utils, controllerFor, restoreAttribute } from '../core/utils';
import { Component, BaseOptions } from '../core/component';
import { FormControl, formAssociated, wrapInControl, unwrapControl } from '../core/formControl';

/** One option from the author's nested lists. */
interface CascaderNode {
  value: string;
  label: string;
  parent: CascaderNode | null;
  children: CascaderNode[];
  source: HTMLLIElement;
}

/** The form control a named field submits through, wrapping its input. */
const CONTROL = 'expressive-cascader-control';

/** The input attributes the component sets, put back by destroy(). */
const INPUT_ATTRIBUTES = ['readonly', 'role', 'aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-required', 'aria-invalid'];

/** Keys that open the popover from the input; Alt+ArrowDown is ArrowDown too. */
const OPEN_KEYS = ['Enter', ' ', 'ArrowDown'];

/** Arrow keys swapped under dir="rtl", where the next column is to the left. */
const RTL_KEYS: Record<string, string> = { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' };

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
  /** Each node's current option; choosing a branch again renders it anew. */
  private _rendered = new Map<CascaderNode, HTMLElement>();
  /** The last press inside the field, which the document listener lets through. */
  private _insidePress: Event | null = null;
  /** Listeners that last while the popover is open. */
  private _openEvents: AbortController | null = null;
  /** What names the popover and the first column: the input's own aria-labelledby or its label's id. */
  private _labelledBy: string | null;
  /** A label id the component gave, which destroy() takes back. */
  private _stampedLabel: HTMLLabelElement | null = null;
  private _ids = 0;
  /** The path the field started with, which a form reset puts back. */
  private _initialPath: CascaderNode[] = [];
  /** The form control wrapping a named input, which the form reads instead of it. */
  private _control: FormControl | null = null;
  /** The form name the input had, which the control submits under. */
  private _formName = '';
  private _required = false;

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
    this._path = this._initialPath = this._startingPath();
    this._show();
    this._takeName();
    const { signal } = this._events;
    this.input.addEventListener('click', this._handleInputClick, { signal });
    this.input.addEventListener('keydown', this._handleInputKeydown, { signal });
    this.popover.addEventListener('click', this._handleOptionClick, { signal });
    this.popover.addEventListener('keydown', this._handleOptionKeydown, { signal });
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
    this._rendered.clear();
    this.input.setAttribute('aria-expanded', 'false');
  }

  destroy() {
    if (this.input) {
      this.close();
      this._giveNameBack();
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
    const { signal } = this._openEvents;
    this.el.addEventListener('pointerdown', this._handleInsidePointer, { signal });
    document.addEventListener('pointerdown', this._handleOutsidePointer, { signal });
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
    this._rendered.set(node, option);
    return option;
  }

  /** The rendered option for `node`, if it is shown. */
  private _optionFor(node: CascaderNode | undefined): HTMLElement | undefined {
    return this._rendered.get(node);
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

  /**
   * A named input would submit the path's labels. The control submits under
   * that name instead, one value per level, so the input gives its name and
   * required up until destroy().
   */
  private _takeName() {
    this._formName = this.input.getAttribute('name') ?? '';
    // ponytail: without form-associated custom elements (jsdom) the input keeps its name and submits the labels.
    if (this._formName && formAssociated()) this._wrap();
  }

  /** Wraps the input in the control, which takes its required too. */
  private _wrap() {
    this._required = this.input.required;
    this.input.required = false;
    if (this._required) this.input.setAttribute('aria-required', 'true');
    this._control = wrapInControl(CONTROL, this.input, () => this._sync());
    this._control.onFormReset = () => this._reset();
    this._control.addEventListener('invalid', this._handleInvalid, { signal: this._events.signal });
    this._sync();
  }

  /** After the path changes: one form value per level, and a required field's validity. */
  private _sync() {
    if (!this._control) return;
    const data = new FormData();
    this.value.forEach((value) => data.append(this._formName, value));
    this._control.internals.setFormValue(data);
    this._validate();
  }

  /** A required field is missing a value until a path is committed; the message anchors at the input. */
  private _validate() {
    const missing = this._required && !this._path.length;
    this._control.internals.setValidity({ valueMissing: missing }, missing ? this._requiredMessage : '', this.input);
    if (!missing) restoreAttribute(this.input, 'aria-invalid', this._saved[INPUT_ATTRIBUTES.indexOf('aria-invalid')]);
  }

  /** A validity flag needs a message, so an empty i18n.required falls back to the default. */
  private get _requiredMessage() {
    return this.options.i18n.required || _defaults.i18n.required;
  }

  /** A form reset puts the starting path back without firing events. */
  private _reset() {
    this.close();
    this._path = this._initialPath;
    this._show();
    this._sync();
  }

  /** Unwraps the input and gives it its name and required back. */
  private _giveNameBack() {
    if (!this._control) return;
    unwrapControl(this._control, this.input);
    this._control = null;
    this.input.required = this._required;
  }

  /** Commits the open path, ending at a leaf: the input shows it, and changes to it fire input and change. */
  private _commit() {
    const changed = !samePath(this._open, this._path);
    this._path = this._open;
    this._show();
    this._sync();
    this.close();
    this.input.focus();
    if (!changed) return;
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Chooses an option: a branch opens its children, and a leaf commits the path. */
  private _pick(option: Element) {
    if (this.input.matches(':disabled')) return this.close();
    const node = this._nodes.get(option);
    this._choose(this._columns.indexOf(option.parentElement), node);
    if (!node.children.length) this._commit();
  }

  /** Moves into the next column from a branch; a leaf has none. */
  private _forward(option: HTMLElement) {
    if (this._nodes.get(option).children.length) this._enter(option);
  }

  /** Enter and Space: a branch opens the next column, and a leaf commits. */
  private _activate(option: HTMLElement) {
    if (this._nodes.get(option).children.length) this._enter(option);
    else this._pick(option);
  }

  /** Chooses a branch and moves focus to the first option of its column. */
  private _enter(option: HTMLElement) {
    this._pick(option);
    this._focus(this._columns.at(-1)?.firstElementChild);
  }

  /** Back to the option that opened this column, leaving the columns as they are. */
  private _back(option: HTMLElement) {
    const level = this._columns.indexOf(option.parentElement);
    if (level > 0) this._focus(this._optionFor(this._open[level - 1]));
  }

  /** Closes without committing and returns focus to the input. */
  private _dismiss() {
    this.close();
    this.input.focus();
  }

  /** Up, Down, Home and End within a column, without wrapping. */
  private _move(option: HTMLElement, e: KeyboardEvent) {
    this._focus(Utils.focusTarget(Array.from(option.parentElement.children) as HTMLElement[], e, { ArrowDown: 1, ArrowUp: -1 }));
  }

  /** What each key does on an option, by its left-to-right name. */
  private _keys: Record<string, (option: HTMLElement, e: KeyboardEvent) => void> = {
    ArrowDown: (option, e) => this._move(option, e),
    ArrowUp: (option, e) => this._move(option, e),
    Home: (option, e) => this._move(option, e),
    End: (option, e) => this._move(option, e),
    ArrowRight: (option) => this._forward(option),
    ArrowLeft: (option) => this._back(option),
    Enter: (option) => this._activate(option),
    ' ': (option) => this._activate(option),
    Escape: () => this._dismiss(),
    Tab: () => this._dismiss(),
  };

  /** The key's left-to-right name, so ArrowLeft and ArrowRight follow the columns under dir="rtl". */
  private _keyName(e: KeyboardEvent) {
    return getComputedStyle(this.el).direction === 'rtl' ? RTL_KEYS[e.key] ?? e.key : e.key;
  }

  _handleInputKeydown = Utils.ignoringComposition((e: KeyboardEvent) => {
    if (this.isOpen || !OPEN_KEYS.includes(e.key)) return;
    e.preventDefault();
    this.open();
  });

  _handleOptionKeydown = (e: KeyboardEvent) => {
    const option = (e.target as Element).closest<HTMLElement>('[role="option"]');
    const action = option && this._keys[this._keyName(e)];
    // Alt, Ctrl and Meta combinations belong to the browser; Shift+Tab still closes.
    if (!action || !Utils.plainKey(e)) return;
    e.preventDefault();
    action(option, e);
  };

  /** A submit or checkValidity() found no path: the input says so to assistive technology. */
  _handleInvalid = () => {
    this.input.setAttribute('aria-invalid', 'true');
  };

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

  // Marked rather than found on the composed path, which a document listener
  // cannot see into when the field sits in a closed shadow root.
  _handleInsidePointer = (e: PointerEvent) => {
    this._insidePress = e;
  };

  /** A press outside the field and the popover closes it, leaving focus where the press puts it. */
  _handleOutsidePointer = (e: PointerEvent) => {
    if (e !== this._insidePress) this.close();
  };

  /** Shows the chosen path's labels in the input. */
  private _show() {
    this.input.value = this._path.map((node) => node.label).join(SEPARATOR);
  }
}
