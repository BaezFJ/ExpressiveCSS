# Performance requests

Measure the requested slow path before editing and repeat the same route, data, viewport, cache state, network/CPU settings, and interaction after the change. Inspect resource loading and duplicate assets, layout shifts, interaction traces and long tasks, and resources retained after remount and teardown. Record browser/tool versions, settings, raw observations, and repeated-run variability. For the cause found, use the [Install guide](../../expressivecss-install/SKILL.md), the [Runtime guide](../../expressivecss-runtime/SKILL.md), or the [media reference](../../expressivecss-usage/references/media.md).

Run this performance pass when performance is requested or a measured regression needs investigation; ordinary markup work does not require a full audit. Laboratory results describe those runs, not field Core Web Vitals or real-user percentiles. Report unavailable measurements and avoid speed claims based only on fewer bytes or shorter code.
