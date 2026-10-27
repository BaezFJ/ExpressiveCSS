import { Utils, restoreAttribute } from '../core/utils';
import { Menu, MenuOptions } from './menu';
import { Component, BaseOptions } from '../core/component';

export interface FormSelectOptions extends BaseOptions {
  /**
   * Classes to be added to the select wrapper element.
   * @default ""
   */
  classes: string;
  /**
   * Pass options object to select menu initialization.
   * @default {}
   */
  menuOptions: Partial<MenuOptions>;
  /** Show a separate popup search field for a plain single select. */
  searchable: boolean;
  i18n: Partial<{ searchLabel: string; noResults: string }>;
}

const _defaults: FormSelectOptions = {
  classes: '',
  menuOptions: {},
  searchable: false,
  i18n: { searchLabel: 'Search options', noResults: 'No results' }
};

type ValueStruct = {
  el: HTMLOptionElement;
  optionEl: HTMLElement;
};

export class FormSelect extends Component<FormSelectOptions> {
  declare el: HTMLSelectElement;
  /** If this is a multiple select. */
  isMultiple: boolean;
  /**
   * Label associated with the current select element.
   * Is "null", if not detected.
   */
  labelEl: HTMLLabelElement;
  /** The generated menu element. */
  menuEl: HTMLElement;
  /** Text input that shows current selected option. */
  input: HTMLInputElement;
  /** Instance of the menu plugin for this select. */
  menu: Menu;
  /** The field wrapper around the native select. */
  wrapper: HTMLDivElement;
  selectOptions: (HTMLOptionElement | HTMLOptGroupElement)[];
  protected _values: ValueStruct[];
  private _createdWrapper: boolean;
  private _originalLabels = new Map<HTMLLabelElement, { for: string | null; id: string | null }>();
  private _labelPlaceholder: Comment;
  private _form: HTMLFormElement | null;
  private _resetTimer: ReturnType<typeof setTimeout>;
  private _validationMessage: HTMLElement | null = null;
  nativeTabIndex: number;
  private _searchable: boolean;
  private _searchInput: HTMLInputElement;
  private _listbox: HTMLElement;
  private _searchStatus: HTMLElement;

  constructor(el: HTMLSelectElement, options: FormSelectOptions) {
    super(el, options);
    // A browser-default select stays native, with no instance on it, and a
    // tree select belongs to TreeSelect, which a page's FormSelect.init() on
    // every select must not wrap a second time.
    if (this.el.classList.contains('browser-default') || (new.target === FormSelect && this.el.matches('[data-tree]'))) {
      this.el[new.target.key] = undefined;
      return;
    }

    this.isMultiple = this.el.multiple;
    this._searchable = this._canSearch();
    this.nativeTabIndex = this.el.tabIndex;
    this.el.tabIndex = -1;
    this._values = [];
    this._createdWrapper = false;
    this._setupMenu();
    this._setupEventHandlers();
  }

  static get defaults(): FormSelectOptions {
    return _defaults;
  }

  static key = 'Expressive_FormSelect';

  private _canSearch() {
    return this.constructor === FormSelect && !this.isMultiple && this.options.searchable;
  }

  destroy() {
    this._events.abort();
    // A skipped select built nothing and holds no instance key. The control
    // may belong to a TreeSelect, or to a later instance, so leave it alone.
    if (!this.menuEl) return;
    clearTimeout(this._resetTimer);
    this._clearValidationError();
    // The Menu holds itself in the static Menu._menus registry
    // until its own destroy() runs, so dropping the elements is not enough -
    // every rebuilt select used to leave an instance behind for good.
    this.menu?.destroy();
    this._removeMenu();
    this.el.tabIndex = this.nativeTabIndex;
    super.destroy();
  }

