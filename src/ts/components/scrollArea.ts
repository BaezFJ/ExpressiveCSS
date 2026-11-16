import { Component, BaseOptions } from '../core/component';

/** A decorative vertical scrollbar for the page. Scrolling stays native. */
export class ScrollArea extends Component<BaseOptions> {
  static key = 'Expressive_ScrollArea';
  private _bar?: HTMLDivElement;

  constructor(el: HTMLElement, options: Partial<BaseOptions> = {}) {
    super(el, options);
    const doc = el.ownerDocument;
    if (el !== doc.documentElement) return;
    this._bar = doc.createElement('div');
    this._bar.className = 'scroll-area-bar';
    this._bar.setAttribute('aria-hidden', 'true');
    const thumb = doc.createElement('div');
    thumb.className = 'scroll-area-thumb';
    this._bar.append(thumb);
    el.append(this._bar);
  }

  destroy(): void {
    this._bar?.remove();
    super.destroy();
  }
}
