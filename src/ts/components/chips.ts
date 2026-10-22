import { Utils, restoreAttribute } from '../core/utils';
import { Autocomplete, AutocompleteOptions } from './autocomplete';
import { Component, BaseOptions } from '../core/component';

export interface ChipData {
  /**
   * Unique identifier.
   */
  id: number | string;
  /**
   * Chip text. If not specified, "id" will be used.
   */
  text?: string;
  /**
   * Chip image (URL).
   */
  image?: string;
}

/** The form control a named field submits through, wrapping its input. */
const CONTROL = 'expressive-chips-control';

interface ChipsControl extends HTMLElement {
  readonly internals: ElementInternals;
  /** Puts the field's starting chips back; set by its Chips instance. */
  onFormReset: (() => void) | null;
}

/** Whether the browser has form-associated custom elements. jsdom does not. */
const formAssociated = () => typeof ElementInternals !== 'undefined' && 'setFormValue' in ElementInternals.prototype;

/**
 * Defines the control on first use, so importing the bundle needs no DOM, and
 * only once, so a second copy of the bundle on the page uses the first one's.
 * The form sees the control, so it answers what a field does; its anchor and
 * focus are the input it wraps.
 */
function defineControl() {
  if (customElements.get(CONTROL)) return;
  customElements.define(CONTROL, class extends HTMLElement {
    static formAssociated = true;
    readonly internals = this.attachInternals();
    onFormReset: (() => void) | null = null;
    /** Called only for a reset no listener canceled, in the same task. */
    formResetCallback() { this.onFormReset?.(); }
    get form() { return this.internals.form; }
    get name() { return this.getAttribute('name') ?? ''; }
    get labels() { return this._input?.labels; }
    get validity() { return this.internals.validity; }
    get validationMessage() { return this.internals.validationMessage; }
    get willValidate() { return this.internals.willValidate; }
    focus(options?: FocusOptions) { this._input?.focus(options); }
    private get _input() { return this.querySelector<HTMLInputElement>(':scope > input'); }
  });
}

/** The values in pasted text, split by commas, tabs or lines. */
const pastedValues = (e: ClipboardEvent) =>
  (e.clipboardData?.getData('text') ?? '').split(/[,\t\n]/).map((value) => value.trim()).filter(Boolean);

export interface ChipsI18nOptions {
  /** Prefix for the delete button's accessible name. */
  remove: string;
  /** What a required field says while it has no chips. */
  required: string;
}

export interface ChipsOptions extends BaseOptions {
  /**
   * Set the chip data.
   * @default []
   */
  data: ChipData[];
  /**
   * Set first placeholder when there are no tags.
   * @default ""
   */
  placeholder: string;
  /**
   * Set second placeholder when adding additional tags.
   * @default ""
   */
  secondaryPlaceholder: string;
  /**
   * Set autocomplete options.
   * @default {}
   */
  autocompleteOptions: Partial<AutocompleteOptions>;
  /**
   * Toggles abililty to add custom value not in autocomplete list.
   * @default false
   */
  autocompleteOnly: boolean;
  /**
   * Set chips limit.
   * @default Infinity
   */
  limit: number;
  /**
   * Specifies class to be used in "close" button.
   * @default 'material-symbols'
   */
  closeIconClass: string;
  /**
   *  Specifies option to render user input field
   *  @default false;
   */
  allowUserInput: boolean;
  /**
   * Strings the component generates. `remove` prefixes the delete button's
   * accessible name, giving "Remove Apple". `required` is what a required
   * field says while it has no chips.
   * @default { remove: 'Remove', required: 'Add at least one item.' }
   */
  i18n: Partial<ChipsI18nOptions>;
  /**
   * Callback for chip add.
   * @default null
   */
  onChipAdd: (element: HTMLElement, chip: HTMLElement) => void;
  /**
   * Callback for chip select.
   * @default null
   */
  onChipSelect: (element: HTMLElement, chip: HTMLElement) => void;
  /**
   * Callback for chip delete.
   * @default null
   */
  onChipDelete: (element: HTMLElement, chip: HTMLElement) => void;
}

