import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElement, InitElements } from '../core/component';

/** `[longitude, latitude]`, MapLibre's order. */
export type LngLat = [number, number];

/**
 * The parts of the `maplibre-gl` module this component uses. Declared here so
 * the published types do not depend on MapLibre.
 */
export interface MapLibre {
  Map: new (options: MapInit) => MapInstance;
  Marker: new (options: object) => MapMarker;
  Popup: new (options: object) => MapPopup;
}

/**
 * What `new Map()` gets. Only the container is declared; the style, center,
 * zoom and `mapOptions` ride along, and MapLibre types them itself.
 */
export interface MapInit {
  container: HTMLElement;
}

/** A point on the map, as MapLibre hands it back. */
export interface MapLngLat {
  lng: number;
  lat: number;
}

/** A map click, with the DOM event behind it and, on a layer, the features hit. */
export interface MapMouseEvent {
  originalEvent: MouseEvent;
  lngLat: MapLngLat;
  features?: Array<{ properties: Record<string, unknown>; geometry: { coordinates: LngLat } }>;
}

export interface MapMarker {
  getElement(): HTMLElement;
  getLngLat(): MapLngLat;
  setLngLat(at: LngLat | MapLngLat): this;
  addTo(map: MapInstance): this;
  on(event: 'dragstart' | 'dragend', callback: () => void): unknown;
  remove(): unknown;
}

export interface MapPopup {
  getElement(): HTMLElement | undefined;
  setDOMContent(content: Node): this;
  setLngLat(at: LngLat | MapLngLat): this;
  addTo(map: MapInstance): this;
  isOpen(): boolean;
  on(event: 'open' | 'close', callback: () => void): unknown;
  remove(): unknown;
}

/** A style layer, as `getStyle()` lists them. */
export interface MapLayer {
  id: string;
  source?: string;
  layout?: Record<string, unknown>;
}

/** A source, as `getSource()` returns it. */
export interface MapSource {
  type: string;
}

/** A clustered GeoJSON source, which is what `addClusters()` registers. */
export interface MapClusterSource extends MapSource {
  getClusterExpansionZoom(clusterId: unknown): Promise<number>;
}

/** The parts of a `maplibre-gl` `Map` this component calls. */
export interface MapInstance {
  on(event: string, listener: (e: MapMouseEvent) => void): unknown;
  on(event: string, layer: string, listener: (e: MapMouseEvent) => void): unknown;
  off(event: string, layer: string, listener: (e: MapMouseEvent) => void): unknown;
  remove(): void;
  zoomIn(): unknown;
  zoomOut(): unknown;
  resetNorthPitch(): unknown;
  getZoom(): number;
  getMinZoom(): number;
  getMaxZoom(): number;
  getBearing(): number;
  getCanvas(): HTMLCanvasElement;
  getStyle(): { glyphs?: string; layers: MapLayer[] };
  setStyle(style: string | object | null, options?: { diff?: boolean }): unknown;
  getSource(id: string): MapSource | undefined;
  addSource(id: string, source: object): unknown;
  removeSource(id: string): unknown;
  addLayer(layer: object): unknown;
  removeLayer(id: string): unknown;
  project(at: MapLngLat): { x: number; y: number };
  unproject(point: [number, number]): MapLngLat;
  panBy(offset: [number, number]): unknown;
  flyTo(options: { center: LngLat; zoom: number }): unknown;
  easeTo(options: { center: LngLat; zoom: number }): unknown;
}

/** A style for each color scheme. The map follows the page's theme. */
export interface MapThemedStyle {
  light: string | object;
  dark: string | object;
}

