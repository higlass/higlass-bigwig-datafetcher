import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfills from 'rollup-plugin-node-polyfills';


export default {
  input: ["src/index.js"],
  output: {
    dir: "dist",
    format: "esm",
    sourcemap: true
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    nodePolyfills(),
  ],
};