const _defaults: ChipsOptions = {
  data: [],
  placeholder: '',
  secondaryPlaceholder: '',
  closeIconClass: 'material-symbols',
  autocompleteOptions: {},
  autocompleteOnly: false,
  limit: Infinity,
  allowUserInput: false,
  i18n: { remove: 'Remove', required: 'Add at least one item.' },
  onChipAdd: null,
  onChipSelect: null,
  onChipDelete: null
};

export class Chips extends Component<ChipsOptions> {
  /** Array of the current chips data. */
  chipsData: ChipData[];
  /** If the chips has autocomplete enabled. */
  hasAutocomplete: boolean;
  /** Autocomplete instance, if any. */
  autocomplete: Autocomplete;
  _input: HTMLInputElement;
  _label: HTMLLabelElement;
  _chips: HTMLElement[];
  private _selectedChip: HTMLElement;
  /** The form name the text input had, which the chips submit instead. */
  private _name = '';
  /** The chips the field started with, which a form reset puts back. */
  private _initialData: ChipData[] = [];
  /** The input's own aria-required, or null, put back on destroy. */
  private _ariaRequired: string | null = null;
  /** The form control wrapping a named input, which the form reads instead of it. */
  private _control: ChipsControl | null = null;
  /** Copies the input's disabled and form attributes to the control, and checks its readonly again. */
  private _mirror: MutationObserver | null = null;
  /** The named text input, whose form, disabled state and required the chips take over. */
  private _source: HTMLInputElement | null = null;
  private _required = false;

  /**
   * Selection is drawn by a class now, not by `:focus`, so it does not clear
   * itself when focus moves - every path that changes the selection has to go
   * through here or the class and the field drift apart.
   *
   * Deliberately no `aria-selected`: the chip is not an option in a listbox,
   * and putting the attribute on an element with no such role is the same
   * defect the semantics standard exists to remove.
   */
  private _setSelected(chip: HTMLElement | null) {
    this._selectedChip?.classList.remove('selected');
    this._selectedChip = chip;
    chip?.classList.add('selected');
  }

  constructor(el: HTMLElement, options: Partial<ChipsOptions>) {
    super(el, options);

    this.el.classList.add('chips');
    this.chipsData = [];
    this._chips = [];
    this._takeName();

    // Render initial chips
    if (this.options.data.length) {
      // A copy: adding or deleting a chip would otherwise edit the caller's
      // array, and a batch init would have every instance share one list.
      this.chipsData = [...this.options.data];
      this._renderChips();
    }

    // Render input element, setup event handlers
    if (this.options.allowUserInput) {
      this.el.classList.add('field');
      this._setupInput();
      this._setupEventHandlers();
      // move input to end, inside its control when it has one
      this.el.append(this._end);
    }
    // After _setupInput: the label points at the input's id, which is only
    // assigned there. Running this first threw on any .chips with a <label>.
    this._setupLabel();
    this._sync();
    // After autocomplete, which can turn the input's value into a chip.
    this._initialData = [...this.chipsData];
  }

  static get defaults() {
    return _defaults;
  }

  static key = 'Expressive_Chips';

  getData() {
    return this.chipsData;
  }

  destroy() {
    if (this.autocomplete && Autocomplete.getInstance(this._input) === this.autocomplete) {
      this.autocomplete.destroy();
    }
    if (this.options.allowUserInput) {
      this._removeEventHandlers();
    }
    this._chips.forEach((c) => c.remove());
    this._chips = [];
    this._giveNameBack();
    super.destroy();
  }

  _setupEventHandlers() {
    this.el.addEventListener('click', this._handleChipClick);
    this.el.addEventListener('keydown', Chips._handleChipsKeydown);
    this.el.addEventListener('focusin', this._handleFocusIn);
    this.el.addEventListener('focusout', this._handleFocusOut);
    this._input.addEventListener('focus', this._handleInputFocus);
    this._input.addEventListener('blur', this._handleInputBlur);
    this._input.addEventListener('keydown', this._handleInputKeydown);
    this._input.addEventListener('paste', this._handleInputPaste);
  }

