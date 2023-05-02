import * as esbuild from "esbuild";

const env = process.env.APP_ENV || 'development';

// These are necessary as long as we use `tape` for tests in the browser.
// The package relies on many node-isms and must be adapted.
import { NodeGlobalsPolyfillPlugin as globals } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin as builtins } from '@esbuild-plugins/node-modules-polyfill';

esbuild.build({
  entryPoints: ["src/index.js"],
  target: 'es2018',
  format: 'esm',
  sourcemap: true,
  bundle: true,
  minify: env === 'production',
  outfile: env === 'production' ? 'dist/index.min.js' : 'dist/index.js',
  plugins: [
    globals({ buffer: true }),
    builtins(),
  ],
});