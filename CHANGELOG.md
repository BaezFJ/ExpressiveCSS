# Changelog

Notable changes to ExpressiveCSS. Versions follow [semver](https://semver.org/);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]


### Fixed

- Carousel ignores stale scroll-completion events from earlier navigation, so
  selecting a swipeable tab immediately after initialization keeps that selection.

- FormSelect preserves every associated label when enhanced, including naming
  order, label activation and authored naming overrides. Teardown restores label
  attributes and removes generated label IDs.

- FormSelect hides the native control from assistive technology, leaving one
  named combobox. Required and custom validation errors appear beside the visible
  field; the native select retains form values and validation rules. Static
  validity checks preserve focus, and interactive validation forwards native
  focus to the visible field, including in forms with mixed native controls.

- Tabs resolves panel IDs directly, so numeric IDs and IDs containing dots,
  colons or brackets work in normal and swipeable modes without selector errors
  or accidental matches against other elements.

- Autocomplete searches on input events, including paste, replacement and deletion
  without key events. Keyboard typing does not repeat the search on keyup.

- FormSelect restores the authored label and node order during teardown and
  reinitialization, including when it creates the field wrapper.

- Datepicker treats `YYYY-MM-DD` input as a local calendar date during
  initialization, editing and reopening, so dates no longer shift backward in
  timezones west of UTC. Impossible dates such as `2023-02-29` are rejected.
