# Bots: price-grid repair and sparse strategy research

Date: 20 September 2026. This work preserves the 10 KUSD maximum input,
partial allocations, separate 1 XOR fee reserve, 5% peak-loss limit, 5% target
and 24-hour goal. No funds moved and no strategy qualified from this research.

## Concrete findings and changes

At finalized block 27,710,487, the DAI/XOR book had a **10 XOR per DAI price
step**, whereas a same-state quote for its 1 DAI minimum lot returned
**0.190378655129951414 XOR**. A competitive positive price near that reference
cannot be expressed on the book's grid. Both DAI/XOR and DAI/KUSD also lacked
resting depth in the fixed screens. These are distinct obstructions.

The inspected runtime denomination hook scales orders and price indexes but
omits the book's tick. A tested patch is prepared in the isolated checkout
`/Users/takemiyamakoto/dev/sora2-orderbook-xor-tick-scaling`, branch
`codex/orderbook-xor-tick-scaling`, based on
`282f4679b02e00b4e6ece254d2b4cf9b7249a134`:

- Normalize the tick alongside order prices, including empty XOR-quoted books.
- Reject zero, inexact and unrepresentable scaling before any order-book writes.
- Validate the scaled tick against the unchanged lot step's quote precision.
- Remove old bid/ask keys before inserting replacements; overlapping old/new
  ranges previously allowed a later removal to delete a migrated level.
- Preserve base volumes, lot limits and non-XOR books.

Committed locally as `dbaf4cf9ac9c08acf64b60ed4d5fe9c68a02ae82`.
Both the patch worktree and original runtime checkout are clean. The repository's
pre-commit `cargo fmt -- --check` passed.
[Portable patch](../../output/go-history/research-20260920/orderbook-xor-tick-scaling.patch),
[verification and source hashes](../../output/go-history/research-20260920/orderbook-xor-tick-scaling-verification.json).

Two independent source-review findings were addressed: minimum quote precision
and an overlap regression fixture that must exercise adverse hashed-key order.
All seven focused regression cases pass. Test execution, including the two
test-setup failures before the corrected successful run, is recorded below.

This establishes a source defect and current configuration obstruction. It does
not attest that the exact local source was deployed, nor establish the sole
historical cause of the live tick. The hook fix affects future denomination;
it does not automatically repair an existing book on upgrade.

## Better strategy direction

The most useful alternative identified is a **staged partial maker route**:
bid for DAI using part of the KUSD allocation, then consider an XOR-quoted ask
using only actually filled DAI. Successfully resting orders can have lower
charges than swaps, but pre-dispatch checks must reserve the full fee. Crossing
or failed placements can incur that full fee. The second leg needs independent
loss-limit admission, actual inventory, executable valuation and remaining time.

Neither empty books nor a displayed spread supplies fill evidence. Prospective
testing must account for queue position, adverse selection, partial fills,
failed/crossing placements, cancellation, unsold DAI and final liquidation costs.
Recent passive-execution research explicitly models non-execution and market
impact; adverse-selection simulation research shows why independent price/fill
models can overstate returns. Neither paper establishes profit on SORA.
[Optimal Execution with Passive Market Impact, July 2026](https://arxiv.org/abs/2607.28323),
[Market Simulation under Adverse Selection, June 2026 revision](https://arxiv.org/abs/2409.12721).

Small liquidity provision is lower priority: the inspected withdrawal fee alone
is approximately 1 XOR before encoded-length charges, with entry, withdrawal,
reward conversion and inventory risks still to account for. It does not solve
this allocation's fee-reserve constraint.

## Qualification correction implemented; deployment tracked separately

Production replay currently applies a five-trade minimum and evaluates history
partitions longer than the user's 24-hour live goal. Replay does not receive the
same goal stops. This can exclude sparse policies for the wrong reason and
measure a different exposure window.

The implemented replacement uses fixed 24-hour funding episodes with live-equivalent
goal admission, target/loss latches, expiry, ongoing exposed-inventory valuation
and declared charged attempts. The fill minimum, fee preflight, cadence and AI
constraints must change together. Previously rejected candidates do not become
qualified simply because this mismatch is repaired. The frozen ongoing
observation experiment and its source files were preserved. See the
[episode protocol](../bots-goal-episodes.md) for the implemented rules, limitations
and regression coverage. This report does not establish deployment or a profitable candidate.

## Existing-book repair

The prepared operator review uses the normal governance-controlled book update
path. Local runtime authority is strictly more than half of the technical
committee or Root. A **0.0001 XOR tick** is a concrete representability example
for review, with the 1/1/1000 DAI lot settings unchanged; it is not an approved
market policy or trading price.

Before a change, reconcile all orders, price/owner indexes, expiration and
alignment state, technical-account liabilities and native denomination units.
Then use the source-supported status/update/status sequence, verifying each
finalized result. Repairing the grid does not supply counterparties or qualify GO.
No administrative transaction or governance proposal was submitted.

## Verification record

- Native build completed, but the first seven tests failed in their shared
  chain fixture before assertions because `SKIP_WASM_BUILD` omitted the required
  runtime blob. Retained log: `orderbook-tick-runtime-tests.log`.
- Enabling `framenode-chain-spec/runtime-wasm` exposed a workspace-discovery
  issue when sharing the warm target directory: the generated Wasm manifest
  mixed the original checkout's dependency patches with the new worktree.
  Retained log: `orderbook-tick-runtime-wasm-tests.log`.
- The corrected command explicitly sets `WASM_BUILD_WORKSPACE_HINT` to the new
  worktree. It built the embedded runtime and passed **7 tests, 0 failures**
  (199 unrelated tests filtered out). Compilation took 3m 14s; the test cases
  took 0.06s. Retained log:
  `orderbook-tick-runtime-wasm-workspace-tests.log`.
- The original runtime checkout remained clean; the ongoing collector's frozen
  sources, manifest, protocol and retained journal prefix passed verification.

Successful command, from the isolated runtime checkout:

```sh
WASM_BUILD_WORKSPACE_HINT=/Users/takemiyamakoto/dev/sora2-orderbook-xor-tick-scaling \
CARGO_TARGET_DIR=/Users/takemiyamakoto/dev/sora2-network/target \
sh scripts/with_llvm_env.sh cargo test --locked -p order-book \
  --features private-net,framenode-chain-spec/runtime-wasm \
  --lib denominate_xor_quote_order_book
```

The pinned compiler was `rustc 1.88.0-nightly (e9f8103f9 2025-05-07)`.
The successful run used the existing warm target; it did not clean Cargo
artifacts or modify the original runtime checkout. These are helper-level
regression tests, not a production runtime release or full-state migration test.

All logs and detailed research are in
`output/go-history/research-20260920/`. Primary evidence:

- [Pinned configuration screen and source analysis](../../output/go-history/research-20260920/maker-book-config-remediation-20260920.md)
- [Operator review package](../../output/go-history/research-20260920/dai-xor-book-operator-review-20260920.md)
- [Maker economics and LP alternatives](../../output/go-history/research-20260920/inventory-income-options.md)
- [Sparse qualification audit](../../output/go-history/research-20260920/sparse-goal-validation-options.md)

This is local repair and research work. The existing production website remains
on its previously verified deployment. No profitable live run or successful
trade recording is claimed.
