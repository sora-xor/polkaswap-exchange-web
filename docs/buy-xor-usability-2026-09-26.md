# Buy XOR usability release — 26 September 2026

Goal: make the supported XOR purchase and optional TS-burn journeys understandable before users connect wallets, and keep costs, progress and recovery legible throughout. Existing quote, account, network, receipt and signing gates remain authoritative.

## Work and acceptance checks

- [x] Explain exact wallet requirements before amount entry; distinguish TON external-app steps and offer explicit alternative routes.
- [x] Put the current wallet setup action first, with optional creation and recovery help.
- [x] Prioritize payment budget, estimated outcome and remaining costs; expand technical details on demand.
- [x] Replace the misleading “Complete” phase with “Purchase” and show separate card payment, TON transfer, conversion, SORA transfer, XOR swap and optional burn milestones.
- [x] Collect transaction status and recovery links into a shared purchase overview.
- [x] Complete relevant unit, translation, lint and visual checks.
- [x] Build, pin, validate, activate and purge the production release; verify the live site in WebKit.

## Status and recovery contract

`getTsJourney` produces display-only milestones from the current plan and existing receipt readers. A financial step is confirmed only when its current receipt reader reports `received`, its reference exactly matches the saved reference, and the relevant wallet/network context is ready. A confirmed SORA swap does not require an upstream Ethereum or TON wallet to remain connected. A submitted reference, current balance, navigation step, checkout-open hint or draft identifier never establishes successful delivery.

MoonPay status is explicitly provider-reported; after reload, its local checkout hint remains a request to check status. TON handoff remains external and unverified by this overview. A burn reference points to the burn review and future claim record; it never reports TS delivered. Selecting an existing balance skips unnecessary work without asserting that earlier transactions completed.

The shared refresh control only refreshes the existing conversion, bridge and swap readers. Recovery navigation retains unresolved-transaction and signing locks. A route-leave guard keeps the signing component mounted while a conversion or swap wallet request is pending, so its returned transaction reference can be recorded before navigation. Ethereum recovery URLs require a canonical 32-byte transaction hash; bridge history keeps its Buy XOR or Get TS route purpose. All provider orders, financial approvals and signatures still require the existing explicit user actions.

## Costs and setup boundaries

The public quote is an initial estimate: it still excludes account-dependent Ethereum gas. This limitation stays visible beside the outcome. The connected card review shows the current net XOR estimate after its gas/fee reserves; amounts can change before later transactions. Detailed ETH, DAI and fee mechanics remain available without dominating the first screen.

Wallet requirements have not disappeared: current card and Ethereum routes need Ethereum and SORA wallets; TON needs TON, Ethereum and SORA wallets. New creation help uses the existing providers and secure backup workflow. This release does not introduce custody, remove recovery steps or imply that a Google backup makes the wallet passwordless.

## External dependencies and evidence limits

Direct card delivery of native SORA2 XOR still requires approved provider/network support. This release cannot create that support through UI changes. No payment, signature, new account or live Google backup is part of automated validation. Mocked visual tests and real read-only quotes are not evidence of a funded novice purchase or device recovery.

Release and validation evidence is recorded under `output/tonswap-growth/buy-xor-usability-2026-09-26/`.

## Verification results

After the wallet-focus fix, 43 affected unit suites passed 537 tests (`affected-tests-final.log`). This includes new receipt-identity/context cases, pending-signature navigation guards, guarded TON alternatives and attached-DOM wallet focus tests. Scoped ESLint passed.

Fifteen integrated actual-component fixture cases covered Buy XOR and Get TS at 390 px mobile and 1200 px desktop in light and dark themes. All fitted their viewport with no runtime errors, failed requests or external requests. Explicit TON alternatives returned to the correct two-wallet route without connecting or opening checkout. Keyboard entry and Ethereum → SORA → ready focus passed after the accessibility fix. Evidence: `qa-summary.json`. These wallet/provider states were mocked, not funded transactions.

Localization passed all four translation suites (13 tests), key/placeholder audits across 31 catalogs, scoped lint and the Akkadian script check. The release changes 86 scoped labels without modifying unrelated catalog leaves. Translations combine machine and model-authored text; native-speaker or specialist review is not claimed (`i18n-summary.md`).

## Deployment

Production: `bafybeifukxh2avuwcbohoz6c65i4uiqgzymrs3vyliicpb5zeelh4iwvym` (`QmaUbzC2gwJNHYahSodocfTLVLoHm6QTvXEjUt16qABmn2`). Testnet artifact: `bafybeiefttidf4vaotq2mg7pwgn7xjmw77s45xdus7avtajc6qszmqfslq` (`QmXLDcuFb4M46G5c6UCeCcYkpoPmVSoMfTWdPJhbABAob9`).

The production build passed and 2,355 runtime/build source files matched their pre-build freeze. Both DAGs were imported to the dedicated MOF origin, recursively pinned, and retained pin integrity verified. The candidate origin passed nine static-file checks with exact built bytes, correct content types and no redirects. Bunny zone `5860217` / `polkaswap` saved the new origin with its success toast; the full-zone cache was purged. Origin/header/cache settings and both required edge rules passed preflight. The public root reports the new production CID; all nine critical files and 226 dependency files passed sequential byte checks. Evidence: `release.json`, `bunny-activation.json`, `candidate.log`, `stable.log` and the linked verification JSON.

Live WebKit 26 checks passed for `/swap`, `/buy-xor` and `/get-ts`: correct page titles, mounted route UI, no bootstrap loader, the new production root, zero console errors and zero failed requests. A separate real $25 read-only card quote returned successful MoonPay and MOF responses. At 1200 px and 390 px the quote and setup views had no overflow; entry focused the Ethereum heading and the next Tab reached Connect, without clicking it. Wallet help and explicit TON → Card changes passed, with no provider iframe, new window or opted-in measurement request. Evidence: `webkit-*.log` and `live-readonly-check.json`. This checked live quote/navigation behavior only; no funds moved.

The final post-validation WebKit Swap check also passed with `Swap - Polkaswap`, the new production root, zero failed requests and zero console errors (`webkit-swap-final.log`). The scoped usability/deployment goal is complete; the external dependencies above remain open.
