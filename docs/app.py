"""ExpressiveCSS documentation site.

The framework build is served straight out of `dist/` rather than copied into
`docs/static/`, so `npm run watch` shows up on a browser reload with no extra step.
"""

from pathlib import Path

from flask import Flask, render_template, send_from_directory, url_for

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


@app.route('/getting-started')
@app.route('/getting-started.html')
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/color')
@app.route('/color.html')
def color():
    return render_template('color.html')


@app.route('/grid')
@app.route('/grid.html')
def grid():
    return render_template('grid.html')


@app.route('/helpers')
@app.route('/helpers.html')
def helpers():
    return render_template('helpers.html')


@app.route('/media-css')
@app.route('/media-css.html')
def media_css():
    return render_template('media-css.html')


@app.route('/pulse')
@app.route('/pulse.html')
def pulse():
    return render_template('pulse.html')


@app.route('/shadow')
@app.route('/shadow.html')
def shadow():
    return render_template('shadow.html')


@app.route('/table')
@app.route('/table.html')
def table():
    return render_template('table.html')


@app.route('/css-transitions')
@app.route('/css-transitions.html')
def css_transitions():
    return render_template('css-transitions.html')


@app.route('/typography')
@app.route('/typography.html')
def typography():
    return render_template('typography.html')


@app.route('/themes')
@app.route('/themes.html')
def themes():
    return render_template('themes.html')


@app.route('/waves')
@app.route('/waves.html')
def waves():
    return render_template('waves.html')


@app.route('/badges')
@app.route('/badges.html')
def badges():
    return render_template('badges.html')


@app.route('/breadcrumbs')
@app.route('/breadcrumbs.html')
def breadcrumbs():
    return render_template('breadcrumbs.html')


@app.route('/buttons')
@app.route('/buttons.html')
def buttons():
    return render_template('buttons.html')


@app.route('/cards')
@app.route('/cards.html')
def cards():
    return render_template('cards.html')


@app.route('/carousel')
@app.route('/carousel.html')
def carousel():
    return render_template('carousel.html')


@app.route('/collections')
@app.route('/collections.html')
def collections():
    return render_template('collections.html')


@app.route('/floating-action-button')
@app.route('/floating-action-button.html')
def floating_action_button():
    return render_template('floating-action-button.html')


@app.route('/footer')
@app.route('/footer.html')
def footer():
    return render_template('footer.html')


@app.route('/icons')
@app.route('/icons.html')
def icons():
    return render_template('icons.html')


@app.route('/navbar')
@app.route('/navbar.html')
def navbar():
    return render_template('navbar.html')


@app.route('/pagination')
@app.route('/pagination.html')
def pagination():
    return render_template('pagination.html')


@app.route('/parallax')
@app.route('/parallax.html')
def parallax():
    return render_template('parallax.html')


@app.route('/preloader')
@app.route('/preloader.html')
def preloader():
    return render_template('preloader.html')


@app.route('/auto-init')
@app.route('/auto-init.html')
def auto_init():
    return render_template('auto-init.html')


@app.route('/collapsible')
@app.route('/collapsible.html')
def collapsible():
    return render_template('collapsible.html')


@app.route('/dropdown')
@app.route('/dropdown.html')
def dropdown():
    return render_template('dropdown.html')


@app.route('/feature-discovery')
@app.route('/feature-discovery.html')
def feature_discovery():
    return render_template('feature-discovery.html')


@app.route('/media')
@app.route('/media.html')
def media():
    return render_template('media.html')


@app.route('/modals')
@app.route('/modals.html')
def modals():
    return render_template('modals.html')


@app.route('/scrollspy')
@app.route('/scrollspy.html')
def scrollspy():
    return render_template('scrollspy.html')


@app.route('/sidenav')
@app.route('/sidenav.html')
def sidenav():
    return render_template('sidenav.html')


@app.route('/tabs')
@app.route('/tabs.html')
def tabs():
    return render_template('tabs.html')


@app.route('/toasts')
@app.route('/toasts.html')
def toasts():
    return render_template('toasts.html')


@app.route('/tooltips')
@app.route('/tooltips.html')
def tooltips():
    return render_template('tooltips.html')


@app.route('/toolbars')
@app.route('/toolbars.html')
def toolbars():
    return render_template('toolbars.html')


@app.route('/datepicker')
@app.route('/datepicker.html')
def datepicker():
    return render_template('datepicker.html')


@app.route('/timepicker')
@app.route('/timepicker.html')
def timepicker():
    return render_template('timepicker.html')


@app.route('/text-inputs')
@app.route('/text-inputs.html')
def text_inputs():
    return render_template('text-inputs.html')


@app.route('/fieldsets')
@app.route('/fieldsets.html')
def fieldsets():
    return render_template('fieldsets.html')


@app.route('/switches')
@app.route('/switches.html')
def switches():
    return render_template('switches.html')


@app.route('/select')
@app.route('/select.html')
def select():
    return render_template('select.html')


@app.route('/range')
@app.route('/range.html')
def range():
    return render_template('range.html')


@app.route('/radio-buttons')
@app.route('/radio-buttons.html')
def radio_buttons():
    return render_template('radio-buttons.html')


@app.route('/chips')
@app.route('/chips.html')
def chips():
    return render_template('chips.html')


@app.route('/checkboxes')
@app.route('/checkboxes.html')
def checkboxes():
    return render_template('checkboxes.html')


@app.route('/autocomplete')
@app.route('/autocomplete.html')
def autocomplete():
    return render_template('autocomplete.html')


@app.route('/dist/<path:filename>')
def dist_file(filename):
    """Serve a file from the npm build output."""
    return send_from_directory(DIST_DIR, filename, max_age=0 if app.debug else None)


if __name__ == '__main__':
    app.run(debug=True)
