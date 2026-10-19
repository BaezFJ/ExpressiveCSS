import { Component, BaseOptions, InitElements, InitElement } from '../core/component';
import { Utils } from '../core/utils';

export interface TabsOptions extends BaseOptions {
  /**
   * Indicator transition duration in milliseconds, on an ease-out curve. The
   * default, null, follows the --md-comp-tabs-indicator-duration and
   * --md-comp-tabs-indicator-easing spring tokens instead.
   * @default null
   */
  duration: number | null;
  /**
   * Callback for when a new tab content is shown.
   * @default null
   */
  onShow: (newContent: Element) => void;
  /**
   * Set to true to swipe between panels. The panels move into a full-width
   * scroll-snap track, so touch and trackpad swipes are native scrolling.
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

/** Left and Right move between tabs the way they point, so they swap in RTL. */
const STEPS = { ltr: { ArrowLeft: -1, ArrowRight: 1 }, rtl: { ArrowLeft: 1, ArrowRight: -1 } };

const _defaults: TabsOptions = {
  duration: null,
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
  _track: HTMLElement;
  private _panels: HTMLElement[] = [];
  // The panel a programmatic scroll is heading for. Scroll events on the way
  // there pass over other panels and must not select them.
  private _scrollTarget: number | null = null;
  private _scrollTimer: ReturnType<typeof setTimeout>;
  private _trackObserver: ResizeObserver | null = null;
  private _trackWidth = -1;
  _activeTabLink: HTMLAnchorElement;
  _content: HTMLElement;
  private _originalPanels = new Map<HTMLElement, { display: string; priority: string; active: boolean; inert: boolean; marker?: Comment }>();
  private _originalLinks = new Map<HTMLAnchorElement, { active: boolean; current: string | null }>();

  constructor(el: HTMLElement, options: Partial<TabsOptions>) {
    super(el, options, Tabs);
    this.el['Expressive_Tabs'] = this;

    this.options = {
      ...Tabs.defaults,
      ...options
    };

    this._tabLinks = this._queryTabLinks();
    if (!this._tabLinks.length) {
      console.error('Tabs: no tab links (an <a> child) to show');
      return;
    }
    this._tabLinks.forEach(link => {
      this._originalLinks.set(link, { active: link.classList.contains('active'), current: link.getAttribute('aria-current') });
      const panel = this._panelFor(link);
      if (panel) this._originalPanels.set(panel, {
        display: panel.style.display, priority: panel.style.getPropertyPriority('display'),
        active: panel.classList.contains('active'), inert: panel.inert
      });
    });
    // Swiping needs at least one panel the links resolve to.
    this.options.swipeable &&= window.innerWidth <= this.options.responsiveThreshold && this._originalPanels.size > 0;
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
    // Labels measured before a web font arrives have the fallback's width,
    // and nothing else re-measures them until the window resizes.
    document.fonts?.ready.then(() => {
      if (this.el['Expressive_Tabs'] === this) this._handleWindowResize();
    });
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
    this._indicator?.remove();
    if (this._track) {
      this._teardownSwipeableTabs();
    }
    this._originalPanels.forEach((original, panel) => {
      panel.style.setProperty('display', original.display, original.priority);
      panel.classList.toggle('active', original.active);
      panel.inert = original.inert;
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
    this.el.addEventListener('keydown', this._handleKeydown);
  }

  _removeEventHandlers() {
    window.removeEventListener('resize', this._handleWindowResize);
    this.el.removeEventListener('click', this._handleTabClick);
    this.el.removeEventListener('keydown', this._handleKeydown);
  }

  /**
   * Left and Right move focus to the next tab, wrapping at the ends, and
   * Home and End to the first and last; disabled tabs are skipped. Focus
   * moves without choosing: Enter follows the link as before. Each tab
   * stays a Tab stop and a link, so the keys add a shortcut rather than a
   * composite the markup would have to announce.
   */
  _handleKeydown = (e: KeyboardEvent) => {
    const steps = STEPS[getComputedStyle(this.el).direction === 'rtl' ? 'rtl' : 'ltr'];
    const target = Utils.focusTarget(Array.from(this._tabLinks), e, steps, true);
    if (!target) return;
    e.preventDefault();
    target.focus();
  };

  // Throttled like Carousel's: every bar re-measures on resize, and the left
  // and right positions are both read before either is written.
  _handleWindowResize = Utils.throttle(() => {
    this._setTabsAndTabWidth();
    if (this._tabWidth !== 0 && this._tabsWidth !== 0) this._positionIndicator();
  }, 200);

  _queryTabLinks() {
    return this.el.querySelectorAll<HTMLAnchorElement>(':scope > a');
  }

  _handleTabClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    if (!target) return;
    const tabLink = target.closest('a');
    if (!tabLink || !Array.from(this._tabLinks).includes(tabLink)) return;

    const disabled =
      tabLink.classList.contains('disabled') ||
      tabLink.getAttribute('aria-disabled') === 'true';
    if (disabled) {
      e.preventDefault();
      return;
    }
    // Act as regular link if target attribute is specified.
    if (tabLink.hasAttribute('target')) return;
    if (this.options.swipeable) {
      e.preventDefault();
      if (!this._panels.includes(this._panelFor(tabLink))) return;
      if (tabLink !== this._activeTabLink) this._showPanel(tabLink);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._scrollToActivePanel(reduce ? 'instant' : 'smooth');
      return;
    }
    const _oldContent = this._content;
    this._tabLinks = this._queryTabLinks();
    // Moves the class and aria-current together, off the old tab and onto this
    // one - they used to be able to disagree.
    const prevIndex = this._index;
    this._setActiveTabLink(tabLink);

    // Swap content
    if (this._content) {
      // Clear the hide rather than force 'block', so a flex or grid panel
      // keeps the display its stylesheet gives it.
      this._content.style.display = '';
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
    const indicator = document.createElement('span');
    indicator.classList.add('indicator');
    this.el.appendChild(indicator);
    this._indicator = indicator;
    this._positionIndicator();
  }

  /** Reads both positions before writing either. */
  private _positionIndicator() {
    const left = this._calcLeftPos(this._activeTabLink);
    const right = this._calcRightPos(this._activeTabLink);
    this._indicator.style.left = left + 'px';
    this._indicator.style.right = right + 'px';
  }

  /** The panel a link shows, or null for a `target` link or one without a hash. */
  private _panelFor(a: HTMLAnchorElement): HTMLElement | null {
    if (!a.hash || a.hasAttribute('target')) return null;
    // Looked up in the tabs' own root, so panels inside a shadow root resolve.
    return Utils.getElementById(this.el, Tabs._decodeHash(a.hash));
  }

  /**
   * The id a hash names. `a.hash` and `location.hash` come back
   * percent-encoded, so a non-ASCII id would never match without this. A
   * malformed escape throws, and is then taken as written.
   */
  private static _decodeHash(hash: string): string {
    try {
      return decodeURIComponent(hash.slice(1));
    } catch {
      return hash.slice(1);
    }
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
    Array.from(this._tabLinks).forEach(a => {
      a.classList.remove('active');
      a.removeAttribute('aria-current');
    });
    this._activeTabLink = tabLink;
    tabLink.classList.add('active');
    tabLink.setAttribute('aria-current', 'page');
    this._index = Array.from(this._tabLinks).indexOf(tabLink);
    this._content = this._panelFor(tabLink);
  }

  _setupActiveTabLink() {
    // If the location.hash matches one of the links, use that as the active tab.
    // If no match is found, use any with class 'active', then the first link.
    // Both sides decoded: an href may be written with or without escapes.
    const hash = location.hash && Tabs._decodeHash(location.hash);
    this._activeTabLink =
      Array.from(this._tabLinks).find(a => hash && Tabs._decodeHash(a.getAttribute('href') ?? '') === hash) ??
      this.el.querySelector<HTMLAnchorElement>('a.active') ??
      this._tabLinks[0];
    this._setActiveTabLink(this._activeTabLink);

    this._originalPanels.forEach((_, panel) => panel.classList.toggle('active', panel === this._content));
  }

  _setupSwipeableTabs() {
    this._panels = [...new Set(Array.from(this._tabLinks, (a) => this._panelFor(a)).filter(Boolean))];
    const track = document.createElement('div');
    track.classList.add('tabs-content');
    this._panels[0].before(track);
    this._panels.forEach((panel) => {
      const marker = document.createComment('');
      panel.before(marker);
      this._originalPanels.get(panel).marker = marker;
      track.appendChild(panel);
      panel.style.display = '';
    });
    this._track = track;
    this._syncPanels();
    track.addEventListener('scroll', this._handleTrackScroll, { passive: true });
    // A swipe or wheel that interrupts a programmatic scroll takes over from it.
    track.addEventListener('pointerdown', this._releaseScrollTarget, { passive: true });
    track.addEventListener('wheel', this._releaseScrollTarget, { passive: true });
    // A track that starts hidden (in a closed dialog or sheet) is 0px wide, so
    // the scroll below cannot reach the active panel. Re-align whenever the
    // track's width changes, which also covers window resizes. Only the width:
    // a panel growing taller mid-swipe must not pull the track back.
    if (typeof ResizeObserver !== 'undefined') {
      this._trackObserver = new ResizeObserver(() => {
        if (track.clientWidth === this._trackWidth) return;
        this._trackWidth = track.clientWidth;
        this._scrollToActivePanel('instant');
      });
      this._trackObserver.observe(track);
    }
    this._scrollToActivePanel('instant');
  }

  _teardownSwipeableTabs() {
    const track = this._track;
    this._trackObserver?.disconnect();
    this._trackObserver = null;
    this._releaseScrollTarget();
    track.removeEventListener('scroll', this._handleTrackScroll);
    track.removeEventListener('pointerdown', this._releaseScrollTarget);
    track.removeEventListener('wheel', this._releaseScrollTarget);
    this._originalPanels.forEach((original, panel) => original.marker?.replaceWith(panel));
    track.remove();
    this._track = undefined;
  }

  /** Only the shown panel is reachable; the others are off to the side. */
  private _syncPanels() {
    this._panels.forEach((panel) => {
      panel.classList.toggle('active', panel === this._content);
      panel.inert = panel !== this._content;
    });
  }

  /** The panel the track is mostly showing. Panels are exactly one track wide. */
  private _trackIndex() {
    return Math.round(Math.abs(this._track.scrollLeft) / (this._track.clientWidth || 1));
  }

  /**
   * Whether panel `index` fills the track. Compare positions, not rounded
   * indexes: a scroll still on its way to another panel can already round to
   * this one. Measured rather than computed from clientWidth, which rounds a
   * fractional track width, while the mandatory snap lands on the real edge.
   */
  private _trackAt(index: number) {
    return Math.abs(this._panels[index].getBoundingClientRect().left - this._track.getBoundingClientRect().left) < 1;
  }

  private _scrollToActivePanel(behavior: ScrollBehavior) {
    const index = this._panels.indexOf(this._content);
    if (index < 0 || this._trackAt(index)) return;
    // scrollLeft runs negative in a right-to-left track.
    const sign = getComputedStyle(this._track).direction === 'rtl' ? -1 : 1;
    const left = sign * index * this._track.clientWidth;
    this._scrollTarget = index;
    this._waitForScroll();
    this._track.scrollTo({ left, behavior });
  }

  // A smooth scroll that something cut short never arrives, and on a busy page
  // one can also take a while to start. Once the track has been still for half
  // a second, jump to the selected panel. The selection stands: a swipe or
  // wheel that took over has already released the target, so the scroll
  // events that follow choose the panel. Every scroll event restarts the wait.
  private _waitForScroll() {
    clearTimeout(this._scrollTimer);
    this._scrollTimer = setTimeout(() => {
      this._releaseScrollTarget();
      this._scrollToActivePanel('instant');
    }, 500);
  }

  _releaseScrollTarget = () => {
    clearTimeout(this._scrollTimer);
    this._scrollTarget = null;
  };

  _handleTrackScroll = () => {
    if (this._scrollTarget !== null) {
      // Release on arrival. A smooth scroll still heading to the previous
      // selection rounds to the new target on its way past, and releasing
      // there let the rest of that scroll select the panel it was heading to.
      if (this._trackAt(this._scrollTarget)) this._releaseScrollTarget();
      else this._waitForScroll();
      return;
    }
    const panel = this._panels[this._trackIndex()];
    if (!panel || panel === this._content) return;
    this._showPanel(Array.from(this._tabLinks).find((a) => this._panelFor(a) === panel));
  };

  private _showPanel(tabLink: HTMLAnchorElement) {
    const prevIndex = this._index;
    this._setActiveTabLink(tabLink);
    this._syncPanels();
    this._setTabsAndTabWidth();
    this._animateIndicator(prevIndex);
    if (typeof this.options.onShow === 'function') this.options.onShow.call(this, this._content);
  }

  _setupNormalTabs() {
    // Hide Tabs Content
    Array.from(this._tabLinks).forEach((a) => {
      if (a === this._activeTabLink) return;
      const currContent = this._panelFor(a);
      if (currContent) currContent.style.display = 'none';
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
    // The trailing edge waits 30% of the move, so the bar stretches toward
    // the new tab before it shrinks. On the spring tokens that delay scales
    // with the spring and drops to 0 with it under reduced motion.
    const ms = this.options.duration;
    const timing = ms == null
      ? ['var(--md-comp-tabs-indicator-duration) var(--md-comp-tabs-indicator-easing)', 'calc(var(--md-comp-tabs-indicator-duration) * 0.3)']
      : [`${ms}ms ease-out`, `${ms * 0.3}ms`];
    const [leftDelay, rightDelay] = this._index - prevIndex >= 0 ? [timing[1], '0s'] : ['0s', timing[1]];
    this._indicator.style.transition = `left ${timing[0]} ${leftDelay}, right ${timing[0]} ${rightDelay}`;

    this._positionIndicator();
  }

  /**
   * Show tab content that corresponds to the tab with the id.
   * @param tabId The id of the tab that you want to switch to.
   */
  select(tabId: string) {
    const tab = Array.from(this._tabLinks).find(a => a.getAttribute('href') === '#' + tabId);
    if (tab) tab.click();
  }
}
