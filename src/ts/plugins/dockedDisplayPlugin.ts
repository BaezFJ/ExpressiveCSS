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

  // @todo move to Util? -> duplicate code fragment with tooltip
  // easeOutCubic
  private get _transition() {
    return `
      transform ${this.options.duration}ms ease-out,
      opacity ${this.options.duration}ms ease-out`;
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

  /**
   * Initializes instance of DockedDisplayPlugin
   * @param el HTMLElement to position to
   * @param container HTMLElement to be positioned
   * @param options Plugin options
   */
  static init(el: HTMLElement, container: HTMLElement, options?: Partial<DockedDisplayPluginOptions>): DockedDisplayPlugin {
    return new DockedDisplayPlugin(el, container, options);
  }

  show = () => {
    if (this.visible) return;
    this.visible = true;
    document.addEventListener('click', this._handleDocumentClick);
    const coordinates = Utils._setAbsolutePosition(this.el, this.container, this.options.margin, this.options.transition, this.options.align);

    this.container.style.visibility = 'visible';
    this.container.style.transition = this._transition;
    setTimeout(() => {
      this.container.style.transform = `translateX(${coordinates.x}px) translateY(${coordinates.y}px)`;
      this.container.style.opacity = '1';
    }, 1);
  };

  hide = () => {
    if (!this.visible) return;
    this.visible = false;
    document.removeEventListener('click', this._handleDocumentClick);
    this.container.removeAttribute('style');
    this.container.style.transition = this._transition;
    setTimeout(() => {
      this.container.style.transform = `translateX(0px) translateY(0px)`;
      this.container.style.opacity = '0';
    }, 1);
  };
}
