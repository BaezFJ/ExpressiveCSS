import { Utils, restoreAttribute } from '../core/utils';
import { Component, BaseOptions } from '../core/component';

/** One option from the author's nested lists. */
interface CascaderNode {
  value: string;
  label: string;
  parent: CascaderNode | null;
  children: CascaderNode[];
  source: HTMLLIElement;
}

/** The input attributes the component sets, put back by destroy(). */
const INPUT_ATTRIBUTES = ['readonly', 'role', 'aria-haspopup', 'aria-expanded', 'aria-controls'];

/** How the input shows a committed path. */
const SEPARATOR = ' / ';

/** An option's own text, without the text of the lists nested in it. */
const ownText = (li: Element) =>
  Array.from(li.childNodes, (node) => (node.nodeName === 'UL' ? ' ' : node.textContent)).join('').replace(/\s+/g, ' ').trim();

/** The options in a list, each with the options nested under it. */
function parse(list: Element | null, parent: CascaderNode | null): CascaderNode[] {
  if (!list) return [];
  return Array.from(list.querySelectorAll<HTMLLIElement>(':scope > li'), (source) => {
    const node: CascaderNode = { value: source.dataset.value ?? '', label: ownText(source), parent, children: [], source };
    node.children = parse(source.querySelector(':scope > ul'), node);
    return node;
  });
}

/** Every option, depth first, which is document order. */
const flatten = (nodes: CascaderNode[]): CascaderNode[] => nodes.flatMap((node) => [node, ...flatten(node.children)]);

/** The options from the first one to `node`. */
function pathTo(node: CascaderNode | undefined): CascaderNode[] {
  const path: CascaderNode[] = [];
  for (let at = node; at; at = at.parent) path.unshift(at);
  return path;
}

export interface CascaderI18nOptions {
  /** What a required field says while no path is chosen. */
  required: string;
}

export interface CascaderOptions extends BaseOptions {
  /**
   * Text the cascader shows.
   * @default { required: 'Choose an option.' }
   */
  i18n: CascaderI18nOptions;
}

const _defaults: CascaderOptions = {
  i18n: { required: 'Choose an option.' }
};

export class Cascader extends Component<CascaderOptions> {
  /** The text input that shows the chosen path. */
  input: HTMLInputElement;
  /** The popover of columns. */
  popover: HTMLElement;
  /** The options from the author's lists. */
  private _options: CascaderNode[];
  /** The chosen path, from the first column to a leaf, or empty. */
  private _path: CascaderNode[] = [];
  /** The input's attributes before the component started. */
  private _saved: (string | null)[];

  constructor(el: HTMLElement, options: Partial<CascaderOptions> = {}) {
    super(el, options);
    this.input = this.el.querySelector<HTMLInputElement>(':scope > input');
    this._options = parse(this.el.querySelector(':scope > .cascader-options'), null);
    if (!this.input) return;
    this._saved = INPUT_ATTRIBUTES.map((name) => this.input.getAttribute(name));
    this.popover = document.createElement('div');
    this.popover.id = `cascader-${Utils.guid()}`;
    this.popover.className = 'cascader-popover';
    this.el.append(this.popover);
    this.input.readOnly = true;
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-haspopup', 'dialog');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-controls', this.popover.id);
    this._path = this._startingPath();
    this._show();
  }

  static get defaults(): CascaderOptions {
    return _defaults;
  }

  static key = 'Expressive_Cascader';

  /** The values of the chosen path, from the first column on. */
  get value(): string[] {
    return this._path.map((node) => node.value);
  }

  destroy() {
    if (this.input) {
      this.popover.remove();
      INPUT_ATTRIBUTES.forEach((name, i) => restoreAttribute(this.input, name, this._saved[i]));
    }
    super.destroy();
  }

  /** The path to the first leaf marked data-selected; a marked branch does not count. */
  private _startingPath() {
    return pathTo(flatten(this._options).find((node) => !node.children.length && node.source.hasAttribute('data-selected')));
  }

  /** Shows the chosen path's labels in the input. */
  private _show() {
    this.input.value = this._path.map((node) => node.label).join(SEPARATOR);
  }
}
