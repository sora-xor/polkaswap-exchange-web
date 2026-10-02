# Purchase wallet onboarding

## Design notes

- Visual thesis: a calm, native Polkaswap workspace, with one current action and restrained neumorphic disclosures for supporting detail.
- Content plan: disclose the route's wallet count before the amount preview; during setup, show the next connection, optional creation/recovery help, then the complete connection checklist.
- Interaction thesis: reveal help on request, move to the next required connection only when existing wallet state changes, and retain visible keyboard focus and 44 px targets without decorative motion.

## Component contracts

`GetTsRouteRequirements.vue` accepts `source`, optional `purpose` (`ts` by default), and optional `disabled`. The source-stage parent places it before the amount preview. Its `selectSource` event contains only `card` or `ethereum`, emitted from explicit alternatives on the TON route. The parent must use its existing guarded source-change handler and pass its plan-edit lock as `disabled`; the component never changes a plan, navigates, connects, or submits anything.

The requirements describe wallet accounts, not necessarily separate installed applications: card/Ethereum require Ethereum and SORA; TON also requires TON; existing SORA assets or XOR require only SORA. The Ethereum route says conversion is conditional because DAI already on Ethereum can proceed to the bridge.

`GetTsWalletSetup.vue` retains its source/purpose contract and existing connection APIs. Setup shows one current action, exposes the exact wallet checklist in a disclosure, and separates creation/recovery guidance from the main action. Google is offered only when its existing integration is registered. Its button opens the existing account chooser, where creation, existing backups, and import remain available. It does not bypass recovery phrase confirmation, credentials, successful backup acknowledgement, or account selection. No wallet state, secrets, completion flags, or new browser storage are introduced.

The current action heading (or ready status) accepts programmatic focus with `tabindex="-1"`. On entry and after a required connection changes, focus moves there after rendering without scrolling. This prevents focus falling to the document body when the previous action button unmounts; focus never opens a wallet or requests a signature.

Official help links are static HTTPS links, open a separate tab with `noopener noreferrer`, and are labelled as external. Ethereum creation uses the [official MetaMask download page](https://metamask.io/download); SORA help uses the existing [SORA wallet connection guide](https://wiki.sora.org/polkaswap-connect-wallet.html). Both pages were checked on 2026-09-25 UTC. Opening help does not invoke a wallet connection.

Copy is authored in `src/features/misc/getTsOnboarding.en.json` under `getTs.onboarding`, then merged into runtime locale catalogs by the release integration lane.

## Validation limits

Unit tests cover exact route requirements, purpose separation, disabled source alternatives, passive help, supported Google/fallback actions, connection order, rejection and readiness. Mocked wallet state is not proof of mobile wallet installation, OAuth completion, backup recovery on a second device, or a funded purchase. These remain separate pilot checks.

Focused validation on 2026-09-25 UTC: both component suites passed, **25 tests**, including an attached-DOM focus regression for initial entry, Ethereum → SORA and SORA → ready. Scoped ESLint passed without output. Commands:

```sh
node .yarn/releases/yarn-4.10.3.cjs exec vitest run --config vitest.config.mjs --project unit tests/unit/features/misc/GetTsWalletSetup.spec.ts tests/unit/features/misc/GetTsRouteRequirements.spec.ts
node .yarn/releases/yarn-4.10.3.cjs exec eslint src/features/misc/components/burn/GetTsWalletSetup.vue src/features/misc/components/burn/GetTsRouteRequirements.vue tests/unit/features/misc/GetTsWalletSetup.spec.ts tests/unit/features/misc/GetTsRouteRequirements.spec.ts
```
