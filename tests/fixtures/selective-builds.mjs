import { build } from 'esbuild';
import { compile, compileString } from 'sass';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../..', import.meta.url));
export const sizes = value => ({ raw: Buffer.byteLength(value), gzip: gzipSync(value).length, brotli: brotliCompressSync(value).length });
export const fixtures = {
  tabs: {
    exports: ['Tabs'],
    components: ['icons-material-design', 'tabs', 'carousel'],
    markup: '<nav class="tabs" aria-label="Sections"><a href="#first" class="active">First</a><a href="#second">Second</a></nav><section id="first">First panel</section><section id="second">Second panel</section>',
    init: "Tabs.init(document.querySelector('.tabs'), { duration: 0 })",
  },
  forms: {
    exports: ['Forms', 'FormSelect', 'Datepicker'],
    components: ['icons-material-design', 'buttons', 'menu', 'forms', 'datepicker'],
    markup: '<div class="field"><select id="choice"><option value="one">One</option><option value="two">Two</option></select><label for="choice">Choice</label></div><div class="field"><input id="date" class="datepicker" type="text"><label for="date">Date</label></div>',
    init: "FormSelect.init(document.querySelector('#choice'), { menuOptions: { inDuration: 0, outDuration: 0 } }), Datepicker.init(document.querySelector('#date'), { openByDefault: true, defaultDate: new Date(2026, 8, 12), setDefaultDate: true })",
  },
};

export async function consumerBuild(name, selective) {
  const fixture = fixtures[name];
  const entry = '@expressivecss/expressive' + (selective ? '/modular' : '');
  const imports = selective
    ? `import { ${fixture.exports.join(', ')} } from '${entry}'; window.Expressive = { ${fixture.exports.join(', ')} };`
    : `import * as Expressive from '${entry}'; window.Expressive = Expressive; const { ${fixture.exports.join(', ')} } = Expressive;`;
  const js = (await build({
    stdin: { contents: `${imports}
      ${selective && name === 'forms' ? 'Forms.Init();' : ''}
      window.instances = [${fixture.init}];
      window.dispose = () => { window.instances.reverse().forEach(instance => instance.destroy()); window.instances = []; };`, resolveDir: root },
    bundle: true, minify: true, format: 'iife', target: 'es2020', write: false,
  })).outputFiles[0].text;
  const options = { style: 'compressed', loadPaths: [`${root}/src/sass`], logger: { warn() {} } };
  const css = selective
    ? compileString(`@use "custom" with ($components: (${fixture.components.map(value => JSON.stringify(value)).join(', ')}), $utilities: ());`, options).css
    : compile(`${root}/src/sass/expressive.scss`, options).css;
  return { js, css, sizes: { js: sizes(js), css: sizes(css) } };
}
