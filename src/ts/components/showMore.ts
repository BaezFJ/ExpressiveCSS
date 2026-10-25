import { Utils, restoreAttribute } from "../core/utils";
import { Component, BaseOptions } from "../core/component";

export interface ShowMoreOptions extends BaseOptions {
  /** Called after the full text shows. */
  onOpen: ((el: Element) => void) | null;
  /** Called after the text is clamped again. */
  onClose: ((el: Element) => void) | null;
}

const _defaults: ShowMoreOptions = {
  onOpen: null,
  onClose: null,
};

// Inline, because the utilities layer beats any component rule and a
// prefixed clamp such as medium:line-clamp-2 would beat .line-clamp-none.
const CLAMP_PROPERTIES = ["-webkit-line-clamp", "line-clamp"];
const BUTTON_ATTRIBUTES = ["aria-expanded", "aria-controls"];

/**
 * Clamped text with a button that shows all of it. A `.show-more` holds text
 * with a `line-clamp-1`, `-2` or `-3` class and a `<button>`.
 */
export class ShowMore extends Component<ShowMoreOptions> {
  static key = "Expressive_ShowMore";
  isOpen = false;
  private readonly text: HTMLElement | null;
  private readonly button: HTMLButtonElement | null;
  // Attributes as they were before init, so destroy() can restore them.
  private _initial: Record<string, string | null> = {};
  private _initialId: string | null = null;

  constructor(el: HTMLElement, options: Partial<ShowMoreOptions>) {
    super(el, options);
    this.text = el.querySelector(":scope > :is(.line-clamp-1, .line-clamp-2, .line-clamp-3)");
    this.button = el.querySelector(":scope > button");
    if (!this.text || !this.button) return;
    this._wire();
    this.button.addEventListener("click", this._toggle, { signal: this._events.signal });
  }

  /** Records the attributes destroy() restores, then points the button at the text. */
  private _wire() {
    for (const name of BUTTON_ATTRIBUTES) this._initial[name] = this.button.getAttribute(name);
    this._initialId = this.text.getAttribute("id");
    if (!this.text.id) this.text.id = `show-more-${Utils.guid()}`;
    this.button.ariaExpanded = "false";
    this.button.setAttribute("aria-controls", this.text.id);
  }

  static get defaults(): ShowMoreOptions {
    return _defaults;
  }

  /** Shows the full text. */
  open = () => {
    if (this.isOpen || !this.button) return;
    this._show(true);
    this._notify("open", this.options.onOpen, { current: () => this.isOpen });
  };

  /** Clamps the text again. */
  close = () => {
    if (!this.isOpen) return;
    this._show(false);
    this._notify("close", this.options.onClose, { current: () => !this.isOpen });
  };

  destroy() {
    if (this.button) {
      this._show(false);
      for (const name of BUTTON_ATTRIBUTES) restoreAttribute(this.button, name, this._initial[name]);
      restoreAttribute(this.text, "id", this._initialId);
    }
    super.destroy();
  }

  private _toggle = () => (this.isOpen ? this.close() : this.open());

  private _show(open: boolean) {
    this.isOpen = open;
    this.button.ariaExpanded = String(open);
    for (const property of CLAMP_PROPERTIES) {
      if (open) this.text.style.setProperty(property, "unset");
      else this.text.style.removeProperty(property);
    }
  }
}
