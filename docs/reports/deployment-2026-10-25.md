# Polkaswap password fix deployment — 25 October 2026

Status: **deployed and publicly verified**. Production and paired testnet builds are separately pinned on the approved origin. Bunny was updated and purged; all 419 public delivery checks and all five live WebKit routes passed. Synthetic encrypted-wallet tests confirmed that the live code rejects short passwords for new wallets while retaining the tested legacy import and unlock behavior.

Raw logs, CARs and source archives are retained locally under `output/security/password-deploy-20261025/` and are not committed to the public repository. Paths below identify that local evidence.

## Release identity

| Artifact | Previous CIDv1 | New CIDv1 |
| --- | --- | --- |
| Production | `bafybeicqvi4opmxmxoqem73mtybdh4ka2ltx3wo7nlvr5k46tqypd3bxea` | `bafybeictpwld4czgcwbzwxaegopxsgzeaax52mykee2scwa7wonhz7ja7u` |
| Paired testnet | `bafybeihezo3i5u3ohglt47rrjddcdy3ecacvooys3kze6mext5cwlyxshi` | `bafybeielqxowawakjsw24xku3bivyj25wgqfra435zngplbqosqkqlrxma` |

Production CIDv0: `QmTxZcoe3VLt8AeiiGyJi6L8Vhrn5AU7MHvm8VKocCrEig`. Testnet CIDv0: `QmXjHmdBDjGtpzwn2AJ9BubNebgAjdcbKjri7M7RsJUMTd`.

Bunny zone `polkaswap` / `5860217` now uses origin `https://pi.soramitsu.io/ipfs/bafybeictpwld4czgcwbzwxaegopxsgzeaax52mykee2scwa7wonhz7ja7u`, with Host header `pi.soramitsu.io`. The publisher used `IPFS_PUBLIC_GATEWAY_URL=https://pi.soramitsu.io`. See `publish.log` and `release-cids.json` in the evidence directory.

## Fix and compatibility

This release fixes **PW-WALLET-001**: new embedded wallets now require at least eight Unicode code points. The creation form and account-creation helper enforce the same minimum before keyring creation, backup export, persistence or Google Drive upload. Direct form submission cannot bypass the check.

Mnemonic recovery uses a separate `importAccountFromSeed` helper. Existing JSON import, wallet unlock, export and Google recovery preserve their prior password behavior. Password contents are never trimmed or normalized, and encryption code is unchanged. Existing wallets are not rewritten or required to change passwords. The embedded-wallet README documents the distinction between creation and recovery.

## Source and feature preservation

The isolated candidate starts from the exact retained October 24 deployed source assembly. All **13,113** baseline files were verified before staging. The candidate records **13,116** source files: 13,106 baseline files unchanged, seven modified, three added and none removed. The ten-file overlay contains only the password policy, creation/recovery routing, regression tests and embedded-wallet documentation.

Four SDK imports were normalized to the retained release's `@sora-substrate/sdk` form in `account.ts`, `ConnectionView.vue`, `CreateAccount.vue` and `account.spec.ts`. The retained Vite aliases continue to resolve the copied SDK. No unrelated import migration or working-checkout changes were included.

The shipped Bots, Store, Buy XOR, Get TS, temporary-wallet flow, production configuration, payment package, liquidity layout fix and October 24 security dependencies are preserved. Package manifests, lockfile and patches are unchanged. The candidate uses the existing installed dependency graph through a `node_modules` symlink; this symlink is excluded from the retained source archive.

Application version: **`1.46.0-password-20261025`**, built with Node **26.12.1** and Yarn **4.10.3**. Exact provenance is recorded in `staging-receipt.json`, `feature-provenance.json`, `source-evidence.json` and `source-integrity-after-build.json`.

The retained source archive is **864,998,005 bytes**, SHA-256 `591e25bf025fcae4f1f153322a026df7c416a6fbb1fd087066c8c1ea2de915d9`. All 13,116 archived files' hashes and modes were verified; all candidate source hashes remained unchanged after the build and archive. See `source-archive.json`.

