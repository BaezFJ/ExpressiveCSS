import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElement, InitElements } from '../core/component';

/**
 * The parts of a Tiptap `Editor` this component uses. Declared here so the
 * published types do not depend on Tiptap.
 */
/** A Tiptap command chain. Commands by name come through `command()`. */
export interface RichTextEditorChain {
  focus(): RichTextEditorChain;
  run(): boolean;
}

/**
 * What `new Editor()` gets. Only these are declared; the extensions and
 * `editorProps` ride along, and Tiptap types them itself.
 */
export interface RichTextEditorConfig {
  element: HTMLElement;
  content: string;
  editable: boolean;
}

export interface RichTextEditorInstance {
  commands: object;
  isEditable: boolean;
  isEmpty: boolean;
  chain(): RichTextEditorChain;
  /** Each command as a check that reports whether it can run now. */
  can(): object;
  isActive(name: string, attributes?: object): boolean;
  getHTML(): string;
  on(event: string, callback: () => void): unknown;
  off(event: string, callback: () => void): unknown;
  destroy(): void;
}

/** Tiptap's `Editor` class, or any class with the parts this component uses. */
export type RichTextEditorClass = new (options: RichTextEditorConfig) => RichTextEditorInstance;

export interface RichTextEditorOptions<E extends RichTextEditorClass = RichTextEditorClass> extends BaseOptions {
  /**
   * Tiptap's `Editor` class. ExpressiveCSS does not bundle Tiptap, so the
   * page imports it and passes it in.
   * @default null
   */
  Editor: E | null;
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

/**
 * A command by name on a chain or on `can()`. The page's `data-command`
 * names a command an extension registered, which `_handleTransaction`
 * checks against `editor.commands` first.
 */
const command = <R>(commands: object, name: string) =>
  Reflect.get(commands, name) as (attributes?: object) => R;

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
export class RichTextEditor<E extends RichTextEditorClass = RichTextEditorClass> extends Component<RichTextEditorOptions<E>> {
  /**
   * The Tiptap editor, with the full type of the `Editor` passed to the
   * constructor; `init()` and `getInstance()` see the `RichTextEditorInstance`
   * subset.
   */
  editor: InstanceType<E> | null = null;
  /** The form value. */
  textarea: HTMLTextAreaElement | null;
  /** The element the editor is mounted in. */
  content: HTMLElement | null = null;
  private _actions = new Map<HTMLButtonElement, Action>();
  private _label: HTMLLabelElement | null = null;
  private _required = false;
  private _form: HTMLFormElement | null = null;

  /** Initializes an editor, typed by the `Editor` passed in. */
  static init<E extends RichTextEditorClass>(this: typeof RichTextEditor, el: HTMLElement, options?: Partial<RichTextEditorOptions<E>>): RichTextEditor<E>;
  /** Initializes an editor on each element, typed by the `Editor` passed in. */
  static init<E extends RichTextEditorClass>(this: typeof RichTextEditor, els: InitElements<InitElement>, options?: Partial<RichTextEditorOptions<E>>): RichTextEditor<E>[];
  static init(els: HTMLElement | InitElements<InitElement>, options: Partial<RichTextEditorOptions> = {}): RichTextEditor | RichTextEditor[] {
    return super.init.call(this, els as InitElements<InitElement>, options);
  }

