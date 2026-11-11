import { test } from 'node:test';
import { execFileSync } from 'node:child_process';

test('both spring functions reject invalid inputs without hanging compilation', () => {
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { compileString } from 'sass';
    for (const name of ['spring', 'spring-duration']) {
      for (const [args, error] of [
        ['1, 0', /\\$stiffness must be/],
        ['0.8, -1', /\\$stiffness must be/],
        ['0.8, 380px', /\\$stiffness must be/],
        ['0.8, "invalid"', /\\$stiffness must be/],
        ['0, 380', /\\$damping must be/],
        ['-0.5, 380', /\\$damping must be/],
        ['1.2, 380', /\\$damping must be/],
        ['0.8s, 380', /\\$damping must be/],
        ['"invalid", 380', /\\$damping must be/],
      ]) {
        assert.throws(() => compileString(
          '@use "abstracts"; .probe { value: abstracts.' + name + '(' + args + '); }',
          { loadPaths: ['src/sass'] }
        ), error, name + '(' + args + ')');
      }
    }
  `], { cwd: new URL('../', import.meta.url), timeout: 5000, stdio: 'pipe' });
});
