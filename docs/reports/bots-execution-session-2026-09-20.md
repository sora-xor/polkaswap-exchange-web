# Execution collection reliability — 20 September 2026

The new opt-in collector reuses one healthy public RPC connection between scheduled observations. It reduces repeated initialization overhead while preserving fresh finalized state, exact quotes/fees, runtime/metadata checks, and the 25-second deadline. It does not change the deployed trading strategy or fee schedule.

The previous collector opened a connection for each slot. Its retained day-001 failure occurred during final metadata continuity verification after both quotes and fees had returned. That observation remains an error. This change addresses setup overhead and missing diagnostic timing; it does not establish the underlying cause of that individual RPC delay.

## Implementation and tests

- `scripts/bots/execution-session.ts` grants one exclusive observation at a time. A successful observation releases its lease while keeping the connection; any error, timeout or shutdown invalidates it. Only the next scheduled slot may reconnect. Late replies and partial callbacks cannot contaminate another slot or mutate retained evidence.
- Both successful and failed observations retain connection identity and reader-operation timing. The measurements distinguish connection, context, buy, sell and final continuity work; they are not individual wire-RPC intervals.
- `scripts/bots/collect-execution-session.ts` uses a separate source-bound transport/timing manifest. It checks instrumentation before append and on resume, rejects changed sources or policies, preserves fixed-lot provenance, and retains every missed/error outcome. The original collector, running experiment and existing records are unchanged.
- Exact amount cloning, elapsed-deadline checks, clock-regression diagnostics, context changes, failed initialization, fixed-lot changes, cleanup and malformed/resumed evidence are covered. **346 collector/replay regression tests pass**, including 31 session and 53 CLI tests. Scoped strict TypeScript and ESLint pass. No unit test uses the network.

Usage: [execution sessions](../bots-execution-sessions.md).

## Frozen live engineering check

Before connecting, a separate protocol froze five observations at 30-second spacing, all source hashes and the original deadline/start grace. The test used the approved MOF public endpoint and no wallet or transaction authority. All five observations completed and passed the existing checks at distinct finalized blocks. The dataset then passed complete-journal resume validation without collecting another observation.

| Finalized block | Connection reused | Whole observation | Connection initialization |
| --- | --- | --- | --- |
| 27,708,919 | No | 12.706 s | 3.067 s |
| 27,708,922 | Yes | 7.225 s | 0 s |
| 27,708,928 | Yes | 8.672 s | 0 s |
| 27,708,931 | Yes | 5.517 s | 0 s |
| 27,708,935 | Yes | 8.932 s | 0 s |

One connection served the five observations; there were no failed or missed slots. Sources matched their pre-connection archive after completion. These five samples demonstrate successful reuse and retained validation. They do not prove a future failure rate, gap-free day, execution latency, inclusion or profitability. The 0-second reuse measurement means no new connection was initialized; the fresh context/quote/check work is included in the whole-observation time.

Evidence under `output/go-history/research-20260920/`: `session-smoke-001-protocol.json`, `frozen-session-smoke-001/`, `execution-session-smoke-001/{manifest.json,observations.jsonl}`, `session-smoke-001-verification.json`, `session-smoke-001.log`, `execution-session-regressions.log` and `execution-session-complete-typecheck.log`.

## Fee investigation and remaining objective

A separate single-connection public observation recorded deployed finalized block **27,708,892**, runtime/transaction version **131/131**, the runtime code-storage hash and exact-format metadata. The observed FixedU128 multiplier is **142.856875128153323136**. Metadata exposes both multiplier controls; Sudo is absent. These observations establish deployed configuration, not local-source equivalence, feature flags, governance authority or a safe lower fee.

The [fee-design feasibility note](../../output/go-history/research-20260920/small-order-fee-design-feasibility.md) separates the global multiplier controls from a dedicated swap-fee runtime change, documents broader effects and identifies missing resource/authorization evidence. No fee setting or governance transaction was changed.

The 10 KUSD maximum, partial orders, XOR reserve, loss limit and existing qualification remain intact. No strategy is newly qualified, no funds were moved and no successful-trade recording exists. The original day-001 process continues with its failed observation preserved; the new engineering test is a separate dataset and cannot replace that gap.
