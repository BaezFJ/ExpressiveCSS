import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement, Openable } from '../core/component';

export interface CommandPaletteOptions extends BaseOptions {
  /**
   * Letter that toggles the palette together with Ctrl, or Command on Apple
   * platforms. `null` turns the shortcut off. `data-shortcut` on the dialog
   * sets it; an empty `data-shortcut` turns it off.
   * @default 'k'
   */
  shortcut: string | null;
  /**
   * If true, the palette closes after a command runs.
   * @default true
   */
  closeOnRun: boolean;
}

const _defaults: CommandPaletteOptions = {
  shortcut: 'k',
  closeOnRun: true
};

let _uid = 0;

/** Case- and accent-insensitive text for matching. */
const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * A command palette: a native modal <dialog class="command-palette"> holding
 * a search input and a list of commands. Typing filters the list; the arrow
 * keys move through what is left and Enter runs it, while focus stays in the
 * input. The dialog owns modality, Escape and returning focus.
 *
 * The input is a combobox and the list a listbox of options, with the active
 * option reported through aria-activedescendant. A command is the link or
 * button inside an option; running it clicks that element, so a page wires
 * commands with ordinary hrefs and click handlers.
 */
export class CommandPalette extends Component<CommandPaletteOptions> implements Openable {
  declare el: HTMLDialogElement;
  /** The search input. */
  input: HTMLInputElement;
  /** The list of commands. */
  list: HTMLElement;
  private _active: HTMLElement | null = null;
  private _generatedIds: HTMLElement[] = [];

  constructor(el: HTMLDialogElement, options: Partial<CommandPaletteOptions>) {
    super(el, options, CommandPalette);
    this.el['Expressive_CommandPalette'] = this;
    const shortcut = el.dataset.shortcut;
    this.options = {
      ...CommandPalette.defaults,
      ...(shortcut !== undefined ? { shortcut: shortcut || null } : {}),
      ...options
    };
    this.input = el.querySelector(':scope > input');
    this.list = el.querySelector(':scope > :is(ul, ol)');
    if (!this.input || !this.list) {
      console.error('CommandPalette needs an <input> and a <ul> as children of the dialog.');
      return;
    }
    this._setupAccessibility();
    this._filter();
    this.input.addEventListener('input', this._handleInput);
    this.input.addEventListener('keydown', this._handleKeydown);
    this.list.addEventListener('click', this._handleListClick);
    this.list.addEventListener('pointermove', this._handlePointerMove);
    this.el.addEventListener('close', this._handleClose);
    document.addEventListener('keydown', this._handleShortcut);
  }

  static get defaults(): CommandPaletteOptions {
    return _defaults;
  }

  /**
   * Initializes instance of CommandPalette.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<CommandPaletteOptions>): CommandPalette;
  /**
   * Initializes instances of CommandPalette.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: InitElements<InitElement>,
    options?: Partial<CommandPaletteOptions>
  ): CommandPalette[];
  /**
   * Initializes instances of CommandPalette.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<CommandPaletteOptions> = {}
  ): CommandPalette | CommandPalette[] {
    return super.init(els, options, CommandPalette);
  }

  static getInstance(el: HTMLElement): CommandPalette {
    return el['Expressive_CommandPalette'];
  }

  /** If the palette is open. */
  get isOpen() {
    return this.el.open;
  }

  /** Opens the palette as a modal dialog with the search input focused. */
  open = () => {
    if (!this.el.open) this.el.showModal();
    this.input?.focus();
  };

  /** Closes the palette. The dialog returns focus to where it was. */
  close = () => {
    if (this.el.open) this.el.close();
  };

  destroy() {
    document.removeEventListener('keydown', this._handleShortcut);
    this.el.removeEventListener('close', this._handleClose);
    if (this.input && this.list) {
      this.input.removeEventListener('input', this._handleInput);
      this.input.removeEventListener('keydown', this._handleKeydown);
      this.list.removeEventListener('click', this._handleListClick);
      this.list.removeEventListener('pointermove', this._handlePointerMove);
      for (const name of ['role', 'aria-controls', 'aria-expanded', 'aria-autocomplete', 'aria-activedescendant']) {
        this.input.removeAttribute(name);
      }
      this.list.removeAttribute('role');
      for (const item of this._items()) {
        item.removeAttribute('role');
        item.removeAttribute('aria-selected');
        item.classList.remove('active');
        item.hidden = false;
        this._action(item)?.removeAttribute('tabindex');
      }
      for (const label of this._labels()) {
        label.removeAttribute('role');
        label.hidden = false;
      }
      for (const el of this._generatedIds) el.removeAttribute('id');
      const empty = this._empty();
      if (empty) empty.hidden = false;
    }
    this.el['Expressive_CommandPalette'] = undefined;
  }

