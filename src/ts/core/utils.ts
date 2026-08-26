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
   */
  static guid(): string {
    return crypto.randomUUID();
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
    // `left` and `right` companions to these two used to be computed and
    // returned as well; the only caller reads the vertical pair and all four
    // measurements, never the horizontal pair.
    const canAlign: {
      top: boolean;
      bottom: boolean;
      spaceOnTop: number;
      spaceOnRight: number;
      spaceOnBottom: number;
      spaceOnLeft: number;
    } = {
      top: true,
      bottom: true,
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

    // Check for container and viewport for Right
    canAlign.spaceOnLeft = !containerAllowsOverflow
      ? scrolledX - bounding.width + elOffsetRect.width
      : elOffsetRect.right - bounding.width;

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
    let id = trigger.dataset.target;
    if (!id) {
      id = trigger.getAttribute('href');
      return id ? id.slice(1) : '';
    }
    return id;
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
    let previous = 0;

    return (...args: unknown[]) => {
      const now = Date.now();
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
          previous = Date.now();
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
    className = className.concat(['text']);
    const button = document.createElement('button');
    button.className = className.join(' ');
    button.style.visibility = visibility ? 'visible' : 'hidden';
    button.type = 'button';
    button.tabIndex = !!visibility ? 0 : -1;
    button.innerText = text;
    // The keypress handler used to call `callback` unconditionally, so a
    // button created without one threw on Enter.
    if (typeof callback === 'function') {
      button.addEventListener('click', callback);
      button.addEventListener('keypress', (e) => {
        if (e.key === Utils.keys.ENTER) callback(e);
      });
    }
    container.append(button);
  }

  static _setAbsolutePosition(
    origin: HTMLElement,
    container: HTMLElement,
    position: string,
    margin: number,
    transitionMovement: number,
    align: string = 'center'
  ) {
    const originHeight = origin.offsetHeight,
      originWidth = origin.offsetWidth,
      containerHeight = container.offsetHeight,
      containerWidth = container.offsetWidth,
      originRect = origin.getBoundingClientRect(); // one rect, read twice below
    let xMovement = 0,
      yMovement = 0,
      targetTop = originRect.top + Utils.getDocumentScrollTop(),
      targetLeft = originRect.left + Utils.getDocumentScrollLeft();

    if (position === 'top') {
      targetTop += -containerHeight - margin;
      if (align === 'center') {
        targetLeft += originWidth / 2 - containerWidth / 2; // This is center align
      }
      yMovement = -transitionMovement;
    } else if (position === 'right') {
      targetTop += originHeight / 2 - containerHeight / 2;
      targetLeft = originWidth + margin;
      xMovement = transitionMovement;
    } else if (position === 'left') {
      targetTop += originHeight / 2 - containerHeight / 2;
      targetLeft = -containerWidth - margin;
      xMovement = -transitionMovement;
    } else {
      targetTop += originHeight + margin;
      if (align === 'center') {
        targetLeft += originWidth / 2 - containerWidth / 2; // This is center align
      }
      yMovement = transitionMovement;
    }
    if (align === 'right') {
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

    container.style.top = newCoordinates.y + 'px';
    container.style.left = newCoordinates.x + 'px';

    return {x: xMovement, y: yMovement};
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
