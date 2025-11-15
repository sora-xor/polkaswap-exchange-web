# Translation Audit Plan – Vue 3 Migration

Goal: audit locale keys touched by recent dialog and flow updates, regenerate language files, and ensure `yarn test:translation` passes before the next release window.

## Objectives

1. Identify new or modified English strings in `src/lang/en.json` (and card-specific files) since the last audit.
2. Propagate updates to all locale files using `yarn lang:fix` / `yarn lang:generate`.
3. Verify special locale constraints (e.g., Akkadian cuneiform enforcement).
4. Run translation tests and capture results in Confluence.

## Audit Scope

- Global locale files: `src/lang/*.json`.
- Card-specific locales: `src/lang/card/*.json`.
- Recently updated components: Bridge dialogs, Moonpay, Order Book, Sora Card, Settings.

## Checklist

| Step                          | Command / Action                                                                           | Owner             | Status |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ----------------- | ------ |
| Extract changed English keys  | `git diff origin/main -- src/lang/en.json src/lang/card/en.json` (or use `yarn lang:diff`) | Localization lead | ☐      |
| Regenerate locale files       | `yarn lang:fix` (ensures key parity)                                                       | Localization lead | ☐      |
| Enforce special locale rules  | `yarn test:translation` <br>`tsx scripts/lang/enforce-cuneiform.ts --locales=akk`          | Localization lead | ☐      |
| Manual QA of critical locales | Spot-check RU, DE, JP (if applicable) for layout issues in updated dialogs                 | QA + Localization | ☐      |
| Update translation changelog  | Document new keys and required translator context in Confluence                            | Localization lead | ☐      |
| Notify translators            | Share list of new/changed keys via localization channel                                    | Localization lead | ☐      |

## Verification

- Ensure `yarn test:translation` passes locally and in CI.
- Add translation status update to #migration-status after audit.
- Attach screenshots for any layout adjustments required due to longer strings.

## Timeline

- Schedule audit during Sprint 2 Week 1 (before staged rollout).
- Re-run checks after each major component migration (Order Book, Sora Card).

## Notes

- Avoid manual edits to non-English files; rely on tooling to maintain structure.
- Track outstanding translation tasks in the migration board under “Localization”.
