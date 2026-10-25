# Buy XOR funding and recovery repair — 2026-09-25

This repair follows testing of the live `/buy-xor` journey beyond page rendering. No purchase, approval, transfer, swap or burn was submitted during verification.

## Corrected behavior

- Guided MoonPay checkout selects the same `credit_debit_card` payment method used by its public estimate. The USD budget checked against SORA liquidity is locked in checkout; changing it requires returning to the plan. Ordinary MoonPay purchases remain editable.
- A provider minimum can be selected explicitly. If conversion/SORA price impact or campaign capacity blocks an amount, the user can request up to six fresh smaller-amount checks. A suggestion is an example, not a maximum, guaranteed rate or authorization. Selecting it refreshes the full plan.
- TON USDT funding derives its downstream DAI estimate from the current TON quote and its minimum ETH output. Editing an amount no longer loses the liquidity check or provider handoff because of an empty saved DAI intention. Both conversion quotes must remain fresh.
- The reviewed bridge draft survives a reload before its submitted hash is available. It remains tied to its exact row, purpose, accounts, network, DAI asset and amount; unrelated history is not adopted. A restored conversion receipt cannot overwrite a subsequently reviewed bridge amount.
- Older completed swaps can recover exact historical block/events from the repository's existing approved archive when the live node reports discarded state. The live node still proves mainnet, finality and canonical block hash; archive network, block and runtime are checked before decoding. This does not change the live RPC endpoint.
- A sped-up Ethereum conversion can be recovered by explicitly entering its replacement hash. The request identity and canonical receipt must match before the purchase tracks it. Cancel transactions and unrelated transfers cannot become received DAI evidence.
- Guided swaps use a deterministic reviewed SDK history ID. If the transaction hash arrives after notification lookup times out, the exact record can still be recovered after reload. An unresolved draft is not shown as confirmed or offered as a duplicate swap, and ordinary Swap behavior is preserved.

The existing neumorphic controls and shared TS/XOR purpose separation remain in use. New controls require no wallet action merely to check a quote or transaction status.

## Read-only provider evidence

The timestamped evidence in `output/tonswap-growth/buy-xor-live-provider-audit.md` and companion JSON files records real provider quotes, contract bytecode checks, a read-only Ethereum gas simulation, and the hosted MoonPay widget. At that observation, $20 and $25 card budgets passed the SORA liquidity limit; $30 and $100 exceeded it, while the $50 conversion quote was unavailable. These are observations, not fixed supported limits; the application checks live values.

MoonPay's original unspecified payment method produced a different fee/output from the explicitly quoted card method. Adding the matching method produced identical ETH output and fees at the same observation. The locked hosted widget removed larger preset budget choices. No customer sign-in or payment was completed.

## Service boundaries

Direct card-to-native-SORA XOR is not available from the configured provider. Card purchases still acquire ETH on Ethereum before conversion and bridging. Native TON still needs an external TON-to-USDT swap, and the TON-USDT-to-Ethereum leg uses the provider handoff. Wallet signatures, provider eligibility and network gas remain necessary. Historical swap recovery requires parent/block runtime versions compatible with the current decoder. Replacement conversion recovery requires the original request to remain readable or its matching fingerprint to have been captured before eviction. Passing read-only checks is not evidence of a completed financial transaction.

## Final validation and deployment

- Source freeze: all 3,413 source/application-test files matched their recorded hashes after validation. No source changed between the full application run and publication.
- Application regression suite: **1,008 suites / 9,484 tests passed**. Translation checks: **4 suites / 13 tests passed**, covering synchronized locale catalogs. Focused UI, provider, draft/recovery tests and scoped lint checks also passed.
- Production CIDv0: `QmSNQtktXmTUqerhWx2Nbt92SXu4FAHw8kHJZncrP4mh7t`.
- Production CIDv1: `bafybeib34jeyafr2uzrk5ari3zrfyhcthcljxbli45rvfdv45py2qvotx4`.
- Both production and testnet DAGs were imported and recursively pinned on the approved MOF origin. Candidate critical files passed status, MIME and exact-byte checks before activation.
- Bunny origin was saved to `https://mof.sora.org/ipfs/bafybeib34jeyafr2uzrk5ari3zrfyhcthcljxbli45rvfdv45py2qvotx4` with host header `mof.sora.org`; the full `polkaswap` pull-zone cache was then purged. The documented origin options and both required edge rules were verified.
- Stable-host verification passed for 9 critical files and 226 sequentially warmed dependencies, with exact bytes matching the frozen production build. The final root response returned HTTP 200 and the production CIDv1 in `x-ipfs-roots`.
- Production WebKit `/swap`, `/buy-xor`, and `/get-ts` checks each passed with their expected page title, actual route UI, no bootstrap loader, **zero failed requests and zero console errors**. The separate local frozen-build check also passed.

Evidence is recorded in `output/tonswap-growth/buy-xor-repair-release.json`, `buy-xor-repair-all-app-tests.log`, `buy-xor-guidance-gas-translation-tests.log`, `buy-xor-repair-webkit-summary.json`, and `get-ts-ux-stable-y2qvotx4/verification.json`.

Live interactive checks also verified the 3 USD → provider-minimum 20 USD control and the 100 USD → fresh 25 USD suggestion. The latter encountered a transient unavailable conversion quote; the visible retry succeeded and displayed a fresh indicative XOR estimate. This confirms the retry path, not uninterrupted third-party quote availability. No wallet was connected and no financial transaction was submitted.
