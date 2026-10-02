# Runtime 130 research and runtime 131 live admission

Assessment dated 2026-09-21. The existing codecs can encode and decode the retained
131 metadata. The historical qualification still cannot admit runtime 131: its
runtime code and metadata identities differ. Keep
`assertGoalQualificationRuntime` and the historical certificate/profile unchanged.
A separate live compatibility capability would require additional execution and
economic evidence. This document proposes that boundary; it does not install it.

## Evidence actually checked

Only retained metadata, runtime-version/code-hash receipts and local source were
read. No pool state, prices, GO observations, study day data, validation data,
wallet or network were accessed.

| Identity                   | Historical 130                                                       | Observed current 131                                                 |
| -------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| spec / transaction version | 130 / 130                                                            | 131 / 131                                                            |
| metadata SHA-256           | `726c0dcdc748164be3ed3cc65c149e936e08380ef99c1b3991a0db6c1d7d127b`   | `18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824`   |
| `:code` storage hash       | `0x2b33b01ba3f9e58e269b0e9619d25bedf3f60cdd6ed0ec519dacc75259c85d1e` | `0xf062ed07861255f5ec443930de9c5066d1e4133036126d48462c8e233a75f27e` |

The current profile was queried at finalized hash
`0xa0da3149533290f84611f13f4ef25b7df4e32cf88eb264061d9d8716475fe1fa`.
It is an observed profile, not a perpetual assertion about the latest chain.
Inputs and hashes are recorded in
`output/go-history/goal-runtime-compatibility-20260921/metadata-codec-evidence.json`.
The current source receipt is
`output/go-history/earlier-goal-study-20260921/current-runtime-profile.json`;
the historical identity is taken from the metadata-only
`earlier-window-metadata-20260920/profile-trainingEnd.json`.

The offline probe invokes the actual browser execution, pool and fee codecs on
both retained metadata blobs. With explicitly invented amounts it verifies:

- V14 metadata, V4 extrinsics and the seven supported signed extensions retain
  the expected order/types: spec version, transaction version, genesis, mortal
  era, compact u32 nonce, weight and native `ChargeTransactionPayment`.
- All seven fixed pool/asset/denomination/timestamp storage keys match. Pool
  properties remain two AccountId32 values; reserves remain two u128 values.
- Both directions of DEX 0, XYK-only, desired-input swap produce equal call bytes
  and 215-byte maximum fee-estimation envelopes. Signing payloads differ; the
  outer extrinsic does not carry spec/transaction version or mortality checkpoint.
- The relevant event declarations match: `XorFee.FeeWithdrawn(AccountId32,u128)`,
  eight-field `LiquidityProxy.Exchange`, and the System success/failure events.
- Invented `RuntimeDispatchInfo` bytes round-trip and trailing bytes fail. The
  retained real metadata uses Weight V2 (`refTime`, `proofSize`), whereas some
  older synthetic fixtures use a scalar weight. Neither sample is a runtime fee
  observation. The first probe attempt used the scalar fixture and failed; the
  corrected attempt and both logs are retained.

These checks establish supported structure, not swap behavior, fee adequacy,
signature authority, runtime equivalence or profitability. The synthetic unit
test `goal-runtime-compatibility.spec.ts` explicitly proves that matching metadata,
call bytes and envelope bytes still do not let a 130 qualification admit 131.

## Missing proof for a separate capability

1. **Exact runtime implementation identity and behavior.** Retain an independently
   attributable runtime artifact/source mapping for the 131 code hash. Compare the
   affected implementation, not only metadata: XYK quote and exchange rounding,
   fee asset selection, fee splitting and refund behavior, transaction-payment
   extension, dispatch weights, fee multiplier, charge-on-failure, and receipt
   event meanings. Code hashes alone identify different implementations; they do
   not explain the difference. No such semantic evidence was established here.

2. **131 decoder and signing conformance.** Bind the supported shape to the exact
   131 metadata and code hashes. Extend real-codec synthetic vectors to cover
   nonce compact-width boundaries, Ed25519/Sr25519/ECDSA, mortal64 phase/checkpoint,
   both directions, u128/rounding boundaries, success and failed-extrinsic events.
   `goal-mortality.ts` must continue checking the actual SDK payload and returned
   signature against account/call/runtime/era/nonce; metadata's fourth `Eth`
   signature variant remains unsupported. A placeholder envelope proves no key
   ownership. Reuse `goal-signing.ts` and the existing receipt/expiry paths.