  _removeEventHandlers() {
    this.el.removeEventListener('click', this._handleChipClick);
    this.el.removeEventListener('keydown', Chips._handleChipsKeydown);
    this.el.removeEventListener('focusin', this._handleFocusIn);
    this.el.removeEventListener('focusout', this._handleFocusOut);
    this._input.removeEventListener('focus', this._handleInputFocus);
    this._input.removeEventListener('blur', this._handleInputBlur);
    this._input.removeEventListener('keydown', this._handleInputKeydown);
    this._input.removeEventListener('paste', this._handleInputPaste);
  }

  /**
   * A text input with a `name` would submit whatever is half typed. The chips
   * submit under that name instead, one value per chip, as a multiple select
   * does, so the input gives its name up until destroy().
   */
  private _takeName() {
    const input = this._editorInput();
    this._name = input?.getAttribute('name') ?? '';
    // ponytail: without form-associated custom elements (jsdom) the input keeps its name and submits its text.
    if (this._name && formAssociated()) this._wrap(input);
  }

  /**
   * Wraps the input in the form control, which takes its name and required.
   * `display: contents` lays the input out as a child of the field still.
   */
  private _wrap(input: HTMLInputElement) {
    this._source = input;
    this._takeRequired(input);
    input.removeAttribute('name');
    defineControl();
    const control = document.createElement(CONTROL) as ChipsControl;
    control.style.display = 'contents';
    control.setAttribute('name', this._name);
    control.onFormReset = () => this._resetChips();
    input.replaceWith(control);
    control.append(input);
    this._control = control;
    this._mirror = new MutationObserver(() => this._mirrorState());
    this._mirror.observe(input, { attributeFilter: ['disabled', 'readonly', 'form'] });
    this._mirrorState();
  }

  /**
   * The editor's text field, or null. A static .chips of filter checkboxes,
   * which AutoInit also starts, keeps its own native form values.
   */
  private _editorInput() {
    return this.options.allowUserInput ? this.el.querySelector<HTMLInputElement>('input:is(:not([type]), [type="text"])') : null;
  }

  /** Where the text field ends: chips go before it, and it goes last. */
  private get _end() {
    return this._control ?? this._input;
  }

  /**
   * The control is disabled with the input, or with a fieldset by itself, and
   * submits to the input's form. A read-only input is not validated, so its
   * required no longer counts.
   */
  private _mirrorState() {
    ['disabled', 'form'].forEach((name) => this._copyAttribute(name));
    this._validate();
  }

  private _copyAttribute(name: string) {
    restoreAttribute(this._control, name, this._source.getAttribute(name));
  }

  /** After the chips change: give the form one value per chip and update a required field's validity. */
  private _sync() {
    if (!this._control) return;
    const data = new FormData();
    this.chipsData.forEach((chip) => data.append(this._name, String(chip.id)));
    this._control.internals.setFormValue(data);
    this._validate();
  }

  /**
   * The chips are what is required, not the text, so `required` moves to the
   * control, and aria-required keeps telling assistive technology.
   */
  private _takeRequired(input: HTMLInputElement) {
    this._required = input.required;
    if (!this._required) return;
    this._ariaRequired = input.getAttribute('aria-required');
    input.required = false;
    input.setAttribute('aria-required', 'true');
  }

  /**
   * A required field is valid once it has a chip, whatever is half typed. The
   * control holds this validity, apart from any error the page sets on the
   * input, and anchors it at the input, which a submit then focuses.
   */
  private _validate() {
    const internals = this._control.internals;
    if (this._required && !this._source.readOnly && !this.chipsData.length) {
      internals.setValidity({ valueMissing: true }, this._requiredMessage, this._anchor);
    } else internals.setValidity({});
  }

  /** The input, unless page script moved it out of the control, where it cannot anchor the message. */
  private get _anchor() {
    return this._control.contains(this._source) ? this._source : undefined;
  }

  /** A validity flag needs a message, so an empty i18n.required falls back to the default. */
  private get _requiredMessage() {
    return this.options.i18n.required || _defaults.i18n.required;
  }

  private _resetChips() {
    this._setSelected(null);
    this._chips.forEach((chip) => chip.remove());
    this.chipsData = [...this._initialData];
    this._chips = this.chipsData.map((chip) => this._renderChip(chip));
    this._control.before(...this._chips);
    this._setPlaceholder();
    this._sync();
  }

