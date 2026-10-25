# Bots goal episodes: production deployment and live outcome

Date: 20 September 2026. The new frontend is live at `https://polkaswap.io/#/bots`. The actual 10 KUSD → XOR attempt failed training. No funds moved, and there is no successful trading video.

**Subsequent source correction:** an audit found that this release's indexed training series used global USD prices with a fixed KUSD peg, including changing discovery routes. Its training and idle-inventory results below describe that supplied series; they do not establish the direct KUSD/XOR pool's performance or impossibility. See [the bounded provenance audit](../../output/go-history/pool-price-correction/training-provenance.json). The replacement `goal-episodes-v2` requires same-state direct XOR pool evidence and rejects v1 qualification snapshots. This report remains the historical record of the v1 release and attempt.

## Shipped behavior

The simple form remains amount, input token, output token, and **GO**. A 10 KUSD budget remains the maximum starting input allocation; it is not an instruction to swap 10 KUSD. The model proposes smaller orders.

The previous research run used substantially longer periods than the requested 24-hour goal and demanded five fills. `goal-episodes-v1` now evaluates four fixed 24-hour training episodes and two held-out episodes, with independently reset funding and no discarded idle or losing episodes. Each partition needs at least one simulated fill, positive mean net and excess returns in both percentages and absolute output units, and worst episode drawdown within the user's bound. Six historical scenarios are descriptive evidence, not a profit guarantee.

Replay now applies the live goal, fee-only failure, minimum-success, fee reserve, order-cap and price-impact checks. The output order ceiling survives the live handoff. Episode-qualified live strategies consume completed hourly signals once; a restart cannot reuse the same hour. Stops latch, but residual holdings remain valued through the original endpoint. Details and limitations are in [the protocol documentation](../bots-goal-episodes.md).

## Deployment evidence

- Production CID: `QmRVrveDCUjgpLyU6UysSJwgRfvGLNgGLKyyvWZ79R2jYQ`.
- Production CIDv1: `bafybeibo54m5hns7q46cpllafql5frkyiutospyzeydxlhcrgizczg5efu`.
- Origin: `https://mof.sora.org/ipfs/bafybeibo54m5hns7q46cpllafql5frkyiutospyzeydxlhcrgizczg5efu`; host header `mof.sora.org`.
- Production and testnet DAGs imported into MOF; both recursive pins verified. The current entry JS, CSS, Swap and Bots chunks returned the built bytes with HTTP 200 and correct content types. 138 assets were warmed sequentially.
- The authenticated Safari Bunny session saved the new origin. It persisted after reload. The authorized full-zone purge confirmation was clicked and closed without error; the public root then returned `cdn-cache: MISS` and the new IPFS root. **The save success toast was not captured.** Persisted settings and HTTP state provide the retained confirmation; this report does not claim toast evidence.
- Required origin settings and both `RawDwebOriginHeaders` and `SetPolkaswapCSP` rules were checked. No runtime or governance change was submitted.

The official WebKit checker passed. Separate fresh WebKit desktop Swap, desktop Bots and 320-pixel mobile Bots checks verified the new root, real page titles/UI, connected node, zero failed requests, zero HTTP errors and zero console/page errors. GO preserved the exact entered amount and output token while opening the same-tab wallet chooser; editing canceled the pending flow. These browser checks were unfunded.

Validation: **7,202 unit tests** (6,582 app and 620 script tests), **13 translation tests**, and scoped ESLint passed. All 31 locale catalogs were synchronized. A broader TypeScript check encountered existing SDK/module/type errors; a clean repository-wide typecheck is not claimed. The release's 44-file application/locale source manifest remains unchanged. The separate day-001 protocol's frozen source hashes remain intact.

## Actual Chrome attempt

The user's existing Chrome tab loaded the release and retained 10 KUSD input and XOR output. The portable assistant controls connected successfully and exposed 117 training observations, exact costs and the new constraints. No validation observations were read by the assistant.

A diagnostic 24-hour deviation-band strategy was tested at 3.5, 1.75 and 0.875 KUSD per order. All candidates failed during training with **Too few trades · No gain after costs · Loss limit exceeded**. Held-out validation did not run. No wallet unlock, trading approval or transaction occurred. The retained DOM transcript is not a video or a network trace.

An additional calculation from only those training observations shows why waiting alone does not solve the loss constraint: unchanged 10 KUSD plus the separate 1 XOR reserve had peak drawdowns of **9.04%, 12.04%, 6.31% and 22.66% when valued in XOR**, across the four fixed days. These are inventory valuation changes, not fees charged to the user's wallet. A target or pause cannot lock in XOR value without an actual conversion.

The next research direction is an inventory-aware no-trade region using exact execution costs and remaining time, tested under a new prospective protocol. The [cost-aware design note](../../output/go-history/research-20260920/cost-aware-opportunity-design.md) also quantifies conditional maker and sponsorship alternatives. For one retained 5 KUSD purchase-and-hold scenario, the necessary fee threshold is below 0.0459792 XOR versus about 0.1000207 XOR observed. That is only a necessary condition for that path, not proof that all strategies are impossible or that a discount would create profit. Maker execution still needs usable deployed ticks and real counterparties; sponsorship needs an actual funded payer.

Evidence directory: [deployment, tests and live outcome](../../output/go-history/deploy-goal-episodes/verification.json). The overall trading-and-recording goal remains incomplete.
