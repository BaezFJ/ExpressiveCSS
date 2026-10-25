import { Component, BaseOptions } from '../core/component';
import { Utils, controllerFor } from '../core/utils';

export interface BackToTopOptions extends BaseOptions {
  /**
   * How far the window scrolls before the link shows, as a CSS length from
   * the top of the page. Viewport units follow window resizes.
   * @default '100vh'
   */
  threshold: string;
}

const _defaults: BackToTopOptions = {
  threshold: '100vh'
};

// A modified click opens the link the browser's way: Ctrl, Meta or Shift
// for a new tab or window, Alt to download.
const modified = (e: MouseEvent) => e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;

/**
 * Back-to-top link. The link stays inert, so hidden, until the window has
 * scrolled past `threshold`. Activating it scrolls to the top and focuses
 * the element its `href` names, or the body.
 *
 * Observation is IntersectionObserver on a sentinel at the threshold, as in
 * AppBar, so a scroll tick reads no layout.
 */
export class BackToTop extends Component<BackToTopOptions> {
  private _observer: IntersectionObserver | null = null;
  private _sentinel: HTMLElement | null = null;
  // The target given tabindex="-1" for one focus move, and its blur listener.
  private _temporary: HTMLElement | null = null;
  private _blur: AbortController | null = null;
  // Whether the window is above the threshold, as the observer last said.
  private _above = true;

  constructor(el: HTMLElement, options: Partial<BackToTopOptions>) {
    super(el, options);
    this.el.setAttribute('inert', '');
    // Absolute in the body, so `top` measures from the top of the page. Zero
    // height and no pointer events keep it out of the layout and the way.
    this._sentinel = this.el.ownerDocument.createElement('span');
    this._sentinel.setAttribute('aria-hidden', 'true');
    this._sentinel.style.cssText = 'position:absolute;inset-inline-start:0;height:0;pointer-events:none;visibility:hidden';
    this._setThreshold(this.options.threshold);
    this.el.ownerDocument.body.prepend(this._sentinel);
    this._observer = new IntersectionObserver(this._onIntersect);
    this._observer.observe(this._sentinel);
    const { signal } = this._events;
    this.el.addEventListener('click', this._onClick, { signal });
    this.el.addEventListener('blur', this._update, { signal });
  }

  static get defaults(): BackToTopOptions {
    return _defaults;
  }

  static key = 'Expressive_BackToTop';

  destroy() {
    this._observer?.disconnect();
    this._observer = null;
    this._sentinel?.remove();
    this._sentinel = null;
    this._clearTabindex();
    this.el.removeAttribute('inert');
    super.destroy();
  }

  // The style setter drops a value that is not a length, which would leave
  // the sentinel at the top of the body and show the link at once.
  private _setThreshold(threshold: string) {
    this._sentinel.style.top = threshold;
    if (this._sentinel.style.top) return;
    console.warn(`BackToTop ignored threshold "${threshold}": expected a CSS length.`, this.el);
    this._sentinel.style.top = _defaults.threshold;
  }

  // Shown once the sentinel is above the viewport. A sentinel below it, on a
  // page that has not scrolled that far, keeps the link hidden.
  private _onIntersect = (entries: IntersectionObserverEntry[]) => {
    const entry = entries[entries.length - 1];
    if (!entry) return;
    this._above = entry.isIntersecting || entry.boundingClientRect.top >= 0;
    this._update();
  };

  // A focused link stays until it loses focus, because an inert one would
  // drop focus to the body, as pressing Home on it does.
  private _update = () => {
    this.el.toggleAttribute('inert', this._above && !this.el.matches(':focus'));
  };

  // Focus first, so nothing focus does can interrupt the scroll. Smooth and
  // instant scrolls both end at the top with focus kept (probed 2026-10-25).
  private _onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || modified(e)) return;
    e.preventDefault();
    this._focus(this._target());
    const view = this.el.ownerDocument.defaultView;
    const reduce = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    view.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' });
  };

  // The element the href names; `#`, `#top` or a missing id mean the body.
  private _target(): HTMLElement {
    const fragment = /^#(.+)/.exec(String(this.el.getAttribute('href')));
    return (fragment && Utils.getElementById(this.el, fragment[1])) || this.el.ownerDocument.body;
  }

  // A target that does not take focus gets tabindex="-1" until it loses
  // focus, so its Tab behavior afterwards is the author's.
  private _focus(target: HTMLElement) {
    target.focus({ preventScroll: true });
    if (this._focused(target)) return;
    this._clearTabindex();
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    this._temporary = target;
    this._blur = controllerFor(target);
    target.addEventListener('blur', this._clearTabindex, { once: true, signal: this._blur.signal });
  }

  // The body is the active element whenever nothing else is, so it only took
  // focus if it has a tabindex.
  private _focused(target: HTMLElement) {
    if (target === target.ownerDocument.body) return target.hasAttribute('tabindex');
    return (target.getRootNode() as Document | ShadowRoot).activeElement === target;
  }

  private _clearTabindex = () => {
    this._blur?.abort();
    this._temporary?.removeAttribute('tabindex');
    this._temporary = this._blur = null;
  };
}
