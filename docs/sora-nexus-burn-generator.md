# SORA Nexus address generator on the burn page

`SoraNexusAccountGenerator.vue` appears inside the SOLSWAP campaign on
`/#/burn`. It generates an independent Minamoto mainnet SORA Nexus Ed25519 key and
24-word recovery phrase locally in the browser. It does not connect, register,
or fund a Nexus account. The current SORA Network wallet remains the signer for
the XOR burn; the generated Nexus address is only the public recipient in the
SOLSWAP burn remark.

## What Polkaswap can and cannot do

Polkaswap, including the wallet library in this repository, has no SORA Nexus
wallet. It keeps no SORA Nexus key once the backup dialog closes and has no
SORA Nexus transport.

| Action                                                              | Status                                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Generate a new recipient and show its words once                    | Implemented here                                                                       |
| Check that 24 words reproduce a saved recipient, in either format   | Implemented here (`SoraNexusAccountRecovery.vue`)                                      |
| Restore, import or unlock a SORA Nexus account                      | Not supported here, in either format                                                   |
| Sign or send a SORA Nexus transaction, read a SORA Nexus balance    | Not supported here                                                                     |
| Restore a new (`bip39-slip10`) recipient in SORA Wallet or Fearless | Unverified dependency: source-level derivation parity only, no released version tested |
| Restore an earlier (`polkaswap-entropy-v1`) recipient in a wallet   | Needs a wallet app to add this import; an ordinary import yields another account       |

Because of this, no button, result or text on the page offers recovery. The
deployed warnings stay in place: the generator still says the account may be
inaccessible until compatible recovery is available, and the burn dialog still
requires the user to acknowledge that they need compatible software. The
backup check ends with a statement of limits and never offers a follow-up
action such as using the address for a burn.

Relax this wording only after a released wallet version has been tested to
restore a generated Minamoto account and show the same address. That decision
belongs to the product owner; it is not implied by this change.

## New recipient format (`bip39-slip10`)

Before creating a recipient, the user must select **SORA Wallet** or **Fearless
Wallet** as the wallet they plan to restore the words in. There is no
preselected wallet and no option to generate the earlier format. Both targets
use the same derivation:

1. Generate 256 bits of secure entropy and encode it as 24 English BIP39 words.
2. Normalize the words and derive the 64-byte BIP39 seed using PBKDF2-HMAC-SHA512,
   2,048 iterations, and an empty BIP39 passphrase.
3. Apply SLIP-0010 Ed25519 derivation at `m/44'/617'/0'/0'`.
4. Derive the public key and encode the single-key account as a SORA Nexus
   Minamoto mainnet i105 address with discriminant 753 (`sora`).

`deriveSoraNexusAddressFromPhrase` uses this mapping.
`generateSoraNexusAccount(targetWallet)` requires a supported target and returns
`targetWallet` and `recoveryFormat` alongside the phrase and address. The selected
wallet is captured with the generated account and shown during backup and with
the confirmed address. Selecting a different target for the next account does
not reinterpret or relabel an address already generated. Wallet choice does not
create a new derivation scheme; it records where the user intends to check the
address.

The existing crypto dependency supplies the PBKDF2, HMAC and Ed25519
primitives. Substrate's mnemonic mini-secret and Ed25519 HDKD helpers implement
different mappings and must not replace these steps.

### Evidence for the derivation, and its limits

The profile was compared with public wallet source on 14 November 2026. Two of
those sources were read again on 25 November 2026 (master branches, read only):

