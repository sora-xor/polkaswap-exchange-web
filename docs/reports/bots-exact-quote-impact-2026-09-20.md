# Exact-input quote impact audit — 2026-09-20

The archived direct KUSD/XOR quote supports an exact 1% impact check without subtracting fees again. For `WithDesiredInput`, let `O` be the positive quoted output (`amount`) and `W` its positive fee-inclusive output without impact (`amount_without_impact`). With `O <= W`, impact is `(W - O) / W`; a 1% limit is exactly `(W - O) * 100 <= W`. Both values use the same output asset's codec units, so the precision scale cancels.

The new browser-compatible helper, `src/features/bot-trading/quote-impact.ts`, exports `isExactInputQuoteWithinImpactLimit(outputCodec, withoutImpactCodec, maxPriceImpactPercent)`. It compares integers by cross-multiplication. Valid over-limit evidence returns `false`; malformed or contradictory quote amounts throw `bots.errors.quote`, and an invalid cap throws `bots.errors.policy`. Amounts must be positive canonical u128 strings. The decimal percent cap follows the existing 0–100 inclusive policy range with at most 18 fractional digits. Equal outputs represent valid zero impact; zero/missing outputs or `O > W` are rejected. This function does not accept desired-output quotes, whose SDK formula has a different denominator.

The helper does not modify amounts, calculate fees, or claim RPC provenance. Its caller must verify the exact input amount, direction, route, output identity/precision and archived state. `scripts/bots/historical-execution-reader.ts` already checks the positive u128 fields, `W >= O`, the two-asset requested route and the single XOR fee entry. Its request fixes `WithDesiredInput`, DEX 0 and `XYKPool`. The reader has not been modified by this audit.

## Fees and valuation

The local primary runtime reference at SORA tag `4.8.8`, commit `0411827191070367d9685227fc2d6d32843af347`, declares spec/transaction version 130. Its liquidity-proxy runtime API invokes `inner_quote(..., skip_info = false, deduce_fee = true)`. Liquidity proxy passes that fee-deduction setting into `quote_without_impact`; direct XYK deducts the pool fee on the XOR input or XOR output side as appropriate. The local version-131 runtime source and the vendored frontend XYK SDK implement the same fee-inclusive convention.

These are primary source references, not proof that a particular compiled runtime artifact was built from these exact local files. The historical reader separately validates the observed metadata and runtime versions at the requested state.

The consequence for replay is concrete: credit the already-net quoted output once. Keep `poolFeeCodec` as fee evidence; do not subtract it again or add it to the impact numerator. Charge the separately estimated XOR network fee once in the ledger. The minimum output/slippage bound remains separate. Pool-codec reserve ratios can mark portfolio holdings, but they must not replace `amount_without_impact` in this impact comparison: they are cached spot ratios, not the fee-inclusive runtime quote baseline.

Primary local references:

- SORA `4.8.8:runtime/src/lib.rs`, `LiquidityProxyAPI::quote` (around line 4139); Git blob `6d366863e125aaee66a8650953e028a75349b6b1`.
- SORA `4.8.8:pallets/liquidity-proxy/src/lib.rs`, `inner_quote` and `calculate_amount_without_impact`; blob `667b825fac889bb9aac5404cac535da0547c5fbf`.
- SORA `4.8.8:pallets/pool-xyk/src/lib.rs`, `quote_without_impact` (around line 824); blob `c11a6474a02120be5a69812a876eefc89a7b64f5`.
- `src/lib/substrate/liquidity-proxy/pallets/poolXyk/index.ts`, `quoteWithoutImpact` (line 479).
- `src/lib/substrate/sdk/swap/index.ts`, `getPriceImpact` (line 307).
- `src/lib/substrate/math/index.ts`, `DEFAULT_ROUND_MODE` (line 67) and `toFixed` (line 419).
- `src/features/bot-trading/research-fees.ts`, `observedPriceImpact` (line 329).

## Live rounding finding corrected

The live SDK returns a negative display percentage with two decimal places. Its actual default is BigNumber `ROUND_FLOOR` (mode 3), and it negates the impact before formatting. Therefore a true 1.004% impact produces `-1.01`, not `-1.00`; the current absolute-value 1% policy check rejects that example. The initial concern that display rounding demonstrably bypasses the cap was incorrect. A focused test exercises the actual `FPNumber` arithmetic and confirms the result.

The SDK also clamps nonpositive computed impact to zero and treats a missing/zero no-impact denominator as zero display impact. The strict new helper follows the archived reader's stronger direct-XYK evidence contract instead of accepting invalid evidence as zero. No production failure arising from those SDK fallback branches was observed in this audit, and no live policy rewrite or deployment is justified solely by the discarded rounding concern. The new exact helper is ready for the separate v3 archive gate.

No market datasets, live quotes, GO history, holdout observations or collector journals were read. Tests use invented integer values, including equality at the cap, one-unit failures, u128 boundaries, decimal cap precision, invalid evidence and existing SDK signed display rounding.
