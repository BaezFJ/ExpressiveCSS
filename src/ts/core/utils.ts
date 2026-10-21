/** The part of a `DOMRect` the positioning helpers below actually read. */
type Bounding = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

/** Which edges of a container a box has crossed. */
type Edges = { top: boolean; right: boolean; bottom: boolean; left: boolean };

/**
 * Class with utilitary functions for global usage.
 */
export class Utils {
  /**
   * Key maps. One `KeyboardEvent.key` value each: the second entries these used
   * to carry (`Esc`, `Up`, `Del`, ...) were IE and Edge Legacy spellings, and
   * the support baseline excludes both.
   */
  static keys = {
    TAB: 'Tab',
    ENTER: 'Enter',
    ESC: 'Escape',
    BACKSPACE: 'Backspace',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    DELETE: 'Delete'
  };

  /**
   * Run `callback` once the document is parsed.
   *
   * The document-level behaviors all used a bare DOMContentLoaded listener,
   * which never fires if the bundle is loaded after that event - an async or
   * deferred script tag, or a dynamic import. Checking readyState first covers
   * both orders.
   */
  static onDocumentReady(callback: () => void): void {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  /**
   * Generates a unique string identifier. Every caller prefixes the result and
   * uses it as an element id, and a UUID is valid in that position.
   *
   * `randomUUID` is exposed only in secure contexts, and a dev server on a
   * plain-HTTP LAN address - the usual way a page is opened on a phone - is
   * not one. Without the fallback every component that stamps an id would
   * throw there. The ids only have to be unique within one document, so the
   * fallback does not need to be cryptographic.
   */
  static guid(): string {
    return (
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    );
  }

  /**
   * Where an element created at runtime has to be appended to stay in the same
   * tree as `el`. A stylesheet adopted into a shadow root cannot match a node
   * in the document, so a portal that lands on `document.body` is unstyled
   * whenever its origin lives in a shadow root (adr/0002).
   *
   * Light-DOM elements still get `document.body`, which is what escapes an
   * ancestor's `overflow: hidden` and stacking context. Inside a shadow root
   * both hazards come back: the host's own ancestors still form the containing
   * block, so a transformed ancestor re-anchors `position: fixed` and a
   * positioned one re-anchors `position: absolute`.
   */
  static portalRoot(el: Node): HTMLElement | ShadowRoot {
    const root = el.getRootNode() as ShadowRoot;
    // Only a ShadowRoot has a host; a Document or a detached subtree does not.
    return root.host ? root : document.body;
  }

  /**
   * `getElementById` against the tree `el` lives in. The mirror of
   * `portalRoot`: an id in a shadow root is invisible to
   * `document.getElementById`, so a trigger and its target inside the same
   * root could not find each other at all.
   *
   * Falls back to the document for a detached `el`, whose root is a plain
   * element with no lookup of its own.
   */
  static getElementById(el: Node, id: string): HTMLElement {
    const root = el.getRootNode() as Document | ShadowRoot;
    return (root.getElementById ? root.getElementById(id) : document.getElementById(id)) as HTMLElement;
  }

  /**
   * Adds or removes one name in an element's inline `anchor-name` list. A
   * trigger can anchor a Tooltip and a Menu at once, and writing the whole
   * property let the last writer, or the first to be destroyed, wipe the other.
   */
  static setAnchorName(el: HTMLElement, name: string, on: boolean) {
    const names = el.style.getPropertyValue('anchor-name').split(',').map((n) => n.trim())
      .filter((n) => n && n !== 'none' && n !== name);
    if (on) names.push(name);
    if (names.length) el.style.setProperty('anchor-name', names.join(', '));
    else el.style.removeProperty('anchor-name');
  }

  /**
   * Fires `expressive:<type>` from `el`. It bubbles and crosses shadow roots,
   * so a page can listen on the element, an ancestor or the document. A
   * `cancelable` event returns false once a listener calls preventDefault().
   */
  static emit(el: Element, type: string, detail?: unknown, cancelable = false) {
    return el.dispatchEvent(new CustomEvent(`expressive:${type}`, { bubbles: true, composed: true, cancelable, detail }));
  }

  /**
   * The element an event really started on, for a listener on the document.
   * There `event.target` is retargeted to the shadow host, so delegation that
   * reads it never sees anything inside an open shadow root. A closed root
   * keeps its inside private and still yields the host.
   */
  static eventTarget(event: Event): Element | null {
    const target = event.composedPath()[0] ?? event.target;
    return target instanceof Element ? target : null;
  }

  /** Whether a key was pressed without Alt, Ctrl or Meta, which belong to the browser and the system. */
  static plainKey(e: KeyboardEvent): boolean {
    return !(e.altKey || e.ctrlKey || e.metaKey);
  }

  /** Where a key moves from `index` among `count` items: by `steps`, or to an end for Home and End. NaN for any other key. */
  private static _keyIndex(key: string, index: number, count: number, steps: Record<string, number>) {
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    return index + (steps[key] ?? NaN);
  }

  /**
   * The item a key moves focus to, from the focused one among `items`: by
   * the offset `steps` gives the key, or to the first or last for Home and
   * End. Disabled items are skipped. Undefined for other keys, for a key
   * with a modifier, when focus is on none of the items, and past either end
   * unless `wrap`.
   */
  static focusTarget(items: HTMLElement[], e: KeyboardEvent, steps: Record<string, number>, wrap = false): HTMLElement | undefined {
    const enabled = items.filter((item) => !item.matches(':disabled, [aria-disabled="true"], .disabled'));
    const index = enabled.indexOf(Utils.eventTarget(e) as HTMLElement);
    if (index < 0 || !Utils.plainKey(e)) return undefined;
    const to = Utils._keyIndex(e.key, index, enabled.length, steps);
    return enabled[wrap ? (to + enabled.length) % enabled.length : to];
  }

  /**
   * Whether focus is on or inside any of `els`, read from each element's own
   * root. A document listener cannot tell from `composedPath()` when the
   * element sits in a closed shadow root, but the element's root still knows
   * what has focus.
   */
  static focusIsIn(...els: (Element | null | undefined)[]): boolean {
    return els.some((el) => {
      const active = el && (el.getRootNode() as Document | ShadowRoot).activeElement;
      return !!active && el.contains(active);
    });
  }

  /**
   * `closest()` for a document listener: the nearest element on the event's
   * composed path that matches `selector`. Unlike `eventTarget(e).closest()`
   * it climbs out of shadow roots too, so a press on a shadow-root icon inside
   * a light-DOM button still finds the button.
   */
  static closestInPath(event: Event, selector: string): Element | null {
    for (const node of event.composedPath()) {
      if (node instanceof Element && node.matches(selector)) return node;
    }
    return null;
  }

  /**
   * Checks for exceeded edges
   * @param container Container element.
   * @param bounding Bounding rect.
   * @param offset Element offset.
   */
  static checkWithinContainer(container: HTMLElement, bounding: Bounding, offset: number): Edges {
    const edges = {
      top: false,
      right: false,
      bottom: false,
      left: false
    };

    const containerRect = container.getBoundingClientRect();
    // If body element is smaller than viewport, use viewport height instead.
    const containerBottom =
      container === document.body
        ? Math.max(containerRect.bottom, window.innerHeight)
        : containerRect.bottom;

    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const scrolledX = bounding.left - scrollLeft;
    const scrolledY = bounding.top - scrollTop;

    // Check for container and viewport for each edge
    if (scrolledX < containerRect.left + offset || scrolledX < offset) {
      edges.left = true;
    }

    if (
      scrolledX + bounding.width > containerRect.right - offset ||
      scrolledX + bounding.width > window.innerWidth - offset
    ) {
      edges.right = true;
    }

    if (scrolledY < containerRect.top + offset || scrolledY < offset) {
      edges.top = true;
    }

    if (
      scrolledY + bounding.height > containerBottom - offset ||
      scrolledY + bounding.height > window.innerHeight - offset
    ) {
      edges.bottom = true;
    }

    return edges;
  }

  /**
   * Checks if element can be aligned in multiple directions.
   * @param el Element to be inspected.
   * @param container Container element.
   * @param bounding Bounding rect.
   * @param offset Element offset.
   */
  static checkPossibleAlignments(
    el: HTMLElement,
    container: HTMLElement,
    bounding: Bounding,
    offset: number
  ) {
    const canAlign: {
      top: boolean;
      right: boolean;
      bottom: boolean;
      left: boolean;
      spaceOnTop: number;
      spaceOnRight: number;
      spaceOnBottom: number;
      spaceOnLeft: number;
    } = {
      top: true,
      right: true,
      bottom: true,
      left: true,
      spaceOnTop: null,
      spaceOnRight: null,
      spaceOnBottom: null,
      spaceOnLeft: null
    };

    const containerAllowsOverflow = getComputedStyle(container).overflow === 'visible';
    const containerRect = container.getBoundingClientRect();
    const containerHeight = Math.min(containerRect.height, window.innerHeight);
    const containerWidth = Math.min(containerRect.width, window.innerWidth);
    const elOffsetRect = el.getBoundingClientRect();

    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const scrolledX = bounding.left - scrollLeft;
    const scrolledYTopEdge = bounding.top - scrollTop;
    const scrolledYBottomEdge = bounding.top + elOffsetRect.height - scrollTop;

    // Check for container and viewport for left
    canAlign.spaceOnRight = !containerAllowsOverflow
      ? containerWidth - (scrolledX + bounding.width)
      : window.innerWidth - (elOffsetRect.left + bounding.width);
    if (canAlign.spaceOnRight < 0) {
      canAlign.left = false;
    }

    // Check for container and viewport for Right
    canAlign.spaceOnLeft = !containerAllowsOverflow
      ? scrolledX - bounding.width + elOffsetRect.width
      : elOffsetRect.right - bounding.width;
    if (canAlign.spaceOnLeft < 0) {
      canAlign.right = false;
    }

    // Check for container and viewport for Top
    canAlign.spaceOnBottom = !containerAllowsOverflow
      ? containerHeight - (scrolledYTopEdge + bounding.height + offset)
      : window.innerHeight - (elOffsetRect.top + bounding.height + offset);
    if (canAlign.spaceOnBottom < 0) {
      canAlign.top = false;
    }

    // Check for container and viewport for Bottom
    canAlign.spaceOnTop = !containerAllowsOverflow
      ? scrolledYBottomEdge - (bounding.height - offset)
      : elOffsetRect.bottom - (bounding.height + offset);
    if (canAlign.spaceOnTop < 0) {
      canAlign.bottom = false;
    }

    return canAlign;
  }

  /**
   * Retrieves target element id from trigger.
   * @param trigger Trigger element.
   */
  static getIdFromTrigger(trigger: HTMLElement): string {
    return trigger.dataset.target || (trigger.getAttribute('href')?.slice(1) ?? '');
  }

  /**
   * Retrieves document scroll postion from top.
   */
  static getDocumentScrollTop(): number {
    return window.scrollY;
  }

  /**
   * Retrieves document scroll postion from left.
   */
  static getDocumentScrollLeft(): number {
    return window.scrollX;
  }

  /**
   * Trailing-edge throttle: run `func` now, then at most once per `wait` ms
   * with the most recent arguments.
   *
   * This used to carry its underscore ancestor's whole configuration - leading
   * and trailing switches, a result passthrough - and both call sites are
   * resize handlers passing nothing but a function and a delay.
   *
   * Assign the return value once. `x = Utils.throttle(fn, 200)` is right;
   * wrapping it in an arrow builds a fresh closure per event and never calls
   * it, which is how resize handling was dead in three components.
   */
  static throttle(func: (...args: unknown[]) => void, wait: number) {
    let timeout: ReturnType<typeof setTimeout> = null;
    let lastArgs: unknown[] = null;
    let previous = -Infinity;

    return (...args: unknown[]) => {
      // performance.now() is monotonic; Date.now() follows the system clock
      // and a backward jump would hold the trailing call for as long as it jumped.
      const now = performance.now();
      const remaining = wait - (now - previous);
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        lastArgs = null;
        func(...args);
      } else if (!timeout) {
        // The trailing call replays the most recent arguments; without this it
        // used to fire with none at all.
        lastArgs = args;
        timeout = setTimeout(() => {
          previous = performance.now();
          timeout = null;
          func(...(lastArgs ?? []));
          lastArgs = null;
        }, remaining);
      } else {
        lastArgs = args;
      }
    };
  }

