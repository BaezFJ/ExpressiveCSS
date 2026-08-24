// Syntax highlighting and copy controls for documentation samples.
(function enhanceCodeBlocks() {
  const LANGUAGE_LABELS = {
    bash: 'Shell',
    css: 'CSS',
    html: 'HTML',
    javascript: 'JavaScript',
    plaintext: 'Text',
    scss: 'SCSS',
  };

  const explicitLanguage = (code) => {
    for (const className of code.classList) {
      if (className.startsWith('language-')) return className.slice('language-'.length);
    }
    return null;
  };

  const detectLanguage = (source) => {
    const text = source.trim();
    if (/^<[!/a-z]/i.test(text)) return 'html';
    if (/^@use\b/.test(text)) return 'scss';
    if (
      /^(?:@media\b|:root\b|(?:html|body)(?:\s|,|\{)|[.#][\w-]+[\s:{.#>[+~])/i.test(text)
    ) {
      return 'css';
    }
    if (/^(?:npm|npx|pnpm|yarn)\s/.test(text)) return 'bash';
    if (
      /\b(?:const|let|var|function|import|new|document|Expressive)\b|^(?:instance|dialog|list)\./m.test(
        text
      )
    ) {
      return 'javascript';
    }
    return 'plaintext';
  };

  const copyText = async (source) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(source);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = source;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand?.('copy');
    textarea.remove();
    if (!copied) throw new Error('Copy is not available');
  };

  const setCopyState = (button, state) => {
    const icon = button.querySelector('.material-symbols');
    const label = button.querySelector('.code-copy-label');
    const states = {
      idle: { icon: 'content_copy', label: 'Copy', title: 'Copy code' },
      copied: { icon: 'check', label: 'Copied', title: 'Code copied' },
      error: { icon: 'error', label: 'Copy failed', title: 'Could not copy code' },
    };
    const next = states[state];
    button.dataset.state = state;
    button.title = next.title;
    button.setAttribute('aria-label', next.title);
    icon.textContent = next.icon;
    label.textContent = next.label;
  };

  const makeCopyButton = (source) => {
    const button = document.createElement('button');
    const icon = document.createElement('span');
    const label = document.createElement('span');

    button.type = 'button';
    button.className = 'code-copy-button';
    button.setAttribute('aria-live', 'polite');
    icon.className = 'material-symbols';
    icon.setAttribute('aria-hidden', 'true');
    label.className = 'code-copy-label';
    button.append(icon, label);
    setCopyState(button, 'idle');

    let resetTimer;
    button.addEventListener('click', async () => {
      window.clearTimeout(resetTimer);
      try {
        await copyText(source);
        setCopyState(button, 'copied');
      } catch {
        setCopyState(button, 'error');
      }
      resetTimer = window.setTimeout(() => setCopyState(button, 'idle'), 2000);
    });

    return button;
  };

  if (window.hljs) {
    window.hljs.configure({
      languages: ['xml', 'css', 'scss', 'javascript', 'bash', 'plaintext'],
    });
  }

  document.querySelectorAll('pre > code').forEach((code) => {
    const pre = code.parentElement;
    if (!pre || pre.parentElement?.classList.contains('code-block')) return;

    const source = code.textContent;
    const language = explicitLanguage(code) ?? detectLanguage(source);
    code.classList.add(`language-${language}`);
    window.hljs?.highlightElement(code);

    const wrapper = document.createElement('div');
    const languageLabel = document.createElement('span');
    wrapper.className = 'code-block';
    languageLabel.className = 'code-language';
    languageLabel.textContent = LANGUAGE_LABELS[language] ?? language;
    languageLabel.setAttribute('aria-hidden', 'true');

    pre.before(wrapper);
    wrapper.append(languageLabel, makeCopyButton(source), pre);
  });
})();
