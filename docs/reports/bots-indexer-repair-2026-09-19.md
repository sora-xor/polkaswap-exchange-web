# Bots GO and indexer repair — September 19, 2026

The compact GO form and history-reader fixes are live at `https://polkaswap.io/#/bots`.
The production indexer now publishes verified completed-hour evidence for all seven
requested assets. Price availability remains explicit; an indexed row does not
imply that its asset has a usable market price.

## Changes

- The initial form shows amount, starting token, token to maximize and one **GO**
  action. Values survive wallet setup; editing a pending request cancels its old
  values. Advanced controls and explicit trading consent remain available.
- AI research uses a complete seven-day window. A bounded, read-only archive
  fallback requires same-chain metadata, exact reserves, denomination and
  adjacent finalized-block evidence; it does not invent missing prices.
- Nullable or incomplete historical rows cannot crash price or supply charts.
  Candles require observed OHLC and volume; supply charts require observed supply,
  mint and burn. Unknown fields are skipped, while observed zeros remain valid.
  Valid finalized close evidence extends retained candle extrema to include the
  observed close when legacy extrema were rounded or predate that close. Original
  open and volume are preserved. Other indexer schemas retain their existing query.
- The indexer records completed hourly closes independently of chart refreshes,
  preserves open-hour chart observations, protects finalized closes against stale
  projections, and retains the seven assets' hourly evidence beyond eight days.

## Frontend deployment and validation

- Production CID: `bafybeicpbfmu4hlee6hfkmp4bhe6htfv6gixjmnumsvfzny2e6j4ecgdza`.
  The dedicated MOF origin passed static-file checks. Bunny saved the origin and
  purged the production zone at **04:48:08 UTC**. Live root, entry JS/CSS, Swap and
  Bots chunks returned HTTP 200 with the expected IPFS root.
- Production WebKit passed desktop Swap, desktop Bots and 320px Bots acceptance:
  visible compact form, one GO action, preserved amount/output through the wallet
  chooser, cancellation on edit, and no horizontal overflow. All three cases had
  **zero failed requests, HTTP errors, page errors and console errors**. Swap
  reached `Swap - Polkaswap`; Bots reached `Bots - Polkaswap`.
- Full frontend unit gate: **882 files / 6,027 tests passed**; script gate:
  **25 files / 299 tests passed**. Translation gate: **4 files / 13 tests passed**.
  The mocked Chromium/WebKit autopilot matrix passed all **20 cases**; its mocked
  wallet and execution checks are not evidence of live transactions.
- A subsequent desktop timing correction passed **87 focused tests** across the
  desktop mailbox, autopilot and AI parser suites, plus lint and diff checks.
  Instructions and the desktop response schema now require `signalTiming:
  "closed-hour"` for SMA and `signalTiming: null` for DCA, threshold and rules.
  Both native and portable submissions reject live-price timing. This correction is included in the verified production release.

- The final chart correction passed **41 price/supply tests** and lint. One
  bounded live-data check retained all **96 complete candles** from the latest
  100 XOR hourly rows, including **86** that the earlier strict comparison
  rejected; four close-only rows remained excluded. No observed open, close or
  volume changed. Evidence: `indexer/chart-close-acceptance.json`.

Evidence under `output/go-history/`: `deploy-chart-final/release.json`,
`deploy-chart-final/cdn-save-purge.json`, `deploy-chart-final/origin-assets.json`,
`deploy-chart-final/live-assets.json`, `deploy-chart-final/official-webkit.log`,
`deploy-chart-final/final-title.json`, `frontend-full-unit.log`,
`frontend-translation.log`, `autopilot-e2e.log`, and
`desktop-timing-regression.log`.

## Indexer activation and public evidence

Backend commit `0c6d0ccdfbaaabf56589ed9d36072b6b6924bb33` was built and tested on
the production host: **1,016 tests passed**, with 25 explicitly skipped. Activation
first applied a seven-day repair, then the complete 90-day artifact through the
service's sole database owner. Only the verified indexer service was stopped.
The second cutover created native RocksDB checkpoint
`pre-hourly-history90-20260919T043944Z` while preserving the original checkpoint
`pre-hourly-history-20260919T041248Z` and the same reviewed release. The worker
became ready after cutover, and the production GraphQL smoke check passed.

The deployed source archive SHA-256 is
`e50a9c550d45805b22dc054e19a0b7a2b275e9154f30c39ac9a2466dabddaef5`.
The complete 90-day data artifact SHA-256 is
`53f85950f6510d0e35559a84b947e0c30da5ed059d4b9f17acf59d23eca805c7`.
Every prepared segment and the assembled artifact passed the unchanged official
artifact validator. Its latest 168 observations exactly match the first deployed
seven-day artifact.

Post-cutover public verification found exactly **2,160 completed hourly rows per
asset: 15,120 observations across seven assets**, covering June 21 04:00 through
September 19 04:00 UTC. There were **zero missing buckets, duplicates or invalid
proofs**. All rows carried the observed denomination
`100000000000000000000000000000000000000`. Every public close, denomination,
source timestamp and complete `closeEvidence` object matched the prepared
artifact exactly; all seven per-asset canonical stream SHA-256 hashes matched.

| Assets | Rows per asset | Price availability |
| --- | ---: | --- |
| XOR, VAL, PSWAP, DAI, KUSD | 2,160 each | Priced under the existing valuation rules |
| LLD | 2,160 | Null close: observed pools do not meet the existing liquidity/route gate |
| LLM | 2,160 | Null close: no observed pool market |

LLD and LLM remain indexed with metadata and source evidence. Their unavailable
prices are not represented as zero or fabricated into backtestable markets.
After verification, the two checksum-pinned one-shot repair settings were removed
from the persistent environment configuration. The running process and all other
settings were preserved; prepared evidence and both checkpoints remain available.

Evidence beneath `output/go-history/indexer/`: `activation90.json`,
`activation90-checkpoint.log`, `activation90-readiness.json`,
`activation90-smoke.log`, `hourly-90days-complete.receipt.json`,
`public-history-90days.json`, `public-history-90days.log`,
`repair-settings-cleared.log`, `final-health.json`, and `host-build-test.log`. Initial activation
evidence remains in `activation.json`, `activation-checkpoint.log`, and
`public-history-7days.json`.

## Existing Chrome tab verification

At **04:18:14 UTC**, the real **10 KUSD → maximize XOR** flow in the existing
wallet-connected Chrome tab completed the same-tab assistant handshake, loaded
history, supplied **117 training candles**, accepted a threshold draft and
completed strategy research. The result was **“No strategy passed the tests.
Your funds are untouched.”** This verifies the connection and history path; it
does not establish a profitable or approved strategy.

The initial draft exposed the timing-instruction mismatch: threshold requires
`signalTiming: null`. Correcting that field left the strategy unchanged and did
not inspect the held-out data. The subsequent tested correction aligns both
instructions and schema with that validator. Evidence:
`output/go-history/chrome-research.json`.

The agent did not unlock the wallet or authorize trading; **zero transactions
were submitted** and no funds moved during this verification.

No live trade, wallet unlock, trading approval or fund movement is claimed by this
report.

Final completion receipt: `output/go-history/completion.json`. The final live
WebKit acceptance completed at **04:49:49 UTC** with the release CID
above in every root response and zero browser errors.
