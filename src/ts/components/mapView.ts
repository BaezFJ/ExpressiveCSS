import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

/** `[longitude, latitude]`, MapLibre's order. */
export type LngLat = [number, number];

/**
 * The parts of the `maplibre-gl` module this component uses. Declared here so
 * the published types do not depend on MapLibre.
 */
export interface MapLibre {
  Map: new (options: object) => any;
  Marker: new (options: object) => any;
  Popup: new (options: object) => any;
}

/** A style for each color scheme. The map follows the page's theme. */
export interface MapThemedStyle {
  light: string | object;
  dark: string | object;
}

export interface MapViewOptions extends BaseOptions {
  /**
   * The `maplibre-gl` module. ExpressiveCSS does not bundle MapLibre, so the
   * page imports it and passes it in.
   * @default null
   */
  maplibregl: MapLibre | null;
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

const lngLat = (el: HTMLElement) => el.dataset.lngLat.split(',').map(Number) as LngLat;

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

/**
 * An interactive map built on MapLibre: a `.map` holding `.map-marker`,
 * `.map-popup` and `.map-controls` children.
 *
 * Each marker sits at its `data-lng-lat`. A marker button with
 * `aria-controls` opens the `.map-popup` it names; a popup with its own
 * `data-lng-lat` and no marker opens at init. Buttons in `.map-controls`
 * run their `data-action`: `zoom-in`, `zoom-out`, `compass`, `locate` or
 * `fullscreen`. Routes, arcs and clusters are data, so they are added from
 * script. The default style follows the page's light or dark theme, and
 * line and cluster colors come from the theme.
 *
 * The class is `MapView` rather than `Map` so importing it does not shadow
 * JavaScript's `Map`.
 */
export class MapView extends Component<MapViewOptions> {
  /** The MapLibre map. */
  map: any = null;
  /** The MapLibre markers made from `.map-marker` children, in order. */
  markers: any[] = [];
  private _children: Element[] = [];
  private _popups: any[] = [];
  private _markerPopups = new Map<HTMLElement, any>();
  private _overlays = new Map<string, Overlay>();
  private _styleReady = false;
  private _dark = false;
  private _location: any = null;
  private _media: MediaQueryList | null = null;
  private _observer: MutationObserver | null = null;

  constructor(el: HTMLElement, options: Partial<MapViewOptions>) {
    super(el, options, MapView);
    this.el['Expressive_MapView'] = this;
    this.options = {
      ...MapView.defaults,
      ...options
    };
    const lib = this.options.maplibregl;
    if (!lib) {
      console.error('MapView needs the maplibre-gl module in options.maplibregl.');
      return;
    }

    this._children = [...el.children];
    this._dark = this._isDark();
    this.map = new lib.Map({
      ...this.options.mapOptions,
      container: el,
      style: this._style(),
      center: this.options.center,
      zoom: this.options.zoom
    });
    this.map.on('style.load', this._handleStyleLoad);
    this.map.on('move', this._sync);
    this.map.on('click', this._handleMapClick);

    const children = this._children.filter((child): child is HTMLElement => child instanceof HTMLElement);
    const claimed = new Set<Element>();
    for (const marker of children.filter((child) => child.matches('.map-marker[data-lng-lat]'))) {
      const target = marker.hasAttribute('aria-controls') ? Utils.getElementById(marker, marker.getAttribute('aria-controls')) : null;
      const popup = target?.parentElement === el && target.matches('.map-popup') ? target : null;
      if (popup) claimed.add(popup);
      this._addMarker(marker, popup);
    }
    for (const popup of children.filter((child) => child.matches('.map-popup[data-lng-lat]') && !claimed.has(child))) {
      this._popup(popup, 0).setLngLat(lngLat(popup)).addTo(this.map);
    }

    if (this._themed()) {
      this._media = matchMedia('(prefers-color-scheme: dark)');
      this._media.addEventListener('change', this._handleScheme);
      this._observer = new MutationObserver(this._handleScheme);
      this._observer.observe(document.documentElement, { attributes: true, attributeFilter: ['theme'], subtree: true });
    }
    for (const button of this._buttons('fullscreen')) button.hidden = !document.fullscreenEnabled;
    document.addEventListener('fullscreenchange', this._handleFullscreen);
    el.addEventListener('click', this._handleClick);
    el.addEventListener('keydown', this._handleKeydown);
    this._sync();
  }

