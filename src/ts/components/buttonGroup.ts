import { Component, BaseOptions, InitElements, InitElement } from "../core/component";

export interface ButtonGroupOptions extends BaseOptions {}

type SavedItemStyle = {
  width: string;
  baseWidth: number;
};

const _defaults: ButtonGroupOptions = {};
const VALID_SELECTION_MODES = new Set(["single", "multiple"]);

/**
 * Coordinates Material button-group press geometry and optional toggle state.
 *
 * Standard groups redistribute the pressed item's 15% width growth from its
 * immediate neighbors. `data-selection="single|multiple"` also enables
 * `aria-pressed` state management.
 */
export class ButtonGroup extends Component<ButtonGroupOptions> {
  private _pressedStyles = new Map<HTMLElement, SavedItemStyle>();
  private _releaseStyles = new Map<HTMLElement, SavedItemStyle>();
  private _releaseTimer: number | null = null;
  private _originalPressed = new Map<HTMLButtonElement, string | null>();

  constructor(el: HTMLElement, options: Partial<ButtonGroupOptions> = {}) {
    super(el, options, ButtonGroup);
    this.el["Expressive_ButtonGroup"] = this;
    this.options = { ...ButtonGroup.defaults, ...options };

    if (this._selectionMode) {
      this._normalizeSelection();
      this.el.addEventListener("click", this._handleClick);
    }
    this.el.addEventListener("pointerdown", this._handlePointerDown);
    this.el.addEventListener("keydown", this._handleKeyDown);
    document.addEventListener("pointerup", this._resetPress);
    document.addEventListener("pointercancel", this._resetPress);
    document.addEventListener("keyup", this._handleKeyUp);
    window.addEventListener("blur", this._resetPress);
  }

  static get defaults() {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<ButtonGroupOptions>): ButtonGroup;
  static init(
    els: InitElements<InitElement>,
    options?: Partial<ButtonGroupOptions>,
  ): ButtonGroup[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<ButtonGroupOptions> = {},
  ): ButtonGroup | ButtonGroup[] {
    return super.init(els, options, ButtonGroup);
  }

  static getInstance(el: HTMLElement): ButtonGroup {
    return el["Expressive_ButtonGroup"];
  }

  destroy() {
    this._resetPress();
    this._finishRelease();
    this.el.removeEventListener("click", this._handleClick);
    this.el.removeEventListener("pointerdown", this._handlePointerDown);
    this.el.removeEventListener("keydown", this._handleKeyDown);
    document.removeEventListener("pointerup", this._resetPress);
    document.removeEventListener("pointercancel", this._resetPress);
    document.removeEventListener("keyup", this._handleKeyUp);
    window.removeEventListener("blur", this._resetPress);
    for (const [item, value] of this._originalPressed) {
      if (value === null) item.removeAttribute("aria-pressed");
      else item.setAttribute("aria-pressed", value);
    }
    this._originalPressed.clear();
    this.el["Expressive_ButtonGroup"] = undefined;
  }

  private get _selectionMode(): "single" | "multiple" | null {
    const mode = this.el.dataset.selection;
    return VALID_SELECTION_MODES.has(mode) ? (mode as "single" | "multiple") : null;
  }

  private get _items(): HTMLElement[] {
    return Array.from(this.el.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLButtonElement ||
        (child instanceof HTMLAnchorElement && child.classList.contains("button")),
    );
  }

  private get _toggleItems(): HTMLButtonElement[] {
    return this._items.filter(
      (item): item is HTMLButtonElement => item instanceof HTMLButtonElement,
    );
  }

  private _normalizeSelection() {
    const items = this._toggleItems;
    items.forEach((item) => {
      this._rememberPressed(item);
      if (!["true", "false"].includes(item.getAttribute("aria-pressed") || "")) {
        item.setAttribute("aria-pressed", "false");
      }
    });

    if (this._selectionMode === "single") {
      const selected = items.filter((item) => item.getAttribute("aria-pressed") === "true");
      selected.slice(1).forEach((item) => item.setAttribute("aria-pressed", "false"));
    }

    if (
      this.el.hasAttribute("data-selection-required") &&
      !items.some((item) => item.getAttribute("aria-pressed") === "true")
    ) {
      items.find((item) => !this._isDisabled(item))?.setAttribute("aria-pressed", "true");
    }
  }

  private _itemFromEvent(event: Event): HTMLElement | null {
    if (!(event.target instanceof Element)) return null;
    const item = event.target.closest("button, a.button");
    return item instanceof HTMLElement && item.parentElement === this.el ? item : null;
  }

