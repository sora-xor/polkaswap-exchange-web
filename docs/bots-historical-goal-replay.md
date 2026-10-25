# Ordered historical goal replay

`scripts/bots/historical-goal-replay.ts` combines the fixed schedule, deterministic
signals, exact portfolio ledger, quote join and terminal accounting into one
offline development run. It does not access a wallet, select a strategy, retry
an order, observe fills or certify profitability.

Call `replayHistoricalGoal(input, quoteEvidence)` with a fixed bot, schedule,
terminal policy, denominator, explicit fill scenario, bounded warmup, and all
24 completed-hour candles. Supply one valuation row for every nonterminal
schedule request and one execution-clock row for every signal, including
explicit unavailable rows. The terminal schedule request is represented by the
separate terminal proof. At most 14,401 valuation requests and 24 signal
opportunities are accepted.

Available valuations carry their target, adjacent previous block, selected
block, same-state reserve mark and normalized pool evidence. The driver checks
the first block at or after the target within the declared lag; funding retains
the schedule's exact timestamp requirement. It binds the pool genesis, block,
metadata identity, denominator, pair precision and reserves to the supplied
mark. Repeated block identities and marks must agree. The upstream reader
remains responsible for canonical RPC/finality provenance and dataset
partitioning; this join does not authenticate arbitrary JSON.

The terminal policy is separately versioned as
`goal-terminal-asof-v1-development` and is included in the immutable input
digest. Its observed block and adjacent successor straddle the unchanged
24-hour deadline. The mark belongs to the observed block, never the successor.
Terminal accounting retains that observed timestamp and uses the deadline as a
separate accounting clock. Newly terminal-only threshold crossings expire the
active goal without inventing an earlier target or loss event.

Missing required valuations or terminal evidence produce an incomplete result
before any quote request. Otherwise the driver merges actual observation,
decision and execution timestamps. At equal timestamps it processes valuation,
then decision, then execution. A stop cancels pending attempts without a quote
or fee. Each signal receives only its next completed candle and its earlier
indicator history. Holds, rejected orders and stopped slots still consume their
scheduled hour. A missing execution clock makes the run incomplete only when
an actual pending order needs it.

The async callback receives only a frozen pending order and its exact previous
and execution blocks. Return `{ quoteEvidence, poolEvidence }` from the verified
readers. The driver checks their exact amount, direction, block, denomination,
metadata, minimum output, native fee and impact before applying the declared
scenario. Sell amounts are fixed at the signal; neither the provider nor the
driver may resize them at execution. An observed null quote or policy rejection
is retained without a fill or fee. A missing pool observation makes execution
evidence incomplete. Malformed or contradictory evidence rejects the run.

For a recoverable provider failure, return
`{ status: 'unavailable', stage, reason, evidenceSha256 }`. Stage and reason are
bounded code unions; `evidenceSha256` identifies an immutable receipt retained
upstream. The driver preserves these fields in the event and diagnostic. An
unrecognized thrown error becomes a generic incomplete-read diagnostic; its
raw message is never copied. There is one callback at most per pending order
and no replacement state or retry.

The declared scenario is either `minimum-output-success` or `fee-only-failure`
for the whole run. Pool fees and slippage are already embedded in the minimum
output, and the native fee is debited once. Historical nonce-zero, tip-zero,
immortal envelopes remain estimates and are **not yet live-compatible fee
envelopes**. Hypothetical orders do not modify later archived pool states.

An optional `feePolicy: HISTORICAL_GOAL_FEE_POLICY` explicitly selects the separate
`goal-ordered-replay-v3-bound-fee-v1-development` protocol. Omitting this field keeps
the original v3 result and nonce-zero fee behavior. The new policy bounds the
supported mortal-64, zero-tip envelope's nonce and signature encoding lengths; it
does not prove future fee adequacy, signature validity or live account eligibility.
The policy and its encoding-specific SHA-256 are retained in the result and input
digest, with `feeAdequacyVerified: false`.

With that policy enabled, a ready quote response also supplies
`boundFee: { source, receipt }` for `applyHistoricalGoalBoundFee`. Its source must
contain the exact same quote evidence already checked by the original quote join.
The second join rebuilds the bound envelope and decodes its two pinned fee-call
responses before ledger admission. It replaces only the native fee; the scenario
then debits that fee once. Each admitted or cost-rejected attempt retains the
policy hash, source/receipt hashes and joined evidence digest. Null quotes and
impact rejections omit this extra evidence and continue to charge no fee.

A ready attempt missing `boundFee` is retained as incomplete with the original
pending amount and no fee or fill. A contradictory receipt, wrong state, changed
quote, mismatched SCALE fee or undeclared policy rejects the run. Neither case
falls back to the original estimate or retries the order. The same explicit fee
policy applies to success and fee-only-failure scenarios.

Both the strategy inventory and the unchanged funded benchmark use the same
marks through terminal accounting, including observations after a goal stops.
Results include exact rational ending values, holdings, fees, event order,
coverage, diagnostics and input/quote evidence digests. The driver retires its
active ledger after producing terminal results. All returned data is deeply
frozen and serializable; it is evidence of a development scenario only.
