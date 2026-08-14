"""RoutePlateCSS documentation site.

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
        'css_url': url_for('dist_file', filename=f'css/routeplate{suffix}.css'),
        'js_url': url_for('dist_file', filename=f'js/routeplate{suffix}.js'),
        'build_missing': not (DIST_DIR / 'css').is_dir(),
    }


@app.route('/getting-started')
@app.route('/getting-started.html')
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/grid')
@app.route('/grid.html')
def grid():
    return render_template('grid.html')


@app.route('/helpers')
@app.route('/helpers.html')
def helpers():
    return render_template('helpers.html')


@app.route('/dist/<path:filename>')
def dist_file(filename):
    """Serve a file from the npm build output."""
    return send_from_directory(DIST_DIR, filename, max_age=0 if app.debug else None)


if __name__ == '__main__':
    app.run(debug=True)