  constructor(el: HTMLElement, options: Partial<RichTextEditorOptions<E>>) {
    super(el, options);
    this.textarea = el.querySelector(':scope > textarea');
    if (!this.textarea || !this.options.Editor) {
      console.error('RichTextEditor needs a <textarea> child and the Tiptap Editor class in options.Editor.');
      return;
    }

    for (const button of el.querySelectorAll<HTMLButtonElement>('button[data-command]')) {
      const command = button.dataset.command;
      let attributes: object | undefined;
      try {
        attributes = button.dataset.attributes ? JSON.parse(button.dataset.attributes) : undefined;
      } catch {
        // One bad button must not stop the editor, or later elements, mounting.
        console.warn('RichTextEditor ignored invalid JSON in data-attributes:', button.dataset.attributes);
      }
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
      this._label.addEventListener('click', this._handleLabelClick, { signal: this._events.signal });
    }
    // A hidden required textarea blocks submit with no message, because the
    // browser cannot focus it to report. The editor takes over: it carries
    // aria-required, and an empty editor cancels submit and takes focus.
    this._required = this.textarea.required;
    this._form = this.textarea.form;
    if (this._required) {
      attributes['aria-required'] = 'true';
      this.textarea.required = false;
      this._form?.addEventListener('submit', this._handleSubmit, { capture: true, signal: this._events.signal });
    }
    this._form?.addEventListener('reset', this._handleReset, { signal: this._events.signal });

    this.content = document.createElement('div');
    this.content.className = 'rich-text-editor-content';
    this.textarea.after(this.content);
    this.textarea.hidden = true;
    const config = {
      element: this.content,
      extensions: this.options.extensions,
      content: this.textarea.value,
      editable: !(this.textarea.disabled || this.textarea.readOnly),
      editorProps: { attributes }
    };
    // `new` on a generic constructor yields the constraint, not E's instance.
    this.editor = new this.options.Editor(config) as InstanceType<E>;
    this.editor.on('update', this._handleUpdate);
    this.editor.on('transaction', this._handleTransaction);
    this._handleTransaction();
    el.addEventListener('click', this._handleClick, { signal: this._events.signal });
  }

  static get defaults(): RichTextEditorOptions {
    return _defaults;
  }

  static key = 'Expressive_RichTextEditor';

  destroy() {
    super.destroy();
    if (!this.editor) return;
    this.editor.off('update', this._handleUpdate);
    this.editor.off('transaction', this._handleTransaction);
    this.editor.destroy();
    this.editor = null;
    this.content.remove();
    this.textarea.hidden = false;
    this.textarea.required = this._required;
    for (const button of this._actions.keys()) {
      button.disabled = false;
      button.classList.remove('active');
      button.removeAttribute('aria-pressed');
    }
  }

  private _handleClick = (e: MouseEvent) => {
    const button = (e.target as Element).closest<HTMLButtonElement>('button[data-command]');
    const action = this._actions.get(button);
    if (action && !button.disabled) command<RichTextEditorChain>(this.editor.chain().focus(), action.command)(action.attributes).run();
  };

  private _handleLabelClick = () => {
    this.editor.chain().focus().run();
  };

  private _skipsValidation(e: SubmitEvent) {
    return this._form.noValidate || !!(e.submitter as HTMLButtonElement | null)?.formNoValidate;
  }

  private _handleSubmit = (e: SubmitEvent) => {
    if (this._skipsValidation(e) || !this.editor.isEditable || !this.editor.isEmpty) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.editor.chain().focus().run();
  };

  /**
   * The form restores the textarea after the reset event, so the editor reads
   * it back a task later. Without this the editor kept the typed text while the
   * form submitted the default. No update is emitted, so a reset fires no input.
   */
  private _handleReset = (e: Event) => {
    setTimeout(() => {
      if (e.defaultPrevented || RichTextEditor.getInstance(this.el) !== this || !this.editor) return;
      const commands = this.editor.commands as { setContent: (content: string, options: { emitUpdate: boolean }) => boolean };
      commands.setContent(this.textarea.value, { emitUpdate: false });
    });
  };

  private _handleUpdate = () => {
    this.textarea.value = this.editor.isEmpty ? '' : this.editor.getHTML();
    this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };

  private _handleTransaction = () => {
    const can = this.editor.isEditable && this.editor.can();
    for (const [button, { command: name, attributes, active }] of this._actions) {
      button.disabled = !can || !(name in this.editor.commands) || !command<boolean>(can, name)(attributes);
      if (!active) continue;
      const on = this.editor.isActive(active, attributes);
      button.setAttribute('aria-pressed', String(on));
      button.classList.toggle('active', on);
    }
  };
}