## Validation before promotion

| Check | Result |
| --- | --- |
| Isolated candidate wallet regression suite | 62 tests passed across five files |
| Isolated candidate translation consistency | 13 tests passed across four files |
| Publisher production build | Passed in 33.65 seconds |
| Combined static feature parity | 837 reachable modules, 8,330 relative imports, all 45 route fragments and five page bindings |
| Actual production CID extraction | 928 files / 42,273,030 bytes, exactly matching the built production directory |
| Source integrity | All 13,116 candidate hashes unchanged |

See `candidate-wallet-tests.log`, `candidate-translation.log`, `publish.log`, `static-feature-parity.json` and `frozen-production-verification.json`.

The earlier password-fix validation in the working checkout also passed the complete unit suite: **14,314 tests across 1,267 files**, plus translation checks, targeted lint and formatting. That historical result is retained in `output/security/password-fix-20261025/validation.json`; it is not presented as a new full-suite run against the isolated release.

All five candidate routes passed the unchanged official WebKit checker with a 30-second settling interval, approved mainnet RPC verification, mounted feature UI and the exact requested route/title. Each had zero failed requests, zero raw console errors and zero cleanup console errors. Candidate bytes were served through the checker's static preview at the production hostname; public CDN checks were performed separately after promotion. See `candidate-routes/summary.json` and its per-route logs, reviews and screenshots.

| Candidate route | Final title | Failed requests | Raw console errors |
| --- | --- | ---: | ---: |
| `/#/swap` | Swap - Polkaswap | 0 | 0 |
| `/#/bots` | Bots - Polkaswap | 0 | 0 |
| `/#/store` | Store - Polkaswap | 0 | 0 |
| `/#/buy-xor` | Buy XOR - Polkaswap | 0 | 0 |
| `/#/get-ts` | Get TS - Polkaswap | 0 | 0 |

## Encrypted-wallet compatibility checks

The candidate browser checks used disposable synthetic accounts and real sr25519 keyring encryption and decryption. Both the normal-browser Google-wallet flow and the compiled local-wallet flow passed. Google OAuth/Drive and indexer responses were simulated; the local-wallet flow was enabled with an Electron user-agent. These checks did not use real user wallets, perform signing or submit transactions. Only approved read-only mainnet RPC methods were allowed.

Both flows rejected new passwords of zero, one and seven Unicode code points, and four emoji, through the button, Enter key and direct DOM form submission. An exactly eight-character password created a wallet whose exported encrypted backup decrypted with the original password and rejected an incorrect password.

The normal-browser flow imported a synthetic JSON wallet with a one-character password, accepted that password for login, and preserved the same public key through reload and export. The local-wallet flow separately imported JSON and mnemonic wallets with a one-character password, persisted them through reload, unlocked them and exported backups with the same public keys. Each encrypted export accepted the original password and rejected an incorrect one. Both runs recorded zero console errors and no attempted disallowed RPC methods.

See `candidate-google-password/evidence.json`, `candidate-local-password/evidence.json` and the retained checker `check-password-wallets.mjs`. These cases verify compatibility of the exercised import and unlock paths; they do not constitute a test of real Google authorization or every historical wallet format.

## IPFS replication and origin verification

Production and paired testnet were exported as separate CARs and separately imported with root pinning into the approved `207.254.29.218` host's private `pi-ipfs` repository. Both recursive root listings passed. Full integrity verification reported **all 15 retained pins `ok`**, preserving the prior releases.

| CAR | Bytes | SHA-256 |
| --- | ---: | --- |
| Production | 42,389,355 | `72f825b472bc1f302488fc8a6f77bd6a3a7a4a2614e65081b1ebabcbbc4a25d6` |
| Testnet | 42,387,518 | `20eaedfea1a5beade6a28a106629ee4b09555b81a329a479bfc5999618b7018b` |

