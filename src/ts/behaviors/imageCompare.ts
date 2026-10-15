import { Utils } from '../core/utils';

const rangeSelector = '.image-compare > input[type="range"]';

/**
 * Image compare. Keeps `--md-comp-image-compare-position` on each
 * `.image-compare` in step with its range input, so the divider and the
 * revealed image follow the value. Listens on the document, so compares added
 * later follow too once moved; `ImageCompare.sync(el)` sets one at once.
 */
export class ImageCompare {
  private static _initialized = false;

  static Init() {
    if (ImageCompare._initialized || typeof document === 'undefined') return;
    ImageCompare._initialized = true;
    document.addEventListener('input', (e) => {
      if ((<Element>e.target).matches?.(rangeSelector)) ImageCompare.sync(<HTMLInputElement>e.target);
    });
    Utils.onDocumentReady(() => {
      document.querySelectorAll<HTMLInputElement>(rangeSelector).forEach((range) => ImageCompare.sync(range));
    });
  }

  /** Moves the divider of a compare to its range's current value. */
  static sync(range: HTMLInputElement) {
    const min = parseFloat(range.min) || 0;
    const max = Number.isNaN(parseFloat(range.max)) ? 100 : parseFloat(range.max);
    const fraction = max === min ? 0 : (parseFloat(range.value) - min) / (max - min);
    range.parentElement.style.setProperty('--md-comp-image-compare-position', `${fraction * 100}%`);
  }
}
