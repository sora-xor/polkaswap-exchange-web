# Burn page redesign — 10 November 2026

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

Candidate production: `bafybeiawmv7o6xvcgolgemttjxyckyqwum2jevnwannjjejjjjo42bdz4y`.
Candidate testnet: `bafybeigyppl2avcuj3n6etj7is2ijgda7ezd6rrup77jtced3yxtvtvohe`.

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

The master integration full-unit gate and public rollout remain in progress.
Final evidence is retained under
`output/playwright/burn-redesign-release-20261110/`.
