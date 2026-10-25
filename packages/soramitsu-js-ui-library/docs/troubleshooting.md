# Troubleshooting

This page lists common issues encountered while working with the Soramitsu UI monorepo and how to resolve them.

## Installation issues

| Symptom                                  | Resolution                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `node` version mismatch errors           | Install Node 18+ and clear `node_modules` (`rm -rf node_modules && yarn`).                          |
| Yarn complains about incompatible engine | Ensure you are using Yarn 1.x (`yarn --version`). Remove `.pnp.cjs` if Yarn 2+ was previously used. |
| `esbuild` download failures              | Set the `ESBUILD_BINARY_PATH` or install via `yarn add --dev esbuild` manually, then retry `yarn`.  |

## Storybook fails to start

- Rebuild the SVG plugin: `yarn build:vite-plugin-svg`.
- Delete Storybook cache: `rm -rf node_modules/.cache/storybook`.
- Confirm no other process is bound to port 6006.

## Cypress tests fail locally

- Ensure Storybook or dev server is not already using the port Cypress expects.
- Run in headed mode (`yarn --cwd packages/ui cy`) to observe interactions.
- If tests hang on mount, clear Vite caches: `rm -rf packages/ui/node_modules/.vite`.
- If the binary crashes with `SIGABRT` or verification errors, install the system packages listed in the [Cypress system requirements](https://docs.cypress.io/guides/getting-started/installing-cypress#System-requirements) (GTK, libxcb, NSS, and associated fonts on Linux; Xcode Command Line Tools on macOS). Re-run `yarn --cwd packages/ui cy:ci:component --verify` after installing.

## Vitest cannot find Vue types

- Open VS Code command palette and select "TypeScript: Select TypeScript Version" → "Use Workspace Version".
- Run `yarn --cwd packages/ui typecheck` to surface missing dependency hints.

## Build errors referencing theme tokens

- Run `yarn build:theme` to regenerate CSS and TS outputs.
- Inspect `packages/theme/src/sass/tokens.scss` for typos; Sass will throw detailed location info.
- Confirm consuming components import the correct Sass entry point.

## API Extractor failures

- Delete `packages/ui/dist-ts` and rerun `yarn --cwd packages/ui build:tsc`.
- Ensure any new types are exported from their `index.ts` barrel before running `api:extract`.

## `focus-trap` or DOM-specific errors during SSR builds

- Guard DOM usage with `if (typeof window !== 'undefined')` checks or move logic to `onMounted` hooks.
- Provide no-op fallbacks when running on the server.

## Lerna publish issues

- Verify you are logged into the NPM registry (`npm whoami`).
- If publishing fails mid-way, reset the git tag if created locally and retry after resolving the root cause.

## Editor-specific quirks

- Volar auto-imports may point to `dist/` files. Prefer source imports during development and rely on bundlers for path resolution.
- When using WebStorm, mark `packages/*/dist` directories as excluded to prevent indexing overhead.

If you encounter an issue not listed here, document the fix in this file so future contributors can benefit.
