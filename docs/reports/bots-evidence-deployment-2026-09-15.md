# Bots evidence deployment — 2026-09-15

## Release

- Production CID: `Qmcp5CM3YLf8r2Us4qeUzcPKyd66AQgDo8RTjLWP2W9HjW`
- Production CIDv1: `bafybeigxbh6htkrrwpsidtdqsihpxyzl756vsqol27hidcyu2ruxrwbgse`
- Testnet CID: `QmZK6wdRhcQG7GF6N5Au6sDnYL5CKvobBsBaLS4kjo54gg`
- Testnet CIDv1: `bafybeifdbmhhk3z3nwl3xjzwotg2nbw25nah2zetbkd6cupo3i7w6cgfne`
- Production origin: `https://mof.sora.org/ipfs/bafybeigxbh6htkrrwpsidtdqsihpxyzl756vsqol27hidcyu2ruxrwbgse`
- Host header: `mof.sora.org`
- Previous production CIDv1: `bafybeian6suqn6qjs5nfrgy3ln7zq7f7hj6y6jmuoqwywue2uzigpjsczq`

The release includes shareable bots routes, count-based profit/loss distributions, chronological validation with cost-adjusted passive comparisons, and the final animated strategy lessons. Account & tools appears above Earn & borrow. See [the implementation and methodology](../bots-refresh.md) and [Strategy Lab usage](../bot-strategy-lab.md).

## Publishing and CDN

`yarn ipfs:publish` built the static release in 31.16 seconds. Both release DAGs were exported from the local node and imported with root pinning into the approved MOF repository. Both recursive root checks passed; all 30 retained recursive pins passed integrity verification. Earlier release pins were preserved.

Before the origin switch, the production HTML, entry JavaScript, CSS, swap chunk, and bots chunk returned HTTP 200 without redirects and matched the local build byte for byte.

Bunny zone `5860217` (`polkaswap`) was updated through its authenticated control panel. Forward host header remains off; follow redirects and origin certificate verification remain on. Smart Cache remains on and cache error responses off. The `RawDwebOriginHeaders` and `SetPolkaswapCSP` rules were checked in the control panel; the stable root serves the required CSP.

The new origin is saved. The full pull-zone purge was confirmed in the authenticated UI and its dialog closed. The next public root request returned the new production CID and exactly matched the built HTML. Sequential warming verified 88 public root/assets returned HTTP 200 and matched the built bytes. The official WebKit swap check passed with zero console errors and zero failed requests; real swap UI and a connected node were present. A final fresh-document WebKit check verified the new CID and the exact title **Swap - Polkaswap**.

## Local verification

The final integrated bot suite passed **676 tests across 47 files**. Translation consistency passed **13 tests across four files**; targeted ESLint and Prettier checks passed. New motion copy covers 23 keys, with 621 machine translations across 27 supported locales, intact runtime placeholders, and no unresolved provider errors. Pijin retains English fallback; ancient-script catalogs reuse existing vocabulary and notation.

Browser checks at 1440 and 390 pixels passed in both themes, with zero overflow and zero console or page errors. The mobile strategy choices remain three columns and the chart stays 170 pixels tall. One restored experiment uses the full available result width; compact histogram explanations open under Details.

Meaningful DCA, threshold, and SMA events were checked along with finite playback, exact pause frames, replay, reduced motion, offscreen suspension, and unchanged-settings updates. The validation walkthrough was tested with an explicitly labeled disposable fixture evaluated by the actual engine: recorded dates and results stay unchanged. Dark profit/loss text meets 4.5:1 contrast against the application background. Focused permanent layout e2e checks passed twice, once in each theme.

Production browser evidence is recorded in `output/bots-evidence/deploy-motion/`; local visual evidence is in `output/bots-evidence/design/`.

## Final production verification

The complete live Bots verification passed: **4,755 historical candidates**, **9 simulated fills**, **WebGL2**, and **three completed walk-forward folds** with reported 100% history coverage. Histogram bin totals, selected/excluded accounting, ledger counts, sign colors, and a shared count scale were verified. The validation walkthrough preserved its observed result through pause, resume, and finite completion. The strategy lesson completed its four scheduled events, paused exactly, resumed, and stayed finished without restarting.

All three Bots deep links retained their pages after reload; browser back/forward navigation passed. The production sidebar places Account & tools before Earn & borrow. The final title was **Swap - Polkaswap**. The verifier recorded **zero console/page errors and zero failed same-origin requests**. The separate official WebKit swap check recorded zero failed requests across its capture. The user's open live lab tab was refreshed and the new layout appeared with saved studies retained.

The first verifier attempt reached all Bots checks successfully but incorrectly required a document response from a hash-only final navigation. That test-only assumption was corrected; its evidence was retained, and the complete verifier passed on rerun. No application rebuild or additional origin switch was needed.
