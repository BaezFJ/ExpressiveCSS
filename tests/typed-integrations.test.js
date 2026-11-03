import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// MapView and RichTextEditor declare structural types for the parts of
// maplibre-gl and Tiptap they call, so the published types depend on
// neither. This compiles a page that passes the installed modules in,
// which fails as soon as those declarations drift from the real ones.
test('the declared MapLibre and Tiptap surfaces accept the installed modules', () => {
  const project = fileURLToPath(new URL('./fixtures/typed-integrations/tsconfig.json', import.meta.url));
  const tsc = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
  const result = spawnSync(process.execPath, [tsc, '-p', project], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stdout || result.stderr);
});
