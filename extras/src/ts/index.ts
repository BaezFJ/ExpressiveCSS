// The @expressivecss/extras entry. Load it after the core package: it adds the
// extras components to core's AutoInit and starts the extras document
// behaviors, as core's index.ts does for its own. The IIFE build exposes these
// exports as `ExpressiveExtras`.
//
// Import core only through `@expressivecss/expressive/core`, and public core
// components (such as Menu) through `@expressivecss/expressive/modular`. Every
// extras build leaves both specifiers external, so extras shares core's
// Component, AutoInit and component classes instead of carrying a copy.

import { AutoInit } from '@expressivecss/expressive/core';
import * as Components from './modular';

export * from './modular';

/** Auto-initialized components, one line each: `Name: { component, selector }`. */
const AUTO_INIT: Record<string, Parameters<typeof AutoInit.register>[1]> = {
  ColumnChart: { component: Components.ColumnChart, selector: ".column-chart" },
  BarChart: { component: Components.BarChart, selector: ".bar-chart" },
  PieChart: { component: Components.PieChart, selector: ".pie-chart" },
  HeatmapChart: { component: Components.HeatmapChart, selector: ".heatmap-chart" },
  RadarChart: { component: Components.RadarChart, selector: ".radar-chart" },
  RadialChart: { component: Components.RadialChart, selector: ".radial-chart" },
  MixedChart: { component: Components.MixedChart, selector: ".mixed-chart" },
  ScatterChart: { component: Components.ScatterChart, selector: ".scatter-chart" },
  FunnelChart: { component: Components.FunnelChart, selector: ".funnel-chart" },
  SankeyChart: { component: Components.SankeyChart, selector: ".sankey-chart" },
  TreemapChart: { component: Components.TreemapChart, selector: ".treemap-chart" },
  LineChart: { component: Components.LineChart, selector: ".line-chart" },
  Confetti: { component: Components.Confetti, selector: ".confetti" },
  Particles: { component: Components.Particles, selector: "canvas.particles" },
  CommandPalette: { component: Components.CommandPalette, selector: "dialog.command-palette" },
  MessageScroller: { component: Components.MessageScroller, selector: ".message-scroller" },
  PullToRefresh: { component: Components.PullToRefresh, selector: ".pull-to-refresh" },
  LoadingOverlay: { component: Components.LoadingOverlay, selector: ".loading-overlay" },
  SwipeActions: { component: Components.SwipeActions, selector: ".list.swipeable" },
  ShowMore: { component: Components.ShowMore, selector: ".show-more" },
  Lightbox: { component: Components.Lightbox, selector: ".lightboxed" },
  ScrollSpy: { component: Components.ScrollSpy, selector: ".scrollspy" },
  BackToTop: { component: Components.BackToTop, selector: ".back-to-top" },
  HoverCard: { component: Components.HoverCard, selector: ".hover-card-trigger" },
  // After core's Menu, so the bar's own menu options replace AutoInit's defaults.
  Menubar: { component: Components.Menubar, selector: ".menubar" },
};

/** Document behaviors started at import, one line each, in start order. */
const BEHAVIORS: { Init(): void }[] = [Components.ImageCompare, Components.Tour];

for (const [name, entry] of Object.entries(AUTO_INIT)) AutoInit.register(name, entry);
for (const behavior of BEHAVIORS) behavior.Init();
