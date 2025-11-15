# Project Structure

The repository is a Yarn workspace monorepo. Each package owns its build tools, tests, and README, while shared automation lives at the root.

```
.
├─ docs/                     # This documentation hub
├─ package.json              # Workspace scripts and shared devDependencies
├─ packages/
│  ├─ icons/                 # Raw SVG icon assets
│  ├─ theme/                 # Design tokens, typography, Sass helpers
│  ├─ ui/                    # Vue 3 component library
│  └─ vite-plugin-svg/       # Vite plugin used to import SVGs as Vue components
├─ tsconfig.json             # Root TypeScript config (extends per-package configs)
├─ lerna.json                # Release orchestration via Lerna
└─ yarn.lock
```

## Root workspace

- **`package.json`** exposes composite scripts (linting, test matrix, builds) and pins tool versions. Use it for cross-package tasks such as `yarn test:all` or `yarn build`.
- **`tsconfig.json`** defines base compiler options used by package-level configs. Avoid editing it unless the change applies to every package.
- **`lerna.json`** configures publishing behaviour. Releases rely on [release-management.md](release-management.md) plus Changesets metadata.
- **`.github/`, CI, and Jenkins files** (if present) keep automation in sync with local scripts.

## `packages/icons`

- Contains only SVG files under directories such as `icomoon/`.
- No build step; consumers import raw SVGs and process them with bundlers (see `packages/icons/README.md`).
- Planned upgrades (tracked in [backlog.md](backlog.md)) include migrating to official Soramitsu icon sets.

## `packages/theme`

- Houses the Soramitsu design tokens and typography presets.
- Key folders:
  - `src/sass/` — token schema (`tokens.scss`), mixins, and typography definitions.
  - `src/ts/` — TypeScript exports for token IDs and helpers.
  - `scripts/` — build helpers (Rollup configs, token processors).
  - `test/` — Jest tests validating token schemas and Sass utilities.
- Builds generate `dist/` (bundled CSS/Sass) and `dist-ts/` (type declarations). See [theming.md](theming.md).

## `packages/ui`

- Vue 3 component library targeting Soramitsu-branded applications.
- Key folders:
  - `src/components/` — source for all components (Accordion, Alert, Button, Checkbox, DatePicker, etc.). Each component lives in its own directory with `S*.vue` files, composables, types, and constants.
  - `src/composables/` — shared hooks (`useTeleport`, `useId`, etc.).
  - `src/test-utils/` — helpers for Vitest and Cypress suites.
  - `stories/` — Storybook stories grouped by component category.
  - `cypress/` — component test specs and fixtures.
  - `scripts/` — automation such as Storybook smoke test runner.
  - `windi.config.ts` — Windi CSS configuration aligned with theme tokens.
- Builds produce `dist/` (ESM, CJS, CSS) and `dist-ts/` (typed declarations).

## `packages/vite-plugin-svg`

- Lightweight fork of `vite-svg-loader` used by the UI package and Storybook.
- Source lives under `src/`, compiled into `dist/` via `yarn --cwd packages/vite-plugin-svg build`.
- Exposes minimal configuration (SVGO options). Documented in `packages/vite-plugin-svg/README.md`.

## Additional tooling

- **`next.Dockerfile` / `next.Jenkinsfile`** — CI/CD templates for building Storybook previews and running the full pipeline.
- **`packages/ui/vite.config.mts`** — Vite bundler configuration for packaging components and Storybook.
- **`packages/ui/api-extractor.json`** — API Extractor configuration for generating `ui.api.md`.

## Where to place new work

| Task                         | Location                                                    | Notes                                                                                   |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| New Vue component            | `packages/ui/src/components/<Name>`                         | Export via `index.ts` and `all-components.ts`; add Storybook stories and Cypress tests. |
| Shared composable            | `packages/ui/src/composables`                               | Prefix with `use` and document in [components.md](components.md).                       |
| Token or typography addition | `packages/theme/src/sass/tokens.scss` and related utilities | Update docs in [theming.md](theming.md) and add Jest coverage.                          |
| Storybook configuration      | `packages/ui/.storybook` and `stories/`                     | Story-level guidance in [storybook.md](storybook.md).                                   |
| Release automation           | Root scripts or `lerna.json`                                | Coordinate with [release-management.md](release-management.md).                         |

Keeping this structure predictable simplifies navigation for both designers and engineers. If you introduce a new folder or package, document it here.