  private _items() {
    return Array.from(this.list.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && !child.classList.contains('label')
    );
  }

  private _labels() {
    return Array.from(this.list.querySelectorAll<HTMLElement>(':scope > .label'));
  }

  private _empty() {
    return this.el.querySelector<HTMLElement>(':scope > .command-palette-empty');
  }

  private _action(item: HTMLElement) {
    return item.querySelector<HTMLElement>(':scope > :is(a[href], button)');
  }

  private _ensureId(el: HTMLElement, prefix: string) {
    if (!el.id) {
      el.id = `${prefix}-${++_uid}`;
      this._generatedIds.push(el);
    }
    return el.id;
  }

  private _setupAccessibility() {
    this.list.setAttribute('role', 'listbox');
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-controls', this._ensureId(this.list, 'command-palette-list'));
    this.input.setAttribute('aria-expanded', 'true');
    this.input.setAttribute('aria-autocomplete', 'list');
    for (const item of this._items()) {
      item.setAttribute('role', 'option');
      this._ensureId(item, 'command-palette-option');
      // Focus stays in the input; the commands are reached with the arrows.
      this._action(item)?.setAttribute('tabindex', '-1');
    }
    // A listbox holds only options; a group heading is a visual divider.
    for (const label of this._labels()) label.setAttribute('role', 'none');
  }

  private _visible() {
    return this._items().filter((item) => !item.hidden);
  }

  private _setActive(item: HTMLElement | null) {
    if (this._active === item) return;
    this._active?.classList.remove('active');
    this._active?.removeAttribute('aria-selected');
    this._active = item;
    if (item) {
      item.classList.add('active');
      item.setAttribute('aria-selected', 'true');
      this.input.setAttribute('aria-activedescendant', item.id);
      item.scrollIntoView({ block: 'nearest' });
    } else {
      this.input.removeAttribute('aria-activedescendant');
    }
  }

  private _filter() {
    const terms = fold(this.input.value).split(/\s+/).filter(Boolean);
    for (const item of this._items()) {
      // data-keywords may sit on the row or on its link or button.
      const keywords = item.dataset.keywords ?? this._action(item)?.dataset.keywords ?? '';
      const text = fold(`${item.textContent} ${keywords}`);
      item.hidden = !terms.every((term) => text.includes(term));
    }
    // A heading stays only while one of the commands under it does.
    for (const label of this._labels()) {
      let next = label.nextElementSibling as HTMLElement | null;
      let any = false;
      while (next && !next.classList.contains('label')) {
        if (!next.hidden) any = true;
        next = next.nextElementSibling as HTMLElement | null;
      }
      label.hidden = !any;
    }
    const visible = this._visible();
    const empty = this._empty();
    if (empty) empty.hidden = visible.length > 0;
    this._setActive(visible[0] ?? null);
  }

  private _move(step: number) {
    const visible = this._visible();
    if (!visible.length) return;
    const index = visible.indexOf(this._active);
    this._setActive(visible[(index + step + visible.length) % visible.length]);
  }

  /** Runs a command by clicking its link or button; the click handler closes. */
  private _run(item: HTMLElement) {
    (this._action(item) ?? item).click();
  }

  _handleInput = () => this._filter();

  _handleKeydown = (e: KeyboardEvent) => {
    if (e.key === Utils.keys.ARROW_DOWN || e.key === Utils.keys.ARROW_UP) {
      e.preventDefault();
      this._move(e.key === Utils.keys.ARROW_DOWN ? 1 : -1);
    } else if (e.key === Utils.keys.ENTER && !e.isComposing && this._active) {
      e.preventDefault();
      this._run(this._active);
    }
  };

  _handleListClick = (e: MouseEvent) => {
    const item = (<Element>e.target).closest<HTMLElement>('[role="option"]');
    if (!item || !this.list.contains(item)) return;
    const action = this._action(item);
    // A click on the row's padding runs its command; that click comes back
    // through here and closes the palette.
    if (action && !action.contains(<Node>e.target)) {
      action.click();
      return;
    }
    if (this.options.closeOnRun) this.close();
  };

  _handlePointerMove = (e: PointerEvent) => {
    const item = (<Element>e.target).closest<HTMLElement>('[role="option"]');
    if (item && this.list.contains(item)) this._setActive(item);
  };

  /** Each opening starts from the full list. */
  _handleClose = () => {
    this.input.value = '';
    this._filter();
  };

  _handleShortcut = (e: KeyboardEvent) => {
    const { shortcut } = this.options;
    if (!shortcut || e.altKey || e.shiftKey || !(e.ctrlKey || e.metaKey)) return;
    if (e.key.toLowerCase() !== shortcut.toLowerCase()) return;
    e.preventDefault();
    if (this.el.open) this.close();
    else this.open();
  };
}