  /**
   * Renders confirm/close buttons with callback function
   */
  static createConfirmationContainer(
    container: HTMLElement,
    confirmText: string,
    cancelText: string,
    onConfirm: (Function: object) => void,
    onCancel: (Function: object) => void
  ): void {
    const confirmationButtonsContainer = document.createElement('div');
    confirmationButtonsContainer.classList.add('confirmation-btns');
    container.append(confirmationButtonsContainer);

    this.createButton(confirmationButtonsContainer, cancelText, ['btn-cancel'], true, onCancel);
    this.createButton(confirmationButtonsContainer, confirmText, ['btn-confirm'], true, onConfirm);
  }

  /**
   * Renders a button with optional callback function
   */
  static createButton(
    container: HTMLElement,
    text: string,
    className: string[] = [],
    visibility: boolean = true,
    callback: (Function: object) => void = null
  ): void {
    const button = document.createElement('button');
    button.className = className.concat(['text']).join(' ');
    button.style.visibility = visibility ? 'visible' : 'hidden';
    button.type = 'button';
    button.tabIndex = visibility ? 0 : -1;
    button.innerText = text;
    if (typeof callback === 'function') button.addEventListener('click', callback);
    container.append(button);
  }

  /**
   * Places `container` below `origin`, kept on screen, and returns the offset
   * it should transition in from.
   */
  static _setAbsolutePosition(
    origin: HTMLElement,
    container: HTMLElement,
    margin: number,
    transitionMovement: number,
    align: string = 'center'
  ) {
    const originHeight = origin.offsetHeight,
      originWidth = origin.offsetWidth,
      containerHeight = container.offsetHeight,
      containerWidth = container.offsetWidth,
      originRect = origin.getBoundingClientRect();
    const targetTop = originRect.top + Utils.getDocumentScrollTop() + originHeight + margin;
    let targetLeft = originRect.left + Utils.getDocumentScrollLeft();

    if (align === 'center') {
      targetLeft += originWidth / 2 - containerWidth / 2;
    } else if (align === 'right') {
      targetLeft += originWidth - containerWidth - margin;
    }

    const newCoordinates = Utils._repositionWithinScreen(
      targetLeft,
      targetTop,
      containerWidth,
      containerHeight,
      margin,
      transitionMovement,
      align
    );

    Utils._placeInOffsetParent(container, newCoordinates);

    return {x: 0, y: transitionMovement};
  }

