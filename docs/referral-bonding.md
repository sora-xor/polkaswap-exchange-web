# Referral XOR bonding

Connected accounts can open or reload `/#/referral/bond` and
`/#/referral/unbond` directly. Disconnected direct entries retain the referral
dashboard's account connection prompt; explicit form navigation still passes
the wallet authentication guard. Back navigation and successful submissions
return to the canonical `/#/referral` dashboard URL.

`ReferralBondingPage.vue` calls `reserveXor` and `unreserveXor` on the shared
`api.referralSystem` instance. These SDK methods require their instance's
wallet and chain context, so they must not be detached into a standalone
callback. The entered decimal string is passed unchanged to the SDK, which
encodes XOR with `FPNumber` before constructing the extrinsic.

The view regression tests exercise the real referral SDK module with mocked
extrinsic construction and submission. They cover both actions, exact
18-decimal conversion, declined submission, and dashboard navigation without
network calls or signing. Router guard tests cover connected reloads and
disconnected entry behavior.

## Production release — 2026-10-05

Deployed production CIDv1:
`bafybeicnjvvhl6tyrjdi3gfrc4bggvr5ttudw34hvztaqebb2dx7j4u6ky`.
The previous production root was
`bafybeibm6zmeinwcmtmu7xvmmrr6c2irb5g3od65uujeyeninklng4xipe`.
The candidate retained the already shipped Polkamarkt changes, Store
configuration, Sora Pay package, and combined application routes.

Production and testnet DAGs were separately imported and pinned on the approved
Pi origin. All retained pins passed integrity verification. Bunny's production
origin was saved and its full-zone cache purged; 88 sequential public asset
requests then matched the build's exact bytes. The five required WebKit routes
(`swap`, `bots`, `store`, `buy-xor`, and `get-ts`) and a final Swap check passed
with the new CID, their mounted UI, zero failed requests, and zero console
errors.

A connected production browser verified direct bonding-page reload, amount
validation, the confirmation dialog, and Back navigation to `/#/referral`.
The confirmation was closed and input cleared without submitting a transaction.
Release provenance and verification records are retained in
`output/referral-bond-fix/release.json` and `live-browser-verification.json`.

Validation covered 13,821 unit tests (10,592 application and 3,229 script
tests), plus 13 translation tests. The isolated worktree initially lacked
retained offline metadata fixtures: restoring the existing fixtures and
rerunning the affected 32 application and six script tests resolved those
environment-only failures without source changes. Full-run and focused-rerun
logs are retained with the release evidence.
