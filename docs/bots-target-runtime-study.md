# Historical observations with an explicit target runtime

This is an engineering design for a new study, not a qualification or a
registered economic experiment. Existing studies, validation claims and
certificates remain unchanged. No market observations have been acquired for
this design.

## The boundary being corrected

The current plan uses one runtime-profile list for historical pool marks,
execution estimates and live admission. Consequently, a runtime 130 study
cannot authorize runtime 131 even when its historical reserve observations
remain correctly decoded. Those are distinct claims. Removing the runtime
check or adding an untested profile to a certificate would not fix that
conflation.

The new path must retain `sourceRuntime: 130` on the actual historical data
and separately pin `executionRuntime: 131` to the exact official compressed
WASM, metadata and code hashes already retained in the
[runtime assessment](bots-goal-runtime-compatibility.md). The exact target WASM
supplies the execution model; the design does not assert universal equivalence
between the two runtimes or depend on an unproven runtime-130 source build.

## Same explicit simulation fidelity

The existing archive evaluator obtains a quote and a bounded native-fee
estimate, then simulates the conservative minimum output and fee-only failure
through the exact portfolio ledger. It does not dispatch a real historical
transaction or replay all block hooks. A target-runtime model must preserve
that distinction.

Only these read-only runtime APIs are needed:

- `LiquidityProxyAPI_quote` for native DEX 0, XYK-only KUSD ↔ XOR desired input.
- `TransactionPaymentApi_query_info` and
  `TransactionPaymentApi_query_fee_details` for the exact supported envelope.
- `Core_version` and `Metadata_metadata` to check the pinned binary identity.

Retained synthetic traces establish that these quote/fee paths need a much
smaller state than transaction dispatch. Their union is DEX configuration,
enabled and locked liquidity sources, pool properties, the pool's actual XOR
and KUSD account balances, the native fee multiplier, and the complete
`XSTPool.EnabledSynthetics` map. The quote uses account balances, not merely
the cached `PoolXYK.Reserves` field. This finite trace establishes the initial
supported read domain; an additional read must fail rather than obtain an
invented default.

Every point value or null must come from a retained RPC response at the exact
source block. Prefix pagination must include an explicit terminal empty page;
the host also needs the genuine first global key beyond that prefix, or an
explicit global-exhaustion response, to preserve `next_key` behavior. Empty
synthetic fixture maps cannot substitute for production state. Both metadata
schemas must agree on the supported storage keys and complete SCALE layouts.

The standalone host rejects writes, transaction APIs, offchain operations and
unknown state reads. It returns a hypothetical read-only API result, not a
fill, a chain receipt, a completeness certificate or wallet authority.

## Economic and live requirements still outstanding

Before any new training access, freeze the exact candidates, dates, exposure
disclosures, source and target identities, state-acquisition policy, raw-byte
verification, modeled delays, missing-data behavior and conservative native
fee scenario. Preserve the existing full training/selection/validation
corridor and all return, benchmark, drawdown and actual-fill gates. The
previous failed study cannot be retuned or relabeled.

A target cost scenario also needs a corresponding live fee limit. One real
fee observation cannot promise a future fee ceiling. Runtime preparation and
post-signing checks must reject an estimate outside the accepted scenario;
actual finalized fees remain authoritative for accounting and recovery.
Quotes must cover inventory-capped partial amounts and both directions,
including minimum-output rounding and unavailable routes.

The new result must keep source provenance and target execution identity
separate through plan, trace, certificate, portable replay, release and owned
live admission. Funding, observation and signing must independently verify
that admission and reject runtime drift. No caller-supplied JSON, compatibility
flag or synthetic test result can authorize trading.

The existing v1/v2 runtime checks stay in place. The new explicitly selected
v3 boundary accepts only source130 provenance and target131 execution. It
remains inactive until a real study passes and its verified release is shipped.
Working adapters alone do not qualify a strategy or establish profitability.

## Implemented engineering components

The bounded [raw transport](bots-target-runtime-transport.md),
[dual-metadata state verifier](bots-target-runtime-state.md) and
[pinned read-only WASM host](bots-goal-target-runtime-host.md) now have focused
unit coverage. The integration uses invented responses through all three
components, including both quote directions and fee APIs, with networking
denied. This proves their engineering interface works; it is not an economic
experiment or a registration.

