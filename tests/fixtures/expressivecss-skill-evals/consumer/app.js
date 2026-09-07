const activity = document.querySelector('#activity');
const selector = document.querySelector('#preview-state');
const states = {
  default: 'Your account is up to date.',
  loading: 'Loading account activity…',
  empty: 'No account activity yet.',
  error: 'Activity could not be loaded. Try again.',
  offline: 'You are offline. Previously saved account details are available.',
  'long-content': 'This account has a long organization name and several notification preferences requiring careful review. '.repeat(8),
};
function showState(value) {
  const state = Object.hasOwn(states, value) ? value : 'default';
  selector.value = state;
  activity.textContent = states[state];
  activity.dataset.state = state;
}
selector.addEventListener('change', () => showState(selector.value));
showState(new URL(location.href).searchParams.get('state'));
document.querySelector('#preferences').addEventListener('submit', (event) => {
  event.preventDefault();
  document.querySelector('#save-result').textContent = 'Preferences saved.';
});
document.querySelector('#remount-help').addEventListener('click', () => {
  const help = document.querySelector('#account-help');
  help.replaceWith(help.cloneNode(true));
});
for (const link of document.querySelectorAll('nav.navigation-bar a, nav.navigation-rail a')) {
  if (link.pathname === (location.pathname === '/dashboard' ? '/home' : location.pathname)) link.setAttribute('aria-current', 'page');
  else link.removeAttribute('aria-current');
}
Expressive.AutoInit();
addEventListener('pagehide', () => Expressive.NavigationDrawer.getInstance(document.querySelector('#account-drawer'))?.destroy(), { once: true });
