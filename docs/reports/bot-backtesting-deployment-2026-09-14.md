# Bot backtesting production deployment — 2026-09-14

The reviewed working-tree build was published to the Polkaswap production site on 2026-09-14. This receipt preserves the initial Canvas release and the completed WebGL follow-up release recorded below.

- Production CID: `QmSuyWt3g7UfYqpjFCKe5vVZ9wYWNBzkVLNEuowbFkCfjb`
- Production CIDv1: `bafybeicd7aw44tsybkxcipebma4ztjwsf5mihtrupnp6uoiuj7fhpwakuy`
- Testnet CID: `QmSFffLudrSi7xuUdTZpEMQohnrKCLFDU5bUQ95sFB8d4Z`
- Testnet CIDv1: `bafybeib2e7v2mxfhf3l7ybbl3gxpnvusfbgsxhjqybz4jpjftxqzblj62y`
- Bunny origin: `https://mof.sora.org/ipfs/bafybeicd7aw44tsybkxcipebma4ztjwsf5mihtrupnp6uoiuj7fhpwakuy`
- Host header: `mof.sora.org`; zone `polkaswap`, ID `5860217`.

`yarn ipfs:publish` succeeded. Both DAGs were streamed to MOF using CAR export/import with root pinning. Both recursive root pins and all 16 retained release pins passed integrity checks. No old pins were removed.

Before the origin switch, production HTML, entry JavaScript/CSS, BotsPage JavaScript and the real-history archive returned HTTP 200 with no redirects and exact local SHA-256 hashes. Testnet HTML and archive matched too. Archive SHA-256: `f58ba3fd2f74d231e723d1bb26a6f7ec2e018a380038b0aea4da072b291fac79` (9,070,774 bytes).

Bunny displayed “Origin settings successfully updated” for the new production root. The full pull-zone purge was confirmed through the authenticated Bunny UI. Forward host header remained off; follow redirects, SSL verification and Smart Cache remained on; error-response caching remained off. `RawDwebOriginHeaders` and `SetPolkaswapCSP` were present with the required stable-host conditions. Live responses contain the expected complete CSP.

The stable root and `/index.html` returned the new IPFS root and `Cache-Control: no-cache`. The entry assets and 89 entry/Swap dependency paths were warmed sequentially; every response returned 200 and exact build bytes.

Validation:

- Official WebKit Swap checker: passed, zero failed requests and console errors.
- Independent unfiltered WebKit capture at 12:33:02 UTC: title `Swap - Polkaswap`, real swap UI, expected CIDv1 root, zero console errors, page errors, failed requests or HTTP errors.
- Two production WebKit bot tests: passed. All 4,739 real candidates, complete ledger, animated accounting and rewind, three-fold training, idle paper bot creation and reload persistence were checked.
- Live fee block 27,647,830: buy and sell network fee `0.100020612589707326 XOR`, XOR/VAL buy swap fee `0.600000000000000000%`, sell `0.600000000000000013%`. The non-XOR VAL/PSWAP path also passed with two-hop swap fees approximately `1.1964%` and 100% historical coverage.
- No wallet signing or real trades were used in browser validation. Saved test bots existed only in disposable browser contexts.

Evidence is under `output/playwright/production-bots/`, including `production-swap-webkit.json`, screenshots, fee observations, MOF pin/hash receipts and sequential asset verification. The full implementation validation is recorded in [bot-backtesting-validation.md](bot-backtesting-validation.md).

## Follow-up readiness correction awaiting the next release

A fresh production WebKit load intermittently displayed “The action could not be completed. Trading has been paused.” while the real-history backtest was healthy. Read-only polling of the public agent status API reproduced the exact cause: the SORA connection attaches its `ApiPromise` before metadata initialization completes, and a status read of the genesis/runtime getters then throws `Api interfaces needs to be initialized before using, wait for 'isReady'`. The initial error remained visible until the next successful user action. No trade session was active in these disposable contexts.

