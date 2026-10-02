# Recovering the first training acquisition

The preparatory runner at
`output/go-history/earlier-goal-acquisition-continuation-20260921-v2/run-study.mts`
composes an explicit child of the failed
[earlier study](bots-earlier-goal-study.md). It has no wallet, signer or broadcast
path. The original failed invocation, its raw evidence and its validation claim
remain authoritative and unchanged.

The child changes only the evaluator source hash in the plan. Its isolated source
directory preserves all original economics, archive readers and causal evaluator
bytes. The only modified modules are the journal and archive composition; four
new modules provide raw-prefix verification, filesystem inventory, recorded
history retries and per-episode transport composition. Preparation requires an
exact 129-file source/config closure with no undeclared transitive additions or
omissions. Parent input and source hashes are checked before acquisition and
again before accepting a result.

`--prepare` verifies files and the original training prefix without network
requests or study registration. It saves the new source/protocol binding and an
exact raw-file manifest. It may read training evidence programmatically; it does
not print market values or open validation values. `--run` repeats verification,
creates the owned preparation in the running process, and registers one child
through the [continuation journal](bots-goal-qualification-study-store.md).
Neither command silently overwrites an earlier output or failed invocation.

The original 826 physical starts count against the unchanged 35,000-start
study limit, leaving at most 34,174 new starts with the original 125 ms spacing.
Replaying successful responses does not make another physical request. Per-episode
accounting includes the original failed request and its 157-byte body, replayed
successful responses, new responses and all retry attempts. The recorded error
also consumes the first of the recovered request's three allowed attempts.

The new child acquisition operation has its own fixed deadline. This is explicit
recovery of historical data acquisition; it does not resume the old expired
wall-clock operation or change the historical modeled arrival times. All retries
and replay uses are retained. The original successful prefix must be exhausted
and the missing response consumed before the privately owned completion proof
can authorize first-episode journal completion.

Training candidates, lots, budgets, dates, fees, loss limits and selection rules
are unchanged. Validation remains closed until the actual qualification boundary
seals a passing training selection. A transport recovery is not evidence of
profitability. Runtime 130 study evidence also cannot silently authorize runtime
131 trading; see [the compatibility assessment](bots-goal-runtime-compatibility.md).

The component tests, exact retained-reader reconstruction and source preparation
passed before this runner started its actual child acquisition on 21 September.
The runner's write-once `prepared.json`, `access.json`, `complete.json` or
`failure.json` provide the precise state; an access marker is not a passing
qualification. The preceding preparation without the `-v2` suffix retained an
earlier diagnostic-counter implementation and was explicitly superseded before
any study registration. Its source and preparation files remain unchanged.
No browser GO activation, deployment or live transaction is established by these
artifacts.

The recorded failed request subsequently recovered on overall attempt 2 with
HTTP 200 and a complete 114,863-byte response. The actual source then completed
and retained its six-page history operation in `history-744.json.json`.
[Recovery corroboration](../output/go-history/earlier-goal-acquisition-continuation-20260921-v2/recovered-history.json)
joins the exact request and response hashes, without displaying market values.
This establishes acquisition continuity, not a completed strategy qualification.
