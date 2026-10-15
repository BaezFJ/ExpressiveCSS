const themes = ['light', 'dark', 'auto'];
const storageKey = 'theme';

/**
 * Theme switch. A click on `[data-theme-set="light|dark|auto"]` writes the
 * `theme` attribute on the root element and saves the choice in
 * `localStorage` under `theme`. Every theme control then reports whether its
 * value is current: `aria-checked` on menu item and radio roles,
 * `aria-pressed` on anything else.
 *
 * Restoring the saved choice is still the page's inline `<head>` script: the
 * bundle loads after first paint, so restoring here would flash the wrong
 * scheme. Init only marks the controls already in the page.
 */
export class Theme {
  private static _initialized = false;

  static Init() {
    if (Theme._initialized || typeof document === 'undefined') return;
    Theme._initialized = true;
    document.addEventListener('click', Theme._onClick);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => Theme.sync(), { once: true });
    } else {
      Theme.sync();
    }
  }

  /** The current theme: the root's `theme` attribute, or `auto` without one. */
  static get(): string {
    const value = document.documentElement.getAttribute('theme');
    return themes.includes(value) ? value : 'auto';
  }

  /** Applies and saves a theme, then marks the controls. Unknown values are ignored. */
  static set(theme: string) {
    if (!themes.includes(theme)) return;
    document.documentElement.setAttribute('theme', theme);
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Storage can be disabled or full; the theme still applies to this page.
    }
    Theme.sync();
  }

  /** Marks every theme control in `root` as current or not. Call it after rendering new controls. */
  static sync(root: ParentNode = document) {
    const current = Theme.get();
    root.querySelectorAll('[data-theme-set]').forEach((control) => {
      const state = String(control.getAttribute('data-theme-set') === current);
      const role = control.getAttribute('role');
      const checked = role === 'menuitemradio' || role === 'radio';
      control.setAttribute(checked ? 'aria-checked' : 'aria-pressed', state);
    });
  }

  private static _onClick(e: MouseEvent) {
    const control = (<Element>e.target).closest?.('[data-theme-set]');
    if (!control || control.matches(':disabled, [aria-disabled="true"]')) return;
    Theme.set(control.getAttribute('data-theme-set'));
  }
}
