import { Utils } from '../core/utils';
import { Dropdown, DropdownOptions } from './dropdown';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface FormSelectOptions extends BaseOptions {
  /**
   * Classes to be added to the select wrapper element.
   * @default ""
   */
  classes: string;
  /**
   * Pass options object to select dropdown initialization.
   * @default {}
   */
  dropdownOptions: Partial<DropdownOptions>;
}

const _defaults: FormSelectOptions = {
  classes: '',
  dropdownOptions: {}
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
  /** Dropdown UL element. */
  dropdownOptions: HTMLUListElement;
  /** Text input that shows current selected option. */
  input: HTMLInputElement;
  /** Instance of the dropdown plugin for this select. */
  dropdown: Dropdown;
  /** The select wrapper element. */
  wrapper: HTMLDivElement;
  selectOptions: (HTMLOptionElement | HTMLOptGroupElement)[];
  private _values: ValueStruct[];
  private _createdWrapper: boolean;
  private _originalLabelFor: string | null;
  nativeTabIndex: number;

  constructor(el: HTMLSelectElement, options: FormSelectOptions) {
    super(el, options, FormSelect);
    if (this.el.classList.contains('browser-default')) return;
    this.el['Expressive_FormSelect'] = this;

    this.options = {
      ...FormSelect.defaults,
      ...options
    };

    this.isMultiple = this.el.multiple;
    this.nativeTabIndex = this.el.tabIndex ?? -1;
    this.el.tabIndex = -1;
    this._values = [];
    this._createdWrapper = false;
    this._originalLabelFor = null;
    this._setupDropdown();
    this._setupEventHandlers();
  }

  static get defaults(): FormSelectOptions {
    return _defaults;
  }

  /**
   * Initializes instance of FormSelect.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLSelectElement, options?: Partial<FormSelectOptions>): FormSelect;
  /**
   * Initializes instances of FormSelect.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: InitElements<HTMLSelectElement | InitElement>,
    options?: Partial<FormSelectOptions>
  ): FormSelect[];
  /**
   * Initializes instances of FormSelect.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLSelectElement | InitElements<HTMLSelectElement | InitElement>,
    options: Partial<FormSelectOptions> = {}
  ): FormSelect | FormSelect[] {
    return super.init(els, options, FormSelect);
  }

  static getInstance(el: HTMLElement): FormSelect {
    return el['Expressive_FormSelect'];
  }

  destroy() {
    this._removeEventHandlers();
    // The Dropdown holds itself in the static Dropdown._dropdowns registry
    // until its own destroy() runs, so dropping the elements is not enough -
    // every rebuilt select used to leave an instance behind for good.
    this.dropdown?.destroy();
    this._removeDropdown();
    this.el.tabIndex = this.nativeTabIndex;
    this.el['Expressive_FormSelect'] = undefined;
  }

  /**
   * Re-read the native `<select>` and update the generated dropdown to match.
   *
   * Assigning `select.value` from script fires no `change` event, so nothing
   * else syncs the visible input text or the `.selected` state on the virtual
   * options. Adding or removing `<option>`s also requires this — the menu is
   * rebuilt from the native list, the field and Dropdown instance stay put.
   */
  refresh() {
    if (!this.dropdownOptions) return;
    this._rebuildOptions();
    this._setValueToInput();
    this._setSelectedStates();
  }

  _setupEventHandlers() {
    this._setupOptionHandlers();
    this.el.addEventListener('change', this._handleSelectChange);
    this.input.addEventListener('click', this._handleInputClick);
    this.dropdownOptions.addEventListener('focusin', this._handleOptionFocus);
  }

  _removeEventHandlers() {
    this._removeOptionHandlers();
    this.el.removeEventListener('change', this._handleSelectChange);
    this.input?.removeEventListener('click', this._handleInputClick);
    this.dropdownOptions?.removeEventListener('focusin', this._handleOptionFocus);
  }

  private _setupOptionHandlers() {
    this.dropdownOptions.querySelectorAll('li:not(.optgroup)').forEach((el) => {
      el.addEventListener('click', this._handleOptionClick);
      el.addEventListener('keydown', this._handleOptionKeydown);
    });
  }

  private _removeOptionHandlers() {
    this.dropdownOptions?.querySelectorAll('li:not(.optgroup)').forEach((el) => {
      el.removeEventListener('click', this._handleOptionClick);
      el.removeEventListener('keydown', this._handleOptionKeydown);
    });
  }

  _handleSelectChange = () => {
    this._setValueToInput();
  };

  // Named rather than inline so that _removeEventHandlers can actually detach
  // it - an anonymous listener per option was unremovable.
  _handleOptionKeydown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') this._handleOptionClick(e);
  };

  _handleOptionClick = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    const virtualOption = (e.target as HTMLLIElement).closest('li');
    this._selectOptionElement(virtualOption);
    e.stopPropagation();
  };

  private _handleOptionFocus = (e: FocusEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const li = target.closest('li[role="option"]');
    if (li?.id) this.input.setAttribute('aria-activedescendant', li.id);
  };

  _arraysEqual<T, E>(a: T[], b: (E | T)[]) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; ++i) if (a[i] !== b[i]) return false;
    return true;
  }

  _selectOptionElement(virtualOption: HTMLElement) {
    if (
      !virtualOption.classList.contains('disabled') &&
      !virtualOption.classList.contains('optgroup')
    ) {
      const value = this._values.find((value) => value.optionEl === virtualOption);
      if (!value) return;
      const previousSelectedValues = this.getSelectedValues();
      if (this.isMultiple) {
        this._toggleEntryFromArray(value);
      } else {
        this._deselectAll();
        this._selectValue(value);
      }
      this._setValueToInput();
      const actualSelectedValues = this.getSelectedValues();
      const selectionHasChanged = !this._arraysEqual(previousSelectedValues, actualSelectedValues);
      if (selectionHasChanged)
        this.el.dispatchEvent(
          new Event('change', { bubbles: true, cancelable: true, composed: true })
        );
    }
    if (!this.isMultiple) this.dropdown?.close();
  }

  _handleInputClick = () => {
    if (this.dropdown && this.dropdown.isOpen) {
      this._setValueToInput();
      this._setSelectedStates();
    }
  };

  _setupDropdown() {
    // The DOM already knows which labels belong to this control. Building a
    // selector out of the id instead meant an id with any CSS-special
    // character either threw or matched something else entirely.
    this.labelEl = this.el.labels?.[0] ?? null;

    this._setupWrapper();
    this._hideNativeSelect();
    if (this.el.disabled) this.wrapper.classList.add('disabled');

    this.dropdownOptions = document.createElement('ul');
    this.dropdownOptions.id = `select-options-${Utils.guid()}`;
    this.dropdownOptions.setAttribute('popover', 'auto');
    this.dropdownOptions.classList.add('dropdown-content', 'select-dropdown');
    this.dropdownOptions.setAttribute('role', 'listbox');
    this.dropdownOptions.ariaMultiSelectable = this.isMultiple.toString();
    if (this.isMultiple) this.dropdownOptions.classList.add('multiple-select-dropdown');
    this._buildOptions();
    this.wrapper.append(this.dropdownOptions);

    this._buildInput();
    this._buildCaret();
    this._initDropdown();
    this._setSelectedStates();
    if (this.labelEl) this.input.after(this.labelEl);
  }

  private _setupWrapper() {
    const parent = this.el.parentElement;
    const reuse =
      parent &&
      parent.matches('.field') &&
      !parent.classList.contains('select-wrapper') &&
      !parent.querySelector(':scope > input, :scope > textarea');
    if (reuse) {
      this.wrapper = parent as HTMLDivElement;
      this.wrapper.classList.add('select-wrapper');
      this._createdWrapper = false;
    } else {
      this.wrapper = document.createElement('div');
      this.wrapper.classList.add('select-wrapper', 'field');
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
    this.el.before(hiddenDiv);
    hiddenDiv.appendChild(this.el);
    this.wrapper.append(hiddenDiv);
  }

  private _buildInput() {
    this.input = document.createElement('input');
    this.input.id = 'select-input-' + Utils.guid();
    this.input.classList.add('select-dropdown', 'dropdown-trigger');
    this.input.type = 'text';
    this.input.readOnly = true;
    this.input.setAttribute('data-target', this.dropdownOptions.id);
    this.input.ariaReadOnly = 'true';
    this.input.ariaRequired = this.el.hasAttribute('required').toString();
    if (this.el.disabled) this.input.disabled = true;
    this.input.setAttribute('tabindex', this.nativeTabIndex.toString());

    const attrs = this.el.attributes;
    for (let i = 0; i < attrs.length; ++i) {
      const attr = attrs[i];
      if (attr.name.startsWith('aria-')) this.input.setAttribute(attr.name, attr.value);
    }

    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-haspopup', 'listbox');
    this.input.ariaExpanded = 'false';
    this.input.setAttribute('aria-controls', this.dropdownOptions.id);
    this.input.placeholder = ' ';

    if (this.labelEl) {
      this._originalLabelFor = this.labelEl.htmlFor;
      this.labelEl.htmlFor = this.input.id;
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

  private _initDropdown() {
    if (this.el.disabled) return;
    const dropdownOptions = { ...this.options.dropdownOptions };
    dropdownOptions.coverTrigger = false;
    const userOnOpenEnd = dropdownOptions.onOpenEnd;
    const userOnCloseEnd = dropdownOptions.onCloseEnd;
    dropdownOptions.onOpenEnd = () => {
      const selectedOption = this.dropdownOptions.querySelector('.selected');
      if (selectedOption) {
        Utils.keyDown = true;
        this.dropdown.focusedIndex = [...selectedOption.parentNode.children].indexOf(selectedOption);
        this.dropdown._focusFocusedItem();
        Utils.keyDown = false;
        if (this.dropdown.isScrollable) {
          let scrollOffset =
            selectedOption.getBoundingClientRect().top -
            this.dropdownOptions.getBoundingClientRect().top;
          scrollOffset -= this.dropdownOptions.clientHeight / 2;
          this.dropdownOptions.scrollTop = scrollOffset;
        }
        if (selectedOption.id) this.input.setAttribute('aria-activedescendant', selectedOption.id);
      }
      this.input.ariaExpanded = 'true';
      if (userOnOpenEnd && typeof userOnOpenEnd === 'function')
        userOnOpenEnd.call(this.dropdown, this.el);
    };
    dropdownOptions.onCloseEnd = () => {
      this.input.ariaExpanded = 'false';
      this.input.removeAttribute('aria-activedescendant');
      if (userOnCloseEnd && typeof userOnCloseEnd === 'function')
        userOnCloseEnd.call(this.dropdown, this.el);
    };
    dropdownOptions.closeOnClick = false;
    this.dropdown = Dropdown.init(this.input, dropdownOptions);
  }

  private _nativeOptions(): (HTMLOptGroupElement | HTMLOptionElement)[] {
    return <(HTMLOptGroupElement | HTMLOptionElement)[]>(
      Array.from(this.el.children).filter((el) => ['OPTION', 'OPTGROUP'].includes(el.tagName))
    );
  }

  private _buildOptions() {
    this.selectOptions = this._nativeOptions();
    this._values = [];
    this.selectOptions.forEach((realOption) => {
      if (realOption.tagName === 'OPTION') {
        const virtualOption = this._createAndAppendOptionWithIcon(
          realOption,
          this.isMultiple ? 'multiple' : undefined
        );
        this._addOptionToValues(realOption as HTMLOptionElement, virtualOption);
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
        this.dropdownOptions.append(groupParent);

        const groupChildren = [];
        const selectOptions = <HTMLOptionElement[]>(
          Array.from(realOption.children).filter((el) => el.tagName === 'OPTION')
        );
        selectOptions.forEach((child) => {
          const virtualOption = this._createAndAppendOptionWithIcon(child, 'optgroup-option');
          groupChildren.push(virtualOption.id);
          this._addOptionToValues(child, virtualOption);
        });
        groupParent.setAttribute('aria-owns', groupChildren.join(' '));
      }
    });
  }

  private _rebuildOptions() {
    this._removeOptionHandlers();
    this.dropdownOptions.replaceChildren();
    this._buildOptions();
    this._setupOptionHandlers();
    this.dropdown?._makeDropdownFocusable();
  }

  _addOptionToValues(realOption: HTMLOptionElement, virtualOption: HTMLElement) {
    this._values.push({ el: realOption, optionEl: virtualOption });
  }

  _removeDropdown() {
    this.wrapper?.querySelector(':scope > .caret')?.remove();
    this.input?.remove();
    this.dropdownOptions?.remove();
    const hide = this.el.parentElement;
    if (hide?.classList.contains('hide-select')) hide.replaceWith(this.el);
    if (this.labelEl && this._originalLabelFor !== null) {
      this.labelEl.htmlFor = this._originalLabelFor;
    }
    if (!this.wrapper) return;
    if (this._createdWrapper) {
      this.wrapper.replaceWith(this.el);
    } else {
      this.wrapper.classList.remove('select-wrapper', 'disabled');
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
    if (realOption.disabled) {
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
    if (this.isMultiple && !realOption.disabled) {
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
    // filter(Boolean): a doubled or trailing space yields an empty string,
    // and classList.add('') throws.
    const classes = realOption.getAttribute('class')?.split(' ').filter(Boolean);
    if (iconUrl) {
      const img = document.createElement('img');
      if (classes?.length) img.classList.add(...classes);
      img.src = iconUrl;
      img.ariaHidden = 'true';
      li.prepend(img);
    }
    this.dropdownOptions.append(li);
    return li;
  }

  _selectValue(value: ValueStruct) {
    value.el.selected = true;
    value.optionEl.classList.add('selected');
    value.optionEl.ariaSelected = 'true';
    const checkbox = <HTMLInputElement>value.optionEl.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = true;
  }

  _deselectValue(value: ValueStruct) {
    value.el.selected = false;
    value.optionEl.classList.remove('selected');
    value.optionEl.ariaSelected = 'false';
    const checkbox = <HTMLInputElement>value.optionEl.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = false;
  }

  _deselectAll() {
    this._values.forEach((value) => this._deselectValue(value));
  }

  _isValueSelected(value: ValueStruct) {
    const realValues = this.getSelectedValues();
    return realValues.some((realValue) => realValue === value.el.value);
  }

  _toggleEntryFromArray(value: ValueStruct) {
    if (this._isValueSelected(value)) this._deselectValue(value);
    else this._selectValue(value);
  }

  _getSelectedOptions(): HTMLOptionElement[] {
    return Array.prototype.filter.call(
      this.el.selectedOptions,
      (realOption: HTMLOptionElement) => realOption
    );
  }

  _setValueToInput() {
    const selectedRealOptions = this._getSelectedOptions();
    const selectedOptionPairs = this._values.filter(
      (value) => selectedRealOptions.indexOf(value.el) >= 0
    );
    const notDisabledOptionPairs = selectedOptionPairs.filter((op) => !op.el.disabled);
    // textContent, not innerText: innerText is layout-dependent, so reading it
    // once per selected option forced a reflow each time.
    const texts = notDisabledOptionPairs.map((value) =>
      value.optionEl.querySelector('span').textContent.trim()
    );
    if (texts.length === 0) {
      const firstDisabledOption = <HTMLOptionElement>this.el.querySelector('option:disabled');
      if (firstDisabledOption && firstDisabledOption.value === '') {
        this.input.value = firstDisabledOption.textContent;
        return;
      }
    }
    this.input.value = texts.join(', ');
  }

  _setSelectedStates() {
    this._values.forEach((value) => {
      const optionIsSelected = value.el.selected;
      const cb = <HTMLInputElement>value.optionEl.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = optionIsSelected;
      if (optionIsSelected) {
        this._activateOption(this.dropdownOptions, value.optionEl);
      } else {
        value.optionEl.classList.remove('selected');
        value.optionEl.ariaSelected = 'false';
      }
    });
  }

  _activateOption(ul: HTMLElement, li: HTMLElement) {
    if (!li) return;
    if (!this.isMultiple)
      ul.querySelectorAll('li.selected').forEach((row) => row.classList.remove('selected'));
    li.classList.add('selected');
    li.ariaSelected = 'true';
  }

  getSelectedValues() {
    return this._getSelectedOptions().map((realOption) => realOption.value);
  }
}
