# Offline accumulation journal replay

`scripts/bots/accumulation_journal_replay.py` reconstructs an episode from full canonical event records using the sealed execution reducer. It can also propose one additional hypothetical event so the parent does not invent a claimed result. It writes no files, invokes no policy, reads no fitted model or market-data file, and has no network, wallet, signing, transaction or qualification interface.

The parent independently owns the expected episode/registration/head, authenticates each source artifact and bridge packet, verifies required schedule coverage, and atomically appends a returned proposal. The worker checks internal replay consistency under those supplied bindings. Self-consistent JSON and a hash chain do not authenticate an acquisition source, source receipt timing, completeness of a schedule, or an invocation result. The output always states `evidenceAuthentication: trusted-parent-source-and-head-required`, `scheduleCompletenessVerified: false`, `financialActions: false`, `qualificationAuthority: false` and `policyCalled: false`.

## Invocation and limits

Use a pinned Python executable, no shell, and isolated startup:

```sh
python3 -I -S -B scripts/bots/accumulation_journal_replay.py
```

The CLI accepts no arguments. Send one bounded JSON request on stdin and close it. The parent must separately bound process time, stdout and stderr and retain failure/timeout evidence; do not automatically retry. Limits are 2 MiB input, 1 MiB journal, 512 records, 256 KiB per record, 256 KiB output, JSON depth 20 and 16,000 JSON nodes. Unknown fields, duplicate keys, floating-point JSON numbers, unsafe integer timestamps, malformed amounts and ratios, malformed journal bytes, reordered records and changed reproduced results reject.

The exact replay request fields are:

```text
{
  kind: "accumulation-journal-replay-request-v1",
  operation: "replay",
  episodeId,
  registrationSha256,
  journalJsonl,
  expectedRecordCount,
  expectedHeadSha256,
  packet
}
```

`packet` is the bridge projection or `null` for accounting-only verification. `journalJsonl` is the original ASCII JSONL string. Each line has recursively sorted keys, compact separators, `ensure_ascii=true`, no floating-point values and exactly one final LF. Blank lines, missing final LF or an alternate encoding reject. `expectedHeadSha256` hashes the last complete line **including LF**; it is distinct from the SHA of the complete prefix. The expected count/head must come from the parent's independently owned storage.

For `operation: "transition"`, add exactly `nextEvent: {kind,input,evidence}` and require `packet: null`. The existing prefix is replayed first; the worker derives the next sequence and reducer revision, applies one transition, and returns a canonical proposal with its complete reproduced result. An empty prefix is allowed only for this operation with `journalJsonl: ""`, count 0, head `null`, and an `opening` event. There is no disk write or ownership claim.

## Record schema

Each canonical record has exactly:

```text
{
  kind, episodeId, registrationSha256,
  sequence, previousRecordSha256, expectedReducerRevision,
  input, evidence,
  result: {status, stateSha256, reason, details}
}
```

Sequences begin at **1**, increase by one, and are independent of reducer revisions. First `previousRecordSha256` is `null`; every later record binds the prior exact line. `result.status` is `applied`, `recorded` or `rejected`. Its state digest is computed over the full newly reproduced reducer state, including summary events, using the canonical encoding above. Results are recomputed and compared exactly; saved state is never deserialized as authority.

`evidence` contains 1–16 records, each exactly `{purpose,artifactId,sha256}`. Purpose and artifact ID use `[A-Za-z0-9_-]{1,96}`; SHA is 64 lowercase hexadecimal characters. An artifact ID may appear only once in a record, even under a different purpose or digest. These are external references, not file paths. The worker neither opens them nor claims to authenticate their contents.

Amounts ending `Codec` are canonical unsigned u128 integer strings with 18 decimals. A price is a positive reduced `{numerator,denominator}` pair of canonical strings. Marks have exactly `{blockHash,blockNumber,observedAtMs,receivedAtMs,price}`. Their native observation and original receipt times remain distinct.

| Event kind | Exact `input` keys |
| --- | --- |
| `opening` | `openingAtMs, capitalKusdCodec, feeReserveXorCodec, price, mark` |
| `valuation` | `atMs, mark` |
| `order-frozen` | `order` (full schema below) |
| `order-cancelled` | `atMs, reason` |
| `attempt-committed` | `atMs` |
| `settlement` | `mark, orderId, envelopeSha256, includedAtMs, receivedAtMs, outcome, outputXorCodec, paidFeeXorCodec` |
| `terminal` | `mark` |
| `decision-slot` | `slot, atMs, status, packetSha256, reason` |
| `admission-start` | `invocationId, atMs, inputSha256, packetSha256` |
| `admission-result` | `invocationId, atMs, inputSha256, outputSha256, status, action, selectedInputKusd, reason` |
| `admission-failure` | `invocationId, atMs, inputSha256, reason` |

The full order keys are `orderId, inputKusd, quotedOutputXorCodec, minimumOutputXorCodec, feeCeilingXorCodec, decisionAtMs, quoteReceivedAtMs, expiresAtMs, executionTargetMs, maximumExecutionLagMs, decisionMark, admissionSha256, quoteSha256, feeSha256, callHex, envelopeHex`. Original input is an integer 1–9 strictly below the opening capital. Original minimum is the exact 0.5% floor. Call/envelope bytes are retained unchanged; their semantic native encoding and admission-result authority remain the parent's verifier responsibility.

