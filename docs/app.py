"""ExpressiveCSS documentation site.

The framework build is served straight out of `dist/` rather than copied into
`docs/static/`, so `npm run watch` shows up on a browser reload with no extra step.

Templates live under `docs/templates/` in the same groups as the sidenav:
start, foundations, structure, components, forms. Layout chrome
(`base.html`, `docs.html`) stays at the templates root.
"""

from pathlib import Path

from flask import Flask, redirect, render_template, send_from_directory, url_for

REPO_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = REPO_ROOT / 'dist'

app = Flask(__name__)


@app.context_processor
def inject_build_assets():
    # Unminified while developing so the source maps stay usable.
    suffix = '' if app.debug else '.min'
    return {
        'css_url': url_for('dist_file', filename=f'css/expressive{suffix}.css'),
        'js_url': url_for('dist_file', filename=f'js/expressive{suffix}.js'),
        'build_missing': not (DIST_DIR / 'css').is_dir(),
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
