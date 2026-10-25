# Bots history repair — September 19, 2026

## Confirmed failure

The production indexer omitted the completed hourly buckets ending September 15
at 17:00, 19:00, 21:00 and 22:00 UTC. Combined with the previous September 14
bundle, XOR/VAL and XOR/DAI had 2,156 of the requested 2,160 observations. The AI
flow correctly refused incomplete history, but real archive observations existed
for all four hours. The chain slowed during this period; it did not halt for
these complete hours.

## Changes

- Refreshed the bundled dataset to 4,851 actual observations through September 19
  at 03:00 UTC. Both pairs now have complete recent 90-day history.
- Added a bounded read-only archive repair for at most 24 missing hours in the
  shared historical loader. Each observation requires finalized adjacent-block
  timestamp proofs, exact pool reserves, asset metadata and matching denomination.
  Existing closes are preserved; unavailable or halted hours remain missing.
- Bounded repair to 30 seconds and JSON-RPC batches of at most 32 calls. It uses
  the approved archive without changing the connected wallet or RPC selection.
- Fixed the extractor's slow-chain search: after four block-height estimates it
  switches to binary search, retaining exact block-boundary proofs.
- Updated the BotsPage test fixture to mock the separate AI history loader added
  by the concurrent deployment task.

No history completeness, denomination, fee, signing or authorization check was
weakened. No model request or live trade was made for this verification.

## Verification

- Live repair recovered the four exact XOR/VAL observations in 9,296 ms, using
  49 bounded HTTP batch requests. Evidence is in
  `output/bots-history-fix/archive-repair-live.json`.
- Focused archive, loader, real-data and extractor suites: 72 tests passed.
- The complete application unit run passed 878 suites / 5,907 tests and found
  two fixture failures while concurrent changes landed. Both were corrected;
  their complete suites then passed all 50 tests. Full unit-script project:
  25 suites / 299 tests passed. Logs are in
  `/tmp/polkaswap-bots-history-{unit,recheck,scripts}.log`.
- Translation checks: 13 tests passed. Targeted ESLint passed.
- Static production build passed in 20.75 seconds, in the isolated output
  directory `output/bots-history-fix/dist`.
- Chrome ran that production build against real public data: XOR/VAL,
  June 21–September 19, 2,160 hourly observations, 100.00% coverage, study state
  Complete, no alert and zero console errors. The full-period verification used
  no held-out validation; the engine and partition checks remain covered by unit
  tests. The study submitted no trades and connected no wallet.
- Real bundled-data integration verifies that AI setup passes its strict history
  check and supplies only training observations to a mocked assistant boundary.

## Deployment ownership

The concurrent task **Assess Jev AI trading integration** owns the combined
frontend/indexer deployment and received these tested changes. This task did not
publish an IPFS root or change the production CDN. Production verification belongs
to that deployment and must not be inferred from the local build evidence above.
