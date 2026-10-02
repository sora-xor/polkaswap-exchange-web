# Tonswap reward curve — 2026-09-21

The burn campaign shows its marginal reward schedule as a compact SVG graph:
50 TS per XOR at the start, decreasing linearly to 5 TS per XOR when rewarded
burns reach the 1,753,357 XOR cap. The current point uses the same finalized
eligible-burn total and exact fixed-point rate calculation as the quote flow.
The diagram makes the advantage of earlier burns visible without suggesting a
time deadline: progress depends on qualifying burns, not elapsed time.

`TonswapRewardCurve` accepts a `burned` FPNumber or null. Pass
`allocation.totalEligible` only when the mainnet snapshot is available; null
retains the schedule but hides the current point. This prevents a failed refresh
from presenting stale data as the current reward rate. SVG coordinate conversion
is display-only; token arithmetic stays fixed point. The cap state reuses the
campaign's exhausted-rewards message.

The chart follows the existing neumorphic theme, has explicit inner padding,
works without WebGL, and exposes the schedule and current point as accessible
text. All labels use the shared locale catalogs. Input autofocus ships with this
release; see [the input notes](tonswap-burn-autofocus-2026-09-21.md).

## Validation and release

Validation passed: 83 campaign, input, and curve unit tests; target ESLint;
13 translation tests; cuneiform enforcement; and all 31 locale catalogs. The
actual component passed 30 curve scenarios in Chromium/WebKit at desktop,
390 px, and 360 px widths, covering start, midpoint, cap, current, and unknown
states. A final four-case label check confirms the end-rate label stays clear
of the line and axis ticks. Autofocus passed four desktop/mobile browser cases.

- Production CID: `QmWCeYcjyCVxZKw2EpP9f9ekm2D8z71bPYck7i3hW9cswX`
- Production CIDv1: `bafybeidu2cu7p36rbqvfj67robkci3lqwofmckpu7ajjyt253odm7jlupi`
- Testnet CID: `QmVyn9ZmXbrd8eFRqzM3sfxmZe4tigjzFLLqjo2utxboYF`
- Testnet CIDv1: `bafybeidrqs22zvtbzos7m4wandvcfjohc6hd5owjfeb7n4gdwfhmws6dvq`
- Production origin: `https://mof.sora.org/ipfs/bafybeidu2cu7p36rbqvfj67robkci3lqwofmckpu7ajjyt253odm7jlupi`
- Host header: `mof.sora.org`

Both DAGs were imported into MOF and recursively pinned; all 122 retained pins
passed integrity verification. The candidate root, entry JS/CSS, and burn chunk
returned 200, correct MIME types, and exact built bytes without redirects. Bunny
showed the origin-save success toast, and the authorized full-zone purge was
submitted and completed. The live root serves the new CIDv1, and 95 required
assets were warmed and byte-verified. Official WebKit and strict live checks passed for swap at 1440 px and burn at
1440/390 px. The expected titles and new root CID were present, reward-curve
values matched the finalized snapshot, padding and layout checks passed, and
all routes had zero failed requests, HTTP errors, console errors, or page
errors. Production screenshots were reviewed. Browser evidence is under
`output/tonswap-reward-curve`; release and autofocus evidence is under
`output/tonswap-autofocus`.