- SORA Wallet Android
  [derivation](https://github.com/sora-xor/sora-android/blob/master/common/src/main/java/jp/co/soramitsu/common/nexus/IrohaKeyDerivation.kt)
  (PBKDF2-HMAC-SHA512, 2,048 rounds, `ed25519 seed` master key, hardened
  segments only) and
  [Minamoto profile](https://github.com/sora-xor/sora-android/blob/master/common/src/main/java/jp/co/soramitsu/common/nexus/NexusNetwork.kt)
  (`m/44'/617'/0'/0'`, discriminant 753).
- The Fearless mobile
  [`default24` vector](https://github.com/soramitsu/fearless-Android/blob/master/common/src/test/resources/universal-wallet-v2-vectors.json),
  whose complete mainnet address is pinned in the focused tests.

On 14 November the same path and prefix were also read in
[SORA Wallet iOS](https://github.com/sora-xor/sora-ios/blob/master/SoraPassport/Common/Model/WalletNetworkModel.swift)
and the Fearless extension's
[key derivation](https://github.com/soramitsu/fearless-wallet-web/blob/master/src/util/irohaKeyring.ts)
and [network profiles](https://github.com/soramitsu/fearless-wallet-web/blob/master/src/consts/universalWallet.ts).
These three were not read again on 25 November.

This is source-level parity. It does not show that any released wallet version
restores a Minamoto account, and it does not enable mainnet transactions. On
25 November the SORA Wallet Android source listed only the Taira testnet as a
live network and noted that production has no live deployment yet; the
Fearless extension's default Iroha network is the Taira testnet. Users must
restore the words in their own wallet and compare the complete address before
burning. A wallet password is not a BIP39 passphrase; this generator does not
accept an additional BIP39 passphrase.

## Earlier recipients (`polkaswap-entropy-v1`)

The generator deployed before this change used the original 32 bytes of BIP39
entropy directly as the Ed25519 seed. `deriveLegacySoraNexusAddressFromPhrase`
preserves that exact mapping so an existing backup can still be checked.
Applying the new derivation to the same words produces a different account and
cannot change the recipient already recorded in a burn transaction.

These recipients need wallet-app support: a wallet that imports the 24 words
the ordinary way derives another account, so the recorded recipient can be
reached only by software that explicitly implements this earlier mapping. No
such import exists in this repository. Whether any wallet app has one is not
known here: the wallet source listed above was read only for the standard
derivation. The
[Iroha JavaScript SDK](https://github.com/hyperledger-iroha/iroha/blob/main/javascript/iroha_js/src/crypto.browser.js)
accepts a raw Ed25519 seed and the
[i105 address codec](https://github.com/hyperledger-iroha/iroha/blob/main/javascript/iroha_js/src/address.js),
but that is a developer interface, not a wallet import. The address codec is
checked against the
[Iroha account address vectors](https://github.com/hyperledger-iroha/iroha/blob/main/fixtures/account/address_vectors.json).

The page never generates this format again and tells the holder of such a
recipient not to use it for new burns until a wallet they have tested can open
it.

## Check a saved burn address

`SoraNexusAccountRecovery.vue` offers a local backup check on the burn page,
including after the campaign has ended. It requires the 24 words and the exact
saved SORA Nexus recipient. `recoverSoraNexusAccount(phrase, expectedAddress)`
validates the mainnet address and compares both derivations. It returns only the
matching public address and `bip39-slip10` or `polkaswap-entropy-v1`; invalid
backups and mismatches fail without selecting a replacement account.

A match establishes one thing: the words reproduce the saved public recipient.
The check does not upload or persist the phrase, expose private keys, register
an account, sign a transaction, certify rewards, or unlock any wallet. Every
result is followed by a statement of limits (`burnPage.nexusRecovery.standard`
or `.legacy`); an unrecognised format would show the stricter legacy text. The
result offers no button or link.

No network query is needed for the comparison. The phrase field is cleared after
every attempt, successful or failed. Closing the disclosure, clearing it, leaving
the page, or unmounting the component also clears the backup inputs.

## Manual backup flow

Generation happens only after the user selects a target wallet and clicks the
button. The chosen wallet remains visible throughout the three-step backup:

1. Write the 24 numbered English words exactly as shown, in order, offline.
2. With the list hidden, enter three randomly selected words as a spot-check.
   Reviewing the list starts a new check with different positions. This check
   cannot prove that every word was saved correctly.
3. Save the exact public i105 address with the phrase and acknowledge that it
   was recorded. The address is shown only after the three answers match.

Close, Cancel, and Escape open a discard confirmation. Repeating Escape or
Close returns to the current backup step; an overlay click does not close the
dialog. Confirming discard clears the pending words and address without
accepting it. Reopening starts a fresh backup flow. Route navigation asks for
confirmation while words are pending, and the browser warns before a reload or
tab close. If the user leaves, the pending phrase is removed; the page never
persists it. After the final acknowledgement, the phrase is removed from
component state and only the public address remains for the current page
session. No phrase is copied, persisted, logged, or sent to an API.

**Use for SOLSWAP burn** opens the existing burn dialog with the verified
address prefilled while the campaign is active. If the SORA Network wallet is
disconnected, the app resumes this action after connection; cancelling the
connection forgets the pending action. The user can edit the recipient before
submitting. Every SOLSWAP recipient must acknowledge the recovery warning in
the burn dialog; changing the recipient clears that acknowledgement. The
regular SOLSWAP burn button starts with an empty recipient. TONSWAP has no
Nexus recipient.

## Tests and translations

The focused tests are `tests/unit/features/misc/nexusAccountGenerator.spec.ts`,
`tests/unit/features/misc/SoraNexusAccountGenerator.spec.ts`,
`tests/unit/features/misc/SoraNexusAccountRecovery.spec.ts`, and the existing
burn page/dialog suites. Crypto tests retain the legacy address vector, compare
the new mapping against an independent derivation, and reject malformed phrases
and wrong expected recipients. Locale key and script constraints are checked by
`yarn test:translation`.

The three limit statements (`nexusGenerator.targetWalletHelp`,
`nexusRecovery.standard`, `nexusRecovery.legacy`) were translated by a language
model for 15 locales and have had no native-speaker review. Thirteen locales
show the English text for the new keys, and the Akkadian and Egyptian catalogs
keep script-only placeholder strings.
