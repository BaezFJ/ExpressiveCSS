# AutoInit options from data attributes

Date: 2026-10-21
Roadmap phase: Phase 20, AutoInit options from data attributes
Branch: `feature/2026-10-21-autoinit-data-options`
Base: `origin/master` at `8d45c2c4af6b6ccf0be918a4b2f325fae3978fb0`, rebased onto `774b0d27` (#380) before the pull request
Status: implemented and locally verified 2026-10-21; CI and review pending

Follow the [mission's product rules](../../../../mission.md#product-rules) and its Initialization scope ("Markup can start and configure components without page script"), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 20](../../../../roadmap.md#phase-20-autoinit-options-from-data-attributes). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Delegation and phase selection

The user invoked feature-spec-auto for Phase 20 and delegated the plan, requirements and validation choices to the agent. There was no interview. The user also said that sibling threads work other phases in parallel, so this spec does not depend on earlier unfinished phases. The roadmap lists Phase 20 with no dependency. Phase 21, AutoInit for markup added later, depends on this phase and is out of scope here. The roadmap stays unchanged on this branch.

## Current behavior

These facts come from the base commit.

- `AutoInit(context, options)` in `src/ts/components/registry.ts` walks `AUTO_INIT_COMPONENTS` in order. For each entry it queries `:is(selector):not(.no-autoinit)` inside `context`. Entries with a `filter` (only Cards) call `component.init(el, options?.[name] ?? {})` per element. The others call `component.init(els, options?.[name] ?? {})` once with the whole `NodeList`, so every element of a component gets the same options.
- Every registered component's static `init` forwards to `Component.init`, which constructs one instance per element. Each constructor merges `{ ...Thing.defaults, ...options }`. Keypad, Timepicker, Chips, Carousel, Autocomplete and Datepicker also merge `i18n` over the default `i18n`.
- AutoInit reads no attributes for options. Some components read single data attributes themselves. Tooltip's constructor merges `data-tooltip`, `data-tooltip-id` and `data-position` between its defaults and the passed options, and `open()` merges them again over `this.options`, so a present attribute beats even an option from script once the tooltip opens. Menu sets `contextMenu` from `data-context-menu` before the passed options. RadialChart reads `data-max`, ButtonGroup `data-selection`, Questionnaire `data-save` and `data-progress-label`, PieChart `data-other-label`, and Menu triggers name their menu with `data-target`.
- `RichTextEditor` already parses a JSON attribute, `data-attributes`, inside `try`/`catch` and warns on invalid JSON. MapView warns and skips an invalid `data-lng-lat`.
- The registry keys (`Menu`, `FormSelect`, `FloatingActionButton`, ...) are the names `AutoInit`'s options object already uses. The minified IIFE bundle renames classes, so a class's `name` cannot stand in for these keys at runtime.
- A dump of each registered component's `defaults` from the built bundle shows options of every JSON kind (strings, numbers, booleans, arrays, plain objects such as `i18n` and `menuOptions`), plus options whose default is `null` (callbacks, `container`, chart `min`/`max`, Datepicker `minDate`), `undefined` (Datepicker `minMonth`) or a function (Autocomplete `onSearch`, ScrollSpy `getActiveElement`). AppBar, ButtonGroup and FloatingActionButton have no defaults.
- Autocomplete's `allowUnsafeHTML`, default `false`, lets labels render as HTML. Datepicker's `minYear` and `maxYear` are commented "used internally (don't config outside)". SECURITY.md says browser components treat author-controlled DOM and strings as untrusted.
- A constructor that throws aborts `AutoInit()`, and the components after it in the registry never start. Datepicker, for example, parses its input in the constructor with its `i18n` month names, so an `i18n.monthsShort` array of numbers throws there.
- Menubar runs after Menu in the registry and calls `Menu.init(item, this.options.menuOptions)` on each of its triggers, which replaces the Menu instance AutoInit created for that trigger.

A page that wants different options on two menus has to mark them `.no-autoinit` and call `Menu.init` itself.

## Decisions

The roadmap left two questions open. The agent settled them from the evidence above.

### One JSON attribute per component

Each component reads one attribute holding a JSON object. Per-option attributes were rejected for these reasons:

- Option values are not all strings. Per-option attributes would need type coercion guessed from each default, and options such as `i18n`, `menuOptions`, `data` and Confetti's `origin` hold objects or arrays that a flat string cannot express.
- Several components already read single data attributes that mean something else or are part of their own markup contract (`data-position`, `data-target`, `data-selection`, `data-max`, `data-tooltip`). Turning every `data-*` attribute into an option would change how existing markup behaves, which the mission's product rules forbid without an opt-in. A new, namespaced attribute does not exist on any current page.
- `RichTextEditor`'s `data-attributes` already sets the precedent of a JSON attribute parsed safely with a warning.

### Attribute name and option names

- The attribute is `data-<name>-options`, where `<name>` is the component's registry key in kebab case: a hyphen goes before every capital letter after the first, and the result is lowercased. `Menu` reads `data-menu-options`, `FormSelect` reads `data-form-select-options` and `FloatingActionButton` reads `data-floating-action-button-options`.
- The name includes the component because one element can match two registry entries, for example a `.tooltipped.menu-trigger` button. Each component reads only its own attribute.
- The `-options` suffix keeps the name apart from existing attributes such as `data-tooltip`.
- The JSON keys are the JavaScript option names, unchanged: `data-menu-options='{"closeOnClick": false}'`. Authors copy keys from each component's options table without translation.

### Agent decisions within that design

These are choices the agent made under delegation. The user can overturn any of them in review.

- AutoInit reads the attribute, and direct `Thing.init(el, options)` calls do not. The roadmap scopes the phase to AutoInit, the modular entry is inert by design, and only the registry has the component's name at runtime.
- Precedence is per top-level option: `{ ...markupOptions, ...options[name] }`. An option passed to `AutoInit` replaces the markup value for that key, including a whole nested object such as `i18n`.
- A markup value is accepted only when the key is an own property of the component's `defaults` and the value has the same JSON kind as the default: string, number, boolean, array or plain object. Options whose default is `null`, `undefined`, a function or a non-plain object cannot be set from markup. That excludes every callback and element option, and it also excludes chart `min`/`max`, Datepicker `minDate`/`maxDate`, Tabs `duration` and Carousel `height`. Pages keep passing those through `AutoInit`'s options or `init`.
- A plain-object value is filtered the same way against the default object, one level at a time. `i18n` keys are checked against the default `i18n`. A default of `{}`, such as FormSelect's `menuOptions`, accepts no nested keys.
- If any key inside a plain object is rejected, the whole top-level option is dropped and keeps its default. Filling the rejected key from the static default instead would turn every default into an explicit override, which breaks Datepicker's merge of locale month names under `withLocale()` (added after the second Codex review).
- An accepted nested object replaces the default object, exactly as the same object passed from script does. Components that merge `i18n` over their defaults keep doing so.
- When the default is a non-empty array, every element of the value must have the kind of the default's first element. Datepicker's `i18n.monthsShort` must then be an array of strings. An empty default array, such as Confetti `colors`, accepts any contents.
- `allowUnsafeHTML`, `minYear`, `maxYear` and `data` cannot be set from markup. The first disables an HTML-escaping default, and the next two are internal. A probe of the built bundle showed that Chips and Autocomplete throw part way through their constructors on any `data` entry that is not an object with an `id`, after changing the element (Chips has already removed its input's `name` and `required`). Those lists come from page script.
- Other numbers are not bounded. A large `yearRange` or `particleCount` costs the same from markup as from script, and an author who can write attributes can already write that much markup.
- Each rejected value logs one `console.warn` naming the component, the attribute and the key, as MapView and RichTextEditor do, and the option keeps its default. A nested key is named with a dot, such as `i18n.nope`. Invalid JSON, or JSON that is not an object, logs one warning and contributes no options.
- AutoInit does not catch constructor errors. An earlier draft retried the element without its markup options, but Codex review showed that a half-run constructor can leave the element changed (Chips) and a half-built instance whose `destroy()` throws, so a retry cannot restore the element from the registry. The known throwing values (`data` entries, wrong array items) are rejected before construction instead. A value that passes every check and still makes a component throw fails the same way as that value passed from script, and AutoInit stops there as it does today. This is a documented limit.
- Component-specific attributes keep their current precedence. Tooltip's `data-tooltip`, `data-tooltip-id` and `data-position` still win when present, and Menu's `data-context-menu` still sets the base for `contextMenu`. The docs say to use one or the other, not both, for the same option.
- Menu triggers inside a `.menubar` take their options from Menubar's `menuOptions`, so `data-menu-options` on them has no effect. Menubar's `menuOptions` default is `{ constrainWidth: false, coverTrigger: false }`, so `data-menubar-options` can set only those two nested keys. The docs state this limit.
- AutoInit initializes every component one element at a time, so each element gets its own options. Component `init` does the same per element internally, so instances are unchanged.
- The per-element step is one function in `registry.ts`, which Phase 21 can call for elements added after load.
- `semantics.json` does not change. The attribute configures runtime options; it adds no role, name or structural rule.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | For each registered component, `AutoInit()` reads the attribute `data-<kebab name>-options` from each matched element. The kebab name puts a hyphen before every capital after the first letter of the registry key and lowercases the result. |
| R2 | The attribute holds a JSON object whose keys are the component's option names. Accepted values become that instance's options, merged under `AutoInit`'s own options for the component: an option given in `AutoInit(context, { Name: {...} })` wins for its key. |
| R3 | A value is accepted only when its key is an own property of the component's `defaults`, the default is a string, number, boolean, array or plain object, and the value has the same kind. A plain-object value is filtered against the default object by the same rule, recursively, and a rejected nested key leaves the whole top-level option at its default. When the default is a non-empty array, each element of the value has the kind of the default's first element. |
| R4 | Anything else falls back to the default: invalid JSON, JSON that is not an object, an unknown key, a kind mismatch, or an option whose default is `null`, `undefined`, a function or a non-plain object. Each rejection logs one `console.warn` naming the component, attribute and key, with nested keys dotted (`i18n.nope`), or the attribute alone for unparseable input. The other accepted keys still apply, and AutoInit carries on with the remaining elements and components. AutoInit does not catch constructor errors. |
| R5 | Attribute values are untrusted. Parsing uses `JSON.parse` only. Keys such as `__proto__` or `constructor` do not change any prototype, because only own keys of the defaults are copied. Autocomplete's `allowUnsafeHTML`, Datepicker's internal `minYear` and `maxYear`, and the Chips and Autocomplete `data` lists cannot be set from markup. |
| R6 | Elements without the attribute get exactly the options they get today. `.no-autoinit` still skips an element. Direct `Thing.init()` calls do not read the attribute. |
| R7 | An element that matches two components reads each component's own attribute, and neither sees the other's options. |
| R8 | One function in `registry.ts` initializes one element of one component with its markup and `AutoInit` options. Both the filtered and unfiltered paths of `AutoInit` use it, so Phase 21 can reuse it. |
| R9 | Docs and generated guidance describe the attribute, its precedence against Tooltip's own attributes, and the Menubar limit: a section on `docs/src/pages/auto-init.astro`, the JavaScript initialization section of `llm.md`, and an Unreleased Added entry in `CHANGELOG.md`. `npm run build:skill` regenerates derived files and `npm run check:generated` passes. |
| R10 | The bundle size change has a reviewed gzip budget line in `tests/selective-builds.test.js`. New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. |

## Constraints and dependencies

- Keep the change inside `src/ts/components/registry.ts`. Add no dependency and no `core/` helper for one caller.
- Read `defaults` through each registry entry's `component.defaults`; LineChart subclasses inherit theirs.
- Tests run against built bundles. Build before testing and tear down instances and console mocks in `finally` blocks.
- Leave the stale `capabilityBrowserEvidence.inputs` pin for `registry.ts` in `docs/src/data/component-decisions.json` alone; it already differs from the base file.

## Out of scope

- Phase 21: watching the page, starting components in markup added later, and destroying removed ones.
- Reading the attribute in direct `init()` calls or the modular entry.
- Per-option attributes, and changes to the single data attributes components already read, including Tooltip's precedence.
- Menubar passing markup options to its triggers' menus.
- Setting callbacks, elements or options with `null` defaults from markup.
- Validating enum values (such as Menu `placement`), number ranges, or array contents beyond the element kind. Components treat those as they treat the same values from script.
- Roadmap edits, release and publication.

## Open decisions

None. The agent decisions above stand unless the user changes them in review.
