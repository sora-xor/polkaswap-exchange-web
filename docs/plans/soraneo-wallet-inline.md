# Soraneo Wallet Inline Plan

**Last updated:** 2025-10-26  
**Owner:** Frontend migration pod  
**Source reference:** `src/lib/soraneo-wallet/**`

## 1. Current State Snapshot

The repository already carries a full copy of the Soraneo wallet source code under `src/lib/soraneo-wallet`. The structure mirrors the upstream package:

- `src/lib/soraneo-wallet/src` – Vue components (`SoraWallet.vue`, `components/**`), composables, mixins, store modules, services, and plugin entry points.
- `src/lib/soraneo-wallet/lib` – Compiled assets that the host app expects (`soraneo-wallet-web.css`, type utilities, ETS/translation bundles, Pinia/Vuex helpers, notification services, etc.).
- `src/lib/soraneo-wallet/src/styles` – Theme variables that reference the Soramitsu UI tokens.

Tooling already aliases the local copy:

| Tool                                          | Mapping                                     |
| --------------------------------------------- | ------------------------------------------- |
| `tsconfig.json`                               | `@wallet/*` → `src/lib/soraneo-wallet/**`   |
| `vite.config.mjs` / `electron.vite.config.ts` | Resolves the same paths plus the CSS bundle |

Despite the local copy, `package.json` still depends on the external workspace (``@wallet`: "workspace:./src/lib/soraneo-wallet"`), so Yarn expects the sibling repo to exist.

## 2. Gaps & Required Follow-up

1. **Stop depending on the sibling workspace**
   - Remove `@wallet` from `dependencies`/`resolutions`.
   - Prune the entry from `yarn.lock` (run `yarn install --mode=update-lock` after editing `package.json`).
   - Ensure CI/electron/IPFS builds still succeed with only the vendored source.

2. **Sync documentation & scripts**
   - Update any docs that still instruct contributors to pull `sora2-wallet-web` separately.
   - Confirm scripts (e.g. `ipfs:publish`) no longer try to build the external package.

3. **Ongoing maintenance**
   - Define an upstream sync process (branch names, diff workflow, code-owner sign-off).
   - Track version parity somewhere visible (e.g. this document + `docs/plans/soraneo-wallet-migration-contract.md`).

## 3. Checklist

- [x] Remove the external dependency from `package.json`/`yarn.lock`.
- [ ] Verify `yarn build`, `yarn build:vue3`, `yarn test:unit`, and the Playwright bridge/MoonPay smoke tests after removal.
- [x] Document the sync process and assign owners.
- [ ] Update roadmap status once the dependency is completely vendored.

## 4. Vendored Library Maintenance

**Owners:** Frontend migration pod (primary), Wallet squad (review)  
**Cadence:** Weekly (aligned with Thursday RC drops) or as-needed for hotfixes

1. **Track upstream changes.** Monitor the private `wallet-web` repository for tagged releases or hotfix branches. New RC announcements land in `#wallet-migration` together with changelog links and checksum artifacts.
2. **Create a sync branch.** Start from `develop`, branch as `chore/wallet-sync/<date>-<tag>`, and pull the upstream source archive. Use `rsync --delete --exclude "lib/"` to copy `src/**`, `lang/**`, and other source assets into `src/lib/soraneo-wallet/src`. Copy build artefacts (CSS bundle, helpers) into `src/lib/soraneo-wallet/lib` only after the corresponding upstream build passes.
3. **Run the integration matrix.** Execute `yarn test:unit`, `yarn build`, `yarn build:vue3`, and `VITE_DISABLE_COMPAT=true yarn test:e2e --project chromium` locally or via Jenkins. Record results in the sync branch description and attach relevant artefacts if failures occur.
4. **Review & approval.** Tag the wallet squad code owner on the PR, include a diff summary against the upstream tag, and call out any deviations or patches we keep locally. Merge only after both teams sign off.
5. **Log parity.** Update the table in `docs/plans/soraneo-wallet-migration-contract.md` (Appendix A changelog) with the upstream tag and commit hash. Note manual patches or TODOs that need follow-up in the next RC.

## 5. Notes

- CSS fallback (`src/styles/soraneo-wallet-web-fallback.css`) remains in place; the alias automatically prefers the vendored bundle when present.
- The local code currently imports the Soramitsu UI tokens via `@soramitsu-ui/theme` (also vendored under `packages/soramitsu-js-ui-library`). That dependency will be addressed in the UI inlining task.
