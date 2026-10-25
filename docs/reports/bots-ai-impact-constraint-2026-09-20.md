# AI execution-limit correction

20 September 2026. This corrects a missing model input; it does not relax an execution limit or qualify a trading strategy.

GO's replay enforces its policy's price-impact ceiling, but the desktop, portable, generic provider and Jev contexts previously omitted that ceiling. They exposed a sampled impact and slippage allowance without the separate hard impact limit. A model could therefore propose an order without knowing a constraint that would later reject it.

Every affected request now includes `constraints.maxPriceImpactPercent`, copied from the actual bot policy. A shared validator preserves exact decimal strings and refuses malformed, inherited and accessor values before a request is sent or published. Current sampled costs remain separate from the maximum permitted impact. No budget, loss threshold, reserve, route or signing permission changes.

The change passed 274 focused tests, scoped lint, **7,267 full unit tests** and **13 translation tests**. The production build passed. All 46 files frozen for the separate day-001 collector remain unchanged. The build's 53 retained source hashes match the immutable release.

Production release: `bafybeigt77h3gtgldcwbnb6t5bm34oc6xsijfm26b5tlgbp7p5uhv6b744`. Both production and testnet DAGs were imported and pinned on MOF, with retained-pin integrity verified. Candidate root, entry JS/CSS and both page chunks returned 200 with exact built bytes. The origin was saved in Safari and the full Polkaswap cache purged; the public root returned the new CID, 200, MISS and `no-cache`. The save toast was not captured; the saved origin link and public content independently establish the applied value. All 138 warmed assets matched the immutable release. Official WebKit and fresh desktop Swap/Bots and 320px mobile Bots checks passed with zero console errors, failed requests or HTTP errors; Swap reached `Swap - Polkaswap` and showed a connected node.

The real connected Chrome tab's unsigned research context included `maxPriceImpactPercent: "1"`, alongside 10 KUSD starting capital, 0.5% slippage, 5% drawdown limit, 5% target and a separate 1 XOR fee reserve. No strategy was submitted in this deployment check. Cancelling the unsigned request restored the visible 10 KUSD / XOR form with the wallet and same-tab agent connected. This verifies request contents and preserves setup; it does not qualify a strategy.

[Release evidence](../../output/go-history/deploy-ai-impact-limit/release.json), [production verification](../../output/go-history/deploy-ai-impact-limit/verification.json), and [real Chrome context receipt](../../output/go-history/deploy-ai-impact-limit/chrome-context.json).

## Remaining direct-route constraint

At finalized block 27711600, exact integer analysis of the direct KUSD/XOR XYK pool gives a maximum input of **3.612680849776241962 KUSD** under 1% impact. The formula matches the pinned runtime quote, actual pool balances match the reserve cache, and every codec amount above this maximum through a rounding-aware analytic upper bound fails. This is below the earlier training prefix's zero-impact minimum of 9.09053 KUSD. The certificate covers that direct route and dated state only; it does not reject every other route, every strategy or future market state.

[Direct-route bound](../../output/go-history/pool-price-correction/direct-xyk-impact-bound-receipt.json) and [proof](../../output/go-history/pool-price-correction/direct-xyk-impact-bound-proof.md).

The retained training data also contains actual KUSD/PSWAP and PSWAP/XOR pools in eight observations. Their historical marginal spreads do not prove executable profit. The inspected local runtime rejects batches containing multiple liquidity-proxy swaps; its version agrees with observed runtime metadata, but this is not a byte-for-byte deployed-code attestation. The unsigned diagnostic therefore accounts conservatively for two separate network fees, intermediate PSWAP holdings and second-leg failure rather than assuming atomic batching.

## Separate route cost result

A fixed, independently reviewed one-state screen at finalized block **27711675** checked KUSD → PSWAP → XOR at **3.5 and 5 KUSD**, keeping the rest of the 10 KUSD unspent. Both legs respected 1% impact. Exact unsigned fee estimates totalled **0.200041425179414652 XOR**, or **8.511382%** of the opening mark including the separate fee reserve. Conservative final losses were **9.566846%** and **10.093583%** respectively. Even before native fees the route lost **1.055464%** and **1.582201%**. Neither size meets the unchanged 5% drawdown limit or produces a positive net change; this result is limited to the specified route, sizes and state.

The screen used no real signature or broadcast and does not establish account eligibility or future fills. [Exact results](../../output/go-history/pool-price-correction/triangle-screen-summary.json) and [cost explanation](../../output/go-history/pool-price-correction/triangle-screen-results.md).

During preparation, a review agent's broad local search accidentally exposed some separate day-001 development observations. The route and sizes had already been fixed; none of those observations were used to change them. That development stream must not be described as untouched acceptance data. The GO reserved holdout is distinct and was not accessed. The collector's frozen sources and retained prefix still verify; the incident concerns data visibility, not modification. [Exposure receipt](../../output/go-history/pool-price-correction/triangle-screen-review-exposure.json).

No funds moved, no strategy qualified and no successful trading recording exists. The trading objective remains open.
