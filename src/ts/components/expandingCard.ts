import { Utils, restoreAttribute } from "../core/utils";
import { Component, BaseOptions } from "../core/component";

export interface ExpandingCardOptions extends BaseOptions {
  onOpen: (el: Element) => void;
  onClose: (el: Element) => void;
}

const _defaults: ExpandingCardOptions = {
  onOpen: null,
  onClose: null,
};

export const EXPANDING_CARD_SELECTOR =
  "article.expanding-card:has(> dialog.expanding-card-dialog)";

/**
 * Morphs a compact card into a full-screen modal detail surface.
 */
export class ExpandingCard extends Component<ExpandingCardOptions> {
  isOpen: boolean = false;
  private readonly trigger: HTMLElement | null;
  private readonly dialog: HTMLDialogElement | null;
  private readonly closeButton: HTMLElement | null;
  private closeGeneration = 0;
  // Trigger attributes as they were before init, so destroy() can restore them.
  private _initialTrigger: Record<string, string | null> = {};

  constructor(el: HTMLElement, options: Partial<ExpandingCardOptions>) {
    super(el, options);
    this.el["Expressive_ExpandingCard"] = this;

    this.dialog = this.el.querySelector(
      ":scope > dialog.expanding-card-dialog",
    );
    this.trigger = this.el.querySelector(
      ":scope > .expanding-card-trigger, :scope > figure > .expanding-card-trigger",
    );
    this.closeButton =
      this.dialog?.querySelector(".expanding-card-close") ?? null;

    if (this.trigger && this.dialog) {
      for (const name of ["aria-expanded", "aria-controls", "tabindex", "role"])
        this._initialTrigger[name] = this.trigger.getAttribute(name);
      this.trigger.ariaExpanded = "false";
      if (this.dialog.id)
        this.trigger.setAttribute("aria-controls", this.dialog.id);
      if (!this.trigger.matches("a[href], button, input, select, textarea")) {
        this.trigger.tabIndex = 0;
        this.trigger.setAttribute("role", "button");
      }
      this._setupEventHandlers();
    }
  }

  static get defaults(): ExpandingCardOptions {
    return _defaults;
  }

  static getInstance(el: HTMLElement): ExpandingCard {
    return el["Expressive_ExpandingCard"];
  }

  destroy() {
    this._removeEventHandlers();
    this._collapse();
    if (this.dialog?.open) this.dialog.close();
    for (const [name, value] of Object.entries(this._initialTrigger)) restoreAttribute(this.trigger, name, value);
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
    if (event.key === 'Enter' || event.key === " ") {
      event.preventDefault();
      this.open();
    }
  };

  private _handleCancel = (event: Event) => {
    event.preventDefault();
    this.close();
  };

  private _handleNativeClose = () => {
    // A queued close event can arrive after a caller has reopened the dialog.
    if (this.dialog.open) return;
    // dialog.close() and <form method="dialog"> bypass close(), so report here.
    const wasOpen = this.isOpen;
    this._collapse();
    if (wasOpen) this._notify('close', this.options.onClose, { current: () => !this.isOpen });
  };

  /** Marks the card closed and invalidates any pending close. */
  private _collapse() {
    this.closeGeneration++;
    this.isOpen = false;
    if (this.trigger) this.trigger.ariaExpanded = "false";
    this.dialog?.classList.remove("expanded");
  }

  private _setTransitionOrigin = () => {
    if (!this.dialog) return;
    const card = this.el.getBoundingClientRect();
    const media = this.el.querySelector<HTMLElement>(
      ":scope > figure, :scope > img",
    );
    const mediaRect = media?.getBoundingClientRect();
    const set = (side: string, px: number) =>
      this.dialog.style.setProperty(
        `--md-comp-expanding-card-from-${side}`,
        `${Math.max(0, px)}px`,
      );

    set("top", card.top);
    set("right", window.innerWidth - card.right);
    set("bottom", window.innerHeight - card.bottom);
    set("left", card.left);
    set("media-height", mediaRect?.height ?? 0);
  };

  open: () => void = () => {
    if (this.isOpen || !this.dialog || !this.trigger) return;
    this.closeGeneration++;

    this._setTransitionOrigin();
    this.isOpen = true;
    this.trigger.ariaExpanded = "true";
    this.dialog.showModal();
    // Commit the clipped start frame before asking CSS to expand it.
    void this.dialog.offsetWidth;
    this.dialog.classList.add("expanded");
    this.closeButton?.focus();

    this._notify('open', this.options.onOpen, { current: () => this.isOpen });
  };

  close: () => void = () => {
    if (!this.isOpen || !this.dialog || !this.trigger) return;
    this._setTransitionOrigin();
    this._collapse();
    const generation = this.closeGeneration;

    this._notify('close', this.options.onClose, { current: () => !this.isOpen });

    const finish = () => {
      if (generation !== this.closeGeneration || this.isOpen || !this.dialog.open) return;
      this.dialog.close();
      if (this.dialog.isConnected && this.trigger.isConnected) this.trigger.focus();
    };
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Wait only for the container's actual clip transition, not arbitrary
    // animations in consumer content. Cancellation also completes cleanup.
    const transitions = reducedMotion ? [] : (this.dialog.getAnimations?.() ?? [])
      .filter((animation) => (animation as CSSTransition).transitionProperty === "clip-path");
    if (transitions.length === 0) finish();
    else void Promise.allSettled(transitions.map((animation) => animation.finished)).then(finish);
  };

  static Init() {
    Utils.onDocumentReady(() => {
      document.querySelectorAll(EXPANDING_CARD_SELECTOR).forEach((el) => {
        if (el["Expressive_ExpandingCard"] == undefined) {
          this.init(el as HTMLElement);
        }
      });
    });
  }
}
