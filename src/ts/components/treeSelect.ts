import { Utils } from '../core/utils';
import { FormSelect, FormSelectOptions } from './select';

// Tree select. A native <select data-tree> whose options name their parent's
// value in data-parent. The native select still owns the form value, reset,
// validity and disabled state; this builds a role="tree" popup over it, where
// only a leaf can be chosen.

/** An option and the options that name it as their parent. */
export interface OptionNode {
  option: HTMLOptionElement;
  children: OptionNode[];
}

/**
 * Turns flat options into a tree. An option sits under the first option whose
 * value its `data-parent` names. It is a root when that is empty, names no
 * option, or starts a chain of parents that comes back to the option itself;
 * its own children stay under it. Siblings keep document order.
 */
export function optionTree(options: HTMLOptionElement[]): OptionNode[] {
  const byValue = new Map<string, HTMLOptionElement>();
  options.forEach((option) => { if (!byValue.has(option.value)) byValue.set(option.value, option); });
  const parentOf = (option: HTMLOptionElement) => byValue.get(option.dataset.parent || undefined);
  // ponytail: walks each option's whole chain, fine for a select's few hundred options.
  const loops = (option: HTMLOptionElement) => {
    let parent = parentOf(option);
    for (let steps = 0; parent && parent !== option && steps < options.length; steps++) parent = parentOf(parent);
    return parent === option;
  };
  const nodes = new Map(options.map((option) => [option, { option, children: [] as OptionNode[] }]));
  const roots: OptionNode[] = [];
  options.forEach((option) => {
    const parent = loops(option) ? undefined : parentOf(option);
    (parent ? nodes.get(parent).children : roots).push(nodes.get(option));
  });
  return roots;
}

type TreeKey = (tree: TreeSelect, row: HTMLElement, e: KeyboardEvent) => void;

/** Up and Down move a visible row; Home and End go to the ends. */
const STEPS = { ArrowUp: -1, ArrowDown: 1 };
const move: TreeKey = (tree, _row, e) => tree._focusRow(Utils.focusTarget(tree._visibleRows(), e, STEPS));
const activate: TreeKey = (tree, row) => tree._activate(row);

/** What each key does to the focused row, with the arrows as in a left-to-right tree. */
const TREE_KEYS: Record<string, TreeKey> = {
  ArrowDown: move,
  ArrowUp: move,
  Home: move,
  End: move,
  ArrowRight: (tree, row) => tree._openOrEnter(row),
  ArrowLeft: (tree, row) => tree._closeOrLeave(row),
  '*': (tree, row) => tree._openSiblings(row),
  Enter: activate,
  ' ': activate
};

/** Any other single character searches the rows' text. */
const typeahead: TreeKey = (tree, row, e) => tree._typeahead(row, e.key);

