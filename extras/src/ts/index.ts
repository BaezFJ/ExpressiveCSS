// The @expressivecss/extras entry. Load it after the core package: it adds the
// extras components to core's AutoInit and starts the extras document
// behaviors, as core's index.ts does for its own. The IIFE build exposes these
// exports as `ExpressiveExtras`.
//
// Import core only through `@expressivecss/expressive/core`. Every extras build
// leaves that specifier external, so extras shares core's Component and AutoInit
// instead of carrying a copy.

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
};

/** Document behaviors started at import, one line each, in start order. */
const BEHAVIORS: { Init(): void }[] = [];

for (const [name, entry] of Object.entries(AUTO_INIT)) AutoInit.register(name, entry);
for (const behavior of BEHAVIORS) behavior.Init();
