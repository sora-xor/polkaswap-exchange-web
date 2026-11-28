# Burn page redesign — 10–11 November 2026

The Burn page now leads with an XOR amount and estimated TS, quick amounts,
folded guidance, compact public activity, and a transaction status banner.
The banner distinguishes submission, inclusion, finality, and an indexed TS
reservation. It honors reduced motion and does not submit a burn without the
existing wallet review and signing flow.

## Source and feature preservation

The release is built at `/private/tmp/ps-burn-redesign-release-20261110` from
`/private/tmp/ps-verified-data-download-release-20261110`, preserving the complete
shipped application and the latest verified Stats download release. The 46-file
Burn overlay is retained with a 13,155-file hash inventory at
`output/playwright/burn-redesign-release-20261110/source-evidence.json` and
`source-overlay.tar.gz`. The dependency graph, deployed SDK, production/testnet
configuration, Store payment package, Bots and other routes are preserved.

Predecessor production: `bafybeicphwvkvtgea6m7osamlafvac3527ikjvqxkoc7oj6bjtl23a6zua`.
Predecessor testnet: `bafybeic74v6pe4kvgj33vqkqlvjq7i2otp2j7fufbqx42o2esyfra645pi`.

Published production: `bafybeiawmv7o6xvcgolgemttjxyckyqwum2jevnwannjjejjjjo42bdz4y`.
Published paired testnet: `bafybeigyppl2avcuj3n6etj7is2ijgda7ezd6rrup77jtced3yxtvtvohe`.

## Reading and reservation safeguards

The user-approved TONSWAP-only display refinement retains a verified reading
while a replacement loads, for at most 60 seconds. An independent expiry timer
withdraws it even during a pending request; visibility return checks expiry too.
Failure or a network/indexer change withdraws the reading immediately. A pending
signature cannot revive an estimate withdrawn while signing.

The banner obtains reserved TS only from the matching transaction in the current
admitted reading. If that evidence expires, fails or omits the transaction, the
TS amount and completed reservation step disappear; proved chain finality and
the transaction hash remain. No local receipt or wallet history supplies rewards.
The public historical and recent burn intervals remain separate. No entitlement
fallback or signing change is introduced.

## Validation and publication

The production publisher and static feature-parity guard passed. Production and
testnet CARs were exported, transferred with SHA-256 checks, imported separately,
and all 59 retained recursive pins passed full integrity. All 36 required origin
responses matched complete build bytes without redirects.

The release-specific unit suite passes 1,223 tests across 100 files, including
116 campaign tests. All 13 translation tests and lint for the changed source
and tests pass. A Chromium probe observed 209 samples over 22 seconds
with 1.2-second synthetic reads and zero blank samples. It verified withdrawal
after failure and after 60 seconds while a replacement stayed pending. Eleven
responsive captures cover 320–1280px, light/dark, Arabic RTL, and a synthetic
final-reservation banner, with no horizontal overflow. No real wallet transaction
was made. Mock data demonstrates states; it does not certify live entitlements.

All nine candidate WebKit routes pass with zero failed requests and console
errors. Chromium and WebKit freshness probes both pass, and the spark animation
runs then settles; reduced-motion mode suppresses it.

Bunny's origin was saved, read back and purged using the existing authorized API
credential. The root, entry JavaScript and CSS matched, then 374 observed Swap
paths were warmed sequentially. All 933 public files matched (935 complete
responses, 42,402,577 bytes); initial and final roots both reported the new CID.
The unmocked live Burn page passed at 390px and 1280px with working quick amounts,
invalid-input rejection, unavailable estimates kept unavailable, no overflow,
and no request or page errors. The final live WebKit refresh probe passed.

The first complete-body audit received one empty Bunny root `503`; independent
stable/origin reads immediately returned the exact expected `200` body, and a
new full audit passed without retries. The first synthetic live fixture probe
timed out waiting for its sample rate; its cause was not established. A repeat
with the same fixture passed. Both initial attempts and recovery evidence are
retained rather than discarded.

All nine official live WebKit routes pass with zero failed requests and console
errors, preserving each requested route and mounted UI. The final Swap recheck
reached `Swap - Polkaswap`, confirmed the new CID and reported zero failed
requests and console errors. Publication is complete. Final evidence is retained under
`output/playwright/burn-redesign-release-20261110/`.

## Master integration

Implementation commit: `5a7092413ff1f4de15a5c3939b8d036b4fd3cc1b` on
`codex/burn-redesign-20261110`; PR:
[#1630](https://github.com/sora-xor/polkaswap-exchange-web/pull/1630).

The isolated integration starts from local master
`b5896d3674d8fc42c188d3b76a2119e7e7defa89` and reconciles the deployed assembly
using common ancestor `1ac1cffd1d8486a16c7fafee26db380365f6a214`.
Master-only signing, bridge-approval, wallet and Bots fixes are preserved. The
canonical checkpoint query retains safe parsing and a bounded network-only retry.
Production is built from its proven release assembly plus Burn, independently
of these additional master changes. Package dependencies and the lockfile are
unchanged. Integration build, static feature parity, translation and lint pass.
Formatting was checked for equivalent TypeScript, Vue and GraphQL ASTs.

The comprehensive master unit run executed 11,425 tests across 1,108 files:
11,424 passed and one new Burn disclosure assertion expected the older release
label. Master correctly retained “Create Minamoto mainnet SORA Nexus address”.
The assertion was corrected; all 28 tests in `tests/unit/views/Burn.spec.ts`
then passed. No runtime code changed. The entire unit project was not repeated
after this test-only correction. The separate unit-scripts project completed:
3,579 tests passed and four existing Bots cases hit the 15-second timeout
(two in `goal-bundle-study.spec.ts`, two in `goal-target-bundle-quote.spec.ts`).
These timeouts have not been diagnosed or rerun under the default serial
settings; they must not be described as passing. The user requested immediate
completion, so no further extended test runs were started. Master translations
pass all 13 tests. The full projects use the repository configuration with four workers
and file parallelism; their source/configuration was not changed to speed up the
run.

The remote master branch requires one independent approving review and approval
of the latest push; this protection applies to administrators. Automatic merging
is disabled. The PR is being made ready for independent review with the four
script timeouts disclosed. Master remains unmerged pending the required review;
branch protection will not be bypassed.
