# Bots visibility and XOR/DAI simulation correction — 15 September 2026

## Changes

Bots now uses permanent sections for the strategy library, rule controls, trading and test settings, AI composer, result explanations, chart diagnostics, evidence, saved research and live-review limits. Selecting another strategy does not collapse the library. All twelve strategies remain visible. Ordinary workspace navigation and token selection remain interactive.

The XOR/DAI failure was reproduced on the production page with 100 XOR, 90 days and the default moving-average strategy. History requests returned 200. The selected RPC returned finalized block 27,658,983 with timestamp **2026-09-15 13:15:54 UTC**, about 80 minutes before the request. The historical fee loader rejected this observation before requesting a quote, producing the misleading “Experiment unavailable / Trading is paused” message. The MOF endpoint independently returned the same finalized block while responding normally to RPC health checks.

Historical simulations now explicitly request dated finalized fee assumptions. They retain the exact block hash, denomination and observed forward/reverse route and network fees. Each result displays the finalized timestamp and explains delayed finalization when present. No replacement prices or invented fees are used.

Fee loading remains strict by default. Live-review promotion continues to call that strict path and rejects a finalized state older than five minutes. The historical option does not persist across calls. Invalid/future timestamps, expired retrievals, changed chain/runtime identity, mismatched amounts and denomination failures are still rejected. No wallet connection, signature or on-chain transaction forms part of acceptance testing.

## Verification

- 1,067 Bots unit tests passed across 56 suites, including strict versus historical fee policies and preserved timestamp provenance.
- 13 translation checks passed; seven fee messages updated consistently across 31 catalogs.
- Focused ESLint passed. Production build passed.
- Eight browser layouts passed: Chromium/WebKit, desktop/mobile, light/dark; zero console/page errors or horizontal overflow. Four focused browser regressions passed.
- XOR/DAI completes against unmocked production history in both Chromium and WebKit: the observed 100 XOR run ended at 95.8683 XOR (−4.13%) after modeled costs. This is a historical simulation, not an execution result or profitability claim. The reduced-motion runs completed in about eight seconds; ordinary animation runs also completed.
- Strict live review rejected delayed finality before any wallet dialog, bot creation, or submitted extrinsic.
- Browser and deployment evidence is recorded under `output/bots-expanded/`.

## Production deployment

Production CID: `Qmd5dcv7PWJ2LnAmXVsS8Sh3nAnJbc5gaK3NRJxYHUNtG8`

Production CIDv1: `bafybeig3azocbpcvvcnqbinhdqdvag44duf2evfyuc6qo2wgcskipotj2e`

Testnet CID: `QmdoFxxbZXffC5rSq1maG4VE7YhLG6B3rMZ2vQf9NMnzq9`

Both release DAGs were imported into the dedicated MOF origin and recursively pinned; retained pin integrity passed. Root, entry JavaScript/CSS, Swap and Bots chunks matched the exact build with HTTP 200 and no redirects. Bunny saved the new MOF origin, retained the required host/header/CSP settings, and confirmed the full Polkaswap cache purge. The public root serves the new CID with `Cache-Control: no-cache`; 138 assets were warmed and byte-verified sequentially.

Final public verification passed in Chromium and WebKit: all twelve strategies are visible, no disclosures remain, and XOR/DAI completes with numeric results and dated fees. Both browsers recorded zero page/console errors, failed requests, or submitted extrinsics. The official WebKit Swap check passed; a separate final check reached `Swap - Polkaswap`, confirmed the new CID and connected node, and recorded zero request or console errors.