export interface MapViewOptions<L extends MapLibre = MapLibre> extends BaseOptions {
  /**
   * The `maplibre-gl` module. ExpressiveCSS does not bundle MapLibre, so the
   * page imports it and passes it in.
   * @default null
   */
  maplibregl: L | null;
  /**
   * A MapLibre style URL or object, or `{ light, dark }` to follow the theme.
   * @default OpenFreeMap Positron and Dark
   */
  style: string | object | MapThemedStyle;
  /**
   * Starting `[longitude, latitude]`.
   * @default [0, 20]
   */
  center: LngLat;
  /**
   * Starting zoom level.
   * @default 1
   */
  zoom: number;
  /**
   * More MapLibre `Map` options, such as `maxZoom` or `bearing`.
   * @default {}
   */
  mapOptions: object;
}

export interface MapLineOptions {
  /** CSS color. Defaults to the route or arc color token. */
  color?: string;
  /** Width in pixels. Routes default to 4, arcs to 2. */
  width?: number;
  /** 0 to 1. */
  opacity?: number;
  /** Dash and gap lengths in line widths, such as `[2, 2]`. */
  dashArray?: number[];
}

export interface MapArc {
  from: LngLat;
  to: LngLat;
}

export interface MapClusterOptions {
  /** CSS color. Defaults to the cluster color token. */
  color?: string;
  /**
   * Pixels within which points join a cluster.
   * @default 50
   */
  radius?: number;
  /**
   * Last zoom level that clusters points.
   * @default 14
   */
  maxZoom?: number;
}

const OPENFREEMAP = 'https://tiles.openfreemap.org/styles/';

const _defaults: MapViewOptions = {
  maplibregl: null,
  style: { light: `${OPENFREEMAP}positron`, dark: `${OPENFREEMAP}dark` },
  center: [0, 20],
  zoom: 1,
  mapOptions: {}
};

type Overlay = { draw: () => void; off?: () => void };

const isLngLat = (value: number[]): value is LngLat =>
  value.length === 2 && value.every(Number.isFinite) && Math.abs(value[1]) <= 90;

// MapLibre throws on a bad position only after the map exists, which leaked
// the map and stopped every later element in the same init(). A value that
// is not "lng,lat", such as Google's lat,lng order past 90, is skipped.
const lngLat = (el: HTMLElement): LngLat | null => {
  // Number('') is 0, so an empty part ("12.5,") becomes NaN and fails.
  const value = el.dataset.lngLat.split(',').map((part) => (part.trim() ? Number(part) : NaN));
  if (isLngLat(value)) return value;
  console.warn(`MapView skipped data-lng-lat="${el.dataset.lngLat}": expected "longitude,latitude".`, el);
  return null;
};

/** The elements with a usable `data-lng-lat`, each paired with its position. */
const positioned = (elements: HTMLElement[]) =>
  elements.map((el) => [el, lngLat(el)] as const).filter((pair): pair is readonly [HTMLElement, LngLat] => pair[1] !== null);

// A quadratic Bézier from `from` to `to`, bowed north of an eastward line.
// ponytail: drawn in degrees, so an arc across the antimeridian goes the long
// way round; split it at ±180 if that matters.
function arc([x0, y0]: LngLat, [x2, y2]: LngLat, steps = 32): LngLat[] {
  const bow = x2 >= x0 ? 0.25 : -0.25;
  const x1 = (x0 + x2) / 2 - (y2 - y0) * bow;
  const y1 = (y0 + y2) / 2 + (x2 - x0) * bow;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps, u = 1 - t;
    return [u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2];
  });
}

// How far each arrow key nudges a focused draggable marker, in steps.
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const plainArrow = (e: KeyboardEvent) => (Utils.plainKey(e) ? ARROWS[e.key] : undefined);

