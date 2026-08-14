// Docs-site glue. The framework bundle only self-initializes Forms/Chips/Waves/
// Range/Cards; everything else needs an explicit AutoInit pass.
document.addEventListener('DOMContentLoaded', () => {
  RoutePlate.AutoInit();

  const toggle = document.getElementById('theme-toggle');
  toggle?.addEventListener('click', (event) => {
    event.preventDefault();
    const root = document.documentElement;
    const next = root.getAttribute('theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('theme', next);
    const icon = toggle.querySelector('.material-icons');
    if (icon) icon.textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
  });

  const containerToggle = document.getElementById('container-toggle-button');
  containerToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    const off = document.body.classList.toggle('containers-off');
    containerToggle.textContent = off ? 'Turn on Containers' : 'Turn off Containers';
  });

  const toc = document.querySelector('.toc-wrapper');
  if (toc && RoutePlate.Pushpin) {
    toc.style.width = `${toc.parentElement.getBoundingClientRect().width}px`;
    RoutePlate.Pushpin.init(toc, {
      top: toc.getBoundingClientRect().top + window.scrollY,
    });
  }
});