  /**
   * Re-read the native `<select>` and update the generated menu to match.
   *
   * Assigning `select.value` from script fires no `change` event, so nothing
   * else syncs the visible input text or the `.selected` state on the virtual
   * options. Adding or removing `<option>`s also requires this — the menu is
   * rebuilt from the native list, the field and Menu instance stay put.
   */
  refresh() {
    if (!this.menuEl) return;
    this._bindForm();
    const root = this.menuEl.getRootNode() as Document | ShadowRoot;
    const focused = this._values.find(value => value.optionEl.contains(root.activeElement))?.el;
    this.input.disabled = this.el.matches(':disabled');
    this.wrapper.classList.toggle('disabled', this.input.disabled);
    if (this.input.disabled) this.menu?.close();
    else if (!this.menu) this._initMenu();
    this.input.removeAttribute('aria-activedescendant');
    this._rebuildOptions();
    this._handleSelectChange();
    if (this.menu) this.menu.focusedIndex = -1;
    if (this.menu?.isOpen) {
      this.menu.recalculateDimensions();
      this._restoreOptionFocus(focused);
    }
  }

  private _restoreOptionFocus(option: HTMLOptionElement) {
    if (!option) return;
    const rows = this._values.filter(({ el, optionEl }) => el === option && optionEl.tabIndex === 0).map(({ optionEl }) => optionEl);
    (rows[0] || this._searchInput || this.input).focus();
  }

  _setupEventHandlers() {
    const { signal } = this._events;
    this._setupOptionHandlers();
    this.el.addEventListener('change', this._handleSelectChange, { signal });
    this.el.addEventListener('invalid', this._handleInvalid, { signal });
    this.el.addEventListener('focus', this._handleNativeFocus, { signal });
    this.input.addEventListener('click', this._handleInputClick, { signal });
    this.menuEl.addEventListener('focusin', this._handleOptionFocus, { signal });
    this._bindForm();
  }

  private _bindForm() {
    this._form?.removeEventListener('reset', this._handleReset);
    this._form = this.el.form;
    this._form?.addEventListener('reset', this._handleReset, { signal: this._events.signal });
  }

  // A rebuild replaces the rows, and no event reaches the old ones.
  protected _setupOptionHandlers() {
    const { signal } = this._events;
    this.menuEl.querySelectorAll('li:not(.optgroup)').forEach((el) => {
      el.addEventListener('click', this._handleOptionClick, { signal });
      el.addEventListener('keydown', this._handleOptionKeydown, { signal });
    });
  }

  _handleSelectChange = () => {
    this._setValueToInput();
    this._setSelectedStates();
    this._syncValidationError();
  };

  private _handleInvalid = (e: Event) => {
    if (e.defaultPrevented) return;
    if (!this._validationMessage) {
      this._validationMessage = document.createElement('small');
      this._validationMessage.id = this.input.id + '-error';
      this._validationMessage.className = 'supporting-text';
      this._validationMessage.style.color = 'var(--md-sys-color-error)';
      this.wrapper.append(this._validationMessage);
      this.input.setAttribute('aria-describedby',
        [this.input.getAttribute('aria-describedby'), this._validationMessage.id].filter(Boolean).join(' '));
    }
    this.input.ariaInvalid = 'true';
    this._syncValidationError();
  };

  // Native reporting chooses the control; static checks never focus. Wait until
  // reporting finishes so Firefox dismisses its native popup when focus moves.
  private _handleNativeFocus = () => queueMicrotask(() => {
    // The instance's own class: a TreeSelect sits under its own key.
    if ((this.constructor as typeof FormSelect).getInstance(this.el) === this && this.el.matches(':focus')) this.input.focus();
  });

  private _syncValidationError() {
    if (!this._validationMessage) return;
    if (this.el.willValidate && !this.el.validity.valid) {
      this._validationMessage.textContent = this.el.validationMessage;
    } else this._clearValidationError();
  }

  private _clearValidationError() {
    if (!this._validationMessage) return;
    const descriptions = this.input.getAttribute('aria-describedby')?.split(/\s+/)
      .filter(id => id !== this._validationMessage.id).join(' ');
    if (descriptions) this.input.setAttribute('aria-describedby', descriptions);
    else this.input.removeAttribute('aria-describedby');
    this.input.ariaInvalid = this.el.ariaInvalid;
    this._validationMessage.remove();
    this._validationMessage = null;
  }

