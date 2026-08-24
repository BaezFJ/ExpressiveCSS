import { Utils } from "../core/utils";
import {
  Component,
  BaseOptions,
  InitElements,
  InitElement,
  Openable,
} from "../core/component";

export interface ExpandingCardOptions extends BaseOptions {
  onOpen: (el: Element) => void;
  onClose: (el: Element) => void;
}

const _defaults: ExpandingCardOptions = {
  onOpen: null,
  onClose: null,
};

const MOTION_DURATION = 500;

export const EXPANDING_CARD_SELECTOR =
  "article.expanding-card:has(> dialog.expanding-card-dialog)";

/**
 * Morphs a compact card into a full-screen modal detail surface.
 */
export class ExpandingCard
  extends Component<ExpandingCardOptions>
  implements Openable
{
  isOpen: boolean = false;
  private readonly trigger: HTMLElement | null;
  private readonly dialog: HTMLDialogElement | null;
  private readonly closeButton: HTMLElement | null;
  private closeTimer: number | null = null;

  constructor(el: HTMLElement, options: Partial<ExpandingCardOptions>) {
    super(el, options, ExpandingCard);
    this.el["Expressive_ExpandingCard"] = this;

    this.options = {
      ...ExpandingCard.defaults,
      ...options,
    };

    this.dialog = this.el.querySelector(
      ":scope > dialog.expanding-card-dialog",
    );
    this.trigger = this.el.querySelector(
      ":scope > .expanding-card-trigger, :scope > figure > .expanding-card-trigger",
    );
    this.closeButton =
      this.dialog?.querySelector(".expanding-card-close") ?? null;

    if (this.trigger && this.dialog) {
      this.trigger.ariaExpanded = "false";
      if (this.dialog.id)
        this.trigger.setAttribute("aria-controls", this.dialog.id);
      if (!this.trigger.matches("a[href], button, input, select, textarea")) {
        this.trigger.tabIndex = 0;
        this.trigger.setAttribute("role", "button");
      }
      this.dialog.ariaExpanded = "false";
      this._setupEventHandlers();
    }
  }

  static get defaults(): ExpandingCardOptions {
    return _defaults;
  }

  static init(
    el: HTMLElement,
    options?: Partial<ExpandingCardOptions>,
  ): ExpandingCard;
  static init(
    els: InitElements<InitElement>,
    options?: Partial<ExpandingCardOptions>,
  ): ExpandingCard[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options?: Partial<ExpandingCardOptions>,
  ): ExpandingCard | ExpandingCard[] {
    return super.init(els, options, ExpandingCard);
  }

  static getInstance(el: HTMLElement): ExpandingCard {
    return el["Expressive_ExpandingCard"];
  }

  destroy() {
    this._removeEventHandlers();
    if (this.closeTimer !== null) window.clearTimeout(this.closeTimer);
    this.dialog?.classList.remove("expanded");
    if (this.dialog?.open) this.dialog.close();
    this.el["Expressive_ExpandingCard"] = undefined;
  }

  private _setupEventHandlers = () => {
    this.trigger?.addEventListener("click", this.open);
    this.trigger?.addEventListener("keypress", this._handleTriggerKeypress);
    this.closeButton?.addEventListener("click", this.close);
    this.dialog?.addEventListener("cancel", this._handleCancel);
    this.dialog?.addEventListener("close", this._handleNativeClose);
  };

  private _removeEventHandlers = () => {
    this.trigger?.removeEventListener("click", this.open);
    this.trigger?.removeEventListener("keypress", this._handleTriggerKeypress);
    this.closeButton?.removeEventListener("click", this.close);
    this.dialog?.removeEventListener("cancel", this._handleCancel);
    this.dialog?.removeEventListener("close", this._handleNativeClose);
  };

  private _handleTriggerKeypress = (event: KeyboardEvent) => {
    if (Utils.keys.ENTER.includes(event.key) || event.key === " ") {
      event.preventDefault();
      this.open();
    }
  };

  private _handleCancel = (event: Event) => {
    event.preventDefault();
    this.close();
  };

  private _handleNativeClose = () => {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.trigger.ariaExpanded = "false";
    this.dialog.ariaExpanded = "false";
    this.dialog.classList.remove("expanded");
  };

  private _setTransitionOrigin = () => {
    if (!this.dialog) return;
    const card = this.el.getBoundingClientRect();
    const media = this.el.querySelector<HTMLElement>(
      ":scope > figure, :scope > img",
    );
    const mediaRect = media?.getBoundingClientRect();

    this.dialog.style.setProperty(
      "--md-comp-expanding-card-from-top",
      `${Math.max(0, card.top)}px`,
    );
    this.dialog.style.setProperty(
      "--md-comp-expanding-card-from-right",
      `${Math.max(0, window.innerWidth - card.right)}px`,
    );
    this.dialog.style.setProperty(
      "--md-comp-expanding-card-from-bottom",
      `${Math.max(0, window.innerHeight - card.bottom)}px`,
    );
    this.dialog.style.setProperty(
      "--md-comp-expanding-card-from-left",
      `${Math.max(0, card.left)}px`,
    );
    this.dialog.style.setProperty(
      "--md-comp-expanding-card-from-media-height",
      `${Math.max(0, mediaRect?.height ?? 0)}px`,
    );
  };

  open: () => void = () => {
    if (this.isOpen || !this.dialog || !this.trigger) return;
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    this._setTransitionOrigin();
    this.isOpen = true;
    this.trigger.ariaExpanded = "true";
    this.dialog.ariaExpanded = "true";
    this.dialog.showModal();
    // Commit the clipped start frame before asking CSS to expand it.
    void this.dialog.offsetWidth;
    this.dialog.classList.add("expanded");
    this.closeButton?.focus();

    if (typeof this.options.onOpen === "function") {
      this.options.onOpen.call(this, this.el);
    }
  };

  close: () => void = () => {
    if (!this.isOpen || !this.dialog || !this.trigger) return;
    this._setTransitionOrigin();
    this.isOpen = false;
    this.trigger.ariaExpanded = "false";
    this.dialog.ariaExpanded = "false";
    this.dialog.classList.remove("expanded");

    if (typeof this.options.onClose === "function") {
      this.options.onClose.call(this, this.el);
    }

    const finish = () => {
      this.closeTimer = null;
      if (this.dialog.open) this.dialog.close();
      this.trigger.focus();
    };
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) finish();
    else this.closeTimer = window.setTimeout(finish, MOTION_DURATION);
  };

  static Init() {
    Utils.onDocumentReady(() => {
      document.querySelectorAll(EXPANDING_CARD_SELECTOR).forEach((el) => {
        if (el && el["Expressive_ExpandingCard"] == undefined) {
          this.init(el as HTMLElement);
        }
      });
    });
  }
}
