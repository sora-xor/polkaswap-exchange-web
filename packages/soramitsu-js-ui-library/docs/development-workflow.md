# Development Workflow

This guide captures the day-to-day routines for contributing to the Soramitsu UI monorepo.

## Branch hygiene

- Prefer `feat/<topic>`, `fix/<topic>`, or `chore/<topic>` naming.
- Keep branches focused; split large features into incremental pull requests when possible.
- Rebase onto the default branch before requesting review to avoid merge commits in history.

## Editor setup

- Enable ESLint and Prettier integration. For VS Code, install **Prettier ESLint** and configure "Format on Save" to call `./node_modules/.bin/prettier-eslint`.
- Enable Volar or Vetur for Vue 3 single-file component support.
- Configure TypeScript to use the workspace version (`cmd + shift + P` → "TypeScript: Select TypeScript Version" → "Use Workspace Version").

## Local development loop

1. **Install dependencies** (once per clone): `yarn`.
2. **Run Storybook** when working on component visuals: `yarn sb:serve`.
3. **Launch Vitest in watch mode** for instant feedback:
   ```sh
   yarn --cwd packages/ui test:unit --watch
   ```
4. **Start Cypress component tests** interactively if you change behaviour reliant on the DOM or keyboard interactions:
   ```sh
   yarn --cwd packages/ui cy
   ```
5. **Update theme builds** whenever you touch tokens: `yarn build:theme`.

## Linting and formatting

- Quick format fix: `yarn lint:format:fix` (formats files changed relative to `HEAD`; append `-- --all` to touch everything)
- ESLint only: `yarn lint:es`
- Combined check (CI equivalent): `yarn lint:check`

Ensure lint commands run clean before pushing. Prettier and ESLint rules are shared across packages to keep code style uniform.

## Type checking

Run type checks after significant TypeScript or Vue composable changes:

```sh
yarn --cwd packages/ui typecheck
```

CI runs this step implicitly via `yarn test:all`; catching issues locally speeds up review.

## API Extractor updates

When adding or modifying public component APIs:

```sh
yarn --cwd packages/ui build:tsc
yarn --cwd packages/ui api:extract:local
```

Commit the resulting `ui.api.md` diff with the feature branch.

## Storybook maintenance

- Keep stories light; prefer controls over hard-coded variants.
- Document breaking changes or new props through Storybook docs panels.
- Run `yarn --cwd packages/ui sb:build` to ensure the static build passes before merging significant UI updates.

## Changesets

Every user-facing change (new component, breaking change, bug fix) should include a Changeset:

```sh
yarn changeset
```

Follow the prompt, using the `**type**(scope): message` format described in `README.md`.

## Pull request checklist

- [ ] Linting and formatting pass locally.
- [ ] `yarn test:all` succeeds or any failing step is explained in the PR description.
- [ ] Stories, tests, and docs updated alongside code changes.
- [ ] API Extractor output updated when public APIs change.
- [ ] Screenshots or GIFs attached for visual updates where helpful.

## Reviewing others' work

- Pull the branch locally when visual changes are involved; run Storybook to verify.
- Check Cypress and Vitest snapshots for changes caused by the patch.
- Cross-reference `backlog.md` to avoid regressing known gaps.

Consistency and automation keep the design system reliable. Adapt this workflow as tooling evolves and document updates here.
