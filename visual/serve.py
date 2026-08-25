"""Serve the docs app for the visual suite.

A wrapper rather than `flask --app` for one reason: Werkzeug logs a line per
request, roughly 1,400 a pass, which buried the results. Silencing the whole
stream was the first attempt and it hid a server that failed to start at all --
Playwright could only report "Exit code: 1". Quieting the access log here
leaves stderr free to carry real failures.

    python visual/serve.py <path-to-app.py> <port>
"""

import importlib.util
import logging
import sys

app_path, port = sys.argv[1], int(sys.argv[2])

spec = importlib.util.spec_from_file_location('expressive_docs_app', app_path)
module = importlib.util.module_from_spec(spec)
# Before exec_module, not after: Flask(__name__) resolves its template and
# static roots through sys.modules[import_name].__file__, so a module that has
# not registered itself yet leaves root_path pointing at the cwd -- which is
# visual/, and every render_template raises TemplateNotFound.
sys.modules[spec.name] = module
spec.loader.exec_module(module)

logging.getLogger('werkzeug').setLevel(logging.ERROR)

# use_reloader: a reloader would fork, and Playwright would be left holding the
# parent's pid when it tries to shut the server down.
module.app.run(port=port, debug=False, use_reloader=False)
