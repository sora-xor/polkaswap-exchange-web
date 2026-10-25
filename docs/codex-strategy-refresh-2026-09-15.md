# Codex strategy refresh — 2026-09-15

The Bots strategy assistant now prepares the current strategy and public market data in the user's existing browser tab. The verified update is live on Polkaswap. Both production and testnet roots are pinned on the dedicated origin, and the production Bunny cache was purged.

## Changes

- **Prepare Codex task → Open Codex / Copy instructions → Review strategy** keeps the existing Polkaswap tab and browser profile. The desktop link carries a prompt only, with no `browserUrl` or account transfer.
- Optional website tools can return a draft directly. Ordinary browsers can paste `{ "requestId": "…", "strategy": { … } }` into the same page for validation and editable review. Adding an experiment and authorizing live trading remain explicit actions.
- Both paths share the current tokens, virtual amount controls, slippage, cadence, SMA windows/timing, relative threshold percentage, and selected recipe/custom rules. Context includes all **nine recipes**, ten condition definitions, and up to **202 verified hourly closes** from a nine-day lookup. It excludes connected-wallet identity, actual balances, signing material and provider credentials.
- Requests expire after five minutes. Form revisions and context generations reject outdated or interleaved direct/portable responses; successful submission consumes the pending context. Focus, visibility, retry and capability polling detect newly available website tools without reloading the connected tab.
- Combined rules retain their names and entry/exit editor. On mobile, numeric threshold fields span the available width so values and signs stay readable.

See [Codex workflow](codex-strategies.md) and [composer semantics](strategy-composer.md).

## Validation

| Check                                              | Result / evidence                                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Final focused Codex units                          | **96 passed** across five suites; [log](../output/codex-refresh/unit-final.log)                                                                              |
| RuleBuilder units after mobile correction          | **16 passed**; [log](../output/codex-refresh/mobile-unit.log)                                                                                                |
| Chromium and WebKit fixture E2E                    | **12 passed**; [log](../output/codex-refresh/e2e-final.log)                                                                                                  |
| Mobile numeric-width follow-up                     | **2 passed** across both engines; [log](../output/codex-refresh/e2e-mobile.log)                                                                              |
| Translation checks                                 | **13 passed**, as recorded by the coordinated locale validation task                                                                                         |
| Broader Bots regression                            | **1,043 passed** in the independent validation task before the final small fixes; this overlaps focused coverage and is not an additional final-source total |
| Final built application with actual public history | **2/2 passed** at port 5416: Chromium desktop/light and WebKit mobile/dark; [verification](../output/codex-refresh/built-mobile-final/verification.json)     |

The final built checks prepared 202 real observations, preserved the selected spring rules and exact review amount, rejected a mismatched request, retained the original tab, and verified numeric field readability. Both recorded no console errors, failed requests or HTTP errors. No experiment was added.

## Deployment

- Production CIDv1: `bafybeihke2upwqcy6i5wk2obx2nratf7gxyhurwvs37ctjoujmf74z2zsy`.
- Testnet CIDv1: `bafybeid2kf5qqw2nu5gdtxzoexyfwlrkt4nj6o35o4hngpn43uy5w5adg4`.
- Both DAGs were imported to the dedicated MOF origin and recursively pinned. Integrity verification reported **58 retained roots OK**; [release](../output/codex-refresh/deploy/release.json), [pin evidence](../output/codex-refresh/deploy/remote-pins.log).
- The origin and live hostname each returned **200 for five checked responses: the root and four assets** (entry JavaScript, CSS, SwapPage and BotsPage). Bytes and hashes matched the build, with the new root in `x-ipfs-roots`; [origin evidence](../output/codex-refresh/deploy/origin-assets.json), [live evidence](../output/codex-refresh/deploy/live-assets.json).
- Bunny's production origin was saved to this MOF CID and its cache purged, with the UI success toast observed by the release task.
- Sequentially warmed **138** entry, bootstrap, swap and Bots assets with exact build bytes.
- Final live Codex acceptance passed **2/2** in Chromium desktop/light and WebKit mobile/dark against this exact CID, with zero console, page, request or HTTP errors. The mobile −8 threshold measured 262 px wide; [live verification](../output/codex-refresh/live/verification.json).
- The official WebKit command exited successfully with zero failed requests and console errors, but its snapshot contained only the bootstrap loader. The separate required final check confirmed **Swap - Polkaswap**, visible swap UI, **Node connected**, the exact final CID and zero errors; [final title evidence](../output/codex-refresh/deploy/final-title.json), [deployment summary](../output/codex-refresh/deploy/deployment-summary.json).

## Limits

These checks exercised preparation, public context, schema validation and review. They did not create a real Codex task, invoke an external AI model, connect a wallet, sign or trade. Prompt-only link handling was checked against the installed desktop parser; end-to-end account/inference behavior remains untested.

Translation tests establish catalogue consistency and required script constraints. Ancient-locale adapter output and specialist terminology in Dhivehi (`dv`) and Dzongkha (`dz`) still have fluent-review uncertainty.