/**
 * An interactive map built on MapLibre: a `.map` holding `.map-marker`,
 * `.map-popup` and `.map-controls` children.
 *
 * Each marker sits at its `data-lng-lat`. A marker button with
 * `aria-controls` opens the `.map-popup` it names; a popup with its own
 * `data-lng-lat` and no marker opens at init. Buttons in `.map-controls`
 * run their `data-action`: `zoom-in`, `zoom-out`, `compass`, `locate`,
 * `fullscreen` or `pan-up`, `pan-down`, `pan-left` and `pan-right`. A
 * `data-draggable` marker moves without a drag too: a tap picks it up and
 * the next tap on the map drops it, and the arrow keys nudge it. Routes, arcs and clusters are data, so they are added from
 * script. The default style follows the page's light or dark theme, and
 * line and cluster colors come from the theme.
 *
 * The class is `MapView` rather than `Map` so importing it does not shadow
 * JavaScript's `Map`.
 */
export class MapView<L extends MapLibre = MapLibre> extends Component<MapViewOptions<L>> {
  /**
   * The MapLibre map, with the full type of the `maplibregl` passed to the
   * constructor; `init()` and `getInstance()` see the `MapInstance` subset.
   */
  map: InstanceType<L['Map']> | null = null;
  /** The MapLibre markers made from `.map-marker` children, in order. */
  markers: MapMarker[] = [];
  private _children: Element[] = [];
  private _popups: MapPopup[] = [];
  private _markerPopups = new Map<HTMLElement, MapPopup>();
  private _overlays = new Map<string, Overlay>();
  private _styleReady = false;
  private _dark = false;
  private _location: MapMarker | null = null;
  private _observer: MutationObserver | null = null;
  // Looked up once: `move` fires every frame of a pan or zoom.
  private _zoomIn: HTMLButtonElement[] = [];
  private _zoomOut: HTMLButtonElement[] = [];
  // The draggable marker a tap picked up, waiting for the tap that drops it.
  private _picked: HTMLElement | null = null;
  // The marker whose drag just ended, so the click that follows does not pick it up.
  private _dragged: HTMLElement | null = null;
  // Undoes what the map added to the page's markup, for destroy().
  private _restore: (() => void)[] = [];
  private _actions: Record<string, (button: HTMLButtonElement) => void> = {
    'zoom-in': () => this.map.zoomIn(),
    'zoom-out': () => this.map.zoomOut(),
    compass: () => this.map.resetNorthPitch(),
    locate: (button) => this._locate(button),
    fullscreen: () => this._toggleFullscreen(),
    'pan-up': () => this._pan(0, -1),
    'pan-down': () => this._pan(0, 1),
    'pan-left': () => this._pan(-1, 0),
    'pan-right': () => this._pan(1, 0)
  };

  /** Initializes a map, typed by the `maplibregl` passed in. */
  static init<L extends MapLibre>(this: typeof MapView, el: HTMLElement, options?: Partial<MapViewOptions<L>>): MapView<L>;
  /** Initializes a map on each element, typed by the `maplibregl` passed in. */
  static init<L extends MapLibre>(this: typeof MapView, els: InitElements<InitElement>, options?: Partial<MapViewOptions<L>>): MapView<L>[];
  static init(els: HTMLElement | InitElements<InitElement>, options: Partial<MapViewOptions> = {}): MapView | MapView[] {
    return super.init.call(this, els as InitElements<InitElement>, options);
  }

