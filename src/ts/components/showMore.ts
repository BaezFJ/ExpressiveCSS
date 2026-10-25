import { Utils, restoreAttribute } from "../core/utils";
import { Component, BaseOptions } from "../core/component";

export interface ShowMoreI18nOptions {
  /** The button's label while the full text shows. */
  showLess: string;
}

export interface ShowMoreOptions extends BaseOptions {
  /** Called after the full text shows. */
  onOpen: ((el: Element) => void) | null;
  /** Called after the text is clamped again. */
  onClose: ((el: Element) => void) | null;
  /** The open label; `data-show-less` on the button overrides it. */
  i18n: Partial<ShowMoreI18nOptions>;
}

const _defaults: ShowMoreOptions = {
  onOpen: null,
  onClose: null,
  i18n: { showLess: "Show less" },
};

// Inline, because the utilities layer beats any component rule and a
// prefixed clamp such as medium:line-clamp-2 would beat .line-clamp-none.
const CLAMP_PROPERTIES = ["-webkit-line-clamp", "line-clamp"];
const BUTTON_ATTRIBUTES = ["aria-expanded", "aria-controls", "hidden"];

/** The button's last label text, skipping aria-hidden icons. */
function labelNode(button: HTMLElement): Text | null {
  const walker = button.ownerDocument.createTreeWalker(button, NodeFilter.SHOW_TEXT);
  let label: Text | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent.trim() && !node.parentElement.closest('[aria-hidden="true"]')) label = node as Text;
  }
  return label;
}

/**
 * Clamped text with a button that shows all of it. A `.show-more` holds text
 * with a `line-clamp-1`, `-2` or `-3` class and a `<button>`. The button
 * hides while the clamped text fits.
 */
export class ShowMore extends Component<ShowMoreOptions> {
  static key = "Expressive_ShowMore";
  isOpen = false;
  private readonly text: HTMLElement | null;
  private readonly button: HTMLButtonElement | null;
  // Attributes as they were before init, so destroy() can restore them.
  private _initial: Record<string, string | null> = {};
  private _initialId: string | null = null;
  private _label: Text | null = null;
  private _moreLabel = "";
  private _observer: ResizeObserver | null = null;

  constructor(el: HTMLElement, options: Partial<ShowMoreOptions>) {
    super(el, options);
    this.text = el.querySelector(":scope > :is(.line-clamp-1, .line-clamp-2, .line-clamp-3)");
    this.button = el.querySelector(":scope > button");
    if (!this.text || !this.button) return;
    this._wire();
    const { signal } = this._events;
    this.button.addEventListener("click", this._toggle, { signal });
    this.button.addEventListener("blur", this._fit, { signal });
    this._observer = new ResizeObserver(this._fit);
    this._observer.observe(this.text);
    // A web font that swaps in can change what fits without resizing the
    // clamped box, so the observer would not report it.
    document.fonts?.ready.then(this._fit);
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
      this._observer.disconnect();
      this._show(false);
      for (const name of BUTTON_ATTRIBUTES) restoreAttribute(this.button, name, this._initial[name]);
      restoreAttribute(this.text, "id", this._initialId);
    }
    super.destroy();
  }

  /** Records what destroy() restores, then points the button at the text. */
  private _wire() {
    for (const name of BUTTON_ATTRIBUTES) this._initial[name] = this.button.getAttribute(name);
    this._initialId = this.text.getAttribute("id");
    if (!this.text.id) this.text.id = `show-more-${Utils.guid()}`;
    this._label = labelNode(this.button);
    if (this._label) this._moreLabel = this._label.data;
    this.button.ariaExpanded = "false";
    this.button.setAttribute("aria-controls", this.text.id);
  }

  private _toggle = () => (this.isOpen ? this.close() : this.open());

  /**
   * Hides the button while the clamped text fits. Open text keeps it, and so
   * does focus, so collapsing text that now fits does not drop focus on the
   * page; the check runs again on blur.
   */
  private _fit = () => {
    if (this.isOpen || this.button.matches(":focus") || ShowMore.getInstance(this.el) !== this) return;
    // Firefox rounds a fractional line height up in scrollHeight only.
    this.button.hidden = this.text.scrollHeight - this.text.clientHeight <= 1;
  };

  private _show(open: boolean) {
    this.isOpen = open;
    this.button.ariaExpanded = String(open);
    if (this._label) this._label.data = open ? this._lessLabel() : this._moreLabel;
    this._clamp(!open);
  }

  private _lessLabel() {
    return this.button.dataset.showLess || this.options.i18n.showLess;
  }

  private _clamp(on: boolean) {
    for (const property of CLAMP_PROPERTIES) {
      if (on) this.text.style.removeProperty(property);
      else this.text.style.setProperty(property, "unset");
    }
  }
}