/** In a right-to-left tree the arrows that open and close swap. */
const MIRRORED: Record<string, string> = { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' };

export class TreeSelect extends FormSelect {
  /**
   * The role="tree" list inside the Menu surface. Menu styles the rows of its
   * <menu> directly, so the tree keeps its rows one list further down.
   */
  tree: HTMLUListElement;
  /** Each branch row and the option it stands for. */
  private _branches: Map<HTMLElement, HTMLOptionElement>;
  /** Branch options this disabled, so the form never submits one. */
  private _disabledBranches: Set<HTMLOptionElement>;
  /** While refresh() rebuilds the rows, the values of the branches left open. */
  private _keepOpen: Set<string> | undefined;
  /** What typeahead has read so far, and the timer that clears it. */
  private _typed = '';
  private _typedTimer: ReturnType<typeof setTimeout>;

  constructor(el: HTMLSelectElement, options: Partial<FormSelectOptions>) {
    super(el, options as FormSelectOptions);
    // A browser-default select stays native.
    if (!this.menuEl) return;
    const { signal } = this._events;
    if (!this._searchInput) {
      this.menuEl.setAttribute('role', 'presentation');
      this.input.setAttribute('aria-haspopup', 'tree');
      this.input.setAttribute('aria-controls', this.tree.id);
    }
    this.menuEl.removeAttribute('aria-multiselectable');
    this._nameTree();
    this._leaveImplicitBranch();
    this._handleSelectChange();
    // Capture, so the tree's keys and clicks are handled before Menu's own
    // listeners on the same element.
    if (!this._searchInput) this.menuEl.addEventListener('keydown', this._handleTreeKeydown, { signal, capture: true });
    this.menuEl.addEventListener('click', this._handleTreeClick, { signal, capture: true });
  }

  static key = 'Expressive_TreeSelect';

  protected _canSearch() {
    return !this.el.multiple && this.options.searchable;
  }

  protected _searchList() { return this.tree; }

  protected _searchRows() { return this._enabledRows(); }

  protected _searchNavigate(e: KeyboardEvent) {
    if (e.target === this._searchInput) super._searchNavigate(e);
    else this._handleTreeKeydown(e);
  }

  destroy() {
    clearTimeout(this._typedTimer);
    this._restoreBranches();
    super.destroy();
  }

  /**
   * Rebuilds the tree from the native options, keeping open each branch whose
   * value is still there and, while the popup is open, focus on the same row.
   */
  refresh() {
    const focused = this._focusedOption();
    this._keepOpen = this._openValues();
    super.refresh();
    this._keepOpen = undefined;
    if (focused && this.menu?.isOpen) this._restoreFocus(focused);
  }

  /** The option whose row has focus, if one does. */
  private _focusedOption() {
    const root = this.menuEl?.getRootNode() as Document | ShadowRoot | undefined;
    return this._optionOf(root?.activeElement?.closest<HTMLElement>('li[role="treeitem"]'));
  }

  /** The values of the open branches. */
  private _openValues() {
    return new Set(Array.from(this._branches ?? [], ([li, option]) => (li.ariaExpanded === 'true' ? option.value : null)));
  }

  /** Focuses the row for `option` again, or the first enabled row once it is gone or disabled, or the field. */
  private _restoreFocus(option: HTMLOptionElement) {
    const row = this._rowOf(option);
    this._expandTo(row);
    const rows = this._enabledRows();
    const target = rows.includes(row) ? row : rows[0];
    if (target) this._focusRow(target);
    else this.input.focus();
  }

  /** Names the tree as the field is named: aria-labelledby, then aria-label, then its labels. */
  private _nameTree() {
    const { input } = this;
    if (input.hasAttribute('aria-labelledby')) this.tree.setAttribute('aria-labelledby', input.getAttribute('aria-labelledby'));
    else if (input.ariaLabel) this.tree.ariaLabel = input.ariaLabel;
    else this._labelTree();
  }

  private _labelTree() {
    const ids = Array.from(this.input.labels ?? [], (label, index) => (label.id ||= `${this.input.id}-label-${index}`));
    if (ids.length) this.tree.setAttribute('aria-labelledby', ids.join(' '));
  }

  // The tree takes its keys and clicks on the menu itself.
  protected _setupOptionHandlers() {}

  protected _buildOptions() {
    this._restoreBranches();
    this._branches = new Map();
    this.selectOptions = this._nativeOptions();
    this._values = [];
    const options = this.selectOptions.filter((option): option is HTMLOptionElement => option.tagName === 'OPTION');
    // One list for the instance's life, so its name survives refresh().
    if (!this.tree) {
      this.tree = document.createElement('ul');
      this.tree.id = 'select-tree-' + Utils.guid();
      this.tree.setAttribute('role', 'tree');
    }
    this.tree.replaceChildren(...optionTree(options).map((node) => this._row(node)));
    this.menuEl.append(this.tree);
  }

  /**
   * A select with no selected option picks its first one, which is often a
   * branch, and disabling the branch does not move the selection. Unless the
   * markup selected it, move to the option a form reset would pick now that
   * branches are disabled: the first enabled leaf, or none. Only on start:
   * after that a selected branch is one a script chose.
   */
  private _leaveImplicitBranch() {
    if (!this._browserPickedBranch()) return;
    const leaf = Array.from(this.el.options).find((option) => !option.disabled);
    if (leaf) leaf.selected = true;
    else this.el.selectedIndex = -1;
  }

  /** Whether the selection is a branch this disabled, which the markup did not select. */
  private _browserPickedBranch() {
    const chosen = this.el.selectedOptions[0];
    return !!chosen && !chosen.defaultSelected && this._disabledBranches.has(chosen);
  }

  private _row(node: OptionNode): HTMLLIElement {
    const li = document.createElement('li');
    li.id = 'select-option-' + Utils.guid();
    li.setAttribute('role', 'treeitem');
    li.tabIndex = -1;
    const label = document.createElement('span');
    label.textContent = node.option.textContent;
    li.append(label);
    if (node.children.length) this._branch(li, node);
    else this._leaf(li, node.option);
    return li;
  }

  private _branch(li: HTMLLIElement, node: OptionNode) {
    const group = document.createElement('ul');
    group.setAttribute('role', 'group');
    group.append(...node.children.map((child) => this._row(child)));
    li.append(group);
    this._setExpanded(li, !!this._keepOpen?.has(node.option.value));
    this._branches.set(li, node.option);
    if (node.option.disabled) return;
    node.option.disabled = true;
    this._disabledBranches.add(node.option);
  }

  private _leaf(li: HTMLLIElement, option: HTMLOptionElement) {
    if (this.el.matches(':disabled') || option.disabled) {
      li.classList.add('disabled');
      li.ariaDisabled = 'true';
    }
    this._values.push({ el: option, optionEl: li });
  }

  private _restoreBranches() {
    this._disabledBranches?.forEach((option) => { option.disabled = false; });
    this._disabledBranches = new Set();
  }

  private _setExpanded(li: HTMLElement, open: boolean) {
    li.ariaExpanded = String(open);
    li.querySelector<HTMLElement>(':scope > ul').hidden = !open;
  }

  /** The rows not inside a closed branch, in document order. */
  _visibleRows(): HTMLElement[] {
    return Array.from(this.tree.querySelectorAll<HTMLElement>('li[role="treeitem"]')).filter((li) => !li.parentElement.closest('[hidden]'));
  }

  private _enabledRows() {
    return this._visibleRows().filter((row) => !row.matches('.disabled'));
  }

  _focusRow(row: HTMLElement | null | undefined) {
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /** Opens the chosen leaf's branches and focuses it, or the first row a person can choose or open. */
  protected _focusSelected() {
    const chosen = this._values.find(({ el, optionEl }) => el.selected && !optionEl.matches('.disabled'))?.optionEl;
    this._expandTo(chosen);
    this._focusRow(chosen ?? this._enabledRows()[0]);
  }

  /** Opens every branch around `row`. */
  private _expandTo(row: HTMLElement | undefined) {
    for (let branch = this._parentRow(row); branch; branch = this._parentRow(branch)) this._setExpanded(branch, true);
  }

  /** The branch row holding `row`, never an element outside the tree. */
  private _parentRow(row: HTMLElement | null | undefined) {
    const parent = row?.parentElement.closest<HTMLElement>('li[role="treeitem"]');
    return this._branches.has(parent) ? parent : null;
  }

  private _optionOf(row: HTMLElement | null | undefined) {
    return this._branches?.get(row) ?? this._values?.find(({ optionEl }) => optionEl === row)?.el;
  }

  private _rowOf(option: HTMLOptionElement | undefined) {
    const branch = Array.from(this._branches).find(([, branchOption]) => branchOption === option)?.[0];
    return branch ?? this._values.find(({ el }) => el === option)?.optionEl;
  }

  /** Chooses a leaf, or opens or closes a branch. */
  _activate(row: HTMLElement) {
    if (this._branches.has(row)) this._toggle(row, row.ariaExpanded !== 'true');
    else this._selectOptionElement(row);
  }

  /** Opens a closed branch, or moves into an open one. */
  _openOrEnter(row: HTMLElement) {
    if (!this._branches.has(row)) return;
    if (row.ariaExpanded !== 'true') this._toggle(row, true);
    else this._focusRow(row.querySelector<HTMLElement>(':scope > ul > li:not(.disabled)'));
  }

  /** Closes an open branch, or moves to the parent row. */
  _closeOrLeave(row: HTMLElement) {
    if (row.ariaExpanded === 'true') this._toggle(row, false);
    else this._focusRow(this._parentRow(row));
  }

  /** Opens every branch beside `row`. */
  _openSiblings(row: HTMLElement) {
    Array.from(row.parentElement.children).forEach((sibling) => {
      if (this._branches.has(sibling as HTMLElement)) this._toggle(sibling as HTMLElement, true);
    });
  }

  /**
   * Moves to the next row whose text starts with the characters typed in the
   * last second, as Menu's typeahead does. A repeated search starts on the
   * focused row, so typing more of its text keeps it.
   */
  _typeahead(row: HTMLElement, key: string) {
    clearTimeout(this._typedTimer);
    this._typed += key.toLowerCase();
    this._typedTimer = setTimeout(() => { this._typed = ''; }, 1000);
    const rows = this._enabledRows();
    const from = rows.indexOf(row) + (this._typed.length === 1 ? 1 : 0);
    const match = [...rows.slice(from), ...rows.slice(0, from)]
      .find((candidate) => candidate.firstChild.textContent.trim().toLowerCase().startsWith(this._typed));
    this._focusRow(match);
  }

  private _toggle(row: HTMLElement, open: boolean) {
    this._setExpanded(row, open);
    if (this.menu?.isOpen) this.menu.recalculateDimensions();
  }

  private _keyFor(e: KeyboardEvent): TreeKey | undefined {
    if (!Utils.plainKey(e)) return undefined;
    return TREE_KEYS[this._logicalKey(e.key)] ?? (e.key.length === 1 ? typeahead : undefined);
  }

  /** The key as in a left-to-right tree. */
  private _logicalKey(key: string) {
    const rtl = getComputedStyle(this.tree).direction === 'rtl';
    return (rtl && MIRRORED[key]) || key;
  }

  private _handleTreeKeydown = Utils.ignoringComposition((e: KeyboardEvent) => {
    const row = Utils.eventTarget(e)?.closest<HTMLElement>('li[role="treeitem"]');
    const action = row && this._keyFor(e);
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    action(this, row, e);
  });

  // Only a row's label acts. A disabled row passes clicks through to its
  // group, which must not toggle the branch around it.
  private _handleTreeClick = (e: MouseEvent) => {
    const label = Utils.eventTarget(e)?.closest('li[role="treeitem"] > span');
    e.preventDefault();
    e.stopPropagation();
    if (label) this._activate(label.parentElement);
  };
}
