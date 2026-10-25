# Strategy Lab release — September 14, 2026

Status: the final motion, UX, and Codex integration is implemented, tested, built, published to IPFS, recursively pinned on MOF, and serving from the new production Bunny origin. The full cache purge succeeded. Production static-file, WebKit, XOR/KUSD, and rendered-motion verification all pass.

## Implemented behavior

The scientific strategy workspace preserves Polkaswap Light/Noir theme tokens and neumorphic controls. Users choose input/output tokens, compare parallel strategies and parameter sets, save or duplicate experiments, and promote a tested strategy to an idle paper bot. Provider-discovered model selectors and memory-only API connections support reviewed deterministic strategy generation. No wallet signature or paid provider request was made during verification.

All whitelisted tokens whose XOR pool contains strictly more than one XOR and a positive target reserve qualify. Actual partial market history is accepted when its denomination is verified. XOR/KUSD completed all three strategies with 22 real hourly observations and 21 evaluated candidates at the earlier live verification. The implementation does not fabricate sub-hour history. New execution settings support one finalized block (about six seconds); saved legacy durations retain their meaning.

During calculation, bounded real batches traverse the strategy gates into the distribution over 140 ms. The evaluator awaits the renderer's actual completion before sending another batch. Prior observations remain settled. Hidden, cancelled, unmounted, reduced-motion, and failed-renderer paths release the barrier safely; completed research does not automatically replay.

## Test evidence

- Final combined repository suite: 875 files, 5,420 tests passed (5,147 unit tests and 273 script tests). Evidence: `output/bot-lab/final-combined-unit.log`. The prior corrected release also passed all 5,345 tests.
- Final particle component regressions: 30 tests passed, including GPU loss, visible landing before next-frame acknowledgement, hidden-view release, and stale frame protection; ESLint passed. Geometry regressions also passed.
- Presentation barrier and runner tests: 8 passed. Evidence: `output/bot-lab/motion-presentation-tests.log`.
- Lab/card/playground presentation wiring: 50 tests passed. Evidence: `output/bot-lab/motion-wiring-tests.log`.
- Immutable-build Chromium Light and WebKit Noir each proved changed rendered screenshot pixels for all three distinct active study IDs within unchanged checkpoints. Each batch completed, final graph pixels remained identical after 350 ms, and both browsers reported zero page/console errors. Local evidence is preserved under `output/bot-lab/motion-local-verification/`. The same pixel-motion probe now also passes against production: Chromium Light with Canvas2D and WebKit Noir with WebGL2 each verified all three active runs, frozen completion, and zero errors. Production evidence: `output/bot-lab/motion-browser-verification.json`, `motion-browser.log`, and per-run before/after/frozen PNGs. Final small mobile-caption and handoff changes are verified separately by the UX task.
- Final combined translation gate: 4 files / 13 tests passed, including key parity, interpolation, special-locale constraints, and English fallback limits. All scoped UX/Codex entries were translated with finance terminology and runtime-token audits. Evidence: `output/bot-lab/final-combined-translation.log`, `final-i18n-europe.json`, and `final-asia-scope-audit.json`.
- Final focused Bots suite: 40 files / 592 tests passed; the last StrategyLab batch-counter regression passed all 18 tests. Mobile layout and exact one-block paper-bot handoff were verified with zero browser errors/warnings. Evidence: `output/bot-lab/final-combined-focused.log` and `bots-ux-validation.json`. Earlier browser tests also exercised real worker/IndexedDB integration in both engines.
- The repository-wide type check is not a passing gate: it reports unresolved SDK declarations and existing test/type errors. Static builds, the complete unit suite, and focused browser checks are the recorded release gates; the type-check limitation is not represented as a clean result.

The combined full suite includes the UX/Codex integration. Final small comparison and handoff regressions are covered by focused tests before release.

## Previous checkpoint release

- Production CID: `QmSzi9gZttF69UxKdjP65ryTbk8YbdpydvbRCt1MmNp59y`
- Production CIDv1: `bafybeicff22yyiwob6flx7z4xga6uuqlm7hotj5tsm5n6kvweck3r2g3ya`
- Origin: `https://mof.sora.org/ipfs/bafybeicff22yyiwob6flx7z4xga6uuqlm7hotj5tsm5n6kvweck3r2g3ya`
- Host header: `mof.sora.org`
- Testnet CID: `QmS1VmboJWPR2RFQKtUpp8vFrWL3gx7fWwMTS6bNPJPRM7`
- Testnet CIDv1: `bafybeibwq2nkpa3g2bk4a7kceaayll56uo5wpihvterxsuycjun5eflyny`

