# Glossary

Shared vocabulary helps align discussions across design, engineering, and QA.

- **A-la-carte import** — Importing individual components from `@soramitsu-ui/ui` instead of installing the full plugin. Optimises bundle size through tree shaking.
- **Changeset** — Metadata describing a change that influences package version bumps and changelog generation. Created via `yarn changeset`.
- **Design token** — Named design value (color, spacing, typography) that components consume. Managed in `@soramitsu-ui/theme`.
- **Provide/inject** — Vue 3 dependency injection mechanism used to share context between parent and child components (e.g. checkbox group state).
- **Storybook** — Interactive documentation site used to showcase and test components in isolation.
- **Vitest** — Unit test runner configured for the UI package. Compatible with Jest expect assertions.
- **Cypress component test** — E2E-style test mounting a component in isolation to assert UI interactions and accessibility.
- **Windi CSS** — Utility-first CSS framework integrated with tokens for rapid layout prototyping.
- **API Extractor** — Tool generating the `ui.api.md` report to track public TypeScript API changes.
- **SVGO** — SVG optimiser used by the custom Vite plugin to transform icons into lightweight Vue components.
- **Focus trap** — Behaviour that keeps keyboard focus inside modals/popovers; implemented via the `focus-trap` dependency.
- **Data-testid** — Stable DOM attribute targeted by Cypress tests to avoid coupling to visual selectors.
- **CI** — Continuous Integration pipeline that runs linting, tests, and builds (`yarn test:all`).
- **Monorepo** — Single repository hosting multiple packages (icons, theme, UI, plugin) managed through Yarn workspaces.
- **Storybook play function** — Async function attached to a story that performs interactions and assertions after the component renders.

Add new entries as terminology evolves.
