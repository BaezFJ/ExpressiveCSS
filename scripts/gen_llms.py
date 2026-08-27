"""Generates llms.txt from the documentation site's own navigation.

llms.txt (https://llmstxt.org) is a link index for language models: an H1, a
blockquote summary, prose, then `##` sections of links. Nothing in it is
authored here. The page list comes from `NAV` in `docs/app.py` -- the same
source the sidenav and the footer read -- each link's note is that page's
`page_blurb`, the version comes from `package.json`, and so does the base URL.
Adding a page to `NAV` therefore adds it here.

This is the Flask pipeline's generator and nothing checks its output any more:
the site's index is built by `docs/src/lib/llms.ts` out of the shared catalogue
and verified by `scripts/verify-site.mjs`. This script goes with `docs/app.py`.

The companion `/llms-full.txt` is not generated: it is `m3-guidelines.md` and
`llm.md` concatenated at request time by the route in `docs/app.py`, so it
cannot drift from them at all.

    uv run python scripts/gen_llms.py            write llms.txt
    uv run python scripts/gen_llms.py --check    exit 1 if it would change
"""

import inspect
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from flask import url_for  # noqa: E402

from docs.app import IS_PRERELEASE, NAV, VERSION, app  # noqa: E402

OUT = REPO_ROOT / 'llms.txt'

SUMMARY = (
    'A Material Design 3 front-end framework for the web: design tokens, light '
    'and dark themes, a responsive grid, styled form controls, and interactive '
    'components, built with Sass and TypeScript.'
)

# The two things a model gets wrong without being told. Both are stated at
# length in the files this points at; the point here is that a model reading
# only the index still gets them.
PREAMBLE = """\
Read the two primary documents in order. `m3-guidelines.md` decides *which*
component a job calls for, how it is structured, and where it sits;
`llm.md` states the markup, class names, tokens, and JavaScript APIs this
framework actually ships. Where they disagree with the Material 3 spec,
`llm.md` wins on what exists and the spec wins on design intent.

The public surface is not Materialize's. There is no `.btn`, `.card-content`,
`.nav-wrapper`, `.brand-logo`, `.modal-header`, `.lever`, or `.filled-in` --
components are carried by the HTML element (`<button>`, `<article>`,
`<dialog>`, `<footer>`), and a class modifies a component rather than making
one. Icons are Material Symbols in a `<span class="material-symbols">`.\
"""

PRIMARY = [
    ('m3-guidelines.md', 'Material 3 design guidelines',
     'Which component to use, its anatomy, placement, adaptive behavior, and the '
     'mistakes generated Material UIs make most often. Read this first.'),
    ('llm.md', 'Markup and JavaScript API reference',
     'Every component: class names, canonical markup, options, methods, events, '
     'and CSS custom properties.'),
    ('llms-full.txt', 'Complete documentation, single file',
     'Both documents above concatenated, for one-fetch ingestion.'),
]


def _package():
    with (REPO_ROOT / 'package.json').open() as fh:
        return json.load(fh)


def _page_url(base, endpoint):
    """The frozen page's URL.

    `url_for`, not a hand-picked rule: a view carries several (a bare path, an
    `.html` one, sometimes an alias -- `sliders` has four) and Frozen-Flask
    writes exactly one file per endpoint, named by whichever one `url_for`
    builds. Choosing differently here would link at a page the site does not
    have.
    """
    with app.test_request_context():
        path = url_for(endpoint)
    if not path.endswith('.html'):
        raise SystemExit(f'{endpoint}: url_for gives {path}, not a frozen page')
    return base + path


_TEMPLATE = re.compile(r"render_template\(\s*['\"]([^'\"]+)['\"]")
_BLURB = re.compile(r"{%-?\s*set\s+page_blurb\s*=\s*(['\"])(.*?)\1\s*-?%}", re.S)


def _blurb(endpoint):
    """The page's own one-line description, as shown in its banner.

    Read out of the template rather than by rendering it: rendering needs a
    request context and would run the whole page for one string.
    """
    view = app.view_functions[endpoint]
    found = _TEMPLATE.search(inspect.getsource(view))
    if not found:
        raise SystemExit(f'{endpoint}: view renders no template')
    template = REPO_ROOT / 'docs' / 'templates' / found.group(1)
    blurb = _BLURB.search(template.read_text())
    if not blurb:
        raise SystemExit(f'{endpoint}: {template.name} sets no page_blurb')
    # Jinja keeps the escapes an HTML attribute needed; a link note is plain text.
    return ' '.join(blurb.group(2).replace('\\"', '"').replace("\\'", "'").split())


def render():
    pkg = _package()
    base = pkg['homepage'].rstrip('/')
    release = f'{VERSION} (prerelease)' if IS_PRERELEASE else VERSION

    out = [
        '# ExpressiveCSS',
        '',
        f'> {SUMMARY}',
        '',
        f'Package `{pkg["name"]}`, version {release}. Distributed as compiled CSS, '
        'Sass sources, and JavaScript in ES module, CommonJS, and browser IIFE '
        'form. Targets the last five Chrome and Firefox versions.',
        '',
        PREAMBLE,
        '',
        '## Primary documentation',
        '',
    ]
    out += [f'- [{title}]({base}/{f}): {note}' for f, title, note in PRIMARY]

    for group in NAV:
        out += ['', f'## {group["label"]}', '']
        out += [
            f'- [{page["label"]}]({_page_url(base, page["endpoint"])}): '
            f'{_blurb(page["endpoint"])}'
            for page in group['pages']
        ]

    repo = pkg['repository']['url'].removeprefix('git+').removesuffix('.git')
    out += [
        '',
        '## Optional',
        '',
        f'- [Source repository]({repo}): issues, source, and the build.',
        f'- [Changelog]({repo}/blob/master/CHANGELOG.md): releases, and the '
        'migration notes for every breaking change.',
        f'- [HTML semantics standard]({repo}/blob/master/SEMANTICS.md): the '
        'element and ARIA contract each component is written against.',
        f'- [npm package](https://www.npmjs.com/package/{pkg["name"]}): install '
        'and version history.',
        '',
    ]
    return '\n'.join(out)


if __name__ == '__main__':
    text = render()
    if '--check' in sys.argv:
        current = OUT.read_text() if OUT.exists() else None
        if current != text:
            raise SystemExit('llms.txt is out of date: run npm run build:llms')
        print('llms.txt is up to date')
    else:
        OUT.write_text(text)
        print(f'wrote {OUT.relative_to(REPO_ROOT)} ({len(text)} bytes)')
