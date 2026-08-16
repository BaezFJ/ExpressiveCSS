// Docs-site glue. The framework bundle only self-initializes Forms/Chips/Waves/
// Range/Cards; everything else needs an explicit AutoInit pass.
document.addEventListener('DOMContentLoaded', () => {
  LibrePOS.AutoInit();

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
    LibrePOS.Waves.renderWaveEffect(
      document.querySelector('.wave-demo'),
      null,
      { r: 255, g: 0, b: 0 }
    );
  });

  const fabHorizontal = document.getElementById('fab-horizontal');
  if (fabHorizontal) {
    LibrePOS.FloatingActionButton.init(fabHorizontal, { direction: 'left' });
  }

  const fabClickOnly = document.getElementById('fab-click-only');
  if (fabClickOnly) {
    LibrePOS.FloatingActionButton.init(fabClickOnly, {
      direction: 'left',
      hoverEnabled: false,
    });
  }

  const collapsibleExpandable = document.getElementById('collapsible-expandable');
  if (collapsibleExpandable) {
    LibrePOS.Collapsible.init(collapsibleExpandable, { accordion: false });
  }

  const dropdownLeft = document.getElementById('dropdown-left-trigger');
  if (dropdownLeft) {
    LibrePOS.Dropdown.init(dropdownLeft, {
      alignment: 'left',
      constrainWidth: false,
    });
  }

  const dropdownRight = document.getElementById('dropdown-right-trigger');
  if (dropdownRight) {
    LibrePOS.Dropdown.init(dropdownRight, {
      alignment: 'right',
      constrainWidth: false,
    });
  }

  const dropdownHover = document.getElementById('dropdown-hover-trigger');
  if (dropdownHover) {
    LibrePOS.Dropdown.init(dropdownHover, {
      hover: true,
      constrainWidth: false,
    });
  }

  const featureTapTarget = document.getElementById('feature-tap-target');
  document.getElementById('tap-target-open')?.addEventListener('click', (event) => {
    event.preventDefault();
    LibrePOS.TapTarget.getInstance(featureTapTarget)?.open();
  });
  document.getElementById('tap-target-close')?.addEventListener('click', (event) => {
    event.preventDefault();
    LibrePOS.TapTarget.getInstance(featureTapTarget)?.close();
  });

  const sliders = document.querySelectorAll('.slider');
  if (sliders.length && LibrePOS.Slider) {
    LibrePOS.Slider.init(sliders);
  }

  const carouselFull = document.getElementById('carousel-fullwidth');
  if (carouselFull) {
    LibrePOS.Carousel.init(carouselFull, { fullWidth: true });
  }
  const carouselContent = document.getElementById('carousel-content');
  if (carouselContent) {
    LibrePOS.Carousel.init(carouselContent, { fullWidth: true, indicators: true });
  }
  document.getElementById('carousel-prev')?.addEventListener('click', () => {
    LibrePOS.Carousel.getInstance(document.getElementById('carousel-intro'))?.prev();
  });
  document.getElementById('carousel-next')?.addEventListener('click', () => {
    LibrePOS.Carousel.getInstance(document.getElementById('carousel-intro'))?.next();
  });

  const slideOut = document.getElementById('slide-out');
  if (slideOut) {
    LibrePOS.Sidenav.init(slideOut);
  }

  const slideOutRight = document.getElementById('slide-out-right');
  if (slideOutRight) {
    LibrePOS.Sidenav.init(slideOutRight, { edge: 'right' });
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
    LibrePOS.Tabs.init(swipeTabs, { swipeable: true });
  }

  document.getElementById('toast-basic')?.addEventListener('click', () => {
    new LibrePOS.Toast({ text: 'Photo saved to album' });
  });

  document.getElementById('toast-action')?.addEventListener('click', () => {
    new LibrePOS.Toast({
      text: 'Item archived',
      action: 'Undo',
      onAction: () => {
        new LibrePOS.Toast({ text: 'Item restored' });
      },
    });
  });

  document.getElementById('toast-close')?.addEventListener('click', () => {
    new LibrePOS.Toast({
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
    new LibrePOS.Toast({ toastId: 'my-toast-1' });
  });

  document.getElementById('toast-html-2')?.addEventListener('click', () => {
    new LibrePOS.Toast({ toastId: 'my-toast-2' });
  });

  document.getElementById('toast-callback')?.addEventListener('click', () => {
    new LibrePOS.Toast({
      text: 'I will call back when dismissed',
      completeCallback: () => {
        new LibrePOS.Toast({ text: 'Your toast was dismissed' });
      },
    });
  });

  document.getElementById('toast-rounded')?.addEventListener('click', () => {
    new LibrePOS.Toast({ text: 'I am a toast!', classes: 'rounded' });
  });

  document.getElementById('toast-top')?.addEventListener('click', () => {
    new LibrePOS.Toast({ text: 'Posted from the top', classes: 'top' });
  });

  document.getElementById('toast-dismiss-show')?.addEventListener('click', () => {
    new LibrePOS.Toast({ text: 'I am a toast!' });
  });

  document.getElementById('toast-dismiss-one')?.addEventListener('click', () => {
    const toastElement = document.querySelector('#toast-container .toast');
    LibrePOS.Toast.getInstance(toastElement)?.dismiss();
  });

  document.getElementById('toast-dismiss-all')?.addEventListener('click', () => {
    LibrePOS.Toast.dismissAll();
  });

  const initDatepicker = (id, options) => {
    const el = document.getElementById(id);
    if (el) LibrePOS.Datepicker.init(el, options);
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
    LibrePOS.Timepicker.init(timepicker24, { twelveHour: false });
  }

  document.querySelectorAll('#input_text_counter, #textarea_counter').forEach((el) => {
    LibrePOS.CharacterCounter.init(el);
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
    LibrePOS.Autocomplete.init(autocompleteInput, {
      minLength: 0,
      data: autocompleteData,
    });
  }
  const autocompleteMulti = document.getElementById('autocomplete-multi');
  if (autocompleteMulti) {
    LibrePOS.Autocomplete.init(autocompleteMulti, {
      minLength: 0,
      isMultiSelect: true,
      data: autocompleteData,
    });
  }

  const chipsEmpty = document.getElementById('chips-empty');
  if (chipsEmpty) {
    LibrePOS.Chips.init(chipsEmpty, { allowUserInput: true });
  }
  const chipsInitial = document.getElementById('chips-initial');
  if (chipsInitial) {
    LibrePOS.Chips.init(chipsInitial, {
      allowUserInput: true,
      data: [{ id: 'Apple' }, { id: 'Microsoft' }, { id: 'Google' }],
    });
  }
  const chipsPlaceholder = document.getElementById('chips-placeholder');
  if (chipsPlaceholder) {
    LibrePOS.Chips.init(chipsPlaceholder, {
      allowUserInput: true,
      placeholder: 'Enter a tag',
      secondaryPlaceholder: '+Tag',
    });
  }
  const chipsAutocomplete = document.getElementById('chips-autocomplete');
  if (chipsAutocomplete) {
    LibrePOS.Chips.init(chipsAutocomplete, {
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
    LibrePOS.Tooltip.getInstance(tooltipDemo)?.open();
  });
  document.getElementById('tooltip-close')?.addEventListener('click', (event) => {
    event.preventDefault();
    LibrePOS.Tooltip.getInstance(tooltipDemo)?.close();
  });

  const toc = document.querySelector('.toc-wrapper');
  if (toc && LibrePOS.Pushpin) {
    toc.style.width = `${toc.parentElement.getBoundingClientRect().width}px`;
    LibrePOS.Pushpin.init(toc, {
      top: toc.getBoundingClientRect().top + window.scrollY,
    });
  }
});
