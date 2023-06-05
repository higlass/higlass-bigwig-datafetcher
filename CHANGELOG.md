**v0.2.0**
- Require explicit registration of the datafetcher by the consumer app/package; do not use `higlass-register` implicitly in `index.js` / via side effect
- Use esbuild for bundling
- Use Vite for development server + simultaneous esbuild in watch-mode (to deal with `Buffer` polyfilling)
- Use Vitest for testing
- Bump version of package
- Bump version of NodeJS in GitHub Actions workflows
- Bump version of `actions/setup-node` from v1 to v3 in GitHub Actions workflows
- Add `type: module` and `exports` properties to `package.json`

**v0.1.2**

- Correctly publish ES modules
- Update dependencies

**v0.1.0**

- HiGlass Bigwig data fetcher initial release
