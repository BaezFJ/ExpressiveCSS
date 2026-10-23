/** One axis of a viewport clamp: `start` moved so `size` fits in `view`. */
const fit = (start: number, size: number, view: number, offset: number) =>
  start < offset ? offset : start + size > view - offset ? view - size : start;

/** Sets an attribute, or removes it for null, as when restoring a value read with getAttribute. */
export function restoreAttribute(el: Element, name: string, value: string | null) {
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}

/** A picker footer text button; a hidden one is also out of the tab order. */
function footerButton(parent: HTMLElement, text: string, className: string, onClick: () => void, visible = true) {
  const button = document.createElement('button');
  button.className = `${className} text`;
  button.style.visibility = visible ? 'visible' : 'hidden';
  button.type = 'button';
  button.tabIndex = visible ? 0 : -1;
  button.innerText = text;
  button.addEventListener('click', onClick);
  parent.append(button);
}

/**
 * Fills a picker's footer: a Clear button, hidden unless `showClearBtn`,
 * then Cancel and Done unless the picker writes its value without them.
 */
export function pickerFooter(
  footer: HTMLElement,
  { i18n, showClearBtn, autoSubmit }: { i18n: Partial<Record<'clear' | 'cancel' | 'done', string>>; showClearBtn: boolean; autoSubmit: boolean },
  clearClass: string,
  onClear: () => void,
  onConfirm: () => void,
  onCancel: () => void
) {
  footerButton(footer, i18n.clear, clearClass, onClear, showClearBtn);
  if (autoSubmit) return;
  const buttons = document.createElement('div');
  buttons.classList.add('confirmation-btns');
  footer.append(buttons);
  footerButton(buttons, i18n.cancel, 'btn-cancel', onCancel);
  footerButton(buttons, i18n.done, 'btn-confirm', onConfirm);
}

/**
 * An AbortController from the window `node` is in. Its signal removes
 * listeners added there, and jsdom rejects a signal from another window.
 */
export function controllerFor(node: Node): AbortController {
  return new (node.ownerDocument?.defaultView ?? window).AbortController();
}

/** An SVG element with its attributes. */
export function svgNode(name: string, attributes: Record<string, string> = {}): SVGElement {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const key in attributes) element.setAttribute(key, attributes[key]);
  return element;
}

/**
 * Class with utilitary functions for global usage.
 */
export class Utils {
  /**
   * Whether a keydown belongs to an IME composition, such as the Enter that
   * confirms a candidate. Safari reports `isComposing` false for that Enter,
   * so keyCode 229 covers it.
   */
  static isComposing(e: KeyboardEvent): boolean {
    return e.isComposing || e.keyCode === 229;
  }

  /**
   * `handler`, skipped for every key of an IME composition: while the user
   * picks a candidate, Enter, the arrows and Escape belong to the IME.
   */
  static ignoringComposition(handler: (e: KeyboardEvent) => void): (e: KeyboardEvent) => void {
    return (e) => {
      if (!Utils.isComposing(e)) handler(e);
    };
  }

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
   * The language an element is written in, from the nearest `lang`, or
   * undefined without one or for a tag the browser does not know.
   */
  static locale(el: Element): string | undefined {
    // Inside a shadow root the language comes from the host's tree, unless
    // something nearer sets one.
    let [node, lang]: [Element | undefined, string | undefined] = [el, undefined];
    while (node && lang === undefined) {
      lang = node.closest<HTMLElement>('[lang]')?.lang;
      node = (node.getRootNode() as ShadowRoot).host;
    }
    try {
      return lang ? Intl.getCanonicalLocales(lang)[0] : undefined;
    } catch {
      return undefined;
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
  static _keyIndex(key: string, index: number, count: number, steps: Record<string, number>) {
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
   * Retrieves target element id from trigger.
   * @param trigger Trigger element.
   */
  static getIdFromTrigger(trigger: HTMLElement): string {
    return trigger.dataset.target || (trigger.getAttribute('href')?.slice(1) ?? '');
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
      x -= rect.left + window.scrollX + parent.clientLeft - (root ? 0 : parent.scrollLeft);
      y -= rect.top + window.scrollY + parent.clientTop - (root ? 0 : parent.scrollTop);
    }
    el.style.top = y + 'px';
    el.style.left = x + 'px';
  }

  /**
   * Moves document coordinates so a `width` by `height` box stays in the
   * viewport. A box past the left or top edge, or within `offset` of it,
   * starts `offset` in; a box past the right or bottom edge, or within
   * `offset` of it, ends at that edge. `offset` is the margin plus the slide
   * distance, or minus it for right alignment.
   */
  static _repositionWithinScreen(
    x: number,
    y: number,
    width: number,
    height: number,
    margin: number,
    transitionMovement: number,
    align: string
  ) {
    const offset = margin + (align === 'right' ? -transitionMovement : transitionMovement);
    return {
      x: window.scrollX + fit(x - window.scrollX, width, window.innerWidth, offset),
      y: window.scrollY + fit(y - window.scrollY, height, window.innerHeight, offset)
    };
  }
}