  /**
   * Writes document coordinates as `top`/`left` on an absolutely positioned
   * element. A static body uses document coordinates; positioned parents,
   * such as a shadow host, use their padding edge, including borders and
   * local scrolling.
   */
  static _placeInOffsetParent(el: HTMLElement, coordinates: { x: number; y: number }) {
    let { x, y } = coordinates;
    const parent = el.offsetParent as HTMLElement;
    if (parent && (parent !== document.body || getComputedStyle(parent).position !== 'static')) {
      const rect = parent.getBoundingClientRect();
      const root = parent === document.scrollingElement;
      x -= rect.left + Utils.getDocumentScrollLeft() + parent.clientLeft - (root ? 0 : parent.scrollLeft);
      y -= rect.top + Utils.getDocumentScrollTop() + parent.clientTop - (root ? 0 : parent.scrollTop);
    }
    el.style.top = y + 'px';
    el.style.left = x + 'px';
  }

  static _repositionWithinScreen(
    x: number,
    y: number,
    width: number,
    height: number,
    margin: number,
    transitionMovement: number,
    align: string
  ) {
    const scrollLeft = Utils.getDocumentScrollLeft();
    const scrollTop = Utils.getDocumentScrollTop();
    let newX = x - scrollLeft;
    let newY = y - scrollTop;

    const bounding: Bounding = {
      left: newX,
      top: newY,
      width: width,
      height: height
    };
    let offset: number;
    if (align === 'left' || align == 'center') {
      offset = margin + transitionMovement;
    } else if (align === 'right') {
      offset = margin - transitionMovement;
    }
    const edges = Utils.checkWithinContainer(document.body, bounding, offset);

    if (edges.left) {
      newX = offset;
    } else if (edges.right) {
      newX -= newX + width - window.innerWidth;
    }
    if (edges.top) {
      newY = offset;
    } else if (edges.bottom) {
      newY -= newY + height - window.innerHeight;
    }
    return {
      x: newX + scrollLeft,
      y: newY + scrollTop
    };
  }
}
