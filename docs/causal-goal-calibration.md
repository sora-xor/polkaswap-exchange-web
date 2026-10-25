# Causal goal calibration replay

This read-only experiment evaluates three fixed trading rules against historical
SORA state. It has no wallet, signing, or transaction authority and does not change
the live `tc1` goal.

The authoritative specification is the
[frozen protocol](../output/go-history/tc1-causal-calibration-20260925/protocol.md).
Implementation:
[acquisition runner](../scripts/bots/run-causal-goal-calibration.ts) and
[replay adapter](../scripts/bots/causal-goal-calibration-replay.ts).
See the [validation receipt](../output/go-history/tc1-causal-calibration-20260925/runner-validation-receipt.md)
for synthetic tests, lint, bootstrap checks, and review evidence.

## Fixed scope

- Use the 673 already exposed completed-hour observations from **2026-06-30
  19:00 UTC through 2026-07-28 19:00 UTC**. Obtain only the 12 preceding warmup
  closes, **June 30 07:00–18:00 UTC**. These data are calibration, not untouched
  validation. No alternative or extended dates are permitted.
- Replay 28 independently funded 24-hour episodes for all three fixed candidates:
  momentum breakout, rebound from discount, and trend pullback accumulation.
  Each episode uses 25 closing marks and 24 successor-state risk checkpoints.
  Holdings and strategy state do not carry between episodes.
- Each episode starts with **10 KUSD plus a protected 1 XOR fee reserve**, with
  a 10% combined-portfolio drawdown cap, 1% price-impact cap, 0.5% minimum-output
  slippage, and 5% target. Candidate parameters and order sizes are frozen.
- Warmup uses the public indexer; archive reads use the approved historical
  endpoint specified in the protocol. This does not replace production RPC.
  Bounds are 2 warmup requests, 32 market-reader shards, 1,932 quote reads,
  1,932 bound-fee reads, and 60,000 actual RPC requests. At most two requests may
  be in flight. Readers retain their stricter per-request limits.

## Prepare and run once

From the repository root, using Node 26 and the pinned Yarn release, replace
`NEW_OUTPUT_DIRECTORY` with one new absolute directory whose parent exists:

```sh
node .yarn/releases/yarn-4.10.3.cjs tsx scripts/bots/run-causal-goal-calibration.ts prepare NEW_OUTPUT_DIRECTORY
node .yarn/releases/yarn-4.10.3.cjs tsx scripts/bots/run-causal-goal-calibration.ts run NEW_OUTPUT_DIRECTORY > NEW_OUTPUT_DIRECTORY/process.log 2>&1
```

`prepare` makes no network requests. It exclusively creates source snapshots and
`registration.json`, binding the protocol, candidate configurations, calibration
hash, local source dependency graph, configuration, Yarn lock/release, and Node
executable. Imported package manifests and resolved entry bytes supplement the
lockfile; this is not authentication of every installed third-party byte.

Review registration before `run`. Keep all bound source, configuration, protocol,
and dependencies unchanged. The runner verifies the bindings before acquisition
and after the full replay. It executes all three candidates for episode zero and
publishes its completion marker before collecting episode one; the remaining
27 episodes then proceed unchanged.

The run is **single use**: `acquisition-started.json` prevents restart even after
an interruption. There are no retries, fallback states, parameter changes, or
skipped episodes. Preserve failures and partial receipts. Do not delete a marker
or create another directory to silently repeat the experiment. Any later study
must explicitly account for prior exposure and retain the earlier evidence.

## Receipts and progress

The CLI writes compact completion/error output; `process.log` captures it. Follow
the retained process handle and artifact creation to inspect progress:

| Artifact | Meaning |
| --- | --- |
| `registration.json`, `source/` | Immutable registration and bound source snapshots. |
| `acquisition-started.json` | The single attempt has started. |
| `raw/warmup.json`, `raw/market-*/`, `raw/quotes/`, `raw/fees/` | Original retained evidence and reader diagnostics. |
| `market/` | Archived market projections used in joins. |
| `episodes/0/` through `episodes/27/` | Each candidate's retained result and event journal, including an incomplete result. |
| `first-episode-complete.json` | All three fixed candidates completed the first episode. |
| `complete.json` | All 84 results completed and final source verification passed. |
| `failed.json` | A caught terminal failure, request counts, and available diagnostics. |

An interrupted process can leave only the start marker and partial receipts;
absence of `failed.json` is not success. Partial artifacts do not establish a
complete result. Report all candidates, coverage, fills, rejections, stops,
returns relative to unchanged holdings, and both control-checkpoint and
retrospective hourly drawdown. Do not select or replace candidates after seeing
results.

## Financial limits

Historical quotes and fee estimates are genuine evidence; replay fills remain
hypothetical minimum-output successes under modeled arrival times. Hourly
checkpoints do not establish intrahour risk, and the replay omits market feedback.
Exposed calibration results cannot qualify a live strategy, establish future
profit, or count as a finalized user-approved trade or successful trading video.
The runner never requests credentials, unlocks a wallet, or moves funds.
