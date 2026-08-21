"""ExpressiveCSS documentation site.

The framework build is served straight out of `dist/` rather than copied into
`docs/static/`, so `npm run watch` shows up on a browser reload with no extra step.

Templates live under `docs/templates/` in the same groups as the sidenav:
start, foundations, structure, components, forms. Layout chrome
(`base.html`, `docs.html`) stays at the templates root.
"""

import html
import json
from pathlib import Path

from flask import Flask, redirect, render_template, send_from_directory, url_for
from markupsafe import Markup

REPO_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = REPO_ROOT / 'dist'

app = Flask(__name__)
# `{% do %}` lets the section macro register itself for the table of contents.
app.jinja_env.add_extension('jinja2.ext.do')


def _group(label, icon, items, blurb=None):
    """One sidenav/footer group.

    `items` are `(endpoint, label)` pairs, or `(endpoint, label, icon)` for the
    flat top-level entries that carry their own icon. `endpoints` is derived so
    the sidenav's `<details open>` test never has to restate the group.
    """
    return {
        'label': label,
        'icon': icon,
        'blurb': blurb,
        'pages': [
            {'endpoint': i[0], 'label': i[1], 'icon': i[2] if len(i) > 2 else None}
            for i in items
        ],
        'endpoints': [i[0] for i in items],
    }


# The single source of truth for the sidenav and the footer. A group with no
# `icon` renders flat (no `<details>`); everything else is a collapsible group.
NAV = [
    _group('Start', None, [
        ('index', 'Getting started', 'home'),
        ('auto_init', 'Auto Init', 'bolt'),
    ], blurb='If ExpressiveCSS has helped you ship a project, open issues and '
             'send pull requests to keep the framework moving.'),
    _group('Foundations', 'palette', [
        ('color', 'Color'),
        ('themes', 'Themes'),
        ('typography', 'Typography'),
        ('icons', 'Icons'),
        ('shadow', 'Elevation'),
        ('grid', 'Grid'),
        ('helpers', 'Helpers'),
        ('media_css', 'Media styles'),
        ('table', 'Table'),
        ('css_transitions', 'Transitions'),
        ('pulse', 'Pulse'),
        ('waves', 'Waves'),
    ]),
    _group('Structure', 'view_quilt', [
        ('navbar', 'App bar'),
        ('navigation_bar', 'Navigation bar'),
        ('navigation_rail', 'Navigation rail'),
        ('sidenav', 'Sidenav'),
        ('panes', 'Panes'),
        ('footer', 'Footer'),
        ('tabs', 'Tabs'),
        ('breadcrumbs', 'Breadcrumbs'),
        ('pagination', 'Pagination'),
        ('menu', 'Menu'),
        ('scrollspy', 'Scrollspy'),
    ]),
    _group('Components', 'widgets', [
        ('buttons', 'Buttons'),
        ('floating_action_button', 'FAB'),
        ('cards', 'Cards'),
        ('lists', 'Lists'),
        ('dialogs', 'Dialogs'),
        ('bottom_sheet', 'Bottom sheet'),
        ('side_sheet', 'Side sheet'),
        ('badges', 'Badges'),
        ('tooltips', 'Tooltips'),
        ('snackbar', 'Snackbar'),
        ('preloader', 'Preloader'),
        ('carousel', 'Carousel'),
        ('media', 'Lightbox'),
        ('parallax', 'Parallax'),
        ('toolbars', 'Toolbars'),
    ]),
    _group('Forms', 'edit', [
        ('fieldsets', 'Fieldsets'),
        ('text_inputs', 'Text fields'),
        ('select', 'Select'),
        ('checkboxes', 'Checkboxes'),
        ('radio_buttons', 'Radio'),
        ('switches', 'Switches'),
        ('sliders', 'Slider'),
        ('chips', 'Chips'),
        ('autocomplete', 'Autocomplete'),
        ('datepicker', 'Date picker'),
        ('timepicker', 'Time picker'),
    ]),
]


def _package_version():
    """The framework version, so the footer cannot drift from package.json."""
    with (REPO_ROOT / 'package.json').open() as fh:
        return json.load(fh)['version']