3. **Real 131 fee-method evidence at one pinned finalized state.** Use the actual
   `TransactionPaymentApi_query_info` and `TransactionPaymentApi_query_fee_details`
   `state_call` methods with exact envelope bytes plus little-endian u32 encoded
   length, at that same hash. Require full SCALE consumption, non-null inclusion
   fee, zero tip, native XOR and agreement between partial fee and the saturated
   inclusion-fee sum. Test both directions and the supported maximum envelope;
   separately query the actual signed envelope before submission. The existing
   `execution-state.ts` implementation already enforces this comparison. Metadata
   and advertised runtime API versions cannot substitute for successful responses.
   Fee methods are estimates: preserve actual settled fees and attention on any
   overrun. No current fee response was read during this assessment.

4. **A separate economic acceptance result.** The selected strategy, lots, budget,
   denomination and benchmark must remain bound to their qualified evidence.
   Equal encoding does not prove unchanged XYK economics or acceptable new costs.
   If an implementation comparison establishes the relevant swap semantics,
   assess a predeclared conservative 131 cost envelope through a separate causal
   replay/stress protocol. Recompute decisions, holdings, benchmark, loss/target
   stops and fees; subtracting a fee delta from the old final return is insufficient.
   Do not retrospectively reuse an already-exposed holdout to approve new rules.
   Keep the old study sealed and label any transported scenario separately. Without
   supported semantic and cost evidence, the available route is a separately
   registered 131 study with its own previously unexamined validation. Neither
   route permits adding 131 to the historical profile list or promises future profit.

At live use, fresh quote/impact/minimum-output and actual-envelope fee guards must
still pass. A new fee greater than the independently accepted envelope, changed
metadata/code, stale context or changed connection revokes admission. Existing
allocation, reserve, session, consent, signed-order retention and deadline rules
continue unchanged. A compatibility check is not authorization to sign.

## Proposed minimum implementation boundary

Add a **separate** `goal-runtime-admission.ts`, only after the evidence policy is
approved. It should own an opaque `GoalLiveAdmission` in a private WeakMap. A
trusted evidence producer, rather than imported JSON or a true-returning hook,
must supply the implementation-conformance and economic-acceptance capabilities.
Bind the admission to the original owned qualification/certificate digest, exact
source and target profiles, codec source hashes, fee-policy/economic-policy hashes,
unchanged strategy/lots/capital/denomination, and the relevant live connection and
fresh context. Serialized audit receipts must be reverified before a new process
can own a capability; they must never silently resume a signer.

Provide two explicit modes. The existing same-profile mode calls
`assertGoalQualificationRuntime` exactly as today. The separately installed
cross-runtime mode verifies the original owned historical qualification plus its
independently owned compatibility evidence and matches the **actual target**
profile. It must never catch a strict-profile rejection and treat decoder success
as permission. The original qualification's `runtimeProfiles` stays 130; current
131 appears only in the separate admission evidence.

The concrete consumption points are:

| File / boundary                                                               | Required assertion                                                                                          |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `goal-funding.ts`, after `reads.capture` and before opening allocation        | Owned qualification plus exact current admission; preserve request ownership check                          |
| `goal-runtime.ts`, after finalized capture and before mark/signal accounting  | Same admission for every observed runtime profile; reject drift                                             |
| `goal-live.ts`, `qualificationRuntime` at preparation and again after signing | Same admission, plus existing fresh quote and exact signed-envelope fee checks                              |
| Trusted composition root                                                      | Install the explicit new mode only when both independent evidence producers exist; keep default mode strict |

The first implementation can keep admission ownership session-local, with a
separately stored audit certificate and an explicit revalidation/consent step on
reload. If it is persisted into a bot binding, add a separately versioned admission
digest to the consent identity and strict binding parser; do not overload
`qualificationDigest` or rewrite existing certificates. Execution-state codecs,
the historical evaluator and frozen study source files need no profile relaxation.

Required boundary tests include cloned/forged/stale capabilities; any changed code
or metadata hash; codec-compatible but economically unapproved runtime; fee-method
disagreement; fees outside the accepted envelope; reconnect/upgrade during signing;
and rejection at funding, accounting and submission independently. A late returned
signature must still be retained for receipt/expiry recovery even when admission
has been revoked.

This assessment supports implementing the separate verifier surface and its
negative tests. It does **not** supply the missing semantic/cost/economic producer,
so it cannot enable cross-runtime trading yet.

## Subsequent source provenance and actual fee checks

The following read-only checks on 2026-09-21 extend the original assessment above;
they do not amend historical profiles or grant live admission.

The exact observed code blobs were independently hashed locally and compared
byte-for-byte with bounded downloads from the official SORA GitHub repository:

