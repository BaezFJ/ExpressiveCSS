import { Utils } from '../core/utils';

export interface DockedDisplayPluginOptions {
  /**
   * Margin between element and docked container
   */
  margin: number,
  /**
   * Transition movement
   */
  transition: number,
  /**
   * Transition duration
   */
  duration: number,
  /**
   * The alignment of the docked container
   */
  align: string
}

const _defaults: DockedDisplayPluginOptions = {
  margin: 5,
  transition: 10,
  duration: 250,
  align: 'left'
}

export class DockedDisplayPlugin {
  private readonly el: HTMLElement;
  private readonly container: HTMLDivElement;
  private options: Partial<DockedDisplayPluginOptions>;
  private visible: boolean;
  /**
   * Elements whose clicks count as inside, beside the container: the element
   * the container docks to, and any other control that opens it, such as a
   * date range's end input. A click on one of those must not close it.
   */
  readonly triggers: HTMLElement[];

  constructor(el: HTMLElement, container: HTMLElement, options: Partial<DockedDisplayPluginOptions>) {
    this.el = el;
    this.triggers = [el];
    this.options = {
      ..._defaults,
      ...options
    };

    this.container = document.createElement('div');
    this.container.classList.add('display-docked');
    this.container.append(container);
    el.parentElement.append(this.container);
  }

  private _handleDocumentClick = (e: MouseEvent) => {
    if (!this.visible) return;
    const path = e.composedPath();
    if (![...this.triggers, this.container].some((inside) => path.includes(inside))) this.hide();
  };

  /** Eases the container to `y` pixels down and to `opacity`. */
  private _animate(y: number, opacity: string) {
    const { duration } = this.options;
    this.container.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    setTimeout(() => {
      this.container.style.transform = `translateX(0px) translateY(${y}px)`;
      this.container.style.opacity = opacity;
    }, 1);
  }

  /** Places the container below the element, kept on screen. */
  private _place() {
    const { margin, transition, align } = this.options;
    const { offsetHeight, offsetWidth } = this.el;
    const width = this.container.offsetWidth;
    const rect = this.el.getBoundingClientRect();
    let left = rect.left + window.scrollX;
    if (align === 'center') left += offsetWidth / 2 - width / 2;
    else if (align === 'right') left += offsetWidth - width - margin;
    const top = rect.top + window.scrollY + offsetHeight + margin;
    const coordinates = Utils._repositionWithinScreen(left, top, width, this.container.offsetHeight, margin, transition, align);
    Utils._placeInOffsetParent(this.container, coordinates);
  }

  /**
   * Tears the plugin down. While shown, the document listener holds a
   * reference to this instance - and through it the whole picker subtree - so
   * the owning component must call this from its own destroy().
   */
  destroy = () => {
    document.removeEventListener('click', this._handleDocumentClick);
    this.container.remove();
  };

  show = () => {
    if (this.visible) return;
    this.visible = true;
    document.addEventListener('click', this._handleDocumentClick);
    this._place();
    this.container.style.visibility = 'visible';
    this._animate(this.options.transition, '1');
  };

  hide = () => {
    if (!this.visible) return;
    this.visible = false;
    document.removeEventListener('click', this._handleDocumentClick);
    this.container.removeAttribute('style');
    this._animate(0, '0');
  };
}
