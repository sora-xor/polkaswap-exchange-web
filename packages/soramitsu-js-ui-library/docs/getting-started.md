# Getting Started

Follow this guide to set up a local environment that can build, test, and publish Soramitsu UI packages. It covers both consumers (who install published packages) and contributors (who clone the monorepo).

## Prerequisites

- **Node.js 18 LTS or newer.** Earlier versions miss APIs used by Vite and Vitest. Verify with `node --version`.
- **Yarn Classic (1.x).** The repository relies on workspaces; the `yarn.lock` is managed by Yarn 1. Install via `npm i -g yarn` if required.
- **Git LFS** for large assets (optional today, but recommended for future design assets).
- **Modern browser** (Chromium or Firefox) for Storybook and Cypress component testing.

> Tip: Use [Volta](https://volta.sh/) or [nvm](https://github.com/nvm-sh/nvm) to pin Node versions per project.

## Clone and install

```sh
# Clone the repository
 git clone git@github.com:soramitsu/soramitsu-js-ui-library.git
 cd soramitsu-js-ui-library

# Install workspace dependencies
 yarn
```

The install command resolves all workspace dependencies (including Storybook, Vite, Cypress, and token tooling). Expect the first install to take several minutes.

## Bootstrap the toolchain

Some workflows depend on generated artefacts:

1. **Build the theme tokens at least once per session.**

   ```sh
   yarn build:theme
   ```

   This compiles Sass tokens into CSS variables consumed by the UI package.

2. **Build the SVG plugin** (runs automatically before Storybook via `presb:serve`, but it can be invoked manually when testing changes to the plugin).

   ```sh
   yarn build:vite-plugin-svg
   ```

3. **Run Storybook** to explore components interactively.

   ```sh
   yarn sb:serve
   ```

   Storybook is served from `packages/ui/.storybook` and listens on port 6006 by default.

4. **(Optional) Compile all packages.** Useful for ensuring release readiness.
   ```sh
   yarn build
   ```

## Working on a single package

Each package ships with its own scripts and configuration located under `packages/<name>`.

- **UI components:** `yarn --cwd packages/ui <script>`
- **Theme tokens:** `yarn --cwd packages/theme <script>`
- **SVG plugin:** `yarn --cwd packages/vite-plugin-svg <script>`
- **Icons:** raw assets; no build step today.

Example: run only the UI unit tests without touching other packages.

```sh
yarn --cwd packages/ui test:unit
```

## Linking the UI library into an application

The published packages are available on NPM under the `@soramitsu-ui/*` scope. To develop against local builds:

1. Build the UI package:
   ```sh
   yarn --cwd packages/ui build
   ```
2. From the root of the monorepo, create a link:
   ```sh
   yarn --cwd packages/ui link
   ```
3. In the consumer project:
   ```sh
   yarn link "@soramitsu-ui/ui"
   yarn link "@soramitsu-ui/theme"   # if you need tokens locally
   yarn link "@soramitsu-ui/vite-plugin-svg"  # optional, for local SVG fixes
   ```
4. Import the plugin in your Vue app:

   ```ts
   import { createApp } from 'vue'
   import { plugin as SoramitsuPlugin } from '@soramitsu-ui/ui'

   const app = createApp(App)
   app.use(SoramitsuPlugin())
   app.mount('#app')
   ```

Remember to unlink before installing from the registry to avoid mismatched dependency trees.

## Verifying the installation

Run the full project test suite to ensure your environment is ready:

```sh
yarn test:all
```

This command executes ESLint, Prettier checks, theme tests, Vitest unit suites, Cypress component tests, builds the SVG plugin, runs `build:theme`, executes the Vite build for the UI package, and finally runs post-build verification tests. Keep the output handy as a reference for what CI expects.

## Next steps

- Read [project-structure.md](project-structure.md) to understand where features live.
- Visit [components.md](components.md) for usage patterns and API contracts.
- Configure your editor and commit hooks following [development-workflow.md](development-workflow.md).
