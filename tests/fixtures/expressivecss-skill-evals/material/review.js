// This working but deliberately intrusive save confirmation is a Material decision to review.
const delivery = document.querySelector('#delivery-choice');
const deliveryInstance = Expressive.ButtonGroup.init(delivery);
const confirmation = document.createElement('dialog');
confirmation.setAttribute('aria-labelledby', 'save-confirmation-title');
confirmation.innerHTML = '<h2 id="save-confirmation-title">Draft saved</h2><p>Your local draft is ready. Nothing was sent.</p><form method="dialog"><button type="submit">Continue editing</button></form>';
document.body.append(confirmation);
const materialListeners = new AbortController();
delivery.addEventListener('click', event => {
  const choice = event.target.closest('[data-delivery]');
  if (choice) document.querySelector('#delivery-value').value = choice.dataset.delivery;
}, { signal: materialListeners.signal });
document.querySelector('#editor-form').addEventListener('submit', event => {
  event.preventDefault();
  document.querySelector('#status').textContent += ` Delivery: ${document.querySelector('#delivery-value').value}.`;
  confirmation.showModal();
}, { signal: materialListeners.signal });
window.addEventListener('pagehide', () => { try { deliveryInstance.destroy(); confirmation.remove(); } finally { materialListeners.abort(); } }, { once: true });
