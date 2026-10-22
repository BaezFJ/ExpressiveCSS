// Language labels and copy controls for documentation samples.
(function enhanceCodeBlocks() {
  const LANGUAGE_LABELS = {
    bash: 'Shell',
    css: 'CSS',
    html: 'HTML',
    javascript: 'JavaScript',
    plaintext: 'Text',
    scss: 'SCSS',
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
    button.className = 'tonal code-copy-button';
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
        await navigator.clipboard.writeText(source);
        setCopyState(button, 'copied');
      } catch {
        setCopyState(button, 'error');
      }
      resetTimer = window.setTimeout(() => setCopyState(button, 'idle'), 2000);
    });

    return button;
  };

  // A sample wider than its block scrolls sideways. Chromium and Firefox put
  // such a scroller in the Tab order on their own; WebKit does not, so the
  // keyboard could never reach the hidden part. Only overflowing blocks get
  // the stop, and a resize re-checks it.
  const syncScrollStop = (pre) => {
    if (pre.scrollWidth > pre.clientWidth) pre.tabIndex = 0;
    else pre.removeAttribute('tabindex');
  };
  const scrollStops = new ResizeObserver((entries) =>
    entries.forEach((entry) => syncScrollStop(entry.target))
  );

  // Code.astro highlights each sample at build time and records its language.
  document.querySelectorAll('pre[data-language] > code').forEach((code) => {
    const pre = code.parentElement;
    if (pre.parentElement?.classList.contains('code-block')) return;

    const source = code.textContent;
    const wrapper = document.createElement('div');
    const languageLabel = document.createElement('span');
    wrapper.className = 'code-block';
    languageLabel.className = 'code-language';
    languageLabel.textContent = LANGUAGE_LABELS[pre.dataset.language];
    languageLabel.setAttribute('aria-hidden', 'true');

    pre.before(wrapper);
    wrapper.append(languageLabel, makeCopyButton(source), pre);
    syncScrollStop(pre);
    scrollStops.observe(pre);
  });
})();