The working-tree correction makes status report an unready node with empty identity during the handshake, then recover to the real chain identity. Strict identity reads for fee and transaction planning remain fail-closed. Only the expected Polkadot initialization exception is tolerated by status; unrelated failures remain errors. The focused agent service suite passes 91 tests, including readiness recovery, disconnected getter avoidance, and refusal to quote against an uninitialized identity. This correction is not part of the initial CID above and must be verified under the next published root.

Independent native WebKit playback on the initial release also confirmed that the first ball lands after approximately 34 seconds in the 90-second replay. With that actual timing allowed, playback advanced from 0 to 932 landed candidates and selected profit from 0 to +204.46 XOR, with zero raw console errors, failed requests or HTTP errors. An earlier 30-second first-landing timeout was a verification timing error. Details are in `output/playwright/production-bots/raw-browser-evidence.json` and `status-diagnostic.json`.


## Completed WebGL follow-up release

The WebGL renderer and startup readiness correction were deployed to `https://polkaswap.io/#/bots` on 2026-09-14. This release supersedes the Canvas-only root above.

- Production CID: `QmTuAVBeATMcgo7TFMfSMKM8ATYg9P6zm7veD3RweAvGs3`
- Production CIDv1: `bafybeicst2yjbwq7fiafleztozggntsl2i37tmwk4cxzgkmfu63phpit5i`
- Testnet CID: `Qmdu2use8CWzfXLNu1q8NYJ6R8qyA2jPEtss9MCfsXUzZ8`
- Testnet CIDv1: `bafybeihhfl7ke7cllsmhizwjdhdgq3wytnpx32u4hzujs6bjvtmxhfbeum`
- Bunny origin: `https://mof.sora.org/ipfs/bafybeicst2yjbwq7fiafleztozggntsl2i37tmwk4cxzgkmfu63phpit5i`
- Host header remains `mof.sora.org`; zone `5860217`.

The publisher completed successfully. Both new DAGs were imported and recursively pinned on MOF, and all **18 retained pins** passed integrity verification. Before switching Bunny, production HTML, entry JS/CSS, BotsPage JS and the real history archive returned 200, no redirects and exact current build hashes. Testnet HTML and history matched too. The history archive is unchanged from the verified real March dataset.

The Bunny origin save showed its success notification. The full cache purge showed **“Pull Zone was successfully purged.”** The root and `/index.html` then served the new CID with `Cache-Control: no-cache`. All 91 warmed entry, Swap and Bots dependency paths returned 200 with exact build bytes. The final root check confirms the expected complete application CSP and new root.

Predeployment checks passed: **5,238 unit tests** (4,965 application tests across 835 files and 273 script tests across 24 files), **13 translation tests**, four real-network browser cases for automatic GPU selection and forced fallback, and focused lint/format checks. No new translation strings or dependencies were added.

Final production checks passed:

- Official WebKit Swap checker: zero console errors and failed requests.
- Independent unfiltered WebKit Swap capture at 12:53:54 UTC: `Swap - Polkaswap`, actual swap UI, correct new IPFS root, zero console errors, page errors, failed requests and HTTP errors.
- Six live bot browser cases passed in 2.5 minutes: complete March history and all 4,739 candidates, real directional fees including VAL/PSWAP, training/cross-validation, paper bot creation and persistence, Chromium automatic/forced Canvas fallback, actual WebKit WebGL2 rendering and forced Canvas fallback.
- GPU context loss preserved the exact replay position, profit metrics and fee totals. Playback advanced normally; keyboard navigation reached the final candidate. Startup checks showed no stale paused-trading banner.
- Production WebKit frame intervals over 120 frames: GPU median 19 ms / p95 25 ms; Canvas median 19 ms / p95 23 ms. These observations do not establish a universal frame-rate improvement; the implementation reduces particle rendering to one GPU draw submission and retains the safe fallback. Local measurements and visual comparisons are in [the WebGL validation report](bot-backtesting-webgl-validation-2026-09-14.md).

Final evidence is retained in `output/playwright/production-webgl/`: release identifiers and gate results, MOF pin/hash receipts, sequential live asset verification, final root headers/HTML, WebKit Swap capture, bot fee observations, and GPU/fallback screenshots. The initial release receipts remain under `output/playwright/production-bots/`.
