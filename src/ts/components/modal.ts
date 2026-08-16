import { Component, BaseOptions, InitElements, MElement } from '../core/component';

// Obsolete for versions > 2.1.1

export interface ModalOptions extends BaseOptions {
  opacity: number;
  inDuration: number;
  outDuration: number;
  preventScrolling: boolean;
  onOpenStart: (this: Modal, el: HTMLElement) => void;
  onOpenEnd: (this: Modal, el: HTMLElement) => void;
  onCloseStart: (el: HTMLElement) => void;
  onCloseEnd: (el: HTMLElement) => void;
  dismissible: boolean;
  startingTop: string;
  endingTop: string;
}

const _defaults = {
  opacity: 0.5,
  inDuration: 250,
  outDuration: 250,
  onOpenStart: null,
  onOpenEnd: null,
  onCloseStart: null,
  onCloseEnd: null,
  preventScrolling: true,
  dismissible: true,
  startingTop: '4%',
  endingTop: '10%'
};

export class Modal extends Component<ModalOptions> {
  constructor(el: HTMLElement, options: Partial<ModalOptions>) {
    super(el, options, Modal);
    this.el['Expressive_Modal'] = this;
    this.options = {
      ...Modal.defaults,
      ...options
    };
    this.el.tabIndex = 0;
    this._setupEventHandlers();
  }

  static get defaults() {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<ModalOptions>): Modal;
  static init(els: InitElements<MElement>, options?: Partial<ModalOptions>): Modal[];
  static init(
    els: HTMLElement | InitElements<MElement>,
    options: Partial<ModalOptions> = {}
  ): Modal | Modal[] {
    return super.init(els, options, Modal);
  }

  static getInstance(el: HTMLElement): Modal {
    return el['Expressive_Modal'];
  }

  destroy() {}
  _setupEventHandlers() {}
  _removeEventHandlers() {}
  _handleTriggerClick() {}
  _handleOverlayClick() {}
  _handleModalCloseClick() {}
  _handleKeydown() {}
  _handleFocus() {}
  open() {
    return this;
  }
  close() {
    return this;
  }

  // Experimental!

  static #createHtml(config: ModalCreateConfig) {
    const title = config.header
      ? `<h2>${typeof config.header === 'string' ? config.header : ''}</h2>`
      : '';
    const actions = config.footer
      ? `<form method="dialog">${typeof config.footer === 'string' ? config.footer : ''}</form>`
      : '';
    return `<dialog id="${config.id}">
      ${title}
      <div>${typeof config.content === 'string' ? config.content : ''}</div>
      ${actions}
    </dialog>`;
  }

  static #createHtmlElement(config: ModalCreateConfig) {
    const dialog = document.createElement('dialog');
    dialog.id = config.id;
    return dialog;
  }

  static create(config) {
    const isServer = false;
    if (isServer) return this.#createHtml(config);
    return this.#createHtmlElement(config);
  }

  static {}
}

interface ModalCreateConfig {
  id: string;
  header: string | HTMLElement;
  content: string | HTMLElement;
  footer: string | HTMLElement;
}
