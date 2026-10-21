import { Utils } from '../core/utils';
import { Autocomplete, AutocompleteOptions } from './autocomplete';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

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

/** The fields that submit chips, served by one formdata listener per tree. */
const submitting = new Set<Chips>();
const listening = new WeakSet<EventTarget>();
const heard = new WeakSet<Event>();

/**
 * Hears forms gather their data and reset. formdata does not bubble or leave
 * a shadow root, and a detached form is in no document, so fields listen in
 * the capture phase on the window, on their own root and on their form. One
 * event can pass several of those, so each is handled once, and each field
 * checks the form as the event comes, wherever the field has moved since.
 */
function listenToForms(target: EventTarget | null) {
  if (!target || listening.has(target)) return;
  listening.add(target);
  const handle = (e: Event) => {
    if (heard.has(e)) return;
    heard.add(e);
    submitting.forEach((chips) => chips._onFormEvent(e));
  };
  target.addEventListener('formdata', handle, true);
  target.addEventListener('reset', handle, true);
  // Typing in a field can make the page clear its own error, which may be
  // all that held an empty required field invalid. Heard as it bubbles, so
  // after the page's listeners on the input.
  target.addEventListener('input', (e) => submitting.forEach((chips) => chips._onEditorInput(e)));
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
  /** A reset whose dispatch may not be over, so a listener could still cancel it. */
  private _pendingReset: Event | null = null;
  /** Whether the input's custom error is the chips' required message. */
  private _ownsError = false;
  /** The input's own aria-required, or null, put back on destroy. */
  private _ariaRequired: string | null = null;
  /** Notices the field being laid out, as it is once mounted, to listen where its form now is. */
  private _mountObserver: ResizeObserver | null = null;
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
    super(el, options, Chips);
    this.el['Expressive_Chips'] = this;

    this.options = {
      ...Chips.defaults,
      ...options
    };
    // Spreading options over the defaults replaces the i18n object wholesale,
    // so passing one string would drop the rest. Same fix as Datepicker.
    if (options?.i18n) this.options.i18n = { ...Chips.defaults.i18n, ...options.i18n };

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
      // move input to end
      this.el.append(this._input);
    }
    // After _setupInput: the label points at the input's id, which is only
    // assigned there. Running this first threw on any .chips with a <label>.
    this._setupLabel();
    this._validate();
    // After autocomplete, which can turn the input's value into a chip.
    this._initialData = [...this.chipsData];
  }

  static get defaults() {
    return _defaults;
  }

  /**
   * Initializes instance of Chips.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<ChipsOptions>): Chips;
  /**
   * Initializes instances of Chips.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<InitElement>, options?: Partial<ChipsOptions>): Chips[];
  /**
   * Initializes instances of Chips.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<ChipsOptions> = {}
  ): Chips | Chips[] {
    return super.init(els, options, Chips);
  }

  static getInstance(el: HTMLElement): Chips {
    return el['Expressive_Chips'];
  }

  getData() {
    this._flushReset();
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
    this.el['Expressive_Chips'] = undefined;
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
    if (!this._name) return;
    this._source = input;
    this._takeRequired(input);
    input.removeAttribute('name');
    submitting.add(this);
    this._listen();
    // A field set up before it is mounted, as in a shadow root, joins its
    // form's tree later; its size changing is the sign it has.
    this._mountObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this._listen());
    this._mountObserver?.observe(this.el);
  }

  /**
   * The editor's text field, or null. A static .chips of filter checkboxes,
   * which AutoInit also starts, keeps its own native form values.
   */
  private _editorInput() {
    return this.options.allowUserInput ? this.el.querySelector<HTMLInputElement>('input:is(:not([type]), [type="text"])') : null;
  }

  /** Listens where the input's form events can be heard: the page, the input's tree and its form. */
  private _listen() {
    if (this._source) [window, this._source.getRootNode(), this._source.form].forEach(listenToForms);
  }

  /** After the chips change: listen where the form is now, and update a required field's validity. */
  private _sync() {
    this._listen();
    this._validate();
  }

  /**
   * The chips are what is required, not the text, so `required` becomes a
   * custom validity, and aria-required keeps telling assistive technology.
   */
  private _takeRequired(input: HTMLInputElement) {
    this._required = input.required;
    if (!this._required) return;
    this._ariaRequired = input.getAttribute('aria-required');
    input.required = false;
    input.setAttribute('aria-required', 'true');
  }

  /** Typing in this field checks its required state again. */
  _onEditorInput(e: Event) {
    if (Utils.eventTarget(e) === this._source) this._validate();
  }

  /** What a form event asks of this field, when the form is its input's. */
  _onFormEvent(e: Event) {
    if (e.target !== this._source.form) return;
    if (e.type === 'reset') this._onReset(e);
    else this._onFormData(e as FormDataEvent);
  }

  /**
   * A reset puts back the chips the field started with, unless a listener
   * cancels it, which any listener can until the dispatch is over. So the
   * chips and their validity change once the reset is final: at the next
   * microtask, or sooner when the field is used. Until then a required field
   * stays as invalid as it was, rather than valid on a reset that a listener
   * goes on to cancel.
   */
  private _onReset(e: Event) {
    this._pendingReset = e;
    queueMicrotask(this._settleReset);
  }

  /**
   * A reset a person starts with a reset button runs its microtasks between
   * listeners, while the event is still dispatching, so then this tries
   * again in a task, after the dispatch. destroy() drops the reset.
   */
  private _settleReset = () => {
    if (this._pendingReset?.eventPhase === 0) this._flushReset();
    else if (this._pendingReset) setTimeout(this._settleReset);
  };

  /** Applies a reset no listener can cancel any more, or puts the validity back for a canceled one. */
  _flushReset() {
    // eventPhase is NONE only once the dispatch is over; until then a listener can still cancel.
    if (this._pendingReset?.eventPhase !== 0) return;
    const canceled = this._pendingReset.defaultPrevented;
    this._pendingReset = null;
    if (!canceled) this._resetChips();
  }

  private _resetChips() {
    this._setSelected(null);
    this._chips.forEach((chip) => chip.remove());
    this.chipsData = [...this._initialData];
    this._chips = this.chipsData.map((chip) => this._renderChip(chip));
    this._source.before(...this._chips);
    this._setPlaceholder();
    this._validate();
  }

  /**
   * Adds a value per chip to the data the input's form gathers, when that is
   * the form and the input is enabled, read as the data is gathered, so a
   * change just before submitting counts.
   */
  private _onFormData(e: FormDataEvent) {
    this._flushReset();
    if (this._source.matches(':disabled')) return;
    this.chipsData.forEach((chip) => e.formData.append(this._name, String(chip.id)));
  }

  /** A required field is valid once it has a chip, whatever is half typed. */
  private _validate() {
    if (this._required) this._showRequired(!this.chipsData.length);
  }

  /**
   * Sets or clears the chips' own required message. An error the page set
   * is left alone: it is not replaced, and it is not the chips' to clear.
   */
  private _showRequired(missing: boolean) {
    this._forgetClearedError();
    if (missing === this._ownsError) return;
    if (!missing) this._clearError();
    else if (!this._source.validity.customError) this._setError(this.options.i18n.required);
  }

  /**
   * Whether the input's custom error is still the chips' message. A disabled
   * input shows no message, so then the flag is all there is to go on: chips
   * added while it is disabled leave it valid once enabled, and an error the
   * page set over the chips' own in that time has to be set again.
   */
  private _stillOwnsError() {
    const input = this._source;
    return this._ownsError && (!input.willValidate || input.validationMessage === this.options.i18n.required);
  }

  /** The page can clear the chips' message itself; then it is no longer theirs to own. */
  private _forgetClearedError() {
    if (!this._source.validity.customError) this._ownsError = false;
  }

  private _setError(message: string) {
    this._source.setCustomValidity(message);
    this._ownsError = !!message;
  }

  /** Clears the chips' message, but not an error the page has set in its place. */
  private _clearError() {
    if (this._stillOwnsError()) this._source.setCustomValidity('');
    this._ownsError = false;
  }

  private _giveNameBack() {
    if (!this._source) return;
    this._pendingReset = null;
    submitting.delete(this);
    this._mountObserver?.disconnect();
    this._source.setAttribute('name', this._name);
    // Only a required field's validity is the chips' to undo; an optional
    // input keeps any error the page set.
    if (!this._required) return;
    this._showRequired(false);
    this._source.required = true;
    if (this._ariaRequired === null) this._source.removeAttribute('aria-required');
    else this._source.setAttribute('aria-required', this._ariaRequired);
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
    return getComputedStyle(el).direction === 'rtl' ? Utils.keys.ARROW_RIGHT : Utils.keys.ARROW_LEFT;
  }

  static _handleChipsKeydown(e: KeyboardEvent) {
    const chips = (<HTMLElement>e.target).closest('.chips');

    // Don't handle keydown inputs on input and textarea
    const tag = (<HTMLElement>e.target).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || !chips) return;

    const currChips: Chips = chips['Expressive_Chips'];
    if (!currChips) return; // .chips markup without an instance behind it

    if (e.key === Utils.keys.BACKSPACE || e.key === Utils.keys.DELETE) {
      const index = currChips._chips.indexOf((e.target as HTMLElement).closest('.chip'));
      if (index < 0) return;
      e.preventDefault();
      currChips._deleteChip(index, 'previous');
    } else if (e.key === Utils.keys.ARROW_LEFT || e.key === Utils.keys.ARROW_RIGHT) {
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
    if (e.key === Utils.keys.ENTER) {
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
    } else if (
      this._input.value === '' &&
      this.chipsData.length &&
      [Utils.keys.BACKSPACE, Chips._backKey(this.el)].includes(e.key)
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
    this.autocomplete = Autocomplete.init(this._input, this.options.autocompleteOptions);
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
    this._flushReset();
    if (!this._isValidAndNotExist(chip) || this.chipsData.length >= this.options.limit) return;
    const renderedChip = this._renderChip(chip);
    this._chips.push(renderedChip);
    this.chipsData.push(chip);
    if (this._input) this._input.before(renderedChip);
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
    this._flushReset();
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