Decision slots are unique integers 0–23, bound to their original episode hour. Status is `ready`, `unavailable`, `failed`, `expired` or `skipped`; only ready has `reason:null`. Other reasons are bounded ASCII identifiers. The worker rejects duplicated or mistimed slots but does not assert that all externally required slots are present. That requires the parent's registered schedule.

Invocation IDs are unique. Only an eligible untouched state can record a start, with at most one active invocation. Result/failure must bind its pending ID and exact input digest; duplicates reject. Result status is `evaluated` or `incomplete`. Evaluated action is `buy` (integer selected input 1–9) or `wait` (selected input null); incomplete has both action and selection null. These records retain bounded references to subprocess evidence, not computed policy authority. They do not change holdings, reducer revision, peaks, stops or funding. Original subprocess bytes and their semantic source binding remain external.

## Replay and error semantics

The worker starts exclusively with `create_episode`, then calls the sealed reducer's `observe_mark`, `freeze_order`, `cancel_order`, `commit_attempt`, `settle_attempt` and `finalize_episode`. It never invokes the old runner's `load_math` or `evaluate_request`, nor fits/loads a model. Full transition inputs are necessary: the reducer's summary `events` omit previous full order terms and cannot reconstruct a journal.

Every `ReplayError` becomes a reproduced `rejected` result containing its reason/details and the helper-returned state. Some failed freeze/commit transitions return a freshly observed state with a new time, peak or stop but unchanged revision; this state is retained rather than discarding its control update. Such an episode remains incomplete. Malformed schemas or structurally invalid typed arguments reject the whole invocation and produce no append proposal; the parent must retain the rejected request separately.

Commitment consumes the only permitted attempt even if it remains unresolved or pays a failure fee. Only success spends the fixed KUSD input. Explicit success or paid failure charges its supplied fee once; no quote estimate is automatically promoted to a paid fee. Fees reduce the original separate reserve and purchased XOR cannot replenish it. Loss is latched at the exact 10% drawdown floor. A target requires a modeled purchase, at least 5% growth over opening, and positive excess over same-mark idle holdings. Stops do not revoke committed attempts or hide later passive losses.

Wrong minima, reserve deficits, wrong order bindings or unsupported timing produce retained unresolved errors. Late settlement with an inclusion mark older than an already processed newer mark remains unsupported/incomplete; never reorder the causal journal to make it pass. Terminal accounting retains the original 24-hour deadline and cannot silently discard unresolved commitments. A terminal state is accounting output only, not proof of complete coverage.

## Result and parent handoff

Successful CLI processing returns exactly the versioned result fields `kind,status,episode,inputSha256,baseJournal,journal,state,stateSha256,diagnostics,proposal,sourceSha256,evidenceAuthentication,scheduleCompletenessVerified,financialActions,qualificationAuthority,policyCalled`.

- `inputSha256` covers the exact stdin bytes.
- `baseJournal` is `{recordCount,headSha256,prefixSha256}` for the input prefix. The empty-prefix SHA is SHA-256 of empty bytes.
- `journal` contains those three fields plus `reducerRevision` for the replayed or proposed prefix.
- `proposal` is null for replay, or `{recordJsonl,headSha256,recordCount,prefixSha256}` for a transition. The full-prefix hash covers every exact retained line, including all LFs.
- `state` is the derived exact accounting summary with fees, reserve, holdings, held/idle value, peaks, drawdown, stop/attempt/success/finalized flags, paid-failure count, attention and current full mark. It is not a restorable authority.
- `status` is `eligible`, `ineligible` or `incomplete`. A healthy accounting-only prefix with `packet:null` may return `incomplete` with `packet-required`; this denotes missing admission handoff, not an inferred acquisition failure. A pending invocation, rejected transition or failed source/invocation record cannot issue an episode projection.

Only `eligible` has an `episode` projection. It is derived internally from untouched state with no stop, frozen order, committed attempt, purchase or paid fee. The packet must match the current mark's hash, height, native timestamp, exact price **and original receipt time**, and its decision must not predate any journal event. The old runner's strict public decoder is called with the same owned model/policy modules to validate the projection; no policy is invoked. Original context expiry and deadline remain checked. The episode's `journalPrefixSha256` is the hash of the **full exact prefix**, not the last record.

The parent must check the worker source pins, input/base/proposal hashes, actual independently owned head and source evidence before atomic append or subsequent runner invocation. It must retain same-process bridge ownership; a projected `status:verified` in JSON is insufficient. Opening/risk/terminal mark verifiers, first eligible execution-state selection, later frozen-envelope fees, hypothetical outcome rules, durable owner locking and complete schedule verification remain outside this worker.

## Source loading and tests

Four fixed repository source files are hashed before import and before output: the model definitions, admission policy, execution reducer and previous runner. A confined standard source loader compiles only those verified bytes in dependency order, ignoring `.pyc` caches. It replaces unchecked canonical module slots once, then reuses only its own objects so dataclass identities remain shared. It rejects package initializer files for every Python import suffix and unexpected namespace paths. This is a source-integrity boundary for an isolated worker, not a sandbox against a hostile interpreter or parent.

All tests use invented amounts, marks, events and packets:

```sh
python3 -m unittest discover -s tests/unit/scripts/bots -p test_accumulation_journal_replay.py -v
```
