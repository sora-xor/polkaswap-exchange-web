# Release Management

This document explains how to promote local changes into published packages under the `@soramitsu-ui/*` scope.

## Prerequisites

- Access to the Soramitsu NPM organisation with publish permissions.
- Git credentials capable of creating release branches and tags.
- Clean working tree: `git status` should report no pending changes (run `yarn test:all` first).

## Versioning workflow

1. **Ensure every change has a Changeset.** Use `yarn changeset` when merging feature branches.
2. **Create a release branch** (e.g. `release/ui-0.9.0`).
3. **Apply version bumps**:
   ```sh
   yarn changeset version
   ```
   This updates package versions and generates changelog entries in each package.
4. **Install dependencies** to refresh the lockfile:
   ```sh
   yarn
   ```
5. **Review changelog diffs** for clarity and adjust wording if necessary.

## Validation matrix

Before publishing, run:

```sh
yarn test:all
```

Optionally, run targeted checks if only certain packages changed:

- Theme only: `yarn --cwd packages/theme test`
- UI package only: `yarn --cwd packages/ui build` and `yarn --cwd packages/ui test:unit`
- Storybook: `yarn --cwd packages/ui sb:build`

## Publishing

Once the release branch passes QA:

1. **Merge the release branch** into the default branch via pull request.
2. **Tag the release** (optional, but recommended): `git tag ui-v0.9.0 && git push origin ui-v0.9.0`.
3. **Publish packages** to NPM:
   ```sh
   yarn publish-workspaces
   ```
   This runs `lerna publish from-package`, pushing already versioned packages to the registry.
4. **Verify on NPM** that the packages (`@soramitsu-ui/ui`, `@soramitsu-ui/theme`, `@soramitsu-ui/vite-plugin-svg`, `@soramitsu-ui/icons`) list the new versions.

## Post-release tasks

- Announce the release in the team channel with highlights from the changelog.
- Update downstream applications if they rely on the new build.
- Close or update issues linked to the release milestone.

## Hotfixes

1. Branch from the latest release tag (`git checkout -b hotfix/ui-0.8.1 ui-v0.8.0`).
2. Cherry-pick or apply the fix.
3. Run `yarn changeset` with the `patch` option.
4. Follow the same release flow with a patch version increment.

## Deprecation policy

- Mark deprecated APIs in code comments and Storybook docs.
- Reference the deprecation and planned removal version in the changelog.
- Provide migration tips in [components.md](components.md) or dedicated upgrade guides.

## Coordinating multiple packages

When a change spans theme and UI packages:

- Ensure the theme publishes first, or use a single release branch covering both packages.
- Update peer dependency ranges if the theme introduces breaking changes consumed by the UI package.
- Communicate sequencing in the release announcement.

## Jenkins / CI pipelines

- `next.Jenkinsfile` outlines the CI stages. Keep it in sync with new scripts or job requirements.
- Docker builds rely on `next.Dockerfile`. Rebuild the base image when adding runtime dependencies (e.g. new system packages required by Storybook).

Maintain this document as processes evolve (e.g. moving to automated publishing, adding canary releases, or integrating provenance signatures).
