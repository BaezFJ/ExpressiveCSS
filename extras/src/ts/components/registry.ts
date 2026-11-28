// The components extras adds to core's AutoInit, in registration order. Its own
// module so the build's style index can read the selectors without the side
// effects of index.ts.

import type { AutoInit } from '@expressivecss/expressive/core';
import * as Components from '../modular';

/** Auto-initialized components, one line each: `Name: { component, selector }`. */
export const AUTO_INIT: Record<string, Parameters<typeof AutoInit.register>[1]> = {
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
  Keypad: { component: Components.Keypad, selector: ".keypad, .keyboard" },
  ColorPicker: { component: Components.ColorPicker, selector: ".color-picker" },
  Questionnaire: { component: Components.Questionnaire, selector: "form.questionnaire" },
  // Only the input types with a caret: setSelectionRange() throws on the rest.
  InputMask: {
    component: Components.InputMask,
    selector: 'input[data-mask]:is(:not([type]), [type="text" i], [type="tel" i], [type="search" i], [type="url" i], [type="password" i])',
  },
  // Only a text input can hold the formatted amount.
  CurrencyInput: { component: Components.CurrencyInput, selector: 'input[data-currency]:is(:not([type]), [type="text" i])' },
  // Core's FormSelect leaves select[data-tree] to this entry.
  TreeSelect: { component: Components.TreeSelect, selector: "select[data-tree]" },
  Cascader: { component: Components.Cascader, selector: ".cascader" },
};
