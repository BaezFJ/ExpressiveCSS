import { Utils } from '../core/utils';
import { Menu, MenuOptions } from './menu';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface AutocompleteData {
  /**
   * A primitive value that can be converted to string.
   * If "text" is not provided, it will also be used as "option text" as well
   */
  id: string | number;
  /**
   * This optional attribute is used as "display value" for the current entry.
   * When provided, it will also be taken into consideration by the standard search function.
   */
  text?: string;
  /**
   * This optional attribute is used to provide a valid image URL to the current option.
   */
  image?: string;
  /**
   * Optional attributes which describes the option.
   */
  description?: string;
}

export interface AutocompleteOptions extends BaseOptions {
  /**
   * Data object defining autocomplete options with
   * optional icon strings.
   */
  data: AutocompleteData[];
  /**
   * Flag which can be set if multiple values can be selected. The Result will be an Array.
   * @default false
   */
  isMultiSelect: boolean;
  /**
   * Callback for when autocompleted.
   */
  onAutocomplete: (entries: AutocompleteData[]) => void;
  /**
   * Minimum number of characters before autocomplete starts.
   * @default 1
   */
  minLength: number;
  /**
   * The height of the Menu which can be set via css-property.
   * @default '300px'
   */
  maxMenuHeight: string;
  /**
   * Function is called when the input text is altered and data can also be loaded asynchronously.
   * If the results are collected the items in the list can be updated via the function setMenuItems(collectedItems).
   * @param text Searched text.
   * @param autocomplete Current autocomplete instance.
   */
  onSearch: (text: string, autocomplete: Autocomplete) => void;
  /**
   * If true will render the key from each item directly as HTML.
   * User input MUST be properly sanitized first.
   * @default false
   */
  allowUnsafeHTML: boolean;
  /**
   * Pass options object to select menu initialization.
   * @default {}
   */
  menuOptions: Partial<MenuOptions>;
  /**
   * Predefined selected values
   */
  selected: number[] | string[];
}

const _defaults: AutocompleteOptions = {
  data: [], // Autocomplete data set
  onAutocomplete: null, // Callback for when autocompleted
  menuOptions: {
    // Default menu options
    autoFocus: false,
    closeOnClick: false,
    coverTrigger: false
  },
  minLength: 1, // Min characters before autocomplete starts
  isMultiSelect: false,
  onSearch: (text: string, autocomplete: Autocomplete) => {
    const normSearch = text.toLocaleLowerCase();
    autocomplete.setMenuItems(

      autocomplete.options.data.filter((option) =>
        option.id.toString().toLocaleLowerCase().includes(normSearch)
          || option.text?.toLocaleLowerCase().includes(normSearch)

      )
    );
  },
  maxMenuHeight: '300px',
  allowUnsafeHTML: false,
  selected: []
};

export class Autocomplete extends Component<AutocompleteOptions> {
  declare el: HTMLInputElement;
  /** If the autocomplete is open. */
  isOpen: boolean;
  /** Number of matching autocomplete options. */
  count: number;
  /** Index of the current selected option. */
  activeIndex: number;
  private oldVal: string;
  private $active: HTMLElement | null;
  private _openTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * The active entry, for both the eye and the screen reader. The class alone
   * was invisible to assistive technology; aria-activedescendant on the input
   * is what reports the move.
   *
   * Deliberately does not touch aria-selected. Active and selected are two
   * different things - in a multi-select the checkboxes track real choices,
   * and folding the highlight into aria-selected would announce a committed
   * choice as unselected the moment the user arrowed past it.
   */
  private _setActive(item: HTMLElement | null) {
    this.$active?.classList.remove('active');
    this.$active = item;
    if (item) {
      item.classList.add('active');
      this.el.setAttribute('aria-activedescendant', item.id);
    } else {
      this.el.removeAttribute('aria-activedescendant');
    }
  }
  private _pointerDown: boolean;
  container: HTMLElement;
  /** Instance of the menu plugin for this autocomplete. */
  menu: Menu;
  static _keydown: boolean;
  selectedValues: AutocompleteData[];
  menuItems: AutocompleteData[];

