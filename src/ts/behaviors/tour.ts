import { Utils } from '../core/utils';

interface TourState {
  steps: HTMLElement[];
  index: number;
  opener: HTMLElement | null;
}

const states = new WeakMap<HTMLElement, TourState>();
const anchor = '--tour-target';

/**
 * Product tour. A `.tour` is a `popover="manual"` card holding one `<section>`
 * per step; each section's `data-tour-target` names the id of the element it
 * explains. The card shows one step at a time beside its target, which gets a
 * highlight ring and scrolls into view. Steps whose target is missing or
 * hidden are skipped.
 *
 * `[data-tour-start="tour-id"]` starts a tour; inside it, `[data-tour-back]`,
 * `[data-tour-next]`, `[data-tour-done]` and `[data-tour-close]` move through
 * it or end it, and Escape ends it. Back hides on the first step, Next on the
 * last, Done everywhere else. Ending hides the card (its `toggle` event says
 * so) and returns focus to whatever had it before the tour.
 */
export class Tour {
  static i18n = { progress: 'Step {current} of {total}' };
  private static _initialized = false;

  static Init() {
    if (Tour._initialized || typeof document === 'undefined') return;
    Tour._initialized = true;
    document.addEventListener('click', Tour._onClick);
    document.addEventListener('keydown', (e) => {
      const tour = Utils.closestInPath(e, '.tour');
      if (e.key === 'Escape' && tour instanceof HTMLElement && states.has(tour)) Tour.end(tour);
    });
    // A page that hides the card itself still gets the target released.
    // `toggle` does not bubble, so this listens in the capture phase.
    document.addEventListener(
      'toggle',
      (e: ToggleEvent) => {
        const tour = e.target as HTMLElement;
        if (e.newState === 'closed' && states.has(tour)) Tour.end(tour);
      },
      true
    );
  }

  /** Opens the tour at a step. Does nothing when no step has a visible target. */
  static start(tour: HTMLElement, index = 0) {
    const steps = [...tour.querySelectorAll<HTMLElement>(':scope > section[data-tour-target]')].filter((step) =>
      Tour._target(step)?.checkVisibility()
    );
    if (!steps.length) return;
    const root = tour.getRootNode() as Document | ShadowRoot;
    const previous = states.get(tour);
    // Restarting a running tour: let go of the step it was showing, or two
    // targets carry the highlight and the card's anchor name.
    if (previous) Tour._release(previous.steps[previous.index]);
    states.set(tour, {
      steps,
      index: 0,
      opener: previous?.opener ?? (root.activeElement instanceof HTMLElement ? root.activeElement : null)
    });
    if (!tour.matches(':popover-open')) tour.showPopover();
    Tour.go(tour, index);
  }

  /** Shows step `index` of a running tour. */
  static go(tour: HTMLElement, index: number) {
    const state = states.get(tour);
    if (!state) return;
    Tour._release(state.steps[state.index]);
    state.index = Math.min(Math.max(index, 0), state.steps.length - 1);
    const step = state.steps[state.index];
    const last = state.index === state.steps.length - 1;
    tour.querySelectorAll<HTMLElement>(':scope > section[data-tour-target]').forEach((section) => {
      section.hidden = section !== step;
    });
    const heading = step.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6');
    if (heading) {
      if (!heading.id) heading.id = `tour-${Utils.guid()}`;
      tour.setAttribute('aria-labelledby', heading.id);
    }
    const progress = tour.querySelector('.tour-progress');
    if (progress) {
      progress.textContent = Tour.i18n.progress
        .replace('{current}', String(state.index + 1))
        .replace('{total}', String(state.steps.length));
    }
    const toggle = (selector: string, show: boolean) =>
      tour.querySelectorAll<HTMLElement>(selector).forEach((button) => (button.hidden = !show));
    toggle('[data-tour-back]', state.index > 0);
    toggle('[data-tour-next]', !last);
    toggle('[data-tour-done]', last);

    const target = Tour._target(step);
    target.classList.add('tour-target');
    target.style.setProperty('anchor-name', anchor);
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
    if (!tour.hasAttribute('tabindex')) tour.tabIndex = -1;
    tour.focus({ preventScroll: true });
  }

  /** Ends a running tour and returns focus to where it was. */
  static end(tour: HTMLElement) {
    const state = states.get(tour);
    if (!state) return;
    Tour._release(state.steps[state.index]);
    states.delete(tour);
    if (tour.matches(':popover-open')) tour.hidePopover();
    state.opener?.focus();
  }

  private static _target(step: HTMLElement): HTMLElement | null {
    return Utils.getElementById(step, step.getAttribute('data-tour-target') ?? '');
  }

  private static _release(step: HTMLElement | undefined) {
    const target = step && Tour._target(step);
    target?.classList.remove('tour-target');
    target?.style.removeProperty('anchor-name');
  }

  private static _onClick(e: MouseEvent) {
    const control = Utils.closestInPath(
      e,
      '[data-tour-start], [data-tour-back], [data-tour-next], [data-tour-done], [data-tour-close]'
    );
    if (!control) return;
    if (control.hasAttribute('data-tour-start')) {
      const tour = Utils.getElementById(control, control.getAttribute('data-tour-start'));
      if (tour?.matches('.tour')) Tour.start(tour);
      return;
    }
    const tour = control.closest<HTMLElement>('.tour');
    const state = tour && states.get(tour);
    if (!state) return;
    if (control.hasAttribute('data-tour-back')) Tour.go(tour, state.index - 1);
    else if (control.hasAttribute('data-tour-next')) Tour.go(tour, state.index + 1);
    else Tour.end(tour);
  }
}
