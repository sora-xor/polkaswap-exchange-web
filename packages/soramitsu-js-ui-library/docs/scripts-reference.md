# Scripts Reference

Use this cheat sheet to find the right Yarn script for each task. Run commands from the repository root unless noted otherwise.

## Root-level scripts

| Command                      | Purpose                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `yarn build`                 | Builds theme, SVG plugin, and UI package in sequence.                                  |
| `yarn build:theme`           | Compiles design tokens and typography assets.                                          |
| `yarn build:vite-plugin-svg` | Builds the custom SVG loader used by Storybook and the UI package.                     |
| `yarn build:ui`              | Runs the full UI build (`clean` → `tsc` → `vite` → `api:extract`).                     |
| `yarn build:ui:only-vite`    | Executes only the Vite bundle step for the UI package.                                 |
| `yarn sb:serve`              | Starts Storybook on port 6006 (prebuilds the SVG plugin).                              |
| `yarn sb:build`              | Produces a static Storybook build under `packages/ui/storybook-static`.                |
| `yarn test:all`              | Full quality gate: lint → tests → builds. Mirrors CI.                                  |
| `yarn test:theme:unit`       | Runs Jest suites for `@soramitsu-ui/theme`.                                            |
| `yarn test:ui:unit`          | Executes Vitest unit tests for the UI package.                                         |
| `yarn test:ui:cy`            | Runs Cypress component tests in headless mode.                                         |
| `yarn test:ui:cy-open`       | Opens the interactive Cypress runner.                                                  |
| `yarn test:ui:after-build`   | Post-build verification for compiled UI output.                                        |
| `yarn lint:es`               | Runs ESLint across the workspace.                                                      |
| `yarn lint:es:fix`           | Runs ESLint with auto-fix.                                                             |
| `yarn lint:format:check`     | Checks Prettier formatting.                                                            |
| `yarn lint:format:fix`       | Applies Prettier formatting, then ESLint auto-fix.                                     |
| `yarn lint:check`            | Executes `lint:es` and `lint:format:check`.                                            |
| `yarn storybook:verify`      | Ensures Storybook builds cleanly (prebuilds the SVG plugin automatically).             |
| `yarn publish-workspaces`    | Publishes all packages that have been versioned via Changesets (Lerna `from-package`). |

## Package-specific scripts

### `packages/ui`

Run with `yarn --cwd packages/ui <script>`.

| Script              | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `build`             | Clean, type-check, Vite build, API Extractor.                  |
| `build:clean`       | Removes `dist/` and `dist-ts/`.                                |
| `build:tsc`         | Generates type declarations via `vue-tsc`.                     |
| `build:vite`        | Bundles the library using Vite (ESM + CJS outputs).            |
| `api:extract`       | Produces `ui.api.md` using Microsoft API Extractor.            |
| `api:extract:local` | API Extractor in local mode (skips .api.md consistency check). |
| `sb:serve`          | Storybook dev server scoped to the UI package.                 |
| `sb:build`          | Storybook static export.                                       |
| `sb:test`           | Runs Storybook test runner (Playwright).                       |
| `test:unit`         | Vitest unit tests.                                             |
| `test:after-build`  | Runs assertions against the compiled `dist/`.                  |
| `cy`                | Opens Cypress component UI runner.                             |
| `cy:ci:component`   | Headless Cypress component tests.                              |
| `typecheck`         | TypeScript type checking via `vue-tsc`.                        |

### `packages/theme`

Run with `yarn --cwd packages/theme <script>`.

| Script  | Purpose                                                   |
| ------- | --------------------------------------------------------- |
| `build` | Compiles Sass tokens and TypeScript exports into `dist/`. |
| `test`  | Jest suite validating token schemas and mixins.           |

### `packages/vite-plugin-svg`

Run with `yarn --cwd packages/vite-plugin-svg <script>`.

| Script  | Purpose                              |
| ------- | ------------------------------------ |
| `build` | Bundles the plugin for distribution. |

### `packages/icons`

No scripts today (raw SVG assets only). Use bundler-specific loaders when consuming the package.

Keep this table updated as new automation lands in `package.json` files.
