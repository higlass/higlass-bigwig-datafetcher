import * as esbuild from "esbuild";
import * as path from "path";

const env = process.env.NODE_ENV || 'development';

// These are necessary as long as we use `tape` for tests in the browser.
// The package relies on many node-isms and must be adapted.
import { NodeGlobalsPolyfillPlugin as globals } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin as builtins } from '@esbuild-plugins/node-modules-polyfill';

esbuild.build({
  entryPoints: ["src/index.js"],
  target: 'es2018',
  format: 'esm',
  splitting: true,
  sourcemap: true,
  bundle: true,
  minify: env === 'production',
  outdir: "dist",
  inject: ["src/alias/buffer-shim.js"],
  plugins: [
    globals({ path: true, fs: true, buffer: false }),
    builtins(),
  ],
});