// Docs-site glue. The framework bundle only self-initializes Forms/Chips/Waves/
// Range/Cards; everything else needs an explicit AutoInit pass.
document.addEventListener('DOMContentLoaded', () => {
  RoutePlate.AutoInit();

  const toggle = document.getElementById('theme-toggle');
  toggle?.addEventListener('click', () => {
    const root = document.documentElement;
    root.setAttribute('theme', root.getAttribute('theme') === 'dark' ? 'light' : 'dark');
  });
});