  /** Unwraps the input, with whatever else went in the control, and gives it its name and required back. */
  private _giveNameBack() {
    if (!this._control) return;
    this._mirror.disconnect();
    this._control.replaceWith(...this._control.childNodes);
    this._control = null;
    this._source.setAttribute('name', this._name);
    if (!this._required) return;
    this._source.required = true;
    restoreAttribute(this._source, 'aria-required', this._ariaRequired);
  }

  /** Whether only an autocomplete suggestion can become a chip. */
  private get _suggestionsOnly() {
    return this.hasAutocomplete && this.options.autocompleteOnly;
  }

  /** Pasted text that lists several values, split by commas, tabs or lines, adds a chip for each. */
  _handleInputPaste = (e: ClipboardEvent) => {
    const values = pastedValues(e);
    if (values.length < 2 || this._suggestionsOnly) return;
    e.preventDefault();
    // An add callback can destroy or replace the instance; the rest of the paste is its.
    values.every((id) => (this.addChip({ id }), Chips.getInstance(this.el) === this));
  };

  _handleChipClick = (e: MouseEvent) => {
    const _chip = (<HTMLElement>e.target).closest('.chip');
    // closest, not classList: the close button now wraps an icon span, so a
    // click on the glyph reports the span as the target.
    const clickedClose = !!(<HTMLElement>e.target).closest('.close');
    if (_chip) {
      // Index into the chip list, not into the container's children: the
      // container also holds the label and the input, so counting children
      // gave an index that did not line up with chipsData.
      const index = this._chips.indexOf(_chip as HTMLElement);
      if (index < 0) return;
      if (clickedClose) {
        this._deleteChip(index, 'input');
      } else {
        this.selectChip(index);
      }
      // Default handle click to focus on input
    } else {
      this._input.focus();
    }
  };

  /** The arrow that points back towards the first chip, which in RTL is Right. */
  private static _backKey(el: Element) {
    return getComputedStyle(el).direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  }

  static _handleChipsKeydown(e: KeyboardEvent) {
    const chips = (<HTMLElement>e.target).closest('.chips');

    // Don't handle keydown inputs on input and textarea
    const tag = (<HTMLElement>e.target).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || !chips) return;

    const currChips: Chips = chips['Expressive_Chips'];
    if (!currChips) return; // .chips markup without an instance behind it

