# Soraneo Wallet Inline Plan

**Last updated:** 2026-04-21
**Owner:** Frontend migration pod
**Source reference:** `src/lib/soraneo-wallet/**`

## 1. Current State Snapshot

The repository carries the Soraneo wallet source inline under `src/lib/soraneo-wallet`. The host app now imports the vendored sources directly:

- `src/lib/soraneo-wallet/src` – Vue components (`SoraWallet.vue`, `components/**`), composables, mixins, store modules, services, and plugin entry points.
- `src/lib/soraneo-wallet/lib` – Prebuilt static residue. The host app only imports `soraneo-wallet-web.css` from this directory; runtime modules, types, and store helpers import straight from `src`.
- `src/lib/soraneo-wallet/src/styles` – Theme variables that reference the Soramitsu UI tokens.

Legacy wallet-package aliases were removed during the final cutover. Current import expectations are:

| Surface                                       | Current expectation                                                |
| --------------------------------------------- | ------------------------------------------------------------------ |
| App and tests                                 | Import runtime symbols directly from `@/lib/soraneo-wallet/src/**` |
| CSS                                           | Import `@/lib/soraneo-wallet/lib/soraneo-wallet-web.css` directly  |
| Tooling                                       | No legacy wallet aliases remain in TypeScript, Vite, or test config                |

`package.json` no longer depends on the former external wallet workspace. The repo builds from the vendored source copy alone.

## 2. Gaps & Required Follow-up

1. **Keep the vendored boundary clean**
   - Do not reintroduce compiled JS bundles or `.d.ts` helper output under `src/lib/soraneo-wallet/lib`.
   - Keep `lib` limited to the CSS bundle or other explicitly imported static assets.

2. **Sync documentation & scripts**
   - Keep docs aligned with the vendored-only setup; no sibling `wallet-web` checkout is required for local work.
   - Keep scripts/tests/configs on direct vendored imports instead of reintroducing alias wrappers.

3. **Ongoing maintenance**
   - Define an upstream sync process (branch names, diff workflow, code-owner sign-off).
   - Track version parity somewhere visible (e.g. this document + `docs/plans/soraneo-wallet-migration-contract.md`).

## 3. Checklist

- [x] Remove the external dependency from `package.json`/`yarn.lock`.
- [x] Verify `yarn build`, `yarn build:vue3`, and `yarn test:unit` after removal.
- [x] Document the sync process and assign owners.
- [ ] Update roadmap status once the dependency is completely vendored.

## 4. Vendored Library Maintenance

**Owners:** Frontend migration pod (primary), Wallet squad (review)
**Cadence:** Weekly (aligned with Thursday RC drops) or as-needed for hotfixes

1. **Track upstream changes.** Monitor the private `wallet-web` repository for tagged releases or hotfix branches. New RC announcements land in `#wallet-migration` together with changelog links and checksum artifacts.
2. **Create a sync branch.** Start from `develop`, branch as `chore/wallet-sync/<date>-<tag>`, and pull the upstream source archive. Use `rsync --delete --exclude "lib/"` to copy `src/**`, `lang/**`, and other source assets into `src/lib/soraneo-wallet/src`. Copy only the CSS bundle or other explicitly imported static assets into `src/lib/soraneo-wallet/lib` after the corresponding upstream build passes; do not sync compiled JS or declaration output back into the app repo.
3. **Run the integration matrix.** Execute `yarn test:unit`, `yarn build`, `yarn build:vue3`, and `yarn test:e2e --project chromium` locally or via Jenkins. Record results in the sync branch description and attach relevant artefacts if failures occur.
4. **Review & approval.** Tag the wallet squad code owner on the PR, include a diff summary against the upstream tag, and call out any deviations or patches we keep locally. Merge only after both teams sign off.
5. **Log parity.** Update the table in `docs/plans/soraneo-wallet-migration-contract.md` (Appendix A changelog) with the upstream tag and commit hash. Note manual patches or TODOs that need follow-up in the next RC.

## 5. Notes

- CSS fallback (`src/styles/soraneo-wallet-web-fallback.css`) remains in place; the alias automatically prefers the vendored bundle when present.
- The local code currently imports the Soramitsu UI tokens via `@soramitsu-ui/theme` (also vendored under `packages/soramitsu-js-ui-library`). That dependency will be addressed in the UI inlining task.
