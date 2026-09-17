import { Carousel } from './carousel';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface TabsOptions extends BaseOptions {
  /**
   * Transition duration in milliseconds.
   * @default 300
   */
  duration: number;
  /**
   * Callback for when a new tab content is shown.
   * @default null
   */
  onShow: (newContent: Element) => void;
  /**
   * Set to true to enable swipeable tabs.
   * This also uses the responsiveThreshold option.
   * @default false
   */
  swipeable: boolean;
  /**
   * The maximum width of the screen, in pixels,
   * where the swipeable functionality initializes.
   * @default infinity
   */
  responsiveThreshold: number;
}

const _defaults: TabsOptions = {
  duration: 300,
  onShow: null,
  swipeable: false,
  responsiveThreshold: Infinity // breakpoint for swipeable
};

export class Tabs extends Component<TabsOptions> {
  _tabLinks: NodeListOf<HTMLAnchorElement>;
  _index: number;
  _indicator: HTMLElement;
  _tabWidth: number;
  _tabsWidth: number;
  _tabsCarousel: Carousel;
  _activeTabLink: HTMLAnchorElement;
  _content: HTMLElement;
  private _originalPanels = new Map<HTMLElement, { display: string; priority: string; active: boolean; carousel: boolean; marker?: Comment }>();
  private _originalLinks = new Map<HTMLAnchorElement, { active: boolean; current: string | null }>();

  constructor(el: HTMLElement, options: Partial<TabsOptions>) {
    super(el, options, Tabs);
    this.el['Expressive_Tabs'] = this;

    this.options = {
      ...Tabs.defaults,
      ...options
    };

    this._tabLinks = this._queryTabLinks();
    this._tabLinks.forEach(link => {
      this._originalLinks.set(link, { active: link.classList.contains('active'), current: link.getAttribute('aria-current') });
      if (link.hasAttribute('target')) return;
      const panel = link.hash && document.querySelector<HTMLElement>(link.hash);
      if (panel) this._originalPanels.set(panel, {
        display: panel.style.display, priority: panel.style.getPropertyPriority('display'),
        active: panel.classList.contains('active'), carousel: panel.classList.contains('carousel-item')
      });
    });
    this.options.swipeable &&= window.innerWidth <= this.options.responsiveThreshold;
    this._index = 0;
    this._setupActiveTabLink();
    if (this.options.swipeable) {
      this._setupSwipeableTabs();
    } else {
      this._setupNormalTabs();
    }
    // Setup tabs indicator after content to ensure accurate widths
    this._setTabsAndTabWidth();
    this._createIndicator();
    this._setupEventHandlers();
  }

