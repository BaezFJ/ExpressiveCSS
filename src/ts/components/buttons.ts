import { restoreAttribute } from '../core/utils';
import { Component, BaseOptions } from "../core/component";

export type FloatingActionButtonOptions = BaseOptions;

const _defaults: FloatingActionButtonOptions = {};

export class FloatingActionButton extends Component<FloatingActionButtonOptions> {
  isOpen: boolean;
  private _anchor: HTMLElement | null;
  private _list: HTMLElement | null;
  private _listWasInert: boolean;
  private _addedExpanded = false;
  private _anchorTabIndex: string | null | undefined;

  constructor(el: HTMLElement, options: Partial<FloatingActionButtonOptions>) {
    super(el, options);
    this.isOpen = false;
    this._anchor = this.el.querySelector(':scope > a, :scope > button');
    this._list = this.el.querySelector(':scope > ul, :scope > menu');
    this._listWasInert = this._list?.inert ?? false;
    this.el.classList.remove('active');
    if (this._list) this._list.inert = true;
    this._addedExpanded = !!this._anchor && !this._anchor.hasAttribute('aria-expanded');
    this._anchor?.setAttribute('aria-expanded', 'false');
    if (this._anchor instanceof HTMLAnchorElement && !this._anchor.hasAttribute('href')) {
      // An <a> reports tabIndex 0 with or without href, but it only takes focus
      // without href once it has the attribute.
      if (!this._anchor.hasAttribute('tabindex') || this._anchor.tabIndex < 0) {
        this._anchorTabIndex = this._anchor.getAttribute('tabindex');
        this._anchor.tabIndex = 0;
      }
      this._anchor.addEventListener('keydown', this._handleAnchorKeydown);
    }
    this.el.addEventListener('click', this._handleFABClick);
  }

  static get defaults() {
    return _defaults;
  }

  static key = 'Expressive_FloatingActionButton';

  destroy() {
    this.close();
    if (this._list) this._list.inert = this._listWasInert;
    this.el.removeEventListener('click', this._handleFABClick);
    this._anchor?.removeEventListener('keydown', this._handleAnchorKeydown);
    if (this._addedExpanded) this._anchor.removeAttribute('aria-expanded');
    if (this._anchorTabIndex !== undefined) restoreAttribute(this._anchor, 'tabindex', this._anchorTabIndex);
    super.destroy();
  }

  open = (): void => {
    if (this.isOpen) return;
    this.isOpen = true;
    if (this._list) this._list.inert = false;
    this.el.classList.add('active');
    this._anchor?.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', this._handleDocumentClick);
    document.addEventListener('keydown', this._handleDocumentKeydown);
  };

  close = (): void => {
    if (!this.isOpen) return;
    const focused = (this.el.getRootNode() as Document | ShadowRoot).activeElement;
    if (focused && this._list?.contains(focused)) this._anchor?.focus();
    if (this._list) this._list.inert = true;
    this.isOpen = false;
    this.el.classList.remove('active');
    this._anchor?.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', this._handleDocumentClick);
    document.removeEventListener('keydown', this._handleDocumentKeydown);
  };

  private _handleFABClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const control = target.closest('a, button');
    if (!control || control.matches(':disabled, [aria-disabled="true"]')) return;
    if (control === this._anchor) this._toggle();
    else if (this._list?.contains(control)) this.close();
  };

  private _handleAnchorKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._toggle();
    }
  };

  private _handleDocumentKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !e.defaultPrevented) this.close();
  };

  private _handleDocumentClick = (e: MouseEvent) => {
    if (e.composedPath().includes(this.el)) return;
    this.close();
  };

  private _toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }
}