  private _handleReset = (e: Event) => {
    clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(() => {
      if (!e.defaultPrevented) {
        this._resetSearch();
        this._handleSelectChange();
        this._clearValidationError();
      }
    }, 0);
  };

  _handleOptionKeydown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') this._handleOptionClick(e);
  };

  _handleOptionClick = (e: MouseEvent | KeyboardEvent) => {
    // Canceling a click on the multi-select checkbox itself reverts the box
    // after _setSelectedStates has set it, leaving it out of step with the option.
    if (!(e.target as Element).matches('input[type="checkbox"]')) e.preventDefault();
    const virtualOption = (e.target as HTMLLIElement).closest('li');
    this._selectOptionElement(virtualOption);
    e.stopPropagation();
  };

  private _handleOptionFocus = (e: FocusEvent) => {
    if (this._searchInput) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    const li = target.closest('li[role="option"]');
    if (li) this.input.setAttribute('aria-activedescendant', li.id);
  };

  _selectOptionElement(virtualOption: HTMLElement) {
    if (virtualOption.hidden) return;
    if (this.el.matches(':disabled')) return;
    if (
      !virtualOption.classList.contains('disabled') &&
      !virtualOption.classList.contains('optgroup')
    ) {
      const value = this._values.find((value) => value.optionEl === virtualOption);
      if (!value || value.el.matches(':disabled')) return;
      const previousSelectedValues = JSON.stringify(this.getSelectedValues());
      // Selecting one option of a single select deselects the others.
      value.el.selected = !this.isMultiple || !value.el.selected;
      this._handleSelectChange();
      if (JSON.stringify(this.getSelectedValues()) !== previousSelectedValues)
        this.el.dispatchEvent(
          new Event('change', { bubbles: true, cancelable: true, composed: true })
        );
      // Only a real selection closes; a disabled option is inert.
      if (!this.isMultiple) this._closeSingleSelect();
    }
  }

  _handleInputClick = () => {
    if (this.menu && this.menu.isOpen) {
      this._setValueToInput();
      this._setSelectedStates();
    }
  };

  private _closeSingleSelect() {
    this.menu?.close();
    if (this._searchInput) this.input.focus();
  }

  _setupMenu() {
    // The DOM already knows which labels belong to this control. Building a
    // selector out of the id instead meant an id with any CSS-special
    // character either threw or matched something else entirely.
    this.labelEl = this.el.labels?.[0] ?? null;
    Array.from(this.el.labels ?? []).forEach(label => {
      this._originalLabels.set(label, { for: label.getAttribute('for'), id: label.getAttribute('id') });
    });
    if (this.labelEl && !this.el.closest('label')) {
      this._labelPlaceholder = document.createComment('');
      this.labelEl.before(this._labelPlaceholder);
    }

    this._setupWrapper();
    this._hideNativeSelect();
    if (this.el.matches(':disabled')) this.wrapper.classList.add('disabled');

    this.menuEl = document.createElement(this._searchable ? 'div' : 'menu');
    this.menuEl.id = `select-options-${Utils.guid()}`;
    this.menuEl.setAttribute('role', 'listbox');
    this.menuEl.ariaMultiSelectable = this.isMultiple.toString();
    if (this.isMultiple) this.menuEl.classList.add('multiple-select-menu');
    this._buildOptions();
    this.wrapper.append(this.menuEl);

    this._buildInput();
    if (this._searchable) this._buildSearch();
    this._buildCaret();
    this._initMenu();
    this._setSelectedStates();
    if (this._labelPlaceholder) this.input.after(this.labelEl);
  }

  private _setupWrapper() {
    const parent = this.el.parentElement;
    const reuse =
      parent &&
      parent.matches('.field') &&
      !parent.querySelector(':scope > .hide-select') &&
      !parent.querySelector(':scope > input, :scope > textarea');
    if (reuse) {
      this.wrapper = parent as HTMLDivElement;
      this._createdWrapper = false;
    } else {
      this.wrapper = document.createElement('div');
      this.wrapper.classList.add('field');
      this._createdWrapper = true;
      this.el.before(this.wrapper);
    }
    if (this.options.classes.length > 0) {
      this.wrapper.classList.add(...this.options.classes.split(' ').filter(Boolean));
    }
  }

  private _hideNativeSelect() {
    const hiddenDiv = document.createElement('div');
    hiddenDiv.classList.add('hide-select');
    hiddenDiv.ariaHidden = 'true';
    this.el.before(hiddenDiv);
    hiddenDiv.appendChild(this.el);
    if (this._createdWrapper) this.wrapper.append(hiddenDiv);
  }

  private _buildInput() {
    this.input = document.createElement('input');
    this.input.id = 'select-input-' + Utils.guid();
    // FormSelect owns this Menu. A later AutoInit must not replace it before
    // FormSelect can destroy its own instance during reinitialization.
    this.input.classList.add('menu-trigger', 'no-autoinit');
    this.input.type = 'text';
    this.input.readOnly = true;
    this.input.setAttribute('data-target', this.menuEl.id);
    this.input.ariaReadOnly = 'true';
    this.input.ariaRequired = this.el.hasAttribute('required').toString();
    this.input.disabled = this.el.matches(':disabled');
    this.input.setAttribute('tabindex', this.nativeTabIndex.toString());

    const attrs = this.el.attributes;
    for (let i = 0; i < attrs.length; ++i) {
      const attr = attrs[i];
      if (attr.name.startsWith('aria-')) this.input.setAttribute(attr.name, attr.value);
    }

    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-haspopup', 'listbox');
    this.input.ariaExpanded = 'false';
    this.input.setAttribute('aria-controls', this.menuEl.id);
    this.input.placeholder = ' ';

    this._originalLabels.forEach((_, label) => { label.htmlFor = this.input.id; });
    // Moving the first label can change DOM order. Preserve the original naming
    // order without overriding an author's explicit accessible name.
    if (this._labelPlaceholder && this._originalLabels.size > 1 && !this.input.getAttribute('aria-label') && !this.input.getAttribute('aria-labelledby')) {
      this.input.setAttribute('aria-labelledby', Array.from(this._originalLabels.keys(), (label, index) => {
        if (!label.id) label.id = `${this.input.id}-label-${index}`;
        return label.id;
      }).join(' '));
    }

    this.wrapper.prepend(this.input);
    this._setValueToInput();
  }

  private _buildCaret() {
    const caret = document.createElement('span');
    caret.classList.add('caret');
    caret.setAttribute('aria-hidden', 'true');
    this.wrapper.prepend(caret);
  }

  private _buildSearch() {
    this.menuEl.classList.add('select-search-popup');
    this.menuEl.setAttribute('role', 'dialog');
    this.menuEl.removeAttribute('aria-multiselectable');
    this.input.setAttribute('aria-haspopup', 'dialog');
    this._listbox = document.createElement('menu');
    this._listbox.id = this.menuEl.id + '-list';
    this._listbox.setAttribute('role', 'listbox');
    this._listbox.append(...this.menuEl.childNodes);
    this._searchInput = document.createElement('input');
    this._searchInput.type = 'search';
    this._searchInput.placeholder = this.options.i18n.searchLabel;
    this._searchInput.setAttribute('aria-label', this.options.i18n.searchLabel);
    this._searchStatus = document.createElement('div');
    this._searchStatus.setAttribute('role', 'status');
    this.menuEl.append(this._searchInput, this._searchStatus, this._listbox);
    this._searchInput.addEventListener('input', this._filterOptions, { signal: this._events.signal });
    this.menuEl.addEventListener('keydown', this._handleSearchKeydown, { signal: this._events.signal, capture: true });
    this._nameSearch();
    this._filterOptions();
  }

  private _nameSearch() {
    const labels = Array.from(this._originalLabels.keys(), (label, index) => {
      if (!label.id) label.id = this.input.id + '-label-' + index;
      return label.id;
    }).join(' ');
    const attribute = this.input.hasAttribute('aria-labelledby') ? 'aria-labelledby' : 'aria-label';
    const name = this.input.getAttribute(attribute);
    [this.menuEl, this._listbox].forEach(el => el.setAttribute(name ? attribute : 'aria-labelledby', name || labels));
  }

  private _filterOptions = () => {
    const query = this._searchInput.value.trim().toLowerCase();
    this._values.forEach(({ el, optionEl }) => {
      optionEl.hidden = !el.textContent.trim().toLowerCase().includes(query);
      optionEl.tabIndex = optionEl.hidden || el.matches(':disabled') ? -1 : 0;
    });
    this._filterGroups();
    this._searchStatus.textContent = this._values.some(({ optionEl }) => !optionEl.hidden) ? '' : this.options.i18n.noResults;
    this.input.removeAttribute('aria-activedescendant');
  };

  private _filterGroups() {
    for (const group of this._listbox.querySelectorAll<HTMLElement>(':scope > li.optgroup')) {
      const ids = new Set(group.getAttribute('aria-owns').split(' '));
      group.hidden = !this._values.some(({ optionEl }) => ids.has(optionEl.id) && !optionEl.hidden);
    }
  }

  private _searchRows() {
    return this._values.map(({ optionEl }) => optionEl).filter(row => row.tabIndex !== -1);
  }

  private _handleSearchKeydown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (!Utils.plainKey(e) || Utils.isComposing(e)) return;
    if (this._searchDismissKey(e)) return;
    this._searchNavigate(e);
  };

  private _searchDismissKey(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      this._searchTab(e);
      return true;
    }
    if (e.key !== 'Escape') return false;
    e.preventDefault();
    this._closeSingleSelect();
    return true;
  }

  private _searchTab(e: KeyboardEvent) {
    if (e.shiftKey) {
      e.preventDefault();
      this._searchBackwardTab(e);
      return;
    }
    const first = this._searchRows()[0];
    if (e.target === this._searchInput && first) {
      e.preventDefault();
      first.focus();
      return;
    }
    // Let the browser advance from the trigger, including across shadow roots.
    this._closeSingleSelect();
  }

  private _searchBackwardTab(e: KeyboardEvent) {
    if (e.target === this._searchInput) this._closeSingleSelect();
    else this._searchInput.focus();
  }

  private _searchNavigate(e: KeyboardEvent) {
    if (e.target === this._searchInput) {
      this._searchInputKey(e);
      return;
    }
    this._searchRowKey(e);
  }

  private _searchInputKey(e: KeyboardEvent) {
    if (e.key === 'Enter') e.preventDefault();
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const rows = this._searchRows();
    this._focusSearchRow(rows[e.key === 'ArrowUp' ? rows.length - 1 : 0]);
  }

  private _focusSearchRow(row: HTMLElement) {
    if (row) row.focus();
  }

  private _searchRowKey(e: KeyboardEvent) {
    if (['Enter', ' '].includes(e.key)) {
      e.preventDefault();
      this._selectOptionElement(e.target as HTMLElement);
      return;
    }
    const target = Utils.focusTarget([this._searchInput, ...this._searchRows()], e, { ArrowDown: 1, ArrowUp: -1 });
    if (!target) return;
    e.preventDefault();
    if (e.key === 'Home') this._searchRows()[0]?.focus();
    else target.focus();
  }

  private _clearSearch() {
    if (!this._searchInput) return;
    this._searchInput.value = '';
    this._filterOptions();
  }

  private _resetSearch() {
    if (!this._searchInput) return;
    this.menu?.close();
    this._clearSearch();
  }

  private _bindSearchClose(options: Partial<MenuOptions>) {
    const onCloseStart = options.onCloseStart;
    options.onCloseStart = () => {
      this._clearSearch();
      return onCloseStart?.call(this.menu, this.el);
    };
  }

  private _initMenu() {
    if (this.el.matches(':disabled')) return;
    const menuOptions = { ...this.options.menuOptions };
    if (this._searchInput) this._bindSearchClose(menuOptions);
    menuOptions.coverTrigger = false;
    const userOnOpenEnd = menuOptions.onOpenEnd;
    const userOnCloseEnd = menuOptions.onCloseEnd;
    menuOptions.onOpenEnd = () => {
      this._focusMenu();
      this.input.ariaExpanded = 'true';
      if (typeof userOnOpenEnd === 'function')
        userOnOpenEnd.call(this.menu, this.el);
    };
    menuOptions.onCloseEnd = () => {
      this.input.ariaExpanded = 'false';
      this.input.removeAttribute('aria-activedescendant');
      if (typeof userOnCloseEnd === 'function')
        userOnCloseEnd.call(this.menu, this.el);
    };
    menuOptions.closeOnClick = false;
    this.menu = Menu.init(this.input, menuOptions);
  }

  private _focusMenu() {
    if (!this._searchInput) return this._focusSelected();
    if (this.menu.options.autoFocus) this._searchInput.focus();
  }

  /** Moves focus to the selected row of the opened menu, centred when it scrolls. */
  protected _focusSelected() {
    const selectedOption = this.menuEl.querySelector('.selected');
    if (!selectedOption) return;
    this.menu.focusedIndex = [...selectedOption.parentNode.children].indexOf(selectedOption);
    this.menu._focusFocusedItem();
    if (this.menu.isScrollable) {
      let scrollOffset =
        selectedOption.getBoundingClientRect().top -
        this.menuEl.getBoundingClientRect().top;
      scrollOffset -= this.menuEl.clientHeight / 2;
      this.menuEl.scrollTop = scrollOffset;
    }
    if (selectedOption.id) this.input.setAttribute('aria-activedescendant', selectedOption.id);
  }

  protected _nativeOptions(): (HTMLOptGroupElement | HTMLOptionElement)[] {
    return <(HTMLOptGroupElement | HTMLOptionElement)[]>(
      Array.from(this.el.children).filter((el) => ['OPTION', 'OPTGROUP'].includes(el.tagName))
    );
  }

  private get _optionList() {
    return this._listbox ?? this.menuEl;
  }

  protected _buildOptions() {
    this.selectOptions = this._nativeOptions();
    this._values = [];
    this.selectOptions.forEach((realOption) => {
      if (realOption.tagName === 'OPTION') {
        const virtualOption = this._createAndAppendOptionWithIcon(
          realOption,
          this.isMultiple ? 'multiple' : undefined
        );
        this._values.push({ el: realOption as HTMLOptionElement, optionEl: virtualOption });
      } else if (realOption.tagName === 'OPTGROUP') {
        const groupId = 'opt-group-' + Utils.guid();
        const groupParent = document.createElement('li');
        groupParent.classList.add('optgroup');
        groupParent.tabIndex = -1;
        groupParent.setAttribute('role', 'group');
        groupParent.setAttribute('aria-labelledby', groupId);
        // Built as nodes, not markup: the optgroup's label attribute is
        // author content that may come from a server, and interpolating it
        // into innerHTML let it close the span and inject an element.
        const groupLabel = document.createElement('span');
        groupLabel.id = groupId;
        groupLabel.setAttribute('role', 'presentation');
        groupLabel.textContent = realOption.getAttribute('label') ?? '';
        groupParent.replaceChildren(groupLabel);
        this._optionList.append(groupParent);

        const groupChildren = [];
        const selectOptions = <HTMLOptionElement[]>(
          Array.from(realOption.children).filter((el) => el.tagName === 'OPTION')
        );
        selectOptions.forEach((child) => {
          const virtualOption = this._createAndAppendOptionWithIcon(child, 'optgroup-option');
          groupChildren.push(virtualOption.id);
          this._values.push({ el: child, optionEl: virtualOption });
        });
        groupParent.setAttribute('aria-owns', groupChildren.join(' '));
      }
    });
  }

  private _rebuildOptions() {
    this._optionList.replaceChildren();
    this._buildOptions();
    this._setupOptionHandlers();
    this.menu?._makeMenuFocusable();
    if (this._searchInput) this._filterOptions();
  }

  _removeMenu() {
    this.wrapper?.querySelector(':scope > .caret')?.remove();
    this.input?.remove();
    this.menuEl?.remove();
    const hide = this.el.parentElement;
    if (hide?.classList.contains('hide-select')) hide.replaceWith(this.el);
    this._originalLabels.forEach((original, label) => {
      for (const name of ['for', 'id'] as const) restoreAttribute(label, name, original[name]);
    });
    this._labelPlaceholder?.replaceWith(this.labelEl);
    if (!this.wrapper) return;
    if (this._createdWrapper) {
      this.wrapper.replaceWith(this.el);
    } else {
      this.wrapper.classList.remove('disabled');
      if (this.options.classes.length > 0) {
        this.wrapper.classList.remove(...this.options.classes.split(' ').filter(Boolean));
      }
    }
  }

  _createAndAppendOptionWithIcon(
    realOption: HTMLOptionElement | HTMLOptGroupElement,
    type: string
  ) {
    const li = document.createElement('li');
    li.id = 'select-option-' + Utils.guid();
    li.setAttribute('role', 'option');
    li.tabIndex = 0;
    const disabled = this.el.matches(':disabled') || realOption.matches(':disabled');
    if (disabled) {
      li.classList.add('disabled');
      li.ariaDisabled = 'true';
      li.tabIndex = -1;
    }
    if (type === 'optgroup-option') li.classList.add(type);

    // Text / Checkbox. An <option>'s content model is text, so its markup is
    // its text - copying it as nodes rather than through innerHTML keeps it
    // that way instead of handing it back to the parser.
    const optionText = realOption.textContent;
    const span = document.createElement('span');
    if (this.isMultiple && !disabled) {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.tabIndex = -1;
      const labelText = document.createElement('span');
      labelText.textContent = optionText;
      label.append(checkbox, labelText);
      span.appendChild(label);
    } else {
      span.textContent = optionText;
    }
    li.appendChild(span);

    const iconUrl = realOption.getAttribute('data-icon');
    let imageUrl: URL | undefined;
    if (iconUrl) {
      try {
        const url = new URL(iconUrl, this.el.ownerDocument.baseURI);
        if (['http:', 'https:', 'blob:'].includes(url.protocol) ||
          /^data:image\/(?:avif|bmp|gif|jpeg|png|svg\+xml|webp|x-icon)(?:;|,)/i.test(url.href)) {
          imageUrl = url;
        }
      } catch { /* Invalid icons must not prevent selection. */ }
    }
    // filter(Boolean): a doubled or trailing space yields an empty string,
    // and classList.add('') throws.
    const classes = realOption.getAttribute('class')?.split(' ').filter(Boolean);
    if (imageUrl) {
      const img = document.createElement('img');
      if (classes?.length) img.classList.add(...classes);
      img.src = imageUrl.href;
      img.ariaHidden = 'true';
      li.prepend(img);
    }
    this._optionList.append(li);
    return li;
  }

  _setValueToInput() {
    this.input.value = Array.from(this.el.selectedOptions, (option) => option.textContent.trim()).join(', ');
  }

  /** Shows each option's selection on its row and checkbox. */
  _setSelectedStates() {
    this._values.forEach(({ el, optionEl }) => {
      optionEl.classList.toggle('selected', el.selected);
      optionEl.ariaSelected = String(el.selected);
      const checkbox = optionEl.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (checkbox) checkbox.checked = el.selected;
    });
  }

  getSelectedValues() {
    return Array.from(this.el.selectedOptions, (option) => option.value);
  }
}