The build completed in 59.46 seconds. Both production and testnet DAGs were exported and imported with `--pin-roots` on the dedicated MOF origin. Recursive pin listings and retained-pin integrity verification passed. Origin HTML, entry JS/CSS, Swap and Bots chunks returned HTTP 200 with no redirects and matched the exact built bytes.

Bunny saved the production origin and host. The persisted sidebar and an independent stable-root response established the save; a success toast was not captured. The full `polkaswap` cache purge completed. TLS verification and redirect following remain enabled, host forwarding and error caching disabled, and Smart Cache enabled. Both `RawDwebOriginHeaders` and `SetPolkaswapCSP` remain present, with the application CSP verified on the live response.

All 88 required assets were warmed sequentially through the stable hostname and matched the build. Official WebKit Swap passed with zero failed requests and zero console errors. Independent WebKit checks reached `Swap - Polkaswap` and Light/Noir `Bots - Polkaswap` on the production CID, each with zero failed requests and zero console errors. Both Bots runs completed all three actual XOR/KUSD studies with one-block settings and frozen final results. Evidence: `output/bot-lab/deploy/checkpoint-release/`.

This preceding release contained real computation checkpoints. It has been superseded by the final particle traversal release below.


## Final motion production release

- Production CID: `QmdB8P6VvXkAF6ZTHAtyw9YZ8rxuABuC7DFUikf2NQaKnm`
- Production CIDv1: `bafybeig4n3eo4zzzhutrakstoujsyeo2smbgxwfbjl2as6dmijopuypo3y`
- Production origin: `https://mof.sora.org/ipfs/bafybeig4n3eo4zzzhutrakstoujsyeo2smbgxwfbjl2as6dmijopuypo3y`
- Host header: `mof.sora.org`
- Testnet CID: `QmUDsbWj4oyanN54AEvgLXtsBhME3kFCjfHXvCjR91pq4t`
- Testnet CIDv1: `bafybeicxngqgfkf5rwhbbty2ojfytzbqoocfxtkigj6orwomregx4hhf7e`

The exact `ipfs:publish` pipeline completed with a 21.70-second build. Both DAGs were transferred to MOF via CAR import with `--pin-roots`. Both roots are recursively pinned, and retained-pin integrity verification passed. The candidate root, entry JavaScript/CSS, Swap and Bots chunks returned HTTP 200 without redirects and matched the exact build bytes. Evidence: `output/bot-lab/deploy/publish.log`, `release.json`, `import-summary.log`, `remote-pins.log`, and `origin-static.log`.

The native Bunny origin was saved with the production CID above and host header `mof.sora.org`. The persisted sidebar confirmed the saved origin; a save toast was not captured. The full cache purge was explicitly confirmed by the native toast “Pull Zone was successfully purged.” The stable root returned HTTP 200 and `x-ipfs-roots: bafybeig4n3eo4zzzhutrakstoujsyeo2smbgxwfbjl2as6dmijopuypo3y`. TLS verification and redirect following remain enabled; host forwarding and error caching remain disabled. Both required edge rules are present, and the full application CSP is verified on the live response. Evidence: `output/bot-lab/deploy/final-root.headers`.

All 88 required candidate entry/Swap/Bots/worker files returned HTTP 200 with exact build bytes (`origin-warm.log`, `origin-warm-assets.json`). The exact published build is retained at `output/bot-lab/deploy/motion-release-dist`; `release.json.distPath` directs static checks to that immutable snapshot. Sequential stable warming passed for all 88 exact-byte assets (`stable-warm.log`, `warm-assets.json`). Official WebKit Swap passed with zero failed requests and zero console errors (`resume-official-webkit-swap.log`). The production pixel-motion probe passed in both engines. Independent WebKit verification reached `Swap - Polkaswap` and the actual Connect account UI, then `Bots - Polkaswap` in Light and Noir. Each Bots context completed three initial studies and three distinct new XOR/KUSD studies, retained one-block execution settings, loaded real research workers, and froze the final graph pixels. All three contexts reported zero console errors and zero failed requests on the exact production CID. Evidence: `resume-production-browser.log`, `production-verification.json`, and the production screenshots.

A final fresh WebKit Swap check also passed after the full studies and motion probes: exact title `Swap - Polkaswap`, visible Connect account, expected production CID, zero failed requests, and zero console errors (`resume-final-title-check.log`). Deployment is complete.