VERSION = _package_version()


@app.template_filter('code_escape')
def code_escape(value):
    """Escape a code sample for display.

    Angle brackets and ampersands only -- quotes are left alone, which is how
    every sample in these docs was written by hand before the `code()` macro.
    """
    return Markup(html.escape(str(value), quote=False))


@app.context_processor
def inject_build_assets():
    # Unminified while developing so the source maps stay usable.
    suffix = '' if app.debug else '.min'
    return {
        'css_url': url_for('dist_file', filename=f'css/expressive{suffix}.css'),
        'js_url': url_for('dist_file', filename=f'js/expressive{suffix}.js'),
        'build_missing': not (DIST_DIR / 'css').is_dir(),
        'nav': NAV,
        'version': VERSION,
        # Fresh per render: section() appends to it, toc() reads it back.
        'toc_sections': [],
    }


# --- Start -----------------------------------------------------------------

@app.route('/')
@app.route('/getting-started')
@app.route('/getting-started.html')
def index():
    return render_template('start/index.html')


@app.route('/auto-init')
@app.route('/auto-init.html')
def auto_init():
    return render_template('start/auto-init.html')


# --- Foundations -----------------------------------------------------------

@app.route('/color')
@app.route('/color.html')
def color():
    return render_template('foundations/color.html')


@app.route('/themes')
@app.route('/themes.html')
def themes():
    return render_template('foundations/themes.html')


@app.route('/typography')
@app.route('/typography.html')
def typography():
    return render_template('foundations/typography.html')


@app.route('/icons')
@app.route('/icons.html')
def icons():
    return render_template('foundations/icons.html')


@app.route('/shadow')
@app.route('/shadow.html')
def shadow():
    return render_template('foundations/shadow.html')


@app.route('/grid')
@app.route('/grid.html')
def grid():
    return render_template('foundations/grid.html')


@app.route('/helpers')
@app.route('/helpers.html')
def helpers():
    return render_template('foundations/helpers.html')


@app.route('/media-css')
@app.route('/media-css.html')
def media_css():
    return render_template('foundations/media-css.html')


@app.route('/table')
@app.route('/table.html')
def table():
    return render_template('foundations/table.html')


@app.route('/css-transitions')
@app.route('/css-transitions.html')
def css_transitions():
    return render_template('foundations/css-transitions.html')


@app.route('/pulse')
@app.route('/pulse.html')
def pulse():
    return render_template('foundations/pulse.html')


@app.route('/waves')
@app.route('/waves.html')
def waves():
    return render_template('foundations/waves.html')


# --- Structure -------------------------------------------------------------

@app.route('/navbar')
@app.route('/navbar.html')
def navbar():
    return render_template('structure/navbar.html')


@app.route('/navigation-bar')
@app.route('/navigation-bar.html')
def navigation_bar():
    return render_template('structure/navigation-bar.html')


@app.route('/navigation-rail')
@app.route('/navigation-rail.html')
def navigation_rail():
    return render_template('structure/navigation-rail.html')


@app.route('/sidenav')
@app.route('/sidenav.html')
def sidenav():
    return render_template('structure/sidenav.html')


@app.route('/panes')
@app.route('/panes.html')
def panes():
    return render_template('structure/panes.html')


@app.route('/footer')
@app.route('/footer.html')
def footer():
    return render_template('structure/footer.html')


@app.route('/tabs')
@app.route('/tabs.html')
def tabs():
    return render_template('structure/tabs.html')


@app.route('/breadcrumbs')
@app.route('/breadcrumbs.html')
def breadcrumbs():
    return render_template('structure/breadcrumbs.html')


@app.route('/pagination')
@app.route('/pagination.html')
def pagination():
    return render_template('structure/pagination.html')


@app.route('/menu')
@app.route('/menu.html')
def menu():
    return render_template('structure/menu.html')


@app.route('/dropdown')
@app.route('/dropdown.html')
def dropdown():
    return redirect(url_for('menu'), code=301)


@app.route('/scrollspy')
@app.route('/scrollspy.html')
def scrollspy():
    return render_template('structure/scrollspy.html')


# --- Components ------------------------------------------------------------

