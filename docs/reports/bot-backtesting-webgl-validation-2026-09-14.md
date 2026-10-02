# WebGL trade replay validation — 2026-09-14

The trade distribution uses a transparent WebGL2 particle layer when context creation passes the browser's major-performance-caveat check. The accessible Canvas2D surface retains the lattice, histogram, labels and inspection controls. A reusable instance buffer submits every ball, trail, outline and gate flash in one instanced draw; GPU pixel coordinates never enter token calculations.

Unsupported contexts, initialization/allocation/first-draw failures, and context loss return to Canvas2D on the current frame without changing playback, strategy selection or financial accounting. The context is not repeatedly retried during the same mount. Buffers, shaders, program, vertex array, event listener and context are released on disposal. Device pixel ratio remains bounded at two.

A startup readiness fix also prevents normal Polkadot API initialization from surfacing a false paused-trading error. Status reports an unready node until chain identity is readable. Quote and transaction checks retain strict identity requirements; unrelated errors continue to propagate.

## Browser verification

Four real-network tests passed against the static build at `http://127.0.0.1:41734/ipfs/polkaswap-e2e/#/bots`. No synthetic history, replacement clock, quote interception or wallet signing was used. Each run loaded 4,739 actual candidates from March 1, 2026 onward, with 100% coverage and current SORA fees.

| Browser and path | Selected renderer | Median frame interval | 95th percentile |
| --- | --- | --- | --- |
| Chromium automatic | Canvas2D (capability guard declined WebGL2) | 15.9 ms | 18.6 ms |
| Chromium forced fallback | Canvas2D | 13.6 ms | 17.3 ms |
| WebKit automatic | WebGL2 | 16 ms | 18 ms |
| WebKit forced fallback | Canvas2D | 17 ms | 21 ms |

These are 120-frame observations on this machine, not a performance guarantee for other hardware. The GPU path uses one particle draw submission per frame instead of individual Canvas drawing calls. Native playback advanced the landed count and corresponding accounting. Scrubbing to completion counted every candidate, and keyboard inspection reached the final candidate. Simulated GPU context loss preserved the exact 70% replay position, metrics and fee totals. The GPU and fallback screenshots were inspected and showed matching candidate positions and styles. All four tests recorded zero page/console errors and failed application requests.

Evidence: `output/playwright/bots-webgl/` contains frame timing JSON and screenshots, including the GPU frame and its matching context-loss fallback frame. Tests are in `tests/e2e/ui/bots-webgl-live.spec.ts`.

## Automated checks

Renderer/component boundary tests: 25 passed. They cover 10,000 candidate submissions, batching, style, allocation and draw failure, context loss, disposal, reduced motion and accounting preservation. The agent service suite passed 91 tests, including the startup readiness regression and strict quote failure before chain identity is ready. Translation checks passed all 13 tests. Focused ESLint and Prettier checks passed. Final production release and full-suite results are recorded in the deployment receipt.
