// Intentionally flawed review fixture: drag and keyboard reordering have no click/tap alternative.
const controller = new AbortController();
const listen = (element, event, handler) => element.addEventListener(event, handler, { signal: controller.signal });
const status = document.querySelector('#status');
listen(document.querySelector('#theme'), 'change', event => document.documentElement.setAttribute('theme', event.target.value));
listen(document.querySelector('#save'), 'click', () => { status.textContent = 'Reminder saved for this page session. Nothing was sent.'; });
document.querySelectorAll('.tiny, #medium-target').forEach(button => listen(button, 'click', () => { status.textContent = button.getAttribute('aria-label'); }));
let dragged;
const list = document.querySelector('#tasks');
const announce = () => { status.textContent = `Task order: ${[...list.children].map(row => row.textContent).join(', ')}.`; };
for (const row of list.children) {
  listen(row, 'dragstart', event => { dragged = row; event.dataTransfer.setData('text/plain', row.textContent); });
  listen(row, 'dragover', event => event.preventDefault());
  listen(row, 'drop', event => { event.preventDefault(); if (dragged && dragged !== row) { list.insertBefore(dragged, row); announce(); } dragged = null; });
  listen(row, 'keydown', event => {
    if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const sibling = event.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
    if (sibling) { list.insertBefore(event.key === 'ArrowUp' ? row : sibling, event.key === 'ArrowUp' ? sibling : row); row.focus(); announce(); }
  });
}
window.addEventListener('pagehide', () => controller.abort(), { once: true });