    if (e.key === 'Backspace' || e.key === 'Delete') {
      const index = currChips._chips.indexOf((e.target as HTMLElement).closest('.chip'));
      if (index < 0) return;
      e.preventDefault();
      currChips._deleteChip(index, 'previous');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Move from the chip that has focus, the same one Backspace deletes.
      const current = (e.target as HTMLElement).closest<HTMLElement>('.chip') ?? currChips._selectedChip;
      const index = currChips._chips.indexOf(current);
      if (index < 0) return;
      if (e.key === Chips._backKey(chips)) {
        if (index > 0) currChips.selectChip(index - 1);
      } else {
        const selectIndex = index + 1;
        if (selectIndex >= currChips.chipsData.length) {
          // Walking off the end returns to the input, so nothing is selected
          // any more - without this the last chip kept the class.
          currChips._setSelected(null);
          currChips._input.focus();
        }
        else currChips.selectChip(selectIndex);
      }
    }
  }

  // Selection follows focus: a chip is selected while focus is inside it, and
  // none is once focus moves to the input or out of the field.
  _handleFocusIn = (e: FocusEvent) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('.chip');
    this._setSelected(chip && this._chips.includes(chip) ? chip : null);
  };

  _handleFocusOut = (e: FocusEvent) => {
    if (!this.el.contains(e.relatedTarget as Node | null)) this._setSelected(null);
  };

  _handleInputFocus = () => {
    this.el.classList.add('focus');
  };

  _handleInputBlur = () => {
    this.el.classList.remove('focus');
  };

  _handleInputKeydown = (e: KeyboardEvent) => {
    // Enter that confirms an IME composition is not a request to add a chip.
    if (Utils.isComposing(e)) return;
    if (e.key === 'Enter') {
      // Override enter if autocompleting.
      if (this.hasAutocomplete && this.autocomplete?.isOpen &&
        this.autocomplete.container.querySelector('[role="option"]')) {
        return;
      }
      e.preventDefault();
      if (!this.hasAutocomplete || !this.options.autocompleteOnly) {
        this.addChip({ id: this._input.value });
      }
      this._input.value = '';
      // The list answered the text Enter just used up.
      this.autocomplete?.close();
    } else if (
      this._input.value === '' &&
      this.chipsData.length &&
      ['Backspace', Chips._backKey(this.el)].includes(e.key)
    ) {
      e.preventDefault();
      this.selectChip(this.chipsData.length - 1);
    }
  };

  _renderChip(chip: ChipData): HTMLElement {
    if (!chip.id && chip.id !== 0) return;
    const label = chip.text || <string>chip.id;
    // <span>, not <div>: a chip is inline, and the container itself is not a
    // control. It used to be a <div tabindex="0"> with no role - focusable,
    // and announcing nothing.
    const renderedChip = document.createElement('span');
    renderedChip.classList.add('chip');
    renderedChip.innerText = label;
    // attach image if needed
    if (chip.image) {
      const img = document.createElement('img');
      img.setAttribute('src', chip.image);
      renderedChip.insertBefore(img, renderedChip.firstChild);
    }
    if (this.options.allowUserInput) {
      // The delete affordance is the control, so it is the <button> and it
      // carries the name. `type` is explicit because a bare button inside a
      // form submits it.
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.classList.add('close');
      closeButton.setAttribute('aria-label', `${this.options.i18n.remove} ${label}`);
      // The ligature is text and is read out, so the glyph is hidden and the
      // button's own label is what gets announced.
      const closeIcon = document.createElement('span');
      closeIcon.classList.add(this.options.closeIconClass);
      closeIcon.setAttribute('aria-hidden', 'true');
      closeIcon.innerText = 'close';
      closeButton.appendChild(closeIcon);
      renderedChip.appendChild(closeButton);
    }
    return renderedChip;
  }

  _renderChips() {
    this._chips = []; //.remove();
    for (let i = 0; i < this.chipsData.length; i++) {
      const chipElem = this._renderChip(this.chipsData[i]);
      this.el.appendChild(chipElem);
      this._chips.push(chipElem);
    }
  }

  _setupAutocomplete() {
    this.options.autocompleteOptions.onAutocomplete = (items) => {
      if (Chips.getInstance(this.el) !== this) return;
      if (items.length > 0) {
        this.addChip({
          id: items[0].id,
          text: items[0].text,
          image: items[0].image
        });
        this._input.value = '';
        this._input.focus();
      }
    };
    // A new object, so a second Chips given the same options does not wrap this wrapper.
    const pageOnCreate = this.options.autocompleteOptions.onCreate;
    this.autocomplete = Autocomplete.init(this._input, {
      ...this.options.autocompleteOptions,
      onCreate: (text, autocomplete) => {
        this._addTyped(text);
        if (typeof pageOnCreate === 'function') pageOnCreate.call(autocomplete, text, autocomplete);
      }
    });
  }

  /** The "Add" row is a deliberate choice, so it adds a chip even in an autocompleteOnly field. */
  private _addTyped(text: string) {
    if (Chips.getInstance(this.el) !== this) return;
    this.addChip({ id: text });
    this._input.value = '';
    this._input.focus();
  }

  _setupInput() {
    this._input = this.el.querySelector('input');
    if (!this._input) {
      this._input = document.createElement('input');
      this.el.append(this._input);
    }
    this._input.classList.add('input');
    this.hasAutocomplete = Object.keys(this.options.autocompleteOptions).length > 0;
    // Setup autocomplete if needed
    if (this.hasAutocomplete) this._setupAutocomplete();
    this._setPlaceholder();
    // Set input id
    if (!this._input.getAttribute('id')) this._input.setAttribute('id', Utils.guid());
  }

  _setupLabel() {
    this._label = this.el.querySelector('label');
    // No input to point at when allowUserInput is off.
    if (this._label && this._input) this._label.setAttribute('for', this._input.getAttribute('id'));
  }

  _setPlaceholder() {
    if (!this._input) return;
    if (!this.chipsData.length && this.options.placeholder) {
      this._input.placeholder = this.options.placeholder;
    } else if (this.chipsData.length && this.options.secondaryPlaceholder) {
      this._input.placeholder = this.options.secondaryPlaceholder;
    }
  }

  _isValidAndNotExist(chip: ChipData) {
    const isValid = !!chip.id || chip.id === 0;
    const doesNotExist = !this.chipsData.some((item) => item.id == chip.id);
    return isValid && doesNotExist;
  }

  /**
   * Add chip to input.
   * @param chip Chip data object
   */
  addChip(chip: ChipData) {
    if (!this._isValidAndNotExist(chip) || this.chipsData.length >= this.options.limit) return;
    const renderedChip = this._renderChip(chip);
    this._chips.push(renderedChip);
    this.chipsData.push(chip);
    if (this._end) this._end.before(renderedChip);
    else this.el.append(renderedChip);
    this._setPlaceholder();
    this._sync();
    this._notify('chip-add', this.options.onChipAdd, { args: [this.el, renderedChip], detail: { chip: renderedChip }, current: () => this._chips.includes(renderedChip) });
  }

  /**
   * Delete nth chip.
   * @param chipIndex  Index of chip
   */
  deleteChip(chipIndex: number) {
    const root = this.el.getRootNode() as Document | ShadowRoot;
    this._deleteChip(chipIndex, this._chips[chipIndex]?.contains(root.activeElement) ? 'input' : null);
  }

  private _deleteChip(chipIndex: number, focus: 'input' | 'previous' | null) {
    const chip = this._chips[chipIndex];
    if (!chip) return;
    if (this._selectedChip === chip) this._setSelected(null);
    chip.remove();
    this._chips.splice(chipIndex, 1);
    this.chipsData.splice(chipIndex, 1);
    this._setPlaceholder();
    this._sync();
    const focusPath: { root: Document | ShadowRoot; element: Element | null }[] = [];
    let root = this.el.getRootNode() as Document | ShadowRoot;
    while (root) {
      focusPath.push({ root, element: root.activeElement });
      root = 'host' in root ? root.host.getRootNode() as Document | ShadowRoot : null;
    }
    this._notify('chip-delete', this.options.onChipDelete, { args: [this.el, chip], detail: { chip }, current: () => !this._chips.includes(chip) });
    if (!focus || focusPath.some(({ root, element }) => root.activeElement !== element) || this.el['Expressive_Chips'] !== this) return;
    if (focus === 'previous' && this._chips.length) this.selectChip(Math.max(chipIndex - 1, 0));
    else {
      this._setSelected(null);
      this._input?.focus();
    }
  }

  /**
   * Select nth chip.
   * @param chipIndex Index of chip
   */
  selectChip(chipIndex: number) {
    const chip = this._chips[chipIndex];
    if (!chip) return;
    this._setSelected(chip);
    // The chip is not a control any more, so focus goes to the one thing in it
    // that is - the delete button.
    (chip.querySelector('.close') as HTMLElement | null)?.focus();
    this._notify('chip-select', this.options.onChipSelect, { args: [this.el, chip], detail: { chip }, current: () => this._selectedChip === chip });
  }

  static Init() {
    // Handle removal of static chips - markup written by hand, which no Chips
    // instance tracks even when one sits on the container (AutoInit gives every
    // .chips one, usually without allowUserInput and so without a click
    // handler). A chip the instance rendered belongs to _handleChipClick:
    // removing the node here as well left chipsData holding an entry whose
    // element was gone.
    Utils.onDocumentReady(() => {
      const chips = document.querySelectorAll('.chips');
      chips.forEach((el) => {
        el.addEventListener('click', (e) => {
          // closest: the close button wraps an icon span, so a click on the
          // glyph reports the span.
          if (!(<HTMLElement>e.target).closest('.close')) return;
          const chip = (<HTMLElement>e.target).closest<HTMLElement>('.chip');
          if (chip && !(el['Expressive_Chips'] as Chips | undefined)?._chips.includes(chip)) chip.remove();
        });
      });
    });
  }
}