  private _isDisabled(item: HTMLElement): boolean {
    return (
      (item instanceof HTMLButtonElement && item.disabled) ||
      item.getAttribute("aria-disabled") === "true" ||
      item.classList.contains("disabled")
    );
  }

  private _handleClick = (event: MouseEvent) => {
    if (!this._selectionMode) return;
    const item = this._itemFromEvent(event);
    if (!(item instanceof HTMLButtonElement) || this._isDisabled(item)) return;
    this._rememberPressed(item);

    const willSelect = item.getAttribute("aria-pressed") !== "true";
    const selectedCount = this._toggleItems.filter(
      (button) => button.getAttribute("aria-pressed") === "true",
    ).length;
    if (
      !willSelect &&
      this.el.hasAttribute("data-selection-required") &&
      selectedCount === 1
    ) {
      return;
    }
    if (this._selectionMode === "single" && willSelect) {
      this._toggleItems.forEach((button) => {
        this._rememberPressed(button);
        button.setAttribute("aria-pressed", "false");
      });
    }
    item.setAttribute("aria-pressed", willSelect ? "true" : "false");
  };

  private _rememberPressed(item: HTMLButtonElement) {
    if (!this._originalPressed.has(item)) {
      this._originalPressed.set(item, item.getAttribute("aria-pressed"));
    }
  }

  private _handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const item = this._itemFromEvent(event);
    if (item && !this._isDisabled(item)) this._startPress(item);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || (event.key !== " " && event.key !== "Enter")) return;
    const item = this._itemFromEvent(event);
    if (item && !this._isDisabled(item)) this._startPress(item);
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === " " || event.key === "Enter") this._resetPress();
  };

  private _startPress(item: HTMLElement) {
    if (this.el.classList.contains("connected") || this._pressedStyles.size) return;
    this._finishRelease();

    const items = this._items;
    const activeIndex = items.indexOf(item);
    if (activeIndex < 0 || items.length < 2) return;

    const rects = items.map((candidate) => candidate.getBoundingClientRect());
    const activeWidth = rects[activeIndex].width;
    if (activeWidth <= 0) return;

    const parsedMultiplier = Number.parseFloat(
      getComputedStyle(this.el).getPropertyValue(
        "--md-comp-button-group-pressed-item-width-multiplier",
      ),
    );
    const multiplier = Number.isFinite(parsedMultiplier) ? parsedMultiplier : 0.15;
    const desiredGrowth = activeWidth * multiplier;
    const neighborIndexes = [activeIndex - 1, activeIndex + 1].filter(
      (index) => index >= 0 && index < items.length,
    );
    const compression = new Map<number, number>();

    if (neighborIndexes.length === 1) {
      const index = neighborIndexes[0];
      compression.set(index, Math.min(desiredGrowth, this._compressionCapacity(rects[index])));
    } else {
      const half = desiredGrowth / 2;
      for (const index of neighborIndexes) {
        compression.set(index, Math.min(half, this._compressionCapacity(rects[index])));
      }
      let remaining = desiredGrowth - [...compression.values()].reduce((sum, value) => sum + value, 0);
      for (const index of neighborIndexes) {
        if (remaining <= 0) break;
        const capacity = this._compressionCapacity(rects[index]) - compression.get(index);
        const extra = Math.min(remaining, capacity);
        compression.set(index, compression.get(index) + extra);
        remaining -= extra;
      }
    }

    const actualGrowth = [...compression.values()].reduce((sum, value) => sum + value, 0);
    if (actualGrowth <= 0) return;

    items.forEach((candidate, index) => {
      this._pressedStyles.set(candidate, {
        width: candidate.style.width,
        baseWidth: rects[index].width,
      });
      candidate.style.width = `${rects[index].width}px`;
    });
    void this.el.offsetWidth;
    items.forEach((candidate, index) => {
      const adjustment =
        index === activeIndex ? actualGrowth : -(compression.get(index) || 0);
      candidate.style.width = `${rects[index].width + adjustment}px`;
    });
  }

  private _compressionCapacity(rect: DOMRect): number {
    return Math.max(0, rect.width - rect.height);
  }

  private _resetPress = () => {
    if (!this._pressedStyles.size) return;
    this._finishRelease();
    this._releaseStyles = new Map(this._pressedStyles);
    for (const [item, style] of this._releaseStyles) {
      item.style.width = `${style.baseWidth}px`;
    }
    this._pressedStyles.clear();
    this._releaseTimer = window.setTimeout(this._finishRelease, 200);
  };

  private _finishRelease = () => {
    if (this._releaseTimer !== null) window.clearTimeout(this._releaseTimer);
    this._releaseTimer = null;
    for (const [item, style] of this._releaseStyles) item.style.width = style.width;
    this._releaseStyles.clear();
  };
}