All **16** origin HTTPS checks returned HTTP 200 without redirects, with expected MIME types and complete bodies matching the frozen build's sizes and SHA-256 hashes. Coverage includes production root/index, configuration, Store configuration, entry JavaScript/CSS, required lazy page/wallet chunks and paired testnet root/index/configuration. See `release-cids.json`, `origin-replication.json`, `origin-pin-integrity.log` and `delivery-origin.json`.

## Bunny promotion and live verification

Authenticated Safari verified the exact zone and hostname. The new origin was saved and read back after a fresh reload. Host forwarding remains off, redirects on, origin TLS verification on, error caching off and Smart Cache on. `RawDwebOriginHeaders` and the complete `SetPolkaswapCSP` value match the deployment runbook.

The full-zone purge selected `polkaswap` with a blank optional search tag. Bunny explicitly confirmed **“Pull Zone was successfully purged.”** at **14:02 JST**. The public root returned the new production CID and byte-identical built HTML: 4,529 bytes, SHA-256 `2282d4ff92fdd57a4c0830342b2e90e5520891ef1dda854a24d9d2268d4e15b7`. See `bunny-evidence.json` and the public root entry in `delivery-live.json`.

Sequential warming verified the entry assets first, followed by Swap dependencies, wallet assets and the remaining route assets. All **419** public checks returned HTTP 200 without redirects, with expected content types and complete bodies matching the frozen build. Coverage includes static import closures and the wallet checks' observed asset paths. The complete result is recorded in `delivery-live.json`.

All five live routes passed the unchanged official WebKit checker without preview interception, with a 30-second settling interval. Each returned the new production CID and HTTP 200, retained its requested route with mounted feature UI and no bootstrap loader, and verified the approved mainnet RPC. Failed requests, raw console errors and cleanup console errors were zero on every route.

| Live route | Final title | Failed requests | Raw console errors |
| --- | --- | ---: | ---: |
| `/#/bots` | Bots - Polkaswap | 0 | 0 |
| `/#/store` | Store - Polkaswap | 0 | 0 |
| `/#/buy-xor` | Buy XOR - Polkaswap | 0 | 0 |
| `/#/get-ts` | Get TS - Polkaswap | 0 | 0 |
| `/#/swap` | Swap - Polkaswap | 0 | 0 |

Swap was checked last at **14:06 JST**, finishing with title **Swap - Polkaswap** and the new production CID. See `live-routes/summary.json` and its per-route logs, reviews and screenshots.

Both synthetic encrypted-wallet suites also passed against the **live CDN assets**, with no static preview interception. Every initial document response returned HTTP 200 and the new production CID. All **388 unique static paths** loaded by each wallet suite were covered by the exact-byte delivery checks, including the shipped wallet and connection chunks.

The live suites confirmed short new-password rejection through the button, Enter key and direct form submission, rejected mismatched confirmation, enabled creation for eight Unicode code points and successfully created/exported an eight-character-password wallet. Google JSON import/login/reload/export and local JSON plus mnemonic import/reload/unlock/export retained the synthetic legacy one-character password and the same public key. Encrypted exports rejected incorrect passwords and decrypted with their originals. Both suites recorded zero console errors and no attempted disallowed RPC methods.

Google OAuth/Drive and indexer services remained simulated; this verifies the live application code and real local encryption using synthetic wallets, not an actual Google account authorization. No real user wallet or transaction was involved. See `live-wallet-verification.json`, `live-google-password/evidence.json` and `live-local-password/evidence.json`.

Final independent HTTPS verification at **14:08 JST** again returned HTTP 200, the new production `x-ipfs-roots`, and exact root bytes (SHA-256 `2282d4ff92fdd57a4c0830342b2e90e5520891ef1dda854a24d9d2268d4e15b7`). The combined completion record is `final-verification.json`; response headers and body are retained as `final-live-root.headers` and `final-live-root.html`.
