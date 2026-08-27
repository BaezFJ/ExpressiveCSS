/**
 * Serve a built static site for the visual suite.
 *
 *     node visual/serve.mjs <dir> <port>
 *
 * `astro preview` is the obvious answer and is deliberately not this. Two
 * reasons: it forks a child that exits without a word on some Node builds
 * (silently, here), and it would tie the pass to astro's own CLI at the moment
 * this suite is meant to compare two revisions' *output*. A directory of files
 * wants a directory server, and both passes run through this one.
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';

const dir = process.argv[2];
const port = Number(process.argv[3]);

// Content type is the load-bearing part: a stylesheet served as
// application/octet-stream is not applied, and every page would differ by the
// whole of its styling.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

createServer((req, res) => {
  // The query string and fragment are not part of the path. `normalize`
  // resolves `..` before the join, so a request cannot climb out of the site.
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  let file = join(dir, path);
  try {
    let stat = statSync(file);
    if (stat.isDirectory()) stat = statSync((file = join(file, 'index.html')));
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(res);
  } catch {
    // A 404 is a result, not a failure: the base pass reads one to tell that a
    // page is new on this branch and has no baseline to compare against.
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found\n');
  }
}).listen(port, '127.0.0.1');
