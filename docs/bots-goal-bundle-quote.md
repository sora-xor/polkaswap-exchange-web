# Original quote and fee verification in the browser

`verifyGoalBundleQuote(binding, {quoteBytes, feeBytes, contextBytes})` in
`src/features/bot-trading/goal-bundle-quote.ts` reconstructs one original v2
`GoalEpisodeQuoteEvidence`. Its inputs are the original `quote-N.json`,
`fee-N.json`, and `quote-context-N.json` wrapper bytes, their pinned canonical
value digests, and the independently reconstructed causal binding. File-byte
hashes remain the bundle reader's responsibility. No normalized JSON certificate
is accepted as qualification authority.

The binding fixes the request and check ID, finalized source, previously verified
valuation, pending input, decision time, modeled quote/fee duration and check
cutoff, and the fee policy ID/hash from the pinned plan/source. The caller owns
signal selection, maximum position/trade limits, deadline cancellation, and
valuation ordering. A quote verifier cannot resize or reverse a pending order.

## Raw joins

The verifier reproduces all 19 original quote-reader calls:

1. Genesis, observed finalized head/header, pinned source canonical hash, selected
   canonical hash/header, and its parent header.
2. Runtime versions and metadata at both selected state and parent. Runtime
   responses must match completely; metadata bytes must match, and the browser
   codec must reproduce the previously verified valuation's metadata/runtime.
3. Five metadata-derived storage reads at the selected block: timestamp,
   denominator, both asset descriptions, and DEX. Real SCALE decoding checks
   token identities/decimals, native DEX, denomination, and valuation timestamp.
4. The exact-input KUSD/XOR quote in either direction, DEX 0, XYKPool,
   AllowSelected, and the unchanged pending amount. Positive u128 outputs, the
   no-impact baseline, direct route, and native pool-fee denomination are checked.
5. The original swap envelope and both `query_info` and `query_fee_details` calls.
   Exact SCALE fee decoding must agree, including zero tip.

It then independently builds the conservative fee envelope with the browser fee
codec: mortal period 64, maximum u32 nonce, maximum supported ECDSA signature
length, zero tip, exact requested call, and exact floor-rounded 50-basis-point
minimum output. The signature/account are public estimation placeholders; this
does not sign or authorize a transaction. Both original bound-fee state calls
must contain precisely this envelope and its encoded length at the same block.
Their SCALE query-info and fee-details results must agree.

All RPC identities, methods, params, HTTP status, exact retained body hashes, and
original timestamp syntax are checked. Quote responses retain the original
2 MiB per-response / 8 MiB aggregate limit. The two bound-fee responses retain
64 KiB each and require complete bytes, matching received/retained byte counts,
and the original strict response shape. Failed, partial, extra, or substituted
calls do not become successful evidence.

The complete reconstructed original quote and bound-fee projections must match
their retained values, including envelope hashes, request, source binding, raw
responses, and all false fill/submission/fee-adequacy claims. The original
quote-context wrapper must join those two digests to the verified valuation's
digest, pending input and modeled clocks. The returned frozen context uses the
original **quote-context value digest**; its other evidence identities remain the
original quote and fee value digests. Acquisition timestamps are never regenerated.

## Economic and trust boundaries

A well-formed quote above the existing 1% impact limit remains valid evidence.
The original pure impact helper validates its inputs; the shared episode
evaluator applies the economic rejection. Turning such a quote into unavailable
evidence would change v2 evaluation semantics. Pool fees are already included in
the quoted output and are not subtracted again. The conservative native fee is
returned separately for exact ledger accounting.

The original quote reader does **not** retain a runtime code-hash RPC. Code
identity therefore comes only from the independently verified valuation at the
same pinned block, joined to matching runtime and metadata. This module does not
invent an extra code-hash observation. Its source/canonical/finality claims remain
RPC-attested; there is no GRANDPA, storage-trie, cryptographic header-hash, actual
inclusion, signature, or future fee-adequacy proof here.

The causal evidence source must supply trustworthy bindings and enforce complete
artifact coverage, phase access, selection and qualification. Passing matching
attacker-chosen binding JSON provides none of those properties. This module does
not activate default GO, admit runtime 131 using runtime 130 research, or bypass
the existing qualification/runtime boundary.

Tests use both actual historical readers with invented RPC responses and real
portable metadata, covering both directions and supported codec versions,
projection tampering, raw request/response corruption, envelope/fee joins,
original timestamps, modeled timing, and high-impact observations. No actual
study data, external service, wallet, or credentials are used.

```sh
yarn test:unit tests/unit/features/bot-trading/goal-bundle-quote.spec.ts
```
