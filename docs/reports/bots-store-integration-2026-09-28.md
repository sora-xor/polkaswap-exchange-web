# Bots and Store release integration — 28 September 2026

The public Store release was built from an isolated checkout that omitted the Bots route and navigation. Republishing the older Bots checkout without reconciliation would restore Bots but disable the Store relay and regress its saved refund handling. The candidate source now combines the existing Bots implementation with the shipped Store frontend.

## Source and boundaries

Store source: `cdef10c24` in the `codex/community-store` branch. Its deployment report identifies production root `bafybeibfifc6u7rt6iuzhnxiuyidm4ly3fobkhcb45xl7faz537yn532ve`. The worldwide expansion retained that frontend root and Sora Pay **0.2.2**; its relay-side shipping catalog is separate from frontend assets.

The integration copies these Store files from that source:

- `src/features/store/client.ts`, `types.ts`, `messages.en.json`, and `pages/StorePage.vue`.
- `public/community-store.json`, preserving the shipped `https://mof.sora.org/sora-pay` endpoint, merchant identity and recipient.
- `vendor/sora-pay/sora-pay-0.2.2.tgz`, plus the matching dependency entry and Yarn-generated lock update.
- Five Store unit-test files and `tests/e2e/ui/community-store.spec.ts`.

Only the `communityStore` namespace was merged into each of the 31 locale catalogs. Other locale namespaces were preserved. Existing Store assets, wallet adapter, checkout components, route registration and checkout composable already matched the Store source byte for byte.

The integration keeps the current checkout's global routing, navigation, wallet/SDK fixes, IPFS handling and Vite configuration. It does not copy the isolated branch's older global files. The Store's server configuration, customer data, shipping catalog and fulfillment processes are unchanged.

## Behavior preserved

The Store remains enabled through its existing relay and presents the desktop-wallet support scope. Saved orders retain their original refund policy; newer orders can show an outgoing network-fee deduction. Agreed deductions and manually reconciled refunds require finalized evidence. Refund receipts show exact amounts and any outstanding correction, and downloadable receipts retain that information. Insufficient native XOR receives the packaged checkout explanation.

The imported Sora Pay archive SHA-256 is `096edc1cddd706902bde50ed83feb6b80c374caf9b692ead30899665d7842a4a`.

## Validation

- Pinned Yarn installation completed successfully on Node **26.10.0**.
- Store unit tests: **7 files / 59 tests passed**.
- Translation checks: **4 files / 13 tests passed**.
- `lang:fix` and the Akkadian cuneiform check passed.
- Scoped ESLint completed with exit **0**, without diagnostics. Node's compile-cache persistence delayed process exit after linting; the completed handle was retained and verified.
- The 12 copied file hashes match the Store source, and all 31 Store locale namespaces match after formatting.

Local evidence is under `output/go-history/bots-store-integration-20260928/`, including an integration manifest with source, before/after hashes and locale preservation checks. Browser/deployment verification belongs to the combined release process; these offline results do not claim a production rollout, payment, or successful trading transaction.
