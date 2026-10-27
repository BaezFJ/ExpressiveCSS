import { Utils } from '../core/utils';
import { Menu, MenuOptions } from './menu';
import { Component, BaseOptions } from '../core/component';

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
  /**
   * Shows the entry dimmed and keeps every selection path from choosing or
   * removing it. The arrow keys skip it, and the result count leaves it out.
   * The `selected` option and `setMenuItems()` can still select it.
   */
  disabled?: boolean;
}

export interface AutocompleteOptions extends BaseOptions {
  i18n: Partial<{
    loading: string;
    noResults: string;
    results: (count: number) => string;
    selected: (count: number) => string;
    create: (text: string) => string;
  }>;
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
   * @param signal Aborted when a newer search starts or the autocomplete is
   * destroyed. Pass it to `fetch()` so a slow, stale response never replaces
   * newer results.
   */
  onSearch: (text: string, autocomplete: Autocomplete, signal: AbortSignal) => void;
  /**
   * Milliseconds to wait after typing pauses before calling `onSearch`, so
   * remote data is fetched once per pause rather than once per key. A search
   * on focus never waits. `0` searches on every input.
   * @default 0
   */
  searchDelay: number;
  /**
   * Ends the list in an "Add" row when the typed text matches no suggestion
   * exactly. Choosing the row calls `onCreate` and fires `expressive:create`;
   * the selection does not change.
   * @default false
   */
  allowCreate: boolean;
  /**
   * Called when the person chooses the "Add" row.
   * @param text The typed text, trimmed.
   * @param autocomplete Current autocomplete instance.
   * @default null
   */
  onCreate: (text: string, autocomplete: Autocomplete) => void;
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
  i18n: {
    loading: 'Loading results.',
    noResults: 'No results.',
    results: count => `${count} ${count === 1 ? 'result' : 'results'} available.`,
    selected: count => `${count} ${count === 1 ? 'item' : 'items'} selected.`,
    create: text => `Add "${text}"`
  },
  data: [], // Autocomplete data set
  onAutocomplete: null, // Callback for when autocompleted
  menuOptions: {
    // Default menu options
    autoFocus: false,
    closeOnClick: false,
    coverTrigger: false
  },
  minLength: 1, // Min characters before autocomplete starts
  searchDelay: 0,
  allowCreate: false,
  onCreate: null,
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
  /**
   * Whether the user left or dismissed the field since the last search, so
   * late results must not reopen it. A field nobody has focused yet counts.
   */
  private _left = true;
  /** Number of matching autocomplete options. */
  count: number;
  /** Index of the current selected option. */
  activeIndex: number;
  private oldVal: string;
  private $active: HTMLElement | null;
  private _openTimer: ReturnType<typeof setTimeout> | undefined;
  /** Aborts the running search when a newer one starts. */
  private _searchAbort: AbortController | undefined;
  /** The search waiting for typing to pause. */
  private _searchTimer: ReturnType<typeof setTimeout> | undefined;
  // Counts selections, so a callback that selects again silences the stale event.
  private _selection = 0;
  private _statusInfo: HTMLElement;
  private _announcer: HTMLElement;
  /** The last search returned no suggestions. A text change clears it until the next one returns. */
  private _noResults = false;

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
    super(el, options);

