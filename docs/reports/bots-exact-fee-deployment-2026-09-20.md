# Exact swap fees deployed — 20 September 2026

Production now estimates the exact proposed swap call before preparing an agent intent. Preparation previously used a cached generic operation fee, while live execution checked a call-specific fee. A stale generic ceiling could therefore reject an otherwise valid prepared swap. This release removes that inconsistency; it does not reduce the chain's fee or establish a profitable strategy.

## Changes

- Agent preparation and bot execution share one exact swap-call encoder. The encoded amounts, direction, minimum/maximum, DEX and source filter are bound to the quote.
- Preparation obtains a fresh unsigned `paymentInfo` estimate using the public signer address. Missing, malformed, zero or timed-out estimates fail explicitly; they do not fall back to a cached fee. The public contract identifies this source as `payment-info`.
- Preparation and execution recheck connection, chain/runtime, signer and intent expiry across asynchronous operations and immediately before submission. Fee and balance checks use the authenticated prepared quote. A failure before submission can be retried safely; uncertain submission retains its idempotency protection.
- SDK slippage limits now use exact decimal arithmetic consistently. For a six-decimal token, a 100-token input and 0.123456% slippage produce a minimum of `99876544` atomic units in both the quote and encoded call; the old quote path produced `99876600`.
- Transaction lookup polling has its missing interval constant restored. Pending-to-finalized and timeout tests cover the path without inventing receipts.

The 10 KUSD maximum, partial-order requirement, XOR reserve and existing qualification/loss limits are unchanged.

## Validation

The full unit run passed **6,934 tests**. A subsequent focused run passed **190 tests** after final regression additions and type fixes. All **13 translation checks** and scoped ESLint passed. Both production and testnet builds succeeded. A broader scoped TypeScript investigation still reports existing errors outside these fixes; this is not a claim that the entire repository type-checks cleanly.

Evidence is retained under `output/go-history/research-20260920/exact-fee-{unit,focused,translation}.log` and `output/go-history/deploy-exact-swap-fee/`.

## Release and live verification

| Item | Value |
| --- | --- |
| Production CID | `QmVf832mqWBouL1zMvSdng9YgsoUt5P6iK32PbNQj3zGGE` |
| Production CIDv1 | `bafybeidmxuutmde6vlelmmrktt3bt4uqcinopoa4ldnddwcbtsk3jepac4` |
| Testnet CID | `QmfDCFBZjHXGTADqbSZ94MZM3eanNSW3DSy8PeVa2uXUSf` |
| Testnet CIDv1 | `bafybeih2vwyfzvojnamyvn7ks4dyfitbmcd4rmhsm3w47t57qu37qcfxnq` |
| Bunny origin | `https://mof.sora.org/ipfs/bafybeidmxuutmde6vlelmmrktt3bt4uqcinopoa4ldnddwcbtsk3jepac4` |
| Host header | `mof.sora.org` |

Both DAGs were imported and recursively pinned on MOF before changing the production origin. Origin root/JS/CSS and Swap/Bots chunks returned 200 with correct content types and exact built bytes, without redirects. The authenticated Bunny UI confirmed **“Origin settings successfully updated”**, followed by **“Pull Zone was successfully purged.”** The required origin settings and both header rules were verified.

The public root returned the new CIDv1 in `x-ipfs-roots` with `Cache-Control: no-cache`. Entry assets and the sequentially warmed dependency closure matched the release. The official WebKit check returned **zero failed requests and zero console errors**. The separate final verification reached **Swap - Polkaswap** with the node connected, then **Bots - Polkaswap** on desktop and 320-pixel mobile, with zero request, HTTP, page or console errors. It verified the single GO action, exact amount/output preservation through the missing-wallet dialog, cancellation on edit and no horizontal overflow.

The user's existing Chrome Bots tab was reloaded to the release and restored to **10 KUSD → XOR**. Its connected account and connected node were visible. No wallet unlock, signing, submission or strategy qualification was performed during this release check. Chrome extension warnings/errors are distinct from the clean isolated WebKit checks and were not represented as a clean Chrome console.

See `release.json`, `source-manifest.json`, `cdn-save-purge.json`, `live-root.headers`, `origin-assets.json`, `live-assets.json`, `warm-assets.json`, `official-webkit.log` and `final-title.json` in the deployment evidence directory.

## Remaining work

Deployment is complete; the user's profitable-trading objective is not. No actual transaction or successful-trade recording exists. Exact fee preparation fixes an execution reliability defect, not the historical qualification rejection. The separate prospective development collector remains read-only; its retained timeout prevents the ongoing run from qualifying as complete, gap-free episode evidence. Research must preserve that failure and evaluate actual costs and inventory exposure without changing the user's limits to force a pass.
