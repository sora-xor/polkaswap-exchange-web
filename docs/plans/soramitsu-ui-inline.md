# Soramitsu UI Inline Plan

**Last updated:** 2025-10-26
**Owner:** Frontend migration pod
**Source reference:** `src/lib/soramitsu-ui/**`

## 1. Current State Snapshot

- The UI kit sources live under `src/lib/soramitsu-ui`, mirroring the upstream package layout (`components`, `composables`, `util`, `icons`, `theme`, `types`, and `lib.ts` entry).
- Aliases in `vite.config.mjs`, `electron.vite.config.ts`, and `tsconfig.json` now resolve `@soramitsu-ui/ui/**`, `@soramitsu-ui/ui/styles`, and `@soramitsu-ui/theme` directly to the vendored source tree. Sass preprocessing includes the local theme root so component styles compile without the external workspace.
- Tests and stubs reference the same aliases; Playwright/Vitest helpers (`tests/stubs/soramitsu-ui/**`) already map to the vendored modules.
- The legacy `packages/soramitsu-js-ui-library` workspace is retained only as an upstream reference and documentation mirror. The application build no longer reads from its `dist/` artefacts.

## 2. Gaps & Required Follow-up

1. **Purge lingering workspace artefacts**
   - Keep the legacy `packages/soramitsu-js-ui-library` tree in sync or archive it once the maintenance workflow below is in place.
   - Remove stale build references (e.g., scripts that still attempt to run `yarn build` inside the workspace) as we verify CI parity.
2. **Verification cadence**
   - Re-run the build/test matrix after dependency upgrades or major UI kit changes.
   - Track any remaining Vitest failures unrelated to the UI kit and document waivers until they are fixed.

## 3. Checklist

- [x] Document current package layout and dependencies (this file).
- [x] Copy UI kit sources (components, composables, styles, build scripts) into `src/lib/soramitsu-ui`.
- [x] Wire Vite/Electron/TS configs to the vendored sources and update Sass imports.
- [x] Remove the external UI kit dependencies from `package.json`/`yarn.lock` and regenerate lockfiles.
- [ ] Re-run `yarn build`, `yarn build:vue3`, `yarn test:unit`, and the bridge/MoonPay Playwright smoke after the swap.
- [x] Publish a maintenance playbook (sync cadence, owners) in this document and cross-link from the roadmap.

## 4. Notes

- The UI kit depends on several supporting packages (`@soramitsu-ui/theme`, `@soramitsu-ui/icons`, `@soramitsu-ui/vite-plugin-svg`, etc.). When vendoring, confirm which parts are required in the application bundle versus build-time tooling.
- Some assets (icons, fonts) are currently pulled from the sibling repo; plan to copy them or reference them through a stable vendored path in `src/assets`.
- Watch for duplicated dependencies (e.g., `lodash-es`, `focus-trap`, `@vueuse/core`) already bundled in the application to avoid shipping duplicate code once the sources live side-by-side.
- Latest verification (2026-04-21): `yarn build`, `yarn build:vue3`, `yarn test:translation`, and `yarn test:unit` all pass after the direct-import wallet cutover. Playwright wallet smokes were not run in this pass.
- `src/compat/soramitsu-ui.ts` has been removed; consumers now import `Status`, `SortDirection`, and `SSkeleton` components directly from the vendored UI kit (`@soramitsu-ui/ui`).

## 5. Vendored UI Maintenance

**Owners:** Frontend migration pod (primary), Design systems squad (review)
**Cadence:** Align with upstream weekly RCs or as-needed hotfixes

1. **Monitor upstream releases.** Track the private `soramitsu-ui` repository for new tags or hotfix branches. Release announcements in `#ui-kit` should include changelog links and checksum artefacts.
2. **Create a sync branch.** Start from `develop`, branch as `chore/ui-kit-sync/<date>-<tag>`, and pull the upstream source archive. Use `rsync --delete --exclude "dist/"` to copy `src/**`, `icons/**`, `theme/**`, and helper utilities into `src/lib/soramitsu-ui`. Regenerate `lib.ts` exports if the upstream surface changes.
3. **Update generated assets.** Run the upstream icon/token generators if required (`pnpm generate:icons`, etc.) and ensure the outputs land under `src/lib/soramitsu-ui/icons` and `src/lib/soramitsu-ui/theme`. Keep fonts under `src/lib/soramitsu-ui/theme/fonts`.
4. **Run the verification matrix.** Execute `yarn build`, `yarn build:vue3`, `yarn test:translation`, and `yarn test:unit`. If Playwright wallet smokes are tagged, run the scoped wallet smoke selection documented in the roadmap. Record pass/fail status in the pull request description.
5. **Review & sign-off.** Request reviews from the design systems squad and the frontend migration pod tech lead. Include a diff summary against the upstream tag, highlighting any local patches.
6. **Log parity.** Update this document and the roadmap checklist with the synced tag hash and notable changes. Mention outstanding follow-ups (e.g., tests still failing upstream or pending design QA) so the next sync can prioritise them.