  constructor(el: HTMLInputElement, options: Partial<AutocompleteOptions>) {
    super(el, options, Autocomplete);
    this.el['Expressive_Autocomplete'] = this;

    this.options = {
      ...Autocomplete.defaults,
      ...options
    };

    this.isOpen = false;
    this.count = 0;
    this.activeIndex = -1;
    this.oldVal = '';
    this.selectedValues = this.selectedValues || this.options.selected.map((value) => <AutocompleteData>{ id: value }) || [];
    this.menuItems = this.options.data || [];
    this.$active = null;
    this._pointerDown = false;
    this._setupMenu();
    this._setupEventHandlers();
  }

  static get defaults(): AutocompleteOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Autocomplete.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLInputElement, options?: Partial<AutocompleteOptions>): Autocomplete;
  /**
   * Initializes instances of Autocomplete.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: InitElements<HTMLInputElement | InitElement>,
    options?: Partial<AutocompleteOptions>
  ): Autocomplete[];
  /**
   * Initializes instances of Autocomplete.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLInputElement | InitElements<HTMLInputElement | InitElement>,
    options: Partial<AutocompleteOptions> = {}
  ): Autocomplete | Autocomplete[] {
    return super.init(els, options, Autocomplete);
  }

  static getInstance(el: HTMLElement): Autocomplete {
    return el['Expressive_Autocomplete'];
  }

  /**
   * The three-dot loading indicator, parsed once and cloned thereafter.
   *
   * It is shown on every input change, and it used to be assigned as an
   * innerHTML string each time - re-running the HTML parser over the same
   * fixed markup on every keystroke.
   */
  private static _loadingTemplate: HTMLElement = null;

  private static _loadingIndicator(): HTMLElement {
    if (!Autocomplete._loadingTemplate) {
      const template = document.createElement('template');
      template.innerHTML = `<div style="height:100%;width:50px;"><svg version="1.1" id="L4" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 100 100" enable-background="new 0 0 0 0" xml:space="preserve">
    <circle fill="#888c" stroke="none" cx="6" cy="50" r="6"><animate attributeName="opacity" dur="1s" values="0;1;0" repeatCount="indefinite" begin="0.1"/></circle>
    <circle fill="#888c" stroke="none" cx="26" cy="50" r="6"><animate attributeName="opacity" dur="1s" values="0;1;0" repeatCount="indefinite" begin="0.2"/></circle>
    <circle fill="#888c" stroke="none" cx="46" cy="50" r="6"><animate attributeName="opacity" dur="1s" values="0;1;0" repeatCount="indefinite"  begin="0.3"/></circle>
  </svg></div>`;
      Autocomplete._loadingTemplate = template.content.firstElementChild as HTMLElement;
    }
    return Autocomplete._loadingTemplate.cloneNode(true) as HTMLElement;
  }

  destroy() {
    // open() defers menu.open() to a timer. Without cancelling it, destroying
    // an autocomplete that was opened in the same tick let the callback run
    // against a menu whose element had already been removed.
    if (this._openTimer !== undefined) {
      clearTimeout(this._openTimer);
      this._openTimer = undefined;
    }
    this._removeEventHandlers();
    this._removeMenu();
    this.el['Expressive_Autocomplete'] = undefined;
  }

  _setupEventHandlers() {
    this.el.addEventListener('blur', this._handleInputBlur);
    this.el.addEventListener('keyup', this._handleInputKeyup);
    this.el.addEventListener('focus', this._handleInputFocus);
    this.el.addEventListener('keydown', this._handleInputKeydown);
    this.el.addEventListener('click', this._handleInputClick);
    // One pair, not two. These used to be a mouse pair plus a touch pair behind
    // a `window.ontouchstart` feature detect; a pointer event covers both, and
    // the detect covered nothing the browser does not report itself.
    this.container.addEventListener('pointerdown', this._handleContainerPointerDown);
    this.container.addEventListener('pointerup', this._handleContainerPointerUp);
  }

  _removeEventHandlers() {
    this.el.removeEventListener('blur', this._handleInputBlur);
    this.el.removeEventListener('keyup', this._handleInputKeyup);
    this.el.removeEventListener('focus', this._handleInputFocus);
    this.el.removeEventListener('keydown', this._handleInputKeydown);
    this.el.removeEventListener('click', this._handleInputClick);
    this.container.removeEventListener('pointerdown', this._handleContainerPointerDown);
    this.container.removeEventListener('pointerup', this._handleContainerPointerUp);
  }

  _setupMenu() {
    this.container = document.createElement('menu');
    this.container.style.maxHeight = this.options.maxMenuHeight;
    this.container.id = `autocomplete-options-${Utils.guid()}`;
    this.container.classList.add('autocomplete-content');
    this.container.ariaExpanded = 'true';
    // An autocomplete is the textbook combobox, and this one already
    // implements the keyboard contract the roles promise - Up and Down move
    // the active entry, Enter commits it - so it is allowed to claim them.
    // It had none: the suggestions were an unlabelled list of <li>, and the
    // highlight moved with a class no assistive technology could see.
    this.container.setAttribute('role', 'listbox');
    this.el.setAttribute('role', 'combobox');
    this.el.setAttribute('aria-autocomplete', 'list');
    this.el.setAttribute('aria-controls', this.container.id);
    this.el.setAttribute('data-target', this.container.id);

    this.menuItems.forEach((menuItem) => {
      const itemElement = this._createMenuItem(menuItem);
      this.container.append(itemElement);
    });

    // ! Issue in Component Menu: _placeMenu moves dom-position
    this.el.parentElement.appendChild(this.container);

    // Initialize menu
    const menuOptions = {
      ...Autocomplete.defaults.menuOptions,
      ...this.options.menuOptions
    };
    // The wrapper is installed unconditionally: selecting the clicked entry is
    // how the autocomplete works, not an optional extra. Only the forwarding to
    // a user-supplied handler is conditional, and it hands over exactly what
    // Menu would have (the clicked `li`, called on the Menu instance).
    const userOnItemClick = menuOptions.onItemClick;
    menuOptions.onItemClick = (li) => {
      if (!li) return;
      const entryID = li.getAttribute('data-id');
      this.selectOption(entryID);
      if (typeof userOnItemClick === 'function') userOnItemClick.call(this.menu, li);
    };
    this.menu = Menu.init(this.el, menuOptions);

    // ! Workaround for Label: move label up again
    // TODO: Just use PopperJS in future!
    const label = this.el.parentElement.querySelector('label');
    if (label) this.el.after(label);

    // Sketchy removal of menu click handler
    this.el.removeEventListener('click', this.menu._handleClick);
    if(!this.options.isMultiSelect && !(this.options.selected.length === 0)) {
      const selectedValue = this.menuItems.filter((value) => value.id === this.selectedValues[0].id);
      this.el.value = selectedValue[0].text;
    }
    // Set Value if already set in HTML
    if (this.el.value) this.selectOption(this.el.value);
    // Add StatusInfo
    const div = document.createElement('div');
    div.classList.add('status-info');
    div.setAttribute('style', 'position: absolute;right:0;top:0;');
    this.el.parentElement.appendChild(div);
    this._updateSelectedInfo();
  }

  _removeMenu() {
    this.container.ariaExpanded = 'false';
    this.container.parentNode.removeChild(this.container);
  }

  _handleInputBlur = () => {
    if (!this._pointerDown) {
      this.close();
      this._resetAutocomplete();
    }
  };

  _handleInputKeyup = (e: KeyboardEvent) => {
    if (e.type === 'keyup') Autocomplete._keydown = false;
    this.count = 0;
    const actualValue = this.el.value.toLocaleLowerCase();
    // Don't capture enter or arrow key usage.
    if (
      e.key === Utils.keys.ENTER ||
      e.key === Utils.keys.ARROW_UP ||
      e.key === Utils.keys.ARROW_DOWN
    )
      return;
    // Check if the input isn't empty, and that focus arrived by keyboard -
    // which is what `:focus-visible` means, and used to be a global flag this
    // bundle maintained from four capture-phase document listeners.
    if (this.oldVal !== actualValue && this.el.matches(':focus-visible')) {
      this.open();
    }
    this._inputChangeDetection(actualValue);
  };

  _handleInputFocus = () => {
    this.count = 0;
    const actualValue = this.el.value.toLocaleLowerCase();
    this._inputChangeDetection(actualValue);
  };

  _inputChangeDetection = (value: string) => {
    // Value has changed!
    if (this.oldVal !== value) {
      this._setStatusLoading();
      this.options.onSearch(this.el.value, this);
    }
    // Reset Single-Select when Input cleared
    if (!this.options.isMultiSelect && this.el.value.length === 0) {
      this.selectedValues = [];
      this._triggerChanged();
    }
    this.oldVal = value;
  };

  _handleInputKeydown = (e: KeyboardEvent) => {
    Autocomplete._keydown = true;
    // Arrow keys and enter key usage
    const numItems = this.container.querySelectorAll('li').length;
    // select element on Enter
    if (e.key === Utils.keys.ENTER && this.activeIndex >= 0) {
      const liElement = this.container.querySelectorAll('li')[this.activeIndex];
      if (liElement) {
        this.selectOption(liElement.getAttribute('data-id'));
        e.preventDefault();
      }
      return;
    }
    // Capture up and down key
    if (e.key === Utils.keys.ARROW_UP || e.key === Utils.keys.ARROW_DOWN) {
      e.preventDefault();
      if (e.key === Utils.keys.ARROW_UP && this.activeIndex > 0) this.activeIndex--;
      if (e.key === Utils.keys.ARROW_DOWN && this.activeIndex < numItems - 1)
        this.activeIndex++;
      this._setActive(null);
      if (this.activeIndex >= 0) {
        this._setActive(this.container.querySelectorAll('li')[this.activeIndex]);
        // Focus selected
        this.container.children[this.activeIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  };

  _handleInputClick = () => {
    this.open();
  };

  _handleContainerPointerDown = () => {
    this._pointerDown = true;
  };

  _handleContainerPointerUp = () => {
    this._pointerDown = false;
  };

  _resetCurrentElementPosition() {
    this.activeIndex = -1;
    this._setActive(null);
  }

  _resetAutocomplete() {
    this.container.replaceChildren();
    this._resetCurrentElementPosition();
    this.oldVal = null;
    this.isOpen = false;
    this._pointerDown = false;
  }

  _highlightPartialText(input: string, label: string) {
    const start = label.toLocaleLowerCase().indexOf('' + input.toLocaleLowerCase() + '');
    const end = start + input.length - 1;
    //custom filters may return results where the string does not match any part
    if (start == -1 || end == -1) {
      return [label, '', ''];
    }
    return [label.slice(0, start), label.slice(start, end + 1), label.slice(end + 1)];
  }

  _createMenuItem(entry: AutocompleteData) {
    const item = document.createElement('li');
    item.id = `autocomplete-option-${Utils.guid()}`;
    item.setAttribute('role', 'option');
    // role=option promises a selection state on every entry, not just the
    // chosen one - and it has to be the *real* one. A multi-select entry that
    // is already committed is selected whether or not it is the highlighted
    // row.
    const isSelected = this.selectedValues.some((sel) => sel.id === entry.id);
    item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    item.setAttribute('data-id', <string>entry.id);
    item.setAttribute(
      'style',
      'display:grid; grid-auto-flow: column; user-select: none; align-items: center;'
    );
    item.tabIndex = 0;
    // Checkbox
    if (this.options.isMultiSelect) {
      const selection = document.createElement('div');
      selection.classList.add('item-selection');
      selection.style.textAlign = 'center';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isSelected;
      const spacer = document.createElement('span');
      spacer.style.paddingLeft = '21px';
      selection.append(checkbox, spacer);
      item.appendChild(selection);
    }
    // Image
    if (entry.image) {
      const img = document.createElement('img');
      img.classList.add('circle');
      img.src = entry.image;
      item.appendChild(img);
    }

    // Text
    const inputText = this.el.value.toLocaleLowerCase();
    const parts = this._highlightPartialText(inputText, (entry.text || entry.id).toString());
    const div = document.createElement('div');
    div.setAttribute('style', 'line-height:1.2;font-weight:500;');
    if (this.options.allowUnsafeHTML) {
      div.innerHTML = parts[0] + '<span class="highlight">' + parts[1] + '</span>' + parts[2];
    } else {
      div.appendChild(document.createTextNode(parts[0]));
      if (parts[1]) {
        const highlight = document.createElement('span');
        highlight.textContent = parts[1];
        highlight.classList.add('highlight');
        div.appendChild(highlight);
        div.appendChild(document.createTextNode(parts[2]));
      }
    }

    const itemText = document.createElement('div');
    itemText.classList.add('item-text');
    itemText.setAttribute('style', 'padding:5px;overflow:hidden;');
    item.appendChild(itemText);
    item.querySelector('.item-text').appendChild(div);
    // Description
    if (
      typeof entry.description === 'string' ||
      (typeof entry.description === 'number' && !isNaN(entry.description))
    ) {
      const description = document.createElement('small');
      description.setAttribute(
        'style',
        'line-height:1.3;color:grey;white-space:nowrap;text-overflow:ellipsis;display:block;width:90%;overflow:hidden;'
      );
      description.innerText = entry.description;
      item.querySelector('.item-text').appendChild(description);
    }
    // Set Grid
    const getGridConfig = () => {
      if (this.options.isMultiSelect) {
        if (entry.image) return '40px min-content auto'; // cb-img-txt
        return '40px auto'; // cb-txt
      }
      if (entry.image) return 'min-content auto'; // img-txt
      return 'auto'; // txt
    };
    item.style.gridTemplateColumns = getGridConfig();
    return item;
  }

  _renderMenu() {
    this._resetAutocomplete();
    // Check if Data is empty
    if (this.menuItems.length === 0) {
      this.menuItems = this.selectedValues; // Show selected Items
    }
    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this._createMenuItem(this.menuItems[i]);
      this.container.append(item);
    }
  }

  _setStatusLoading() {
    const statusElement = this.el.parentElement.querySelector('.status-info');
    if (statusElement) statusElement.replaceChildren(Autocomplete._loadingIndicator());
  }

  _updateSelectedInfo() {
    const statusElement = this.el.parentElement.querySelector('.status-info');
    if (statusElement) {
      if (this.options.isMultiSelect)
        statusElement.textContent = this.selectedValues.length.toString();
      else statusElement.replaceChildren();
    }
  }

  _refreshInputText() {
    if (this.selectedValues.length === 1) {
      const entry = this.selectedValues[0];
      this.el.value = entry.text || <string>entry.id; // Write Text to Input
    }
  }

  _triggerChanged() {
    this.el.dispatchEvent(new Event('change'));
    // Trigger Autocomplete Event
    if (typeof this.options.onAutocomplete === 'function')
      this.options.onAutocomplete.call(this, this.selectedValues);
  }

  /**
   * Show autocomplete.
   */
  open = () => {
    const inputText = this.el.value.toLocaleLowerCase();
    this._resetAutocomplete();
    if (inputText.length >= this.options.minLength) {
      this.isOpen = true;
      this._renderMenu();
    }
    // Open menu
    if (!this.menu.isOpen) {
      // Cancel first: two open() calls before the callback fires would leave
      // the earlier timer untracked, and destroy() can only cancel the one it
      // knows about.
      if (this._openTimer !== undefined) clearTimeout(this._openTimer);
      this._openTimer = setTimeout(() => {
        this._openTimer = undefined;
        this.menu.open();
      }, 0); // TODO: why?
    } else this.menu.recalculateDimensions(); // Recalculate menu when its already open
  };

  /**
   * Hide autocomplete.
   */
  close = () => {
    this.menu.close();
  };

  /**
   * Updates the visible or selectable items shown in the menu.
   * @param menuItems Items to be available.
   * @param selected Selected item ids
   * @param open Option to conditionally open menu
   */
  setMenuItems(menuItems: AutocompleteData[], selected: number[] | string[] = null, open: boolean = true) {
    this.menuItems = menuItems;
    this.options.data = menuItems;
    if (selected) {
      this.selectedValues = this.menuItems.filter(
        (item) => !(selected.indexOf(<never>item.id) === -1)
      );
    }
    if (this.options.isMultiSelect) {
      this._renderMenu();
    } else {
      this._refreshInputText();
    }
    if (open) this.open();
    this._updateSelectedInfo();
    this._triggerChanged();
  }

  /**
   * Select a specific autocomplete option via id-property.
   * @param id The id of a data-entry.
   */
  selectOption(id: number | string) {
    const entry = this.menuItems.find((item) => item.id == id);
    if (!entry) return;
    // Toggle Checkbox
    /* const li = this.container.querySelector('li[data-id="' + id + '"]');
    if (!li) return;*/
    if (this.options.isMultiSelect) {
      /* const checkbox = <HTMLInputElement | null>li.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;*/
      if (!(this.selectedValues.filter(
        (selectedEntry) => selectedEntry.id === entry.id
      ).length >= 1)) this.selectedValues.push(entry);
      else this.selectedValues = this.selectedValues.filter(
        (selectedEntry) => selectedEntry.id !== entry.id
      );
      this._renderMenu();
      this.el.focus();
    } else {
      // Single-Select
      this.selectedValues = [entry];
      this._refreshInputText();
      this._resetAutocomplete();
      this.close();
    }
    this._updateSelectedInfo();
    this._triggerChanged();
  }
}