`goal-target-model.ts` now parses the separate runtime identities and execution
implementation pins. The v3 qualification and causal episode boundaries bind
the source profile, target profile and model digest separately on each fill.
Historical marks retain source130. Owned live verification and the trusted
publisher release path admit only target131 for this model. No v3 release is
configured in the application.

The cost policy is `native-xor-declared-cap-stress-v1`. Before training, a study
must choose a positive exact-codec per-transaction native fee cap no greater
than the separate 1 XOR reserve. There is no default numerical cap. The two
runtime fee APIs must agree and stay within that cap; otherwise the proposed
order is rejected. Accepted hypothetical fills charge the full declared cap,
while retaining both original API fee amounts in evidence. This is an explicit
cost scenario, not a claim about future network fees. Live preparation, the
fresh quote after signing, and the actual signed-envelope fee estimate all
enforce the same qualified cap. Finalized actual fees still determine ledger
accounting, including fees above estimates and recovery.

The v3 archive producer and study-store dispatch now preserve source-state
authentication and unavailable-route results. The isolated Node target-estimate
replay helper re-verifies storage receipts and recomputes every API result with
the pinned worker. The fixed Node study replay and publication entry points
now compose that helper with the shared causal episode and study controllers;
the quote helper alone cannot qualify a study.
The publisher may perform v3 raw replay in Node over portable retained artifacts
and publish a small pinned release, matching the existing deployment trust
boundary. The browser must label that publisher attestation honestly; it need
not run zstd/WASM or claim to have repeated raw v3 research. Its existing v2 raw
replay path remains unchanged. No study has been registered or evaluated under
this new protocol yet.

## Portable raw replay and publication

V2 and V3 share replay mechanics behind strict versioned constructors. The V3
study controller retains the existing private selection capability and
training-before-validation order; V3 rejects parent/continuation records. The
fixed Node-only episode composition calls the concrete target replay helper.
It does not accept a replacement quote verifier through its public arguments.

The target quote join consumes every `target-rpc-CHECK-ID.json` wrapper,
compares it with the embedded original receipt array, authenticates source
metadata and Properties through the verified market artifact, and recomputes
the complete estimate. Success requires an exact joined fee artifact;
unavailable routes require its absence. Request/byte counters count each
physical target RPC once. Source ordering, clocks, histories, marks, terminal
state and artifact-completeness checks remain in the shared episode core.

Do not replay original responses through live acquisition: that would generate
new `requestedAt`/`completedAt` fields and different provenance hashes. The
publisher binds a fixed Node full-study verifier, preserves owned validation
admission and abort/revocation semantics, and publishes only after rechecking
the original artifacts. Existing V2 entry points retain their version checks.

The explicit Node entry points are:

- `exportGoalStudyBundleV3` in `scripts/bots/goal-study-bundle-export.ts` copies
  a completed durable journal into an immutable portable bundle. It requires
  original metadata caches, verifies completed traces, rejects continuation
  artifacts, and writes the index last. This step provides integrity and
  distribution, not independent proof of the underlying RPC responses.
- `reverifyGoalStudyBundleV3` in `scripts/bots/goal-study-bundle-verifier-v3.ts`
  accepts a trusted `{ rootUrl, indexSha256 }` and exactly
  `{ fetch, compressedBytes, signal? }`. It verifies original metadata and raw
  episodes, recomputes selection and qualification, and returns an owned result
  with `dispose()`. The pinned target binary is copied before asynchronous reads.
- `exportGoalStudyReleaseV3` in `scripts/bots/goal-study-release-v3.ts` takes
  `{ bundle, outputDirectory }` plus those same dependencies. It calls the fixed
  full-study verifier, then writes a small `manifest.json` without overwriting
  existing output. It always disposes the verification. Cancellation during
  filesystem publication can leave files for inspection, but returns no success
  receipt. Do not configure an artifact without a completed publication result.

None of these entry points acquires new market data, unlocks a wallet or enables
a release in the application. Synthetic checks establish software behavior;
they do not establish profitability or replace the pending registered study.