    this.isOpen = false;
    this.count = 0;
    this.activeIndex = -1;
    this.oldVal = '';
    this.selectedValues = this.options.selected.map((id) => this.options.data.find(entry => entry.id === id) ?? { id });
    this.menuItems = this.options.data || [];
    this.$active = null;
    this._pointerDown = false;
    this._setupMenu();
    this._setupEventHandlers();
  }

  static get defaults(): AutocompleteOptions {
    return _defaults;
  }

  static key = 'Expressive_Autocomplete';

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
    this._cancelPendingSearch();
    this._searchAbort?.abort();
    this._events.abort();
    this.menu.destroy();
    this.isOpen = false;
    this._removeMenu();
    for (const name of ['role', 'aria-autocomplete', 'aria-controls', 'data-target', 'aria-haspopup', 'aria-expanded', 'aria-activedescendant']) {
      this.el.removeAttribute(name);
    }
    this._statusInfo.remove();
    this._announcer.remove();
    super.destroy();
  }

  _setupEventHandlers() {
    const { signal } = this._events;
    this.el.addEventListener('blur', this._handleInputBlur, { signal });
    this.el.addEventListener('input', this._handleInput, { signal });
    this.el.addEventListener('keyup', this._handleInputKeyup, { signal });
    this.el.addEventListener('focus', this._handleInputFocus, { signal });
    this.el.addEventListener('keydown', this._handleInputKeydown, { signal });
    this.el.addEventListener('click', this._handleInputClick, { signal });
    // One pair, not two. These used to be a mouse pair plus a touch pair behind
    // a `window.ontouchstart` feature detect; a pointer event covers both, and
    // the detect covered nothing the browser does not report itself.
    this.container.addEventListener('pointerdown', this._handleContainerPointerDown, { signal });
    this.container.addEventListener('pointerup', this._handleContainerPointerUp, { signal });
    this.container.addEventListener('pointercancel', this._handleContainerPointerUp, { signal });
    this.container.addEventListener('mousedown', this._handleNoResultsPress, { capture: true, signal });
    this.container.addEventListener('click', this._handleNoResultsPress, { capture: true, signal });
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
    const userOnOpenStart = menuOptions.onOpenStart;
    const userOnCloseStart = menuOptions.onCloseStart;
    menuOptions.onOpenStart = (el) => {
      this.isOpen = true;
      if (typeof userOnOpenStart === 'function') userOnOpenStart.call(this.menu, el);
    };
    menuOptions.onCloseStart = (el) => {
      this.isOpen = false;
      if (typeof userOnCloseStart === 'function') userOnCloseStart.call(this.menu, el);
    };
    // The wrapper is installed unconditionally: selecting the clicked entry is
    // how the autocomplete works, not an optional extra. Only the forwarding to
    // a user-supplied handler is conditional, and it hands over exactly what
    // Menu would have (the clicked `li`, called on the Menu instance).
    const userOnItemClick = menuOptions.onItemClick;
    menuOptions.onItemClick = (li) => {
      if (!li) return;
      this._choose(li);
      if (typeof userOnItemClick === 'function') userOnItemClick.call(this.menu, li);
    };
    this.menu = Menu.init(this.el, menuOptions);
    this.el.setAttribute('aria-haspopup', 'listbox');

    // ! Workaround for Label: move label up again
    // TODO: Just use PopperJS in future!
    const label = this.el.parentElement.querySelector('label');
    if (label) this.el.after(label);

    // Menu's trigger handlers open the list without rendering it, and its
    // keydown cancels Space and Enter, which a text field needs.
    this.el.removeEventListener('click', this.menu._handleClick);
    this.el.removeEventListener('keydown', this.menu._handleTriggerKeydown);
    if (!this.options.isMultiSelect) this._refreshInputText();
    // Set Value if already set in HTML
    if (this.el.value) this.selectOption(this.el.value);
    // Add StatusInfo
    const div = document.createElement('div');
    div.classList.add('status-info');
    div.setAttribute('aria-hidden', 'true');
    div.setAttribute('style', 'position: absolute;right:0;top:0;');
    this.el.parentElement.appendChild(div);
    this._statusInfo = div;
    this._announcer = document.createElement('div');
    this._announcer.classList.add('autocomplete-status');
    this._announcer.setAttribute('role', 'status');
    this._announcer.setAttribute('aria-live', 'polite');
    this._announcer.setAttribute('aria-atomic', 'true');
    this.el.parentElement.appendChild(this._announcer);
    this._updateSelectedInfo();
  }

  _removeMenu() {
    this.container.ariaExpanded = 'false';
    this.container.parentNode.removeChild(this.container);
  }

  _handleInputBlur = () => {
    if (!this._pointerDown) {
      this._left = true;
      this._cancelPendingSearch();
      this.close();
      this._resetAutocomplete();
    }
  };

  _handleInputKeyup = () => {
    Autocomplete._keydown = false;
  };

  _handleInput = () => {
    this._left = false;
    this.count = 0;
    const actualValue = this.el.value.toLocaleLowerCase();
    // Check if the input isn't empty, and that focus arrived by keyboard -
    // which is what `:focus-visible` means, and used to be a global flag this
    // bundle maintained from four capture-phase document listeners. An open
    // menu is not re-rendered with the old results here: setMenuItems renders
    // the new ones. Below minLength, open() still runs to clear the list.
    if (this.oldVal !== actualValue) {
      // The old results can stay on screen until setMenuItems replaces them,
      // but none may stay active: Enter would select a result for the
      // previous query.
      this._resetCurrentElementPosition();
      // open() renders before the new search starts, so the old answer goes first.
      this._noResults = false;
      if (this.el.matches(':focus-visible')
        && (!this.menu.isOpen || actualValue.length < this.options.minLength)) this.open();
    }
    this._inputChangeDetection(actualValue, true);
  };

  _handleInputFocus = () => {
    this._left = false;
    this.count = 0;
    const actualValue = this.el.value.toLocaleLowerCase();
    this._inputChangeDetection(actualValue);
  };

  _inputChangeDetection = (value: string, typed?: boolean) => {
    // Editing or clearing a single selection's text deselects it.
    const deselected = !this.options.isMultiSelect && this.selectedValues.length > 0
      && this.el.value !== (this.selectedValues[0].text || String(this.selectedValues[0].id));
    if (deselected) this.selectedValues = [];
    // Value has changed!
    if (this.oldVal !== value) {
      this._noResults = false;
      this._setStatusLoading();
      this._queueSearch(typed);
    }
    if (deselected) this._triggerChanged();
    this.oldVal = value;
  };

  /** Searches now, or once typing pauses for `searchDelay`. Focus never waits. */
  private _queueSearch(typed?: boolean) {
    this._cancelPendingSearch();
    const delay = this.options.searchDelay;
    if (!typed || !(delay > 0 && delay < Infinity)) return this._search(this.el.value);
    // The running search is for text the field no longer holds.
    this._searchAbort?.abort();
    this._searchTimer = setTimeout(() => {
      this._searchTimer = undefined;
      this._search(this.el.value);
    }, delay);
  }

  private _cancelPendingSearch() {
    clearTimeout(this._searchTimer);
    this._searchTimer = undefined;
  }

  /** Starts a search and aborts the one before, whose response is now stale. */
  private _search(text: string) {
    this._searchAbort?.abort();
    this._searchAbort = new AbortController();
    this.options.onSearch(text, this, this._searchAbort.signal);
  }

  _handleInputKeydown = Utils.ignoringComposition((e: KeyboardEvent) => {
    Autocomplete._keydown = true;
    if (e.key === 'Escape' || e.key === 'Tab') {
      this._dismiss(e);
      return;
    }
    // Arrow keys and enter key usage
    const options = this._options();
    const numItems = options.length;
    // select element on Enter
    if (e.key === 'Enter' && this.activeIndex >= 0) {
      const liElement = options[this.activeIndex];
      if (liElement) {
        this._choose(liElement);
        e.preventDefault();
      }
      return;
    }
    // Capture up and down key
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      // A list that is already opening keeps its rendered results.
      if (!this.menu.isOpen && this._openTimer === undefined) {
        this.open();
        return;
      }
      if (e.key === 'ArrowUp' && this.activeIndex > 0) this.activeIndex--;
      if (e.key === 'ArrowDown' && this.activeIndex < numItems - 1)
        this.activeIndex++;
      this._setActive(null);
      if (this.activeIndex >= 0) {
        this._setActive(options[this.activeIndex]);
        // Focus selected
        options[this.activeIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  });

  private _dismiss(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      // Take the key only when it closes something, or a surrounding <dialog>
      // would cancel too. A dismissed list stays shut for late results.
      if (this.menu.isOpen || this._openTimer !== undefined) e.preventDefault();
      this._left = true;
    }
    this.close();
    this._resetCurrentElementPosition();
  }

  _handleInputClick = () => {
    this.open();
  };

  // The flag says "a press is in flight inside the option list", so that a blur
  // caused by that press does not close the list out from under it. Without the
  // cancel half, a cancelled gesture left the flag set and the next blur could
  // not close the list at all.
  _handleContainerPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this._pointerDown = true;
  };

  _handleContainerPointerUp = () => {
    this._pointerDown = false;
  };

  // The no-results row is not an option. A press on it would move focus to the
  // list, which nothing hands back, and Menu would report the row as chosen.
  _handleNoResultsPress = (e: MouseEvent) => {
    if (!(e.target instanceof Element) || !e.target.closest('.autocomplete-no-results')) return;
    e.preventDefault();
    e.stopPropagation();
  };

  /** The rows that can be chosen. The no-results row and disabled rows are not. */
  private _options() {
    return this.container.querySelectorAll<HTMLElement>('li[role="option"]:not([aria-disabled="true"])');
  }

  _resetCurrentElementPosition() {
    this.activeIndex = -1;
    this._setActive(null);
  }

  _resetAutocomplete() {
    this.container.replaceChildren();
    this._resetCurrentElementPosition();
    this.oldVal = null;
    this._pointerDown = false;
  }

  _highlightPartialText(input: string, label: string) {
    const start = label.toLocaleLowerCase().indexOf(input.toLocaleLowerCase());
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
    Autocomplete._markDisabled(item, entry);
    item.setAttribute(
      'style',
      'display:grid; grid-auto-flow: column; user-select: none; align-items: center;'
    );
    item.tabIndex = -1;
    // Checkbox
    if (this.options.isMultiSelect) {
      const selection = document.createElement('div');
      selection.classList.add('item-selection');
      selection.style.textAlign = 'center';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.tabIndex = -1;
      checkbox.checked = isSelected;
      checkbox.disabled = entry.disabled === true;
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

    const div = this._createLabel(entry);

    const itemText = document.createElement('div');
    itemText.classList.add('item-text');
    itemText.setAttribute('style', 'padding:5px;overflow:hidden;');
    item.appendChild(itemText);
    itemText.appendChild(div);
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
      itemText.appendChild(description);
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

  /** Menu already ignores a click on an aria-disabled row. */
  private static _markDisabled(item: HTMLElement, entry: AutocompleteData) {
    if (entry.disabled === true) item.setAttribute('aria-disabled', 'true');
  }

  _createLabel(entry: AutocompleteData) {
    const inputText = this.el.value.toLocaleLowerCase();
    const label = (entry.text || entry.id).toString();
    const div = document.createElement('div');
    div.setAttribute('style', 'line-height:1.2;font-weight:500;');
    // Only a script-supplied text is HTML. An id can come from markup's
    // `selected`, which AutoInit treats as untrusted, so it stays text.
    if (this.options.allowUnsafeHTML && entry.text) this._highlightHTML(div, label, inputText);
    else this._highlightText(div, this._highlightPartialText(inputText, label));
    return div;
  }

  _highlightHTML(div: HTMLElement, label: string, inputText: string) {
    // Highlight inside a parsed text node. Splicing the span into the HTML
    // string put its quotes inside any attribute the match landed in, which
    // closed that attribute and let the rest of it become markup.
    div.innerHTML = label;
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text; node; node = walker.nextNode() as Text) {
      const [before, match] = this._highlightPartialText(inputText, node.data);
      if (!match) continue;
      const matched = node.splitText(before.length);
      matched.splitText(match.length);
      const highlight = document.createElement('span');
      highlight.classList.add('highlight');
      matched.replaceWith(highlight);
      highlight.append(matched);
      break;
    }
  }

  _highlightText(div: HTMLElement, parts: string[]) {
    div.appendChild(document.createTextNode(parts[0]));
    if (parts[1]) {
      const highlight = document.createElement('span');
      highlight.textContent = parts[1];
      highlight.classList.add('highlight');
      div.appendChild(highlight);
      div.appendChild(document.createTextNode(parts[2]));
    }
  }

  _renderMenu() {
    this._resetAutocomplete();
    if (this._noResults) this.container.append(this._createNoResultsRow());
    // Check if Data is empty
    if (this.menuItems.length === 0) {
      this.menuItems = this.selectedValues; // Show selected Items
    }
    this.container.append(...this.menuItems.map((entry) => this._createMenuItem(entry)));
    const createText = this._createText();
    if (createText) this.container.append(this._createRow(createText));
  }

  /** The typed text to offer as a new value, or '' when the option is off, the text is short or a suggestion matches it. */
  private _createText() {
    const text = this.el.value.trim();
    if (!this.options.allowCreate || text.length < this.options.minLength) return '';
    const typed = text.toLocaleLowerCase();
    return this.menuItems.some((entry) => (entry.text || String(entry.id)).toLocaleLowerCase() === typed) ? '' : text;
  }

  /** The "Add" row. Its label is what the person typed, so it is set as text, never as HTML. */
  private _createRow(text: string) {
    const item = document.createElement('li');
    item.id = `autocomplete-option-${Utils.guid()}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');
    // Not data-id, which an entry's id could equal. The text is kept on the
    // row because the field can change before newer results replace it.
    item.setAttribute('data-create', text);
    item.classList.add('autocomplete-create');
    item.setAttribute('style', 'display:grid; user-select: none; align-items: center;');
    item.tabIndex = -1;
    const label = document.createElement('div');
    label.classList.add('item-text');
    label.setAttribute('style', 'padding:5px;overflow:hidden;line-height:1.2;font-weight:500;');
    label.textContent = this.options.i18n.create(text);
    item.append(label);
    return item;
  }

  /**
   * Shows sighted users the `i18n.noResults` that the live region announces.
   * Screen readers already hear that, and a listbox may only own options, so
   * the row is hidden from them.
   */
  private _createNoResultsRow() {
    const row = document.createElement('li');
    row.classList.add('autocomplete-no-results');
    row.setAttribute('role', 'none');
    row.setAttribute('aria-hidden', 'true');
    row.textContent = this.options.i18n.noResults;
    return row;
  }

  _setStatusLoading() {
    const statusElement = this._statusInfo;
    if (statusElement) statusElement.replaceChildren(Autocomplete._loadingIndicator());
    this._announce(this.options.i18n.loading);
  }

  private _announce(message: string) {
    if (!this._announcer) return;
    const text = this.el.matches(':focus') && this.el.value.length >= this.options.minLength ? message : '';
    if (this._announcer.textContent !== text) this._announcer.textContent = text;
  }

  private _resultsMessage(count: number) {
    return count ? this.options.i18n.results(count) : this.options.i18n.noResults;
  }

  _updateSelectedInfo() {
    const statusElement = this._statusInfo;
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
    // Counted before the native change, whose listeners may select again.
    const values = this.selectedValues;
    const selection = ++this._selection;
    this.el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true }));
    if (selection !== this._selection) return;
    this._notify('autocomplete', this.options.onAutocomplete, { args: [values], detail: { values }, current: () => selection === this._selection });
  }

  /**
   * Show autocomplete.
   */
  open = () => {
    const inputText = this.el.value.toLocaleLowerCase();
    this._resetAutocomplete();
    if (inputText.length >= this.options.minLength) {
      this._renderMenu();
      this._announce(this._resultsMessage(this.menuItems.length));
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
    if (this._announcer) this._announcer.textContent = '';
    if (this._openTimer !== undefined) {
      clearTimeout(this._openTimer);
      this._openTimer = undefined;
    }
    this.isOpen = false;
    this.menu.close();
  };

  /**
   * Updates the visible or selectable items shown in the menu.
   * @param menuItems Items to be available.
   * @param selected Selected item ids
   * @param open Option to conditionally open menu
   */
  setMenuItems(menuItems: AutocompleteData[], selected: number[] | string[] = null, open: boolean = true) {
    if (this.el['Expressive_Autocomplete'] !== this) return;
    // Results that arrive after the user left the field update the list
    // without opening it under an input nobody is using.
    open &&= !this._left;
    const resultCount = menuItems.length;
    this._noResults = resultCount === 0;
    this.menuItems = menuItems;
    if (selected) {
      this.selectedValues = this.menuItems.filter(
        (item) => !(selected.indexOf(<never>item.id) === -1)
      );
    }
    // open() clears and renders the list itself.
    if (this.options.isMultiSelect) {
      if (!open) this._renderMenu();
    } else {
      this._refreshInputText();
    }
    if (open) this.open();
    this._updateSelectedInfo();
    this._announce(open ? this._resultsMessage(resultCount) : '');
    if (selected) this._triggerChanged();
  }

  private _toggleOption(entry: AutocompleteData) {
    const selected = !this.selectedValues.some((selectedEntry) => selectedEntry.id === entry.id);
    if (selected) this.selectedValues.push(entry);
    else this.selectedValues = this.selectedValues.filter((selectedEntry) => selectedEntry.id !== entry.id);
    // Update the row in place. Re-rendering the list dropped the active row,
    // and its reset of oldVal made the refocus below run a new search.
    const row = Array.from(this.container.children).find((li) => li.getAttribute('data-id') === String(entry.id));
    if (row) {
      row.setAttribute('aria-selected', String(selected));
      row.querySelector('input').checked = selected;
    }
    this.el.focus();
  }

  private _selectSingle(entry: AutocompleteData) {
    // A click focuses the row, and removing it would drop focus to <body>.
    // A selection made from code leaves focus where it is.
    const refocus = Utils.focusIsIn(this.container);
    // A search still waiting would run on the chosen label and reopen the list.
    this._cancelPendingSearch();
    this.selectedValues = [entry];
    this._refreshInputText();
    this._resetAutocomplete();
    this.close();
    if (refocus) {
      // The field already shows the choice, so returning to it is not a new search.
      this.oldVal = this.el.value.toLocaleLowerCase();
      this.el.focus();
    }
  }

  /** Commits a row chosen by Enter or a click. */
  private _choose(li: Element) {
    if (li.hasAttribute('data-create')) this._create(li.getAttribute('data-create'));
    else this.selectOption(li.getAttribute('data-id'));
  }

  private _create(text: string) {
    const refocus = Utils.focusIsIn(this.container);
    // A search still waiting would reopen the list on the same text.
    this._cancelPendingSearch();
    // The field keeps the text, so returning to it is not a new search.
    this.oldVal = this.el.value.toLocaleLowerCase();
    this.close();
    if (refocus) this.el.focus();
    this._notify('create', this.options.onCreate, { args: [text, this], detail: { text } });
  }

  /**
   * Select a specific autocomplete option via id-property.
   * @param id The id of a data-entry.
   */
  selectOption(id: number | string) {
    // A disabled entry is never found, so it is neither chosen nor removed.
    const entry = this.menuItems.find((item) => item.id == id && item.disabled !== true);
    if (!entry) return;
    if (this.options.isMultiSelect) this._toggleOption(entry);
    else this._selectSingle(entry);
    this._updateSelectedInfo();
    if (this.options.isMultiSelect) this._announce(this.options.i18n.selected(this.selectedValues.length));
    this._triggerChanged();
  }
}