  constructor(el: HTMLElement, options: Partial<MapViewOptions<L>>) {
    super(el, options);
    const lib = this.options.maplibregl;
    if (!lib) {
      console.error('MapView needs the maplibre-gl module in options.maplibregl.');
      return;
    }

    this._children = [...el.children];
    this._zoomIn = [...this._buttons('zoom-in')];
    this._zoomOut = [...this._buttons('zoom-out')];
    this._dark = this._isDark();
    const init = {
      ...this.options.mapOptions,
      container: el,
      style: this._style(),
      center: this.options.center,
      zoom: this.options.zoom
    };
    // `new` on a generic constructor yields the constraint, not L's instance.
    this.map = new lib.Map(init) as InstanceType<L['Map']>;
    this.map.on('style.load', this._handleStyleLoad);
    this.map.on('move', this._sync);
    this.map.on('click', this._handleMapClick);

    const children = this._children.filter((child): child is HTMLElement => child instanceof HTMLElement);
    const claimed = new Set<Element>();
    for (const [marker, at] of positioned(children.filter((child) => child.matches('.map-marker[data-lng-lat]')))) {
      const target = marker.hasAttribute('aria-controls') ? Utils.getElementById(marker, marker.getAttribute('aria-controls')) : null;
      const popup = target?.parentElement === el && target.matches('.map-popup') ? target : null;
      if (popup) claimed.add(popup);
      this._addMarker(marker, popup, at);
    }
    for (const [popup, at] of positioned(children.filter((child) => child.matches('.map-popup[data-lng-lat]') && !claimed.has(child)))) {
      this._popup(popup, 0).setLngLat(at).addTo(this.map);
    }

    const { signal } = this._events;
    if (this._themed()) {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this._handleScheme, { signal });
      this._observer = new MutationObserver(this._handleScheme);
      this._observer.observe(document.documentElement, { attributes: true, attributeFilter: ['theme'], subtree: true });
    }
    for (const button of this._buttons('fullscreen')) button.hidden = !document.fullscreenEnabled;
    document.addEventListener('fullscreenchange', this._handleFullscreen, { signal });
    el.addEventListener('click', this._handleClick, { signal });
    el.addEventListener('keydown', this._handleKeydown, { signal });
    this._sync();
  }

  static get defaults(): MapViewOptions {
    return _defaults;
  }

  static key = 'Expressive_MapView';

  destroy() {
    super.destroy();
    if (!this.map) return;
    this._releaseMarkers();
    this._observer?.disconnect();
    for (const overlay of this._overlays.values()) overlay.off?.();
    for (const popup of this._popups) popup.remove();
    for (const marker of this.markers) {
      marker.remove();
      const element: HTMLElement = marker.getElement();
      element.classList.remove(...[...element.classList].filter((name) => name.startsWith('maplibregl-')));
      element.style.removeProperty('transform');
      element.style.removeProperty('opacity');
      if (element.hasAttribute('aria-controls')) element.removeAttribute('aria-expanded');
    }
    this._location?.remove();
    this._location = null;
    this.map.remove();
    this.map = null;
    this.markers = [];
    this._popups = [];
    this._markerPopups.clear();
    this._overlays.clear();
    this.el.style.removeProperty('--md-comp-map-bearing');
    for (const button of this.el.querySelectorAll<HTMLButtonElement>('.map-controls [data-action]')) {
      button.disabled = false;
      button.hidden = false;
      button.removeAttribute('aria-pressed');
    }
    this.el.append(...this._children);
  }

  /** Draws a line through `[longitude, latitude]` points. Replaces an overlay with the same id. */
  addRoute(id: string, coordinates: LngLat[], options: MapLineOptions = {}) {
    this._line(id, { type: 'LineString', coordinates }, 'route', { width: 4, ...options });
  }

  /** Draws a curved line for each `{ from, to }`. Replaces an overlay with the same id. */
  addArcs(id: string, arcs: MapArc[], options: MapLineOptions = {}) {
    this._line(id, { type: 'MultiLineString', coordinates: arcs.map(({ from, to }) => arc(from, to)) }, 'arc', { width: 2, ...options });
  }

  /**
   * Draws GeoJSON points, or the URL of a GeoJSON file, as clusters that
   * show their count and zoom in when clicked. The layers are
   * `${id}-clusters`, `${id}-count` and `${id}-points`.
   */
  addClusters(id: string, data: object | string, options: MapClusterOptions = {}) {
    const clusters = `${id}-clusters`, points = `${id}-points`;
    const zoomIn = async (e: MapMouseEvent) => {
      const [feature] = e.features;
      // `_draw` registered this id as a clustered GeoJSON source.
      const source = this.map.getSource(id) as MapClusterSource;
      // The data may have changed since the click, leaving no such cluster.
      const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id).catch((): null => null);
      // destroy() may have run while the zoom was looked up.
      if (zoom !== null) this.map?.easeTo({ center: feature.geometry.coordinates, zoom });
    };
    const pointer = () => { this.map.getCanvas().style.cursor = 'pointer'; };
    const reset = () => { this.map.getCanvas().style.cursor = ''; };
    const listen = (method: 'on' | 'off') => {
      this.map[method]('click', clusters, zoomIn);
      for (const layer of [clusters, points]) {
        this.map[method]('mouseenter', layer, pointer);
        this.map[method]('mouseleave', layer, reset);
      }
    };
    this._draw(id, {
      draw: () => {
        const color = options.color ?? this._color('var(--md-comp-map-cluster-color)');
        const surface = this._color('var(--md-comp-map-marker-ring-color)');
        this.map.addSource(id, {
          type: 'geojson',
          data,
          cluster: true,
          clusterRadius: options.radius ?? 50,
          clusterMaxZoom: options.maxZoom ?? 14
        });
        this.map.addLayer({
          id: clusters,
          type: 'circle',
          source: id,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': color,
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 100, 26],
            'circle-stroke-width': 6,
            'circle-stroke-color': color,
            'circle-stroke-opacity': 0.3
          }
        });
        // A symbol layer needs the style's glyphs and one of its fonts.
        const style = this.map.getStyle();
        const font = style.glyphs && style.layers.find((layer) => layer.layout?.['text-font'])?.layout['text-font'];
        if (font) {
          this.map.addLayer({
            id: `${id}-count`,
            type: 'symbol',
            source: id,
            filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': font, 'text-size': 12 },
            paint: { 'text-color': this._color('var(--md-comp-map-cluster-label-color)') }
          });
        }
        this.map.addLayer({
          id: points,
          type: 'circle',
          source: id,
          filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': color, 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': surface }
        });
      },
      off: () => listen('off')
    });
    listen('on');
  }

  /** Removes a route, arcs or clusters added with this id. */
  removeOverlay(id: string) {
    const overlay = this._overlays.get(id);
    if (!overlay) return;
    this._overlays.delete(id);
    overlay.off?.();
    if (!this._styleReady || !this.map.getSource(id)) return;
    for (const layer of this.map.getStyle().layers) if (layer.source === id) this.map.removeLayer(layer.id);
    this.map.removeSource(id);
  }

  private _line(id: string, geometry: object, token: string, options: MapLineOptions) {
    this._draw(id, {
      draw: () => {
        this.map.addSource(id, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry } });
        this.map.addLayer({
          id,
          type: 'line',
          source: id,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': options.color ?? this._color(`var(--md-comp-map-${token}-color)`),
            'line-width': options.width,
            'line-opacity': options.opacity ?? 1,
            ...(options.dashArray && { 'line-dasharray': options.dashArray })
          }
        });
      }
    });
  }

  // Sources and layers go with the style, so every overlay is drawn again
  // when a theme change swaps it.
  private _draw(id: string, overlay: Overlay) {
    this.removeOverlay(id);
    this._overlays.set(id, overlay);
    if (this._styleReady) overlay.draw();
  }

  private _addMarker(element: HTMLElement, content: HTMLElement | null, at: LngLat) {
    const marker = new this.options.maplibregl.Marker({
      element,
      draggable: element.hasAttribute('data-draggable')
    }).setLngLat(at).addTo(this.map);
    marker.on('dragend', () => this._moved(marker));
    if (element.hasAttribute('data-draggable')) this._makeMovable(element, marker);
    this.markers.push(marker);
    if (!content) return;
    element.setAttribute('aria-expanded', 'false');
    const popup = this._popup(content, 16);
    popup.on('open', () => element.setAttribute('aria-expanded', 'true'));
    popup.on('close', () => {
      element.setAttribute('aria-expanded', 'false');
      if (!document.activeElement || document.activeElement === document.body) element.focus();
    });
    this._markerPopups.set(element, popup);
  }

  /** A marker moved: its `data-lng-lat` holds the new place, and it fires `change`. */
  private _moved(marker: MapMarker) {
    const element: HTMLElement = marker.getElement();
    const { lng, lat } = marker.getLngLat();
    element.dataset.lngLat = `${lng},${lat}`;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // A drag is not the only way to move it (WCAG 2.5.7): a tap picks it up,
  // and the arrow keys nudge it. A button is already a control; anything
  // else becomes one, and destroy() takes that back off.
  private _makeMovable(element: HTMLElement, marker: MapMarker) {
    const added = element instanceof HTMLButtonElement ? [] : ['role', 'tabindex'].filter((name) => !element.hasAttribute(name));
    if (added.includes('role')) element.setAttribute('role', 'button');
    if (added.includes('tabindex')) element.tabIndex = 0;
    element.setAttribute('aria-pressed', 'false');
    this._restore.push(() => ['aria-pressed', ...added].forEach((name) => element.removeAttribute(name)));
    element.addEventListener('keydown', (e) => this._nudge(e, marker), { signal: this._events.signal });
    marker.on('dragstart', () => (this._dragged = element));
    marker.on('dragend', () => setTimeout(() => { this._dragged = null; }));
  }

  /** Takes back the attributes `_makeMovable()` added. Destroy removes its listeners. */
  private _releaseMarkers() {
    this._restore.splice(0).forEach((undo) => undo());
    this._picked = null;
  }

  /** The arrow keys move a focused draggable marker 10px, and the map stays put. */
  private _nudge(e: KeyboardEvent, marker: MapMarker) {
    const step = plainArrow(e);
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    const at = this.map.project(marker.getLngLat());
    marker.setLngLat(this.map.unproject([at.x + step[0] * 10, at.y + step[1] * 10]));
    this._moved(marker);
  }

  /** Picks a marker up, or puts down the one already picked up. */
  private _pick(element: HTMLElement | null) {
    this._picked?.setAttribute('aria-pressed', 'false');
    this._picked = element;
    element?.setAttribute('aria-pressed', 'true');
  }

  // A tap on a draggable marker picks it up, or puts it back down; the click
  // that ends a drag does neither.
  private _tapMarker(element: HTMLElement | null) {
    // aria-pressed: one skipped for a bad data-lng-lat is no marker to pick up.
    if (element?.matches('[data-draggable][aria-pressed]')) this._tapMovable(element);
    else if (this._markerPopups.has(element)) this._toggle(element);
  }

  private _tapMovable(element: HTMLElement) {
    if (this._dragged !== element) this._pick(this._picked === element ? null : element);
  }

  /** A third of the map's width or height in a direction. */
  private _pan(x: number, y: number) {
    const { width, height } = this.el.getBoundingClientRect();
    this.map.panBy([(x * width) / 3, (y * height) / 3]);
  }

  // Either can be refused (an iframe without allowfullscreen, say). The
  // button state follows fullscreenchange, so there is nothing to undo.
  private _toggleFullscreen() {
    const request = document.fullscreenElement === this.el ? document.exitFullscreen() : this.el.requestFullscreen();
    request.catch(() => {});
  }

  private _popup(content: HTMLElement, offset: number) {
    const popup = new this.options.maplibregl.Popup({ closeOnClick: false, maxWidth: 'none', offset }).setDOMContent(content);
    this._popups.push(popup);
    return popup;
  }

  private _toggle(marker: HTMLElement) {
    const popup = this._markerPopups.get(marker);
    if (popup.isOpen()) popup.remove();
    else popup.setLngLat(this.markers.find((m) => m.getElement() === marker).getLngLat()).addTo(this.map);
  }

  private _buttons(action: string) {
    return this.el.querySelectorAll<HTMLButtonElement>(`.map-controls [data-action="${action}"]`);
  }

  private _locate(button: HTMLButtonElement) {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        if (!this.map) return;
        const center: LngLat = [coords.longitude, coords.latitude];
        if (!this._location) {
          const dot = document.createElement('span');
          dot.className = 'map-marker location';
          dot.setAttribute('aria-hidden', 'true');
          this._location = new this.options.maplibregl.Marker({ element: dot });
        }
        this._location.setLngLat(center).addTo(this.map);
        this.map.flyTo({ center, zoom: Math.max(this.map.getZoom(), 14) });
      },
      (error) => { if (this.map && error.code === error.PERMISSION_DENIED) button.disabled = true; }
    );
  }

  // Resolves a CSS color where the map is, so light-dark() and scoped
  // themes apply, then paints it on a canvas to read back the sRGB value.
  // MapLibre does not parse the oklch() the theme tokens compute to.
  private _color(value: string) {
    const probe = document.createElement('span');
    probe.hidden = true;
    probe.style.color = value;
    this.el.append(probe);
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    context.fillStyle = getComputedStyle(probe).color;
    probe.remove();
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 100) / 100})`;
  }

  private _isDark() {
    return this._color('light-dark(black, white)') === 'rgba(255, 255, 255, 1)';
  }

  private _themed(style: MapViewOptions['style'] = this.options.style): style is MapThemedStyle {
    return typeof style === 'object' && 'light' in style && 'dark' in style;
  }

  private _style() {
    const style = this.options.style;
    return this._themed(style) ? style[this._dark ? 'dark' : 'light'] : style;
  }

  private _handleStyleLoad = () => {
    this._styleReady = true;
    for (const overlay of this._overlays.values()) overlay.draw();
  };

  private _handleScheme = () => {
    const dark = this._isDark();
    if (dark === this._dark) return;
    this._dark = dark;
    this._styleReady = false;
    this.map.setStyle(this._style(), { diff: false });
  };

  private _sync = () => {
    const zoom = this.map.getZoom();
    for (const button of this._zoomIn) button.disabled = zoom >= this.map.getMaxZoom();
    for (const button of this._zoomOut) button.disabled = zoom <= this.map.getMinZoom();
    this.el.style.setProperty('--md-comp-map-bearing', `${-this.map.getBearing()}deg`);
  };

  private _handleFullscreen = () => {
    for (const button of this._buttons('fullscreen')) {
      button.setAttribute('aria-pressed', String(document.fullscreenElement === this.el));
    }
  };

  private _handleClick = (e: MouseEvent) => {
    const target = e.target as Element;
    const button = target.closest<HTMLButtonElement>('.map-controls [data-action]');
    if (button) this._actions[button.dataset.action]?.(button);
    else this._tapMarker(target.closest<HTMLElement>('.map-marker'));
  };

  // A click on the map closes marker popups, but not the one being toggled.
  private _handleMapClick = (e: MapMouseEvent) => {
    const target = e.originalEvent.target as Node;
    this._drop(target, e.lngLat);
    for (const [marker, popup] of this._markerPopups) {
      if (!marker.contains(target) && !popup.getElement()?.contains(target)) popup.remove();
    }
  };

  // A tap on the map, not on a marker, puts a picked-up marker there.
  private _drop(target: Node, at: MapLngLat) {
    if (!this._picked || (target as Element).closest?.('.map-marker')) return;
    const marker = this.markers.find((m) => m.getElement() === this._picked);
    marker.setLngLat(at);
    this._moved(marker);
    this._pick(null);
  }

  private _handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this._escape(e);
  };

  // Escape puts down a picked-up marker first, then closes a popup.
  private _escape(e: KeyboardEvent) {
    if (this._picked) {
      e.preventDefault();
      this._pick(null);
      return;
    }
    for (const popup of this._popups) {
      if (popup.getElement()?.contains(e.target as Node)) {
        e.preventDefault();
        popup.remove();
      }
    }
  }
}