@app.route('/buttons')
@app.route('/buttons.html')
def buttons():
    return render_template('components/buttons.html')


@app.route('/floating-action-button')
@app.route('/floating-action-button.html')
def floating_action_button():
    return render_template('components/floating-action-button.html')


@app.route('/cards')
@app.route('/cards.html')
def cards():
    return render_template('components/cards.html')


@app.route('/lists')
@app.route('/lists.html')
def lists():
    return render_template('components/lists.html')


@app.route('/collections')
@app.route('/collections.html')
def collections():
    return redirect(url_for('lists'), code=301)


@app.route('/collapsible')
@app.route('/collapsible.html')
def collapsible():
    return redirect(url_for('sidenav'), code=301)


@app.route('/dialogs')
@app.route('/dialogs.html')
def dialogs():
    return render_template('components/dialogs.html')


@app.route('/modals')
@app.route('/modals.html')
def modals():
    return redirect(url_for('dialogs'), code=301)


@app.route('/bottom-sheet')
@app.route('/bottom-sheet.html')
def bottom_sheet():
    return render_template('components/bottom-sheet.html')


@app.route('/side-sheet')
@app.route('/side-sheet.html')
def side_sheet():
    return render_template('components/side-sheet.html')


@app.route('/badges')
@app.route('/badges.html')
def badges():
    return render_template('components/badges.html')


@app.route('/tooltips')
@app.route('/tooltips.html')
def tooltips():
    return render_template('components/tooltips.html')


@app.route('/snackbar')
@app.route('/snackbar.html')
def snackbar():
    return render_template('components/snackbar.html')


@app.route('/toasts')
@app.route('/toasts.html')
def toasts():
    return redirect(url_for('snackbar'), code=301)


@app.route('/preloader')
@app.route('/preloader.html')
def preloader():
    return render_template('components/preloader.html')


@app.route('/carousel')
@app.route('/carousel.html')
def carousel():
    return render_template('components/carousel.html')


@app.route('/media')
@app.route('/media.html')
def media():
    return render_template('components/media.html')


@app.route('/parallax')
@app.route('/parallax.html')
def parallax():
    return render_template('components/parallax.html')


@app.route('/toolbars')
@app.route('/toolbars.html')
def toolbars():
    return render_template('components/toolbars.html')


# --- Forms -----------------------------------------------------------------

@app.route('/fieldsets')
@app.route('/fieldsets.html')
def fieldsets():
    return render_template('forms/fieldsets.html')


@app.route('/text-inputs')
@app.route('/text-inputs.html')
def text_inputs():
    return render_template('forms/text-inputs.html')


@app.route('/select')
@app.route('/select.html')
def select():
    return render_template('forms/select.html')


@app.route('/checkboxes')
@app.route('/checkboxes.html')
def checkboxes():
    return render_template('forms/checkboxes.html')


@app.route('/radio-buttons')
@app.route('/radio-buttons.html')
def radio_buttons():
    return render_template('forms/radio-buttons.html')


@app.route('/switches')
@app.route('/switches.html')
def switches():
    return render_template('forms/switches.html')


@app.route('/sliders')
@app.route('/sliders.html')
@app.route('/slider')
@app.route('/slider.html')
def sliders():
    return render_template('forms/sliders.html')


@app.route('/range')
@app.route('/range.html')
def range():
    return redirect(url_for('sliders'), code=301)


@app.route('/chips')
@app.route('/chips.html')
def chips():
    return render_template('forms/chips.html')


@app.route('/autocomplete')
@app.route('/autocomplete.html')
def autocomplete():
    return render_template('forms/autocomplete.html')


@app.route('/datepicker')
@app.route('/datepicker.html')
def datepicker():
    return render_template('forms/datepicker.html')


@app.route('/timepicker')
@app.route('/timepicker.html')
def timepicker():
    return render_template('forms/timepicker.html')


@app.route('/dist/<path:filename>')
def dist_file(filename):
    """Serve a file from the npm build output."""
    return send_from_directory(DIST_DIR, filename, max_age=0 if app.debug else None)


if __name__ == '__main__':
    app.run(debug=True)