  static get defaults(): TabsOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Tabs.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<TabsOptions>): Tabs;
  /**
   * Initializes instances of Tabs.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<InitElement>, options?: Partial<TabsOptions>): Tabs[];
  /**
   * Initializes instances of Tabs.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<TabsOptions> = {}
  ): Tabs | Tabs[] {
    return super.init(els, options, Tabs);
  }

  static getInstance(el: HTMLElement): Tabs {
    return el['Expressive_Tabs'];
  }

  destroy() {
    this._removeEventHandlers();
    this._indicator.remove();
    if (this.options.swipeable) {
      this._teardownSwipeableTabs();
    }
    this._originalPanels.forEach((original, panel) => {
      panel.style.setProperty('display', original.display, original.priority);
      panel.classList.toggle('active', original.active);
      panel.classList.toggle('carousel-item', original.carousel);
      if (!panel.className) panel.removeAttribute('class');
    });
    this._originalLinks.forEach((original, link) => {
      link.classList.toggle('active', original.active);
      if (original.current === null) link.removeAttribute('aria-current');
      else link.setAttribute('aria-current', original.current);
    });
    this.el['Expressive_Tabs'] = undefined;
  }

  /**
   * The index of tab that is currently shown.
   */
  get index() {
    return this._index;
  }

  _setupEventHandlers() {
    window.addEventListener('resize', this._handleWindowResize);
    this.el.addEventListener('click', this._handleTabClick);
  }

  _removeEventHandlers() {
    window.removeEventListener('resize', this._handleWindowResize);
    this.el.removeEventListener('click', this._handleTabClick);
  }

  _handleWindowResize = () => {
    this._setTabsAndTabWidth();
    if (this._tabWidth !== 0 && this._tabsWidth !== 0) {
      this._indicator.style.left = this._calcLeftPos(this._activeTabLink) + 'px';
      this._indicator.style.right = this._calcRightPos(this._activeTabLink) + 'px';
    }
  };

  _queryTabLinks() {
    return this.el.querySelectorAll<HTMLAnchorElement>(
      ':scope > a, :scope > .tab > a'
    );
  }

  _handleTabClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    if (!target) return;
    const tabLink = target.closest('a') as HTMLAnchorElement | null;
    if (!tabLink || !Array.from(this._tabLinks).includes(tabLink)) return;

    const tab = tabLink.parentElement;
    const disabled =
      tabLink.classList.contains('disabled') ||
      tabLink.getAttribute('aria-disabled') === 'true' ||
      tab?.classList.contains('disabled');
    if (disabled) {
      e.preventDefault();
      return;
    }
    // Act as regular link if target attribute is specified.
    if (tabLink.hasAttribute('target')) return;
    if (this.options.swipeable) {
      const panel = tabLink.hash && document.querySelector(tabLink.hash);
      const index = this._tabsCarousel.images.indexOf(panel as HTMLElement);
      if (index >= 0) this._tabsCarousel.set(index);
      e.preventDefault();
      return;
    }
    const _oldContent = this._content;
    // Update the variables with the new link and content
    if (tabLink.hash) this._content = document.querySelector(tabLink.hash);
    this._tabLinks = this._queryTabLinks();
    // Moves the class and aria-current together, off the old tab and onto this
    // one - they used to be able to disagree.
    const prevIndex = this._index;
    this._setActiveTabLink(tabLink);

    // Swap content
    if (this._content) {
      this._content.style.display = 'block';
      this._content.classList.add('active');
      if (typeof this.options.onShow === 'function')
        this.options.onShow.call(this, this._content);
      if (_oldContent && _oldContent !== this._content) {
        _oldContent.style.display = 'none';
        _oldContent.classList.remove('active');
      }
    }
    // Update widths after content is swapped (scrollbar bugfix)
    this._setTabsAndTabWidth();
    this._animateIndicator(prevIndex);
    e.preventDefault();
  };

  _createIndicator() {
    const tag = this.el.tagName === 'UL' || this.el.tagName === 'OL' ? 'li' : 'span';
    const indicator = document.createElement(tag);
    indicator.classList.add('indicator');
    this.el.appendChild(indicator);
    this._indicator = indicator;
    this._indicator.style.left = this._calcLeftPos(this._activeTabLink) + 'px';
    this._indicator.style.right = this._calcRightPos(this._activeTabLink) + 'px';
  }

  /**
   * Which tab is current, for the eye and for assistive technology.
   *
   * The class alone is a colour. `aria-current` is the part a screen reader
   * reads, and because tabs are navigation rather than a tablist (rule 2 -
   * there is no keyboard model here to back a tablist), "current" is exactly
   * the right word for it. Its *value* changes as the user clicks, which makes
   * maintaining it the component's job, not the author's - see CONTEXT.md on
   * static semantics versus dynamic state. Writing it once in the markup and
   * never moving it left the old tab announcing itself as current.
   */
  private _setActiveTabLink(tabLink: HTMLAnchorElement) {
    Array.from(this._tabLinks).forEach((a: HTMLAnchorElement) => {
      a.classList.remove('active');
      a.removeAttribute('aria-current');
    });
    this._activeTabLink = tabLink;
    tabLink.classList.add('active');
    tabLink.setAttribute('aria-current', 'page');
    this._index = Array.from(this._tabLinks).indexOf(tabLink);
    this._content = tabLink.hasAttribute('target') ? null : document.getElementById(tabLink.hash.slice(1));
  }

  _setupActiveTabLink() {
    // If the location.hash matches one of the links, use that as the active tab.
    this._activeTabLink = Array.from(this._tabLinks).find(
      (a: HTMLAnchorElement) => a.getAttribute('href') === location.hash
    );
    // If no match is found, use the first link or any with class 'active' as the initial active tab.
    if (!this._activeTabLink) {
      let activeTabLink = this.el.querySelector('a.active');
      if (!activeTabLink) {
        activeTabLink = this._tabLinks[0];
      }
      this._activeTabLink = activeTabLink as HTMLAnchorElement;
    }
    this._setActiveTabLink(this._activeTabLink);

    if (this._content) this._content.classList.add('active');
  }

  _setupSwipeableTabs() {
    const tabsContent = [];
    this._tabLinks.forEach((a) => {
      if (a.hash && !a.hasAttribute('target')) {
        const currContent = document.querySelector(a.hash);
        if (!currContent) return;
        currContent.classList.add('carousel-item');
        tabsContent.push(currContent);
      }
    });

    // Create Carousel-Wrapper around Tab-Contents
    const tabsWrapper = document.createElement('div');
    tabsWrapper.classList.add('tabs-content', 'carousel', 'flat');

    // Wrap around
    tabsContent[0].parentElement.insertBefore(tabsWrapper, tabsContent[0]);
    tabsContent.forEach((tabContent) => {
      const marker = document.createComment('');
      tabContent.before(marker);
      this._originalPanels.get(tabContent).marker = marker;
      tabsWrapper.appendChild(tabContent);
      tabContent.style.display = '';
    });

    this._tabsCarousel = Carousel.init(tabsWrapper, {
      fullWidth: true,
      noWrap: true,
      duration: this.options.duration,
      onCycleTo: (item) => {
        const prevIndex = this._index;
        this._setActiveTabLink(Array.from(this._tabLinks).find(a => !a.hasAttribute('target') && a.hash === '#' + item.id));
        this._setTabsAndTabWidth();
        this._animateIndicator(prevIndex);
        if (typeof this.options.onShow === 'function')
          this.options.onShow.call(this, this._content);
      }
    });
  }

  _teardownSwipeableTabs() {
    const tabsWrapper = this._tabsCarousel.el;
    this._tabsCarousel.destroy();
    this._originalPanels.forEach((original, panel) => original.marker?.replaceWith(panel));
    tabsWrapper.remove();
  }

  _setupNormalTabs() {
    // Hide Tabs Content
    Array.from(this._tabLinks).forEach((a) => {
      if (a === this._activeTabLink || a.hasAttribute('target')) return;
      if ((<HTMLAnchorElement>a).hash) {
        const currContent = document.querySelector((<HTMLAnchorElement>a).hash);
        if (currContent) (<HTMLElement>currContent).style.display = 'none';
      }
    });
  }

  _setTabsAndTabWidth() {
    this._tabsWidth = this.el.getBoundingClientRect().width;
    this._tabWidth = Math.max(this._tabsWidth, this.el.scrollWidth) / this._tabLinks.length;
  }

  _calcRightPos(el) {
    return Math.ceil(this._tabsWidth - el.offsetLeft - el.getBoundingClientRect().width);
  }

  _calcLeftPos(el) {
    return Math.floor(el.offsetLeft);
  }

  /**
   * Recalculate tab indicator position. This is useful when
   * the indicator position is not correct.
   */
  updateTabIndicator() {
    this._setTabsAndTabWidth();
    this._animateIndicator(this._index);
  }

  _animateIndicator(prevIndex) {
    let leftDelay = 0,
      rightDelay = 0;

    const isMovingLeftOrStaying = this._index - prevIndex >= 0;
    if (isMovingLeftOrStaying) leftDelay = 90;
    else rightDelay = 90;

    // in v1: easeOutQuad
    this._indicator.style.transition = `
      left ${this.options.duration}ms ease-out ${leftDelay}ms,
      right ${this.options.duration}ms ease-out ${rightDelay}ms`;

    this._indicator.style.left = this._calcLeftPos(this._activeTabLink) + 'px';
    this._indicator.style.right = this._calcRightPos(this._activeTabLink) + 'px';
  }

  /**
   * Show tab content that corresponds to the tab with the id.
   * @param tabId The id of the tab that you want to switch to.
   */
  select(tabId: string) {
    const tab = Array.from(this._tabLinks).find(
      (a: HTMLAnchorElement) => a.getAttribute('href') === '#' + tabId
    );
    if (tab) (<HTMLAnchorElement>tab).click();
  }
}
