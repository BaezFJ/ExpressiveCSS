import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

/**
 * The parts of a Tiptap `Editor` this component uses. Declared here so the
 * published types do not depend on Tiptap.
 */
export interface RichTextEditorInstance {
  commands: object;
  isEditable: boolean;
  isEmpty: boolean;
  chain(): any;
  can(): any;
  isActive(name: string, attributes?: object): boolean;
  getHTML(): string;
  on(event: string, callback: () => void): unknown;
  off(event: string, callback: () => void): unknown;
  destroy(): void;
}

export interface RichTextEditorOptions extends BaseOptions {
  /**
   * Tiptap's `Editor` class. ExpressiveCSS does not bundle Tiptap, so the
   * page imports it and passes it in.
   * @default null
   */
  Editor: (new (options: any) => RichTextEditorInstance) | null;
  /**
   * Tiptap extensions, usually `[StarterKit]`.
   * @default []
   */
  extensions: unknown[];
}

const _defaults: RichTextEditorOptions = {
  Editor: null,
  extensions: []
};

type Action = { command: string; attributes?: object; active?: string };

// Copied from the textarea onto the editable element.
const NAMING = ['aria-label', 'aria-labelledby', 'aria-describedby'];

/**
 * A rich text editor built on Tiptap: a `.rich-text-editor` holding a
 * `<textarea>` and, usually, a `.toolbar` of `[data-command]` buttons.
 *
 * The textarea's value is the starting HTML. The component hides it, mounts
 * the editor after it and writes the editor's HTML back on every change, so
 * the textarea still submits with its form. A button's `data-command` names a
 * Tiptap command and `data-attributes` holds its JSON argument. Buttons are
 * disabled when their command cannot run, and `toggle*` commands report their
 * state with `aria-pressed` and `.active`.
 */
export class RichTextEditor extends Component<RichTextEditorOptions> {
  /** The Tiptap editor. */
  editor: RichTextEditorInstance | null = null;
  /** The form value. */
  textarea: HTMLTextAreaElement | null;
  /** The element the editor is mounted in. */
  content: HTMLElement | null = null;
  private _actions = new Map<HTMLButtonElement, Action>();
  private _label: HTMLLabelElement | null = null;

  constructor(el: HTMLElement, options: Partial<RichTextEditorOptions>) {
    super(el, options, RichTextEditor);
    this.el['Expressive_RichTextEditor'] = this;
    this.options = {
      ...RichTextEditor.defaults,
      ...options
    };
    this.textarea = el.querySelector(':scope > textarea');
    if (!this.textarea || !this.options.Editor) {
      console.error('RichTextEditor needs a <textarea> child and the Tiptap Editor class in options.Editor.');
      return;
    }

    for (const button of el.querySelectorAll<HTMLButtonElement>('button[data-command]')) {
      const command = button.dataset.command;
      const attributes = button.dataset.attributes ? JSON.parse(button.dataset.attributes) : undefined;
      // toggleBulletList is active while the selection is in a bulletList.
      const active = command.startsWith('toggle') ? command[6].toLowerCase() + command.slice(7) : undefined;
      this._actions.set(button, { command, attributes, active });
    }

    const attributes: Record<string, string> = { role: 'textbox', 'aria-multiline': 'true' };
    for (const name of NAMING) {
      const value = this.textarea.getAttribute(name);
      if (value) attributes[name] = value;
    }
    // A <label for> names the hidden textarea, so it has to name the editor
    // instead, and a click on it has to focus the editor.
    this._label = this.textarea.labels?.[0] ?? null;
    if (this._label && !attributes['aria-labelledby']) {
      if (!this._label.id) this._label.id = `rich-text-editor-label-${Utils.guid()}`;
      attributes['aria-labelledby'] = this._label.id;
      this._label.addEventListener('click', this._handleLabelClick);
    }

    this.content = document.createElement('div');
    this.content.className = 'rich-text-editor-content';
    this.textarea.after(this.content);
    this.textarea.hidden = true;
    this.editor = new this.options.Editor({
      element: this.content,
      extensions: this.options.extensions,
      content: this.textarea.value,
      editable: !(this.textarea.disabled || this.textarea.readOnly),
      editorProps: { attributes }
    });
    this.editor.on('update', this._handleUpdate);
    this.editor.on('transaction', this._handleTransaction);
    this._handleTransaction();
    el.addEventListener('click', this._handleClick);
  }

  static get defaults(): RichTextEditorOptions {
    return _defaults;
  }

  /**
   * Initializes instance of RichTextEditor.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<RichTextEditorOptions>): RichTextEditor;
  /**
   * Initializes instances of RichTextEditor.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: InitElements<InitElement>,
    options?: Partial<RichTextEditorOptions>
  ): RichTextEditor[];
  /**
   * Initializes instances of RichTextEditor.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<RichTextEditorOptions> = {}
  ): RichTextEditor | RichTextEditor[] {
    return super.init(els, options, RichTextEditor);
  }

  static getInstance(el: HTMLElement): RichTextEditor {
    return el['Expressive_RichTextEditor'];
  }

  destroy() {
    this.el['Expressive_RichTextEditor'] = undefined;
    if (!this.editor) return;
    this.el.removeEventListener('click', this._handleClick);
    this._label?.removeEventListener('click', this._handleLabelClick);
    this.editor.off('update', this._handleUpdate);
    this.editor.off('transaction', this._handleTransaction);
    this.editor.destroy();
    this.editor = null;
    this.content.remove();
    this.textarea.hidden = false;
    for (const button of this._actions.keys()) {
      button.disabled = false;
      button.classList.remove('active');
      button.removeAttribute('aria-pressed');
    }
  }

  private _handleClick = (e: MouseEvent) => {
    const button = (e.target as Element).closest<HTMLButtonElement>('button[data-command]');
    const action = this._actions.get(button);
    if (action && !button.disabled) this.editor.chain().focus()[action.command](action.attributes).run();
  };

  private _handleLabelClick = () => {
    this.editor.chain().focus().run();
  };

  private _handleUpdate = () => {
    this.textarea.value = this.editor.isEmpty ? '' : this.editor.getHTML();
    this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };

  private _handleTransaction = () => {
    const can = this.editor.isEditable && this.editor.can();
    for (const [button, { command, attributes, active }] of this._actions) {
      button.disabled = !can || !(command in this.editor.commands) || !can[command](attributes);
      if (!active) continue;
      const on = this.editor.isActive(active, attributes);
      button.setAttribute('aria-pressed', String(on));
      button.classList.toggle('active', on);
    }
  };
}
