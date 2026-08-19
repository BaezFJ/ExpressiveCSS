# Changelog

Notable changes to ExpressiveCSS. Versions follow [semver](https://semver.org/);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Removed

- **Breaking:** `dialog.top` / `dialog.top-sheet`. M3 has no top sheet;
  use a side sheet or a bottom sheet. The unused
  `--md-comp-basic-dialog-sheet-width` token is gone with them.

### Changed

- **Breaking:** `Autocomplete`'s `menuOptions.onItemClick` now receives the clicked
  `li` and is called on the `Menu` instance, matching the documented `MenuOptions`
  contract. It previously received the autocomplete's `<input>` element, so a
  handler written against the documented signature got the wrong node. Handlers
  that used the argument need updating; handlers that ignored it are unaffected.

[Unreleased]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.4.0...HEAD
