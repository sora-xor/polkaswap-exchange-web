# One-shot operational continuation

This [thin driver](../scripts/bots/continue-causal-gap-calibration.ts) composes the
frozen gap acquisition helpers and exact existing replay. It changes no candidate,
date, clock, financial limit or qualification rule. The interrupted original run
remains unchanged and incomplete. The new directory is a derived operational
continuation, not a claim of uninterrupted original completion.

The [layered cache](../scripts/bots/causal-gap-continuation-reuse.ts) authenticates
the parent snapshot and nested strict-v1 evidence using original receipt hashes,
source snapshots and existing pure codecs. Only an explicitly incomplete trailing
group can be quarantined; contradictory complete evidence is fatal. All 36 parent
results must reproduce exactly using cache only before fresh suffix reads are
enabled. Already retained partial episode-12 evidence is reused as well.

The interrupted attempt is charged a conservative upper reservation: seven market
shards, five quote jobs, five fee jobs and 2,482 RPCs. The 1,954 retained successful
RPC receipts are a lower bound, not an exact dispatch total. The extra invocation
per class covers a sequential trailing operation whose in-memory receipts were
lost. New limits are 25 shards, 1,927 quotes, 1,927 fees, 57,518 RPCs and zero new
warmup requests. Existing reader limits remain in force. No retained observation
is reacquired; a missing interrupted response is explicitly ambiguous.

After offline tests and source review, use a new absolute output directory:

```sh
node .yarn/releases/yarn-4.10.3.cjs tsx scripts/bots/continue-causal-gap-calibration.ts prepare NEW_DIRECTORY
node .yarn/releases/yarn-4.10.3.cjs tsx scripts/bots/continue-causal-gap-calibration.ts run NEW_DIRECTORY
```

Preparation has no network request. `registration.json` is a byte-identical copy
of the original evaluation registration; `continuation-registration.json` binds
the new orchestration source, parent evidence manifest and reserved budget. The
start, completion and failure receipts reference both registrations. Always
present the continuation provenance alongside the frozen reporter's output.

The run must be launched by an independently verified persistent one-shot process
(for example a user launchd job with `KeepAlive` disabled), with stdout/stderr and
exit status retained. The driver does not install, start or retry that job.
`acquisition-started.json` is exclusive; never delete it or restart this directory.

Every logical reader invocation is synchronously recorded and flushed before its
claim returns. Every request intent is recorded and flushed before actual fetch;
the original bounded response is recorded and flushed before delivery to the
reader. Response URL/status/headers and original bytes are retained. Method-specific
byte caps and the caller's request deadline remain effective. Failure keeps the
intent and bounded available bytes, charges the attempt, and forbids another
request. Interrupted intents never silently become completed receipts.

`prefix-reproduced.json` records the cache-only equality gate. `attempts/` and
`invocations/` provide durable dispatch accounting; `reuse/` records provenance.
The final marker requires all 84 complete results and final source/evidence checks.
Do not aggregate a partial prefix. Independent episodes are not a compounded
portfolio; hypothetical results on exposed calibration provide no realized profit,
future-profit assurance, transaction evidence or live qualification.
