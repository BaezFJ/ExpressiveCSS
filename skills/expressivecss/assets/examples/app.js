/* Native application behavior. No backend, persistence, timers or automatic full-page init. */
(() => {
  const app = document.querySelector('#app');
  const treatment = document.querySelector('#treatment');
  const queryTreatment = new URLSearchParams(location.search).get('treatment');
  if (['restrained', 'expressive'].includes(queryTreatment)) treatment.value = queryTreatment;
  let savedPreferences;
  let savedDraft;

  function mount() {
    const controller = new AbortController();
    const instances = [];
    const listen = (target, type, handler) => target.addEventListener(type, handler, { signal: controller.signal });
    const status = document.querySelector('#status');
    function applyTreatment() {
      const expressive = treatment.value === 'expressive';
      document.body.dataset.treatment = expressive ? 'expressive' : 'restrained';
      app.querySelectorAll('.primary-action').forEach(button => {
        button.classList.toggle('large', expressive);
        button.classList.toggle('medium', !expressive);
      });
      app.querySelectorAll('.focal :is(h1, h2)').forEach(heading => {
        heading.classList.toggle('headline-large', expressive);
        heading.classList.toggle('headline-medium', !expressive);
      });
    }
    function dispose() {
      // ButtonGroup.destroy restores authored states; retain the user's state for bfcache return.
      const pressed = [...app.querySelectorAll('[aria-pressed]')].map(button => [button, button.getAttribute('aria-pressed')]);
      try { instances.forEach(instance => instance.destroy()); }
      finally {
        controller.abort();
        pressed.forEach(([button, value]) => button.setAttribute('aria-pressed', value));
      }
    }
    try {
      applyTreatment();
      listen(treatment, 'change', applyTreatment);
      listen(document.querySelector('#theme'), 'change', event => {
        if (event.target.value === 'auto') document.documentElement.removeAttribute('theme');
        else document.documentElement.setAttribute('theme', event.target.value);
      });
      if (document.body.dataset.example === 'settings') {
        listen(document.querySelector('#settings-form'), 'submit', event => {
          event.preventDefault();
          const values = new FormData(event.target);
          savedPreferences = { updates: values.getAll('updates'), quiet: values.has('quiet') };
          status.textContent = `Saved for this page session: ${savedPreferences.updates.length} email update types; quiet hours ${savedPreferences.quiet ? 'on' : 'off'}. No account settings changed.`;
        });
      }
      if (document.body.dataset.example === 'editor') {
        const form = document.querySelector('#editor-form');
        const subject = document.querySelector('#subject');
        const message = document.querySelector('#message');
        const group = document.querySelector('#formatting');
        const preview = document.querySelector('#preview');
        const previewButton = document.querySelector('#preview-button');
        const previewMessage = document.querySelector('#preview-message');
        instances.push(Expressive.ButtonGroup.init(group));
        function updatePreview() {
          document.querySelector('#preview-subject').textContent = subject.value;
          previewMessage.textContent = message.value;
          previewMessage.classList.toggle('is-bold', document.querySelector('#bold').getAttribute('aria-pressed') === 'true');
          previewMessage.classList.toggle('is-italic', document.querySelector('#italic').getAttribute('aria-pressed') === 'true');
        }
        listen(group, 'click', updatePreview);
        listen(form, 'input', updatePreview);
        listen(previewButton, 'click', () => {
          if (!form.reportValidity()) return;
          updatePreview();
          preview.hidden = false;
          previewButton.setAttribute('aria-expanded', 'true');
          document.querySelector('#preview-title').focus();
        });
        listen(document.querySelector('#edit-button'), 'click', () => {
          preview.hidden = true;
          previewButton.setAttribute('aria-expanded', 'false');
          message.focus();
        });
        listen(form, 'submit', event => {
          event.preventDefault();
          savedDraft = { subject: subject.value, message: message.value, bold: document.querySelector('#bold').getAttribute('aria-pressed'), italic: document.querySelector('#italic').getAttribute('aria-pressed') };
          status.textContent = `Saved “${savedDraft.subject}” for this page session. Nothing was sent.`;
        });
      }
      if (document.body.dataset.example === 'list-detail') {
        const list = document.querySelector('#reading-list');
        const detail = document.querySelector('#reading-detail');
        const title = document.querySelector('#detail-title');
        const readButton = document.querySelector('#read-button');
        const stories = [...list.querySelectorAll('[data-story]')];
        const metadata = { seeds: 'Seed library / 2 minute read', water: 'Garden care / 2 minute read', welcome: 'Volunteering / 2 minute read' };
        let selected = list.querySelector('[aria-current="true"]');
        const showPane = pane => {
          list.classList.toggle('active', pane === list);
          detail.classList.toggle('active', pane === detail);
        };
        function updateReadAction() { readButton.textContent = selected.dataset.read === 'true' ? 'Mark as unread' : 'Mark as read'; }
        stories.forEach(button => listen(button, 'click', () => {
          selected = button;
          stories.forEach(story => {
            story.toggleAttribute('aria-current', story === button);
            if (story === button) story.setAttribute('aria-current', 'true');
            story.parentElement.classList.toggle('selected', story === button);
          });
          title.textContent = button.firstChild.textContent.trim();
          document.querySelector('#story-meta').textContent = metadata[button.dataset.story];
          detail.querySelectorAll('[data-story-content]').forEach(article => { article.hidden = article.dataset.storyContent !== button.dataset.story; });
          updateReadAction();
          showPane(detail);
          title.focus();
        }));
        listen(readButton, 'click', () => {
          const read = selected.dataset.read !== 'true';
          selected.dataset.read = String(read);
          selected.querySelector('.read-state').textContent = read ? 'Read' : 'Unread';
          updateReadAction();
          status.textContent = `${title.textContent} marked ${read ? 'read' : 'unread'} for this page session.`;
        });
        listen(document.querySelector('#back-button'), 'click', () => { showPane(list); selected.focus(); });
        // Keep the focused pane visible when a two-pane window becomes compact.
        listen(matchMedia('(max-width: 839.98px)'), 'change', event => {
          if (event.matches && detail.contains(document.activeElement)) showPane(detail);
          else if (event.matches && list.contains(document.activeElement)) showPane(list);
        });
      }
    } catch (error) { dispose(); throw error; }
    return dispose;
  }
  let dispose = mount();
  window.addEventListener('pagehide', () => dispose());
  window.addEventListener('pageshow', event => { if (event.persisted) dispose = mount(); });
})();
