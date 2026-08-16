import { Component, BaseOptions, InitElements, MElement } from '../core/component';

export interface ParallaxOptions extends BaseOptions {
  /**
   * @deprecated Motion is CSS (`animation-timeline: view()`). This value
   * is accepted so existing AutoInit calls keep compiling, and is ignored.
   * @default 0
   */
  responsiveThreshold: number;
}

const _defaults: ParallaxOptions = {
  responsiveThreshold: 0
};

/**
 * Parallax. The effect is CSS (see components/_parallax.scss). This class
 * exists so AutoInit / getInstance / destroy keep working; it does not
 * attach scroll or resize listeners.
 */
export class Parallax extends Component<ParallaxOptions> {
  constructor(el: HTMLElement, options: Partial<ParallaxOptions>) {
    super(el, options, Parallax);
    this.el['Expressive_Parallax'] = this;

    this.options = {
      ...Parallax.defaults,
      ...options
    };

    if (!this.el.querySelector('img, video')) {
      console.error('Parallax: no <img> or <video> to move inside the .parallax element');
    }
  }

  static get defaults(): ParallaxOptions {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<ParallaxOptions>): Parallax;
  static init(els: InitElements<MElement>, options?: Partial<ParallaxOptions>): Parallax[];
  static init(
    els: HTMLElement | InitElements<MElement>,
    options: Partial<ParallaxOptions> = {}
  ): Parallax | Parallax[] {
    return super.init(els, options, Parallax);
  }

  static getInstance(el: HTMLElement): Parallax {
    return el['Expressive_Parallax'];
  }

  destroy() {
    this.el['Expressive_Parallax'] = undefined;
  }
}