  static get defaults(): MapViewOptions {
    return _defaults;
  }

  /**
   * Initializes instance of MapView.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<MapViewOptions>): MapView;
  /**
   * Initializes instances of MapView.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<InitElement>, options?: Partial<MapViewOptions>): MapView[];
  /**
   * Initializes instances of MapView.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<MapViewOptions> = {}
  ): MapView | MapView[] {
    return super.init(els, options, MapView);
  }

  static getInstance(el: HTMLElement): MapView {
    return el['Expressive_MapView'];
  }

  destroy() {
    this.el['Expressive_MapView'] = undefined;
    if (!this.map) return;
    this.el.removeEventListener('click', this._handleClick);
    this.el.removeEventListener('keydown', this._handleKeydown);
    document.removeEventListener('fullscreenchange', this._handleFullscreen);
    this._media?.removeEventListener('change', this._handleScheme);
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
    const zoomIn = async (e: any) => {
      const [feature] = e.features;
      const zoom = await this.map.getSource(id).getClusterExpansionZoom(feature.properties.cluster_id);
      this.map.easeTo({ center: feature.geometry.coordinates, zoom });
    };
    const pointer = () => { this.map.getCanvas().style.cursor = 'pointer'; };
    const reset = () => { this.map.getCanvas().style.cursor = ''; };
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
        const font = style.glyphs && style.layers.find((layer: any) => layer.layout?.['text-font'])?.layout['text-font'];
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
      off: () => {
        this.map.off('click', clusters, zoomIn);
        for (const layer of [clusters, points]) {
          this.map.off('mouseenter', layer, pointer);
          this.map.off('mouseleave', layer, reset);
        }
      }
    });
    this.map.on('click', clusters, zoomIn);
    for (const layer of [clusters, points]) {
      this.map.on('mouseenter', layer, pointer);
      this.map.on('mouseleave', layer, reset);
    }
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

  private _addMarker(element: HTMLElement, content: HTMLElement | null) {
    const marker = new this.options.maplibregl.Marker({
      element,
      draggable: element.hasAttribute('data-draggable')
    }).setLngLat(lngLat(element)).addTo(this.map);
    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat();
      element.dataset.lngLat = `${lng},${lat}`;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
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
        const center = [coords.longitude, coords.latitude];
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

  private _themed() {
    const style = this.options.style;
    return typeof style === 'object' && 'light' in style && 'dark' in style;
  }

  private _style() {
    return this._themed() ? this.options.style[this._dark ? 'dark' : 'light'] : this.options.style;
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
    for (const button of this._buttons('zoom-in')) button.disabled = zoom >= this.map.getMaxZoom();
    for (const button of this._buttons('zoom-out')) button.disabled = zoom <= this.map.getMinZoom();
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
    const action = button?.dataset.action;
    if (action === 'zoom-in') this.map.zoomIn();
    else if (action === 'zoom-out') this.map.zoomOut();
    else if (action === 'compass') this.map.resetNorthPitch();
    else if (action === 'locate') this._locate(button);
    else if (action === 'fullscreen') {
      if (document.fullscreenElement === this.el) document.exitFullscreen();
      else this.el.requestFullscreen();
    } else {
      const marker = target.closest<HTMLElement>('.map-marker');
      if (this._markerPopups.has(marker)) this._toggle(marker);
    }
  };

  // A click on the map closes marker popups, but not the one being toggled.
  private _handleMapClick = (e: any) => {
    const target = e.originalEvent.target as Node;
    for (const [marker, popup] of this._markerPopups) {
      if (!marker.contains(target) && !popup.getElement()?.contains(target)) popup.remove();
    }
  };

  private _handleKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    for (const popup of this._popups) {
      if (popup.getElement()?.contains(e.target as Node)) {
        e.preventDefault();
        popup.remove();
      }
    }
  };
}
