# AGENTS Guidelines

This repository is a Node.js + Vue (Vite) project that compiles into a static site and is deployed via IPFS. There is no server runtime — all functionality must work from static assets produced by the build.

## Project Basics
- Runtime: Node 24 (see `.nvmrc` and `package.json` engines).
- Package manager: Yarn 1.x (`yarn.lock`).
- Build: `yarn build` produces static assets (dist/) suitable for IPFS hosting.
- Dev: `yarn serve` for local development.

## Testing Requirements
- Every new function or feature must include at least one unit test; add more for edge cases and critical paths.
- Test runner: Vitest (workspace projects in `vitest.workspace.ts`).
- Unit tests live under `tests/unit/**`, mirroring the source structure where possible.
- Run tests:
  - `yarn test:unit` — unit tests
  - `yarn test:translation` — i18n consistency checks
  - `yarn test:all` — convenience alias for unit tests
- Guidelines:
  - Do not perform network calls or require external services. Mock SDKs, wallet APIs, and providers.
  - Prefer lightweight mocking for `@soramitsu/soraneo-wallet-web` and `@/utils/ethers-util` when testing bridge flows.
  - Cover redenomination math and token amount handling with precise expectations.

## Internationalization (i18n)
- If you add or change user‑visible strings:
  - Update `src/lang/en.json` (authoritative keys).
  - Run `yarn lang:fix` (and/or `yarn lang:generate`) to propagate/fix translation keys.
  - Update all locale catalogs so they mirror English keys: keep `src/lang/*.json` and `src/lang/card/*.json` in sync with `en.json`. Do not leave missing keys.
  - For special locales (e.g., Akkadian `akk`), ensure locale‑specific constraints are respected (cuneiform‑only). Run `yarn test:translation` to verify and optionally `tsx scripts/lang/enforce-cuneiform.ts --locales=akk`.
  - Ensure `yarn test:translation` passes.
- Use existing message keys where possible; keep wording consistent across the app.

## Documentation
- Document everything you add:
  - Use clear JSDoc/TSDoc comments on functions, classes, and modules.
  - If you introduce new components, modules, or flows, add brief usage notes (and update README or module‑level docs as appropriate).
  - Keep inline comments minimal and focused on non‑obvious logic.

## Security Expectations (Financial Application)
This is a financial application — treat security as a first‑class concern.
- Math & amounts:
  - Never use raw JavaScript floating‑point for token math.
  - Use `FPNumber` helpers consistently (e.g., `fromCodecValue`, `fromNatural`, `toCodecString`).
  - Handle decimals, rounding, and denomination (chain‑provided denominator) explicitly.
- Input & data handling:
  - Validate and sanitize all user inputs; avoid `eval`/dynamic code execution.
  - Guard against overflow/underflow and invalid states.
  - Do not expose secrets or sensitive data. Avoid logging PII or private keys.
- Network & bridging:
  - Validate network selection and addresses before signing or sending.
  - Respect chain‑provided configuration (e.g., denomination) and handle error cases with safe fallbacks.
- Dependencies:
  - Avoid adding new libraries without a clear need. Prefer vetted, existing dependencies.
  - Keep version ranges conservative and align with repository conventions.

## Coding Conventions
- Align with the existing codebase style and structure.
- Keep changes minimal and focused; avoid broad refactors unless requested.
- Use the `@/` alias for imports from `src`.
- Follow TypeScript best practices and avoid `any` when possible.

## Build & IPFS Considerations
- The site must work as static files served from IPFS:
  - Avoid absolute URLs for internal navigation/resources unless required.
  - Ensure assets and routes resolve under content‑addressed paths.
- Verify that dynamic features degrade gracefully without server assistance.

## PR Checklist (must pass before merging)
- [ ] Unit tests added/updated for all new/changed functions and critical paths.
- [ ] `yarn test:unit` and `yarn test:translation` pass locally.
- [ ] Translations regenerated/fixed for any new strings.
- [ ] Documentation updated (comments and any relevant docs).
- [ ] Security reviewed (inputs validated, math safe, no secrets exposed).

If anything here conflicts with explicit user or system instructions, follow those higher‑priority instructions and update this document accordingly.
