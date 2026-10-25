# Testing and Quality

Quality gates protect the component library from regressions. This guide covers the available checks and how to run them efficiently.

## CI equivalent: `yarn test:all`

The root script orchestrates the entire matrix:

1. `lint:check` → ESLint plus Prettier diff mode.
2. `test:theme:unit` → Jest tests for the theme package.
3. `build:vite-plugin-svg` → Ensures the SVG loader compiles.
4. `test:ui:unit` → Vitest suites for UI utilities and Vue components.
5. `build:theme` → Rebuilds token artefacts.
6. `test:ui:cy` → Cypress component tests in headless mode.
7. `build:ui:only-vite` → Production Vite build of the UI package.
8. `test:ui:after-build` → Vitest assertions verifying compiled output.

Keep the order intact when editing scripts; later steps assume earlier ones succeeded.

## Static analysis

- **ESLint (`yarn lint:es`)** — Vue, TypeScript, and accessibility rules.
- **Prettier (`yarn lint:format:check`)** — Ensures consistent formatting.
- **TypeScript (`yarn --cwd packages/ui typecheck`)** — Fails on type regressions missed by Vue SFC inference.

Integrate ESLint and TypeScript into IDEs to catch issues before commits.

## Unit testing with Vitest

- Command: `yarn --cwd packages/ui test:unit`
- Uses `happy-dom` for DOM emulation.
- Test files typically live beside the code (`*.spec.ts`).
- Prefer testing composables and pure utilities at this layer. For visual regressions, rely on Storybook and Cypress.
- Run in watch mode (`--watch`) during development.

## Theme tests with Jest

`packages/theme/test` contains Jest suites that validate token schemas, Sass utilities, and preset generation. Always run `yarn --cwd packages/theme test` after touching theme Sass or scripts.

## Cypress component testing

- Interactive mode: `yarn --cwd packages/ui cy`
- Headless CI mode: `yarn --cwd packages/ui cy:ci:component`
- Specs live under `packages/ui/cypress/component/`.
- Tests mount Vue components in isolation, asserting focus management, popover positioning, and keyboard interaction.
- Accessibility checks leverage `cypress-axe`; ensure new components include `axe` scans in their specs when relevant.

### Troubleshooting Cypress

- Delete cached builds (`yarn --cwd packages/ui build:clean`) if stories stop mounting.
- Use `CYPRESS_BASE_URL=http://localhost:6006` when pointing tests at a running Storybook instance.

## Storybook verification

- Static build: `yarn --cwd packages/ui sb:build`
- Smoke test script: `yarn --cwd packages/ui sb:test` (wraps Storybook test runner via Playwright).
- Keep stories deterministic; avoid random data that breaks snapshots or Playwright assertions.

## Accessibility and visual QA

- Leverage Storybook's accessibility addon for quick ARIA audits.
- Use Percy, Chromatic, or Mirage (if available) to capture visual diffs. Integrations can be added to `.storybook/main.ts` as needed.
- Document accessibility considerations in stories and component docs.

## Performance checks

- Run `yarn --cwd packages/ui build:vite` and inspect bundle analyzer output (enable via Vite plugin if not already).
- Monitor `sideEffects` declarations in `package.json` to keep tree shaking effective.

## Adding new tests

1. Identify the appropriate layer (unit vs. component vs. integration).
2. Locate the existing folder (e.g. `packages/ui/src/components/Button/__tests__`).
3. Write deterministic tests that assert behaviour, not implementation details.
4. Update this file if you introduce new testing conventions or tooling.

## Reporting failures

When a check fails in CI:

- Re-run the corresponding script locally.
- Attach logs or screenshots to the pull request.
- Open an issue if the failure stems from flaky infrastructure rather than code changes.

Maintaining a fast, reliable test matrix keeps the design system trustworthy. Evolve this guide as you adopt new tooling (e.g. Storybook test runner, visual diff services).