- Runtime 130 matches the 3,037,507-byte 4.8.8 follow-up artifact published at
  [`411dcdb70c5c00b21482a44d02334840d5f338c6`](https://github.com/sora-xor/sora2-network/blob/411dcdb70c5c00b21482a44d02334840d5f338c6/runtime-upgrade-4.8.8/runtime-upgrade-4.8.8-info.json),
  SHA-256 `0ac7b85d845d56d450df99ab7166014897be57a7a1f66437d92e6949b56f49c0`.
  The original 4.8.8 tag contains a different WASM (`:code` hash
  `0x39f8609a748b13a0186e90023f709adf9d639bfa0777f6aaf3484a254e6b17b4`).
  The matching artifact first appears with source commit
  `a24f53a097a8a7fd6d0ca18be94314a3219f63a2`. This establishes attributable
  artifact identity; its package lacks a reproducible source/compiler attestation.
- Runtime 131 matches the 3,055,506-byte
  [4.8.9 council artifact published at `2c8911cfa0d92be7a31c8a3841ba7ae38d33da3d`](https://github.com/sora-xor/sora2-network/blob/2c8911cfa0d92be7a31c8a3841ba7ae38d33da3d/runtime-upgrade-4.8.9/README.md),
  SHA-256 `db948406c5f22d4923b2760019de53bcd0ef756ed05accaf5156ca3041988447`.
  Its build manifest identifies source `823a5b9fde8486dd73aeab856c76bbab5408bf0f`
  and mainnet features, with `wip` disabled. The inspection independently verified
  129 relevant source-manifest hashes against that commit; it did not rebuild it.

The scoped source comparison found 65 unchanged files across XYK, liquidity
proxy, assets, denomination, native payment extension, weights and supporting
runtime constants. The native direct-swap flat fee, length fee, multiplier
application, refund and failed-swap fee paths are unchanged in those associated
sources. Non-native fee/referrer changes are `wip`-gated. Mainnet changes include
routed weight accounting for VAL buyback, staking payouts and liveness work;
this is not whole-runtime equivalence. Exact paths, hashes and limitations are in
[the provenance inspection](../output/go-history/goal-runtime-provenance-20260921/inspection.json).

One actual fee-only invocation then made 12 sequential requests to
`https://ws.mof.sora.org/`, with no retry or fallback. It pinned finalized block
**27,721,401**, hash
`0x2c87b42bea9e9cd91cf42d7709b0fb915099a2a93111439dc6fbdaadf3089ce7`.
Genesis, spec/transaction 131, the exact code and metadata hashes in the table
above, and denominator `100000000000000000000000000000000000000` matched.
Only runtime metadata, denomination and fee methods were queried; no pool,
quote, history, account balance or wallet data was read.

| Fixed input / direction | Input codec | Envelope | Agreed native XOR fee codec |
| --- | --- | --- | --- |
| 5 KUSD → XOR | `5000000000000000000` | 215 bytes | `100021312589707326` |
| 1 XOR → KUSD | `1000000000000000000` | 215 bytes | `100021312589707326` |

For both envelopes, `TransactionPaymentApi_query_info.partial_fee` matched
`TransactionPaymentApi_query_fee_details`: base fee `0`, length fee
`21500000000000`, adjusted weight fee `99999812589707326`, and tip `0`.
The sum is **0.100021312589707326 XOR** at 18 decimals. Full SCALE consumption
and the 215-byte maximum supported signature/nonce encoding were checked with
the existing pure codecs. Minimum output was explicitly dummy `1` codec, derived
from dummy output `2`; ECDSA signature bytes and account were placeholders.
These envelopes establish fee-method conformance only. They were not signed by
a wallet, submitted, executed or treated as genuine liquidity quotes.

[The offline verification](../output/go-history/goal-runtime131-fees-20260921/verification.json)
checks all 12 raw response/file hashes, unchanged probe source hashes, same-state
request bindings and fee agreement. Its linked protocol/result retain complete
public raw RPC receipts. Eight synthetic tests, lint and scoped TypeScript passed.
A preliminary CLI import error occurred before any RPC and remains recorded.
No admission capability was created. The observed fee happens to equal half the
earlier two-fill engineering total; that arithmetic does not establish runtime
equivalence, economic acceptance or future fee adequacy.

The next bounded semantic step is to run the two exact matched WASM blobs against
the same explicitly synthetic native DEX-0 XYK fixture: each fixed input direction
and a deliberately failing minimum-output case. Compare quote rounding, dispatched
balance changes, native fees and receipt events, with all external reads denied.
The retained release harness demonstrates exact-WASM execution, but currently
loads pinned remote state; it needs an offline fixture adapter before this check.
This would test the specific execution path without guessing a source tag. Any
later admission still needs the original qualified strategy and separately accepted
cost/economic evidence; the historical certificate and runtime guard remain strict.
