# Soramitsu UI - next

## Monorepo structure

Packages located at `packages/` dir.

Each package has its own `tsconfig.json`, own build & testing configs and their specific user guidelines in README
files.

- **`icons`** package contains only raw SVGs for now.
- **`theme`** package contains theme-related tools - Windi CSS helpers & theme variables, as well as fonts.
- **`ui`** package contains components.

## Getting started

**Install packages:**

```shell
yarn
```

**Build theme:** (you need to rebuild it each time you use it from ui lib)

```shell
yarn build:theme
```

**Open storybook:**

```shell
yarn sb:serve
```

## Usage library in project

Usage examples, migration notes, and per-component guidance live alongside the packages themselves. Start with
`packages/ui/README.md` for code snippets and plugin setup instructions, or spin up Storybook (`yarn sb:serve`) and
browse the stories locally.

## Documentation

For a complete handbook covering setup, theming, development workflow, testing, and release processes, see
[`docs/README.md`](docs/README.md).

OR **cypress component-testing:**

```shell
yarn test:ui:cy-open
```

**Build all packages:**

```shell
yarn build
```

**Build Storybook:**

```shell
yarn sb:build
```

## Testing

- `yarn test:all` – runs lint, unit tests (Jest + Vitest), Cypress component suites, the theme build, and a Storybook build smoke test. This mirrors the CI pipeline and should be the default pre-push task.
- To capture structured Cypress diagnostics, rerun the component suite with `npx cypress run --component --reporter json > cypress-report.json` and inspect the resulting JSON for failing specs and stack traces.
- Storybook has a dedicated smoke script (`yarn storybook:verify`); keep it green locally to mirror the CI workflow.
- Theme-specific tests live under `packages/theme`; run them in isolation with `yarn --cwd packages/theme test` when touching Sass utilities or token exports.

- The Storybook test runner can replay stories with Playwright. When we adopt it, the command will look like `npx storybook test --watch`; feel free to experiment locally in the meantime.

### To add new component:

1. Create a component directory in `packages/ui/src/components` (e.g. `packages/ui/src/components/Button`) with component itself
   prefixed with `S` (e.g. `SButton.vue`) and the `index.ts` file exporting it. The file's name becomes component's
   name. There are also can be subsidiary entities like other components, composables types, constants and so on that
   can be exported too.
2. Every exported component must be added to `packages/ui/src/components/all-components.ts` and `packages/ui/src/components/index.ts`.
3. Then it's necessary to add a story for being able to manually test the components. It can be done by adding a
   `*.stories.ts` file in `packages/ui/stories` directory (e.g. `packages/ui/stories/components/Button.stories.ts`).
4. Then added component should be tested. A test should be a `packages/ui/cypress/component/*.spec.cy.ts` file, where `*` is
   component's name. For searching elements in a component you should use `data-testid` attribute.
5. If there are any quite complex utils they should have their own unit tests nearby.
6. When everything is working, use repo root script `lint:format:fix` to bring the code to common style (more details
   in the section **Linting & Format**).
7. Then you should update `ui.api.md` using two commands in the `packages/ui` package: `build:tsc` and then `api:extract:local`.
8. Using `yarn changeset` create a minor change with `**feat**` prefix about new component (e.g.
   `**feat**: added button component`).
9. Create pull request.

### To release & publishing:

1. Create a release branch.
2. Make sure that everything is ready.
3. Use the command `yarn changeset version` to update `CHANGELOG.md` files.
4. Create a pull request with a release version in name.
5. Merge the pull request. It will automatically publish packages.

### Some recommendations

- There are a useful library [VueUse](https://vueuse.org/) with a lot of composition utilities that can be used in
  develop, so it is good idea to regularly check it.
- We often use provide/inject mechanism for main-subsidiary components communication (e.g. checkbox group - checkbox).
  It should be done by creating `api.ts` with a provided payload type, an injection key and an api hook in
  component directory.

- Reusable test helpers live in `packages/ui/src/test-utils`; they include a Vue mount helper and toast mocks to keep Vitest specs concise.

### Styleguide

- Previously enums was defined as plain TypeScript enums, but they don't work well with tree shaking, so now we
  define enums as follows:

  ```ts
  const Status = {
    Info: 'info',
  } as const

  type Status = (typeof Status)[keyof typeof Status]
  ```

- There is no need to create folders for every type of subsidiary entities, e.g. composables, utilities, etc.,
  if their number is small.
- Move composables to its own files started with `use`. It's helps to detect and group composables in directory tree.
- We are using BEM with underscores for class names (e.g. `button__icon_hidden` or `button__icon_size_small`).
- Try to use Windi CSS utility classes.
- Messages in changesets should start with `**type**`, where `type` can be `fix`, `feat` or something like this,
  that describes a type of change. After the type should go a scope in brackets if it can be defined. (For example,
  it can be the name of a component). Then after colon goes a change description.
  Examples: ``**fix**(`STable`): remove unnecessary border`` or `**feat**: add pagination component`.
  More info: https://www.conventionalcommits.org/en/v1.0.0/

## Linting & Format

Available scripts:

- `lint:es` - calls eslint to find formatting errors for all project
- `lint:es:fix` - calls eslint to find and fix formatting errors for all project
- `lint:format:base` - runs Prettier first, then ESLint auto-fix on tracked changes
- `lint:format:check` - verifies that the combined formatter would not change tracked files
- `lint:format:fix`- applies the formatter in write mode to tracked files
- `lint:check` - calls `lint:es` and then `lint:format:check`

To use "Format On Save" feature you should setup your (I)DE to run:

```bash
# From the project root
node ./scripts/format-with-eslint.mjs --write <target file name>

The script runs Prettier using the project config and then re-runs ESLint with `--fix`, mirroring the CI formatter. Pass `-- --all` to process the entire repository instead of just files changed relative to `HEAD`.
```

The helper applies Prettier first and then re-runs ESLint with `--fix`, mirroring the CI `lint:format:*` scripts.
