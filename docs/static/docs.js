// Docs-site glue. The framework bundle only self-initializes Forms/Chips/Waves/
// Range/Cards; everything else needs an explicit AutoInit pass.
document.addEventListener('DOMContentLoaded', () => {
  RoutePlate.AutoInit();

  const applyTheme = (next) => {
    document.documentElement.setAttribute('theme', next);
    document.querySelectorAll('#theme-toggle .material-icons, #page-theme-toggle .material-icons')
      .forEach((icon) => {
        icon.textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
      });
  };

  document.querySelectorAll('#theme-toggle, #page-theme-toggle').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const next = document.documentElement.getAttribute('theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  });

  const containerToggle = document.getElementById('container-toggle-button');
  containerToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    const off = document.body.classList.toggle('containers-off');
    containerToggle.textContent = off ? 'Turn on Containers' : 'Turn off Containers';
  });

  const scaleDemo = document.getElementById('scale-demo');
  document.getElementById('scale-demo-trigger')?.addEventListener('click', (event) => {
    event.preventDefault();
    scaleDemo?.classList.toggle('scale-out');
  });

  const flowDemo = document.getElementById('flow-text-demo');
  document.getElementById('flow-toggle')?.addEventListener('click', (event) => {
    event.preventDefault();
    flowDemo?.classList.toggle('flow-text');
  });

  document.getElementById('wave-trigger')?.addEventListener('click', () => {
    RoutePlate.Waves.renderWaveEffect(
      document.querySelector('.wave-demo'),
      null,
      { r: 255, g: 0, b: 0 }
    );
  });

  const fabHorizontal = document.getElementById('fab-horizontal');
  if (fabHorizontal) {
    RoutePlate.FloatingActionButton.init(fabHorizontal, { direction: 'left' });
  }

  const fabClickOnly = document.getElementById('fab-click-only');
  if (fabClickOnly) {
    RoutePlate.FloatingActionButton.init(fabClickOnly, {
      direction: 'left',
      hoverEnabled: false,
    });
  }

  const collapsibleExpandable = document.getElementById('collapsible-expandable');
  if (collapsibleExpandable) {
    RoutePlate.Collapsible.init(collapsibleExpandable, { accordion: false });
  }

  const dropdownLeft = document.getElementById('dropdown-left-trigger');
  if (dropdownLeft) {
    RoutePlate.Dropdown.init(dropdownLeft, {
      alignment: 'left',
      constrainWidth: false,
    });
  }

  const dropdownRight = document.getElementById('dropdown-right-trigger');
  if (dropdownRight) {
    RoutePlate.Dropdown.init(dropdownRight, {
      alignment: 'right',
      constrainWidth: false,
    });
  }

  const dropdownHover = document.getElementById('dropdown-hover-trigger');
  if (dropdownHover) {
    RoutePlate.Dropdown.init(dropdownHover, {
      hover: true,
      constrainWidth: false,
    });
  }

  const featureTapTarget = document.getElementById('feature-tap-target');
  document.getElementById('tap-target-open')?.addEventListener('click', (event) => {
    event.preventDefault();
    RoutePlate.TapTarget.getInstance(featureTapTarget)?.open();
  });
  document.getElementById('tap-target-close')?.addEventListener('click', (event) => {
    event.preventDefault();
    RoutePlate.TapTarget.getInstance(featureTapTarget)?.close();
  });

  const sliders = document.querySelectorAll('.slider');
  if (sliders.length && RoutePlate.Slider) {
    RoutePlate.Slider.init(sliders);
  }

  const carouselFull = document.getElementById('carousel-fullwidth');
  if (carouselFull) {
    RoutePlate.Carousel.init(carouselFull, { fullWidth: true });
  }
  const carouselContent = document.getElementById('carousel-content');
  if (carouselContent) {
    RoutePlate.Carousel.init(carouselContent, { fullWidth: true, indicators: true });
  }
  document.getElementById('carousel-prev')?.addEventListener('click', () => {
    RoutePlate.Carousel.getInstance(document.getElementById('carousel-intro'))?.prev();
  });
  document.getElementById('carousel-next')?.addEventListener('click', () => {
    RoutePlate.Carousel.getInstance(document.getElementById('carousel-intro'))?.next();
  });

  const slideOut = document.getElementById('slide-out');
  if (slideOut) {
    RoutePlate.Sidenav.init(slideOut);
  }

  const slideOutRight = document.getElementById('slide-out-right');
  if (slideOutRight) {
    RoutePlate.Sidenav.init(slideOutRight, { edge: 'right' });
  }

  // Extra overlay sidenavs set tabindex on every .sidenav link. Put the docs
  // sidebar back in the tab order.
  if (slideOut || slideOutRight) {
    document.querySelectorAll('#nav-mobile a').forEach((link) => {
      link.tabIndex = 0;
    });
  }

  const swipeTabs = document.getElementById('tabs-swipe');
  if (swipeTabs) {
    RoutePlate.Tabs.init(swipeTabs, { swipeable: true });
  }

  document.getElementById('toast-basic')?.addEventListener('click', () => {
    new RoutePlate.Toast({ text: 'Photo saved to album' });
  });

  document.getElementById('toast-action')?.addEventListener('click', () => {
    new RoutePlate.Toast({
      text: 'Item archived',
      action: 'Undo',
      onAction: () => {
        new RoutePlate.Toast({ text: 'Item restored' });
      },
    });
  });

  document.getElementById('toast-close')?.addEventListener('click', () => {
    new RoutePlate.Toast({
      text: "Can't send photo. Retry in 5 seconds.",
      action: 'Retry',
      dismissible: true,
    });
  });

  document.getElementById('toast-static')?.addEventListener('click', () => {
    const el = document.getElementById('static-snackbar');
    if (!el) return;
    el.classList.add('active');
    window.clearTimeout(el._hideTimer);
    el._hideTimer = window.setTimeout(() => el.classList.remove('active'), 4000);
  });

  document.getElementById('toast-html-1')?.addEventListener('click', () => {
    new RoutePlate.Toast({ toastId: 'my-toast-1' });
  });

  document.getElementById('toast-html-2')?.addEventListener('click', () => {
    new RoutePlate.Toast({ toastId: 'my-toast-2' });
  });

  document.getElementById('toast-callback')?.addEventListener('click', () => {
    new RoutePlate.Toast({
      text: 'I will call back when dismissed',
      completeCallback: () => {
        new RoutePlate.Toast({ text: 'Your toast was dismissed' });
      },
    });
  });

  document.getElementById('toast-rounded')?.addEventListener('click', () => {
    new RoutePlate.Toast({ text: 'I am a toast!', classes: 'rounded' });
  });

  document.getElementById('toast-top')?.addEventListener('click', () => {
    new RoutePlate.Toast({ text: 'Posted from the top', classes: 'top' });
  });

  document.getElementById('toast-dismiss-show')?.addEventListener('click', () => {
    new RoutePlate.Toast({ text: 'I am a toast!' });
  });

  document.getElementById('toast-dismiss-one')?.addEventListener('click', () => {
    const toastElement = document.querySelector('#toast-container .toast');
    RoutePlate.Toast.getInstance(toastElement)?.dismiss();
  });

  document.getElementById('toast-dismiss-all')?.addEventListener('click', () => {
    RoutePlate.Toast.dismissAll();
  });

  const initDatepicker = (id, options) => {
    const el = document.getElementById(id);
    if (el) RoutePlate.Datepicker.init(el, options);
  };
  initDatepicker('datepicker-intro', { openByDefault: true });
  initDatepicker('datepicker-range', {
    openByDefault: true,
    isDateRange: true,
    dateRangeEndEl: '#datepicker-range-end',
  });
  initDatepicker('datepicker-multi', {
    openByDefault: true,
    isMultipleSelection: true,
  });

  const timepicker24 = document.getElementById('timepicker-24');
  if (timepicker24) {
    RoutePlate.Timepicker.init(timepicker24, { twelveHour: false });
  }

  document.querySelectorAll('#input_text_counter, #textarea_counter').forEach((el) => {
    RoutePlate.CharacterCounter.init(el);
  });

  const indeterminate = document.getElementById('indeterminate-checkbox');
  if (indeterminate) indeterminate.indeterminate = true;

  const autocompleteData = [
    { id: 12, text: 'Apple' },
    { id: 13, text: 'Microsoft' },
    { id: 42, text: 'Google', image: 'https://picsum.photos/id/64/250/250' },
  ];
  const autocompleteInput = document.getElementById('autocomplete-input');
  if (autocompleteInput) {
    RoutePlate.Autocomplete.init(autocompleteInput, {
      minLength: 0,
      data: autocompleteData,
    });
  }
  const autocompleteMulti = document.getElementById('autocomplete-multi');
  if (autocompleteMulti) {
    RoutePlate.Autocomplete.init(autocompleteMulti, {
      minLength: 0,
      isMultiSelect: true,
      data: autocompleteData,
    });
  }

  const chipsEmpty = document.getElementById('chips-empty');
  if (chipsEmpty) {
    RoutePlate.Chips.init(chipsEmpty, { allowUserInput: true });
  }
  const chipsInitial = document.getElementById('chips-initial');
  if (chipsInitial) {
    RoutePlate.Chips.init(chipsInitial, {
      allowUserInput: true,
      data: [{ id: 'Apple' }, { id: 'Microsoft' }, { id: 'Google' }],
    });
  }
  const chipsPlaceholder = document.getElementById('chips-placeholder');
  if (chipsPlaceholder) {
    RoutePlate.Chips.init(chipsPlaceholder, {
      allowUserInput: true,
      placeholder: 'Enter a tag',
      secondaryPlaceholder: '+Tag',
    });
  }
  const chipsAutocomplete = document.getElementById('chips-autocomplete');
  if (chipsAutocomplete) {
    RoutePlate.Chips.init(chipsAutocomplete, {
      allowUserInput: true,
      autocompleteOptions: {
        data: [
          { id: 12, text: 'Apple' },
          { id: 13, text: 'Microsoft' },
          { id: 42, text: 'Google', image: 'https://picsum.photos/id/64/250/250' },
        ],
      },
    });
  }

  const tooltipDemo = document.getElementById('tooltip-method-demo');
  document.getElementById('tooltip-open')?.addEventListener('click', (event) => {
    event.preventDefault();
    RoutePlate.Tooltip.getInstance(tooltipDemo)?.open();
  });
  document.getElementById('tooltip-close')?.addEventListener('click', (event) => {
    event.preventDefault();
    RoutePlate.Tooltip.getInstance(tooltipDemo)?.close();
  });

  const toc = document.querySelector('.toc-wrapper');
  if (toc && RoutePlate.Pushpin) {
    toc.style.width = `${toc.parentElement.getBoundingClientRect().width}px`;
    RoutePlate.Pushpin.init(toc, {
      top: toc.getBoundingClientRect().top + window.scrollY,
    });
  }
});
