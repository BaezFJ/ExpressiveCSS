// RichTextEditor setup that does not need a real Tiptap. A stand-in Editor
// mounts a contenteditable with the attributes it is given and records focus.
// rich-text-editor-browser.test.js covers the real editor.

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody } from './setup.js';

class FakeEditor {
  constructor({ element, content, editable, editorProps }) {
    this.dom = document.createElement('div');
    for (const [name, value] of Object.entries(editorProps.attributes)) this.dom.setAttribute(name, value);
    element.append(this.dom);
    this.isEditable = editable;
    this.isEmpty = !content;
    this.commands = {};
    this.focused = false;
  }
  chain() {
    const chain = { focus: () => ((this.focused = true), chain), run: () => true };
    return chain;
  }
  can() {
    return {};
  }
  isActive() {
    return false;
  }
  getHTML() {
    return '';
  }
  on() {}
  off() {}
  destroy() {
    this.dom.remove();
  }
}

describe('RichTextEditor', () => {
  beforeEach(resetBody);

  test('invalid data-attributes JSON warns instead of aborting setup', () => {
    document.body.innerHTML = `
      <div class="rich-text-editor">
        <button type="button" data-command="toggleHeading" data-attributes="{level: 2}">H</button>
        <textarea aria-label="Post"></textarea>
      </div>`;
    const warn = console.warn;
    const warnings = [];
    console.warn = (...args) => warnings.push(args);
    let instance;
    try {
      instance = Expressive.RichTextEditor.init(document.querySelector('.rich-text-editor'), { Editor: FakeEditor });
      assert.ok(instance.editor, 'the editor did not mount');
      assert.equal(warnings.length, 1);
    } finally {
      console.warn = warn;
      instance?.destroy();
    }
  });

  test('an empty required editor blocks submit and takes focus', () => {
    document.body.innerHTML = `
      <form>
        <div class="rich-text-editor">
          <textarea name="body" aria-label="Post" required></textarea>
        </div>
      </form>`;
    const form = document.querySelector('form');
    const textarea = form.querySelector('textarea');
    let submitted = 0;
    const onSubmit = () => submitted++;
    document.addEventListener('submit', onSubmit);
    const instance = Expressive.RichTextEditor.init(form.querySelector('.rich-text-editor'), { Editor: FakeEditor });

    try {
      // The hidden textarea cannot be focused to report, so it must not validate.
      assert.equal(textarea.required, false);
      assert.equal(instance.editor.dom.getAttribute('aria-required'), 'true');
      form.requestSubmit();
      assert.equal(submitted, 0);
      assert.equal(instance.editor.focused, true);
    } finally {
      document.removeEventListener('submit', onSubmit);
      instance.destroy();
    }
    assert.equal(textarea.required, true);
  });
});
