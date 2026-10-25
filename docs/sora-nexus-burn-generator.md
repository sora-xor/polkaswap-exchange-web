# SORA Nexus address generator on the burn page

`SoraNexusAccountGenerator.vue` appears inside the SOLSWAP campaign on
`/#/burn`. It generates an independent Minamoto mainnet SORA Nexus Ed25519 key and
24-word recovery phrase locally in the browser. It does not connect, register,
or fund a Nexus account. The current SORA Network wallet remains the signer for
the XOR burn; the generated Nexus address is only the public recipient in the
SOLSWAP burn remark.

## Recovery format

This generator defines the following recovery mapping:

1. Generate 256 bits of secure entropy and encode it as 24 English BIP39 words.
2. Use those original 32 entropy bytes directly as the Ed25519 private seed.
3. Derive the public key and encode the single-key account as a SORA mainnet
   i105 address with discriminant 753 (`sora`).

The [Iroha JavaScript SDK](https://github.com/hyperledger-iroha/iroha/blob/main/javascript/iroha_js/src/crypto.browser.js)
supports a raw Ed25519 seed and the [i105 address codec](https://github.com/hyperledger-iroha/iroha/blob/main/javascript/iroha_js/src/address.js),
but does not establish a mnemonic import standard. Standard [BIP39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
derives a different seed through PBKDF2, so another wallet can show a different
address from the same words. The page states that Easy Wallets cannot restore
accounts created here yet and does not promise a compatible import path. The
address codec is checked against the [Iroha account address
vectors](https://github.com/hyperledger-iroha/iroha/blob/main/fixtures/account/address_vectors.json).

## Manual backup flow

Generation happens only after the user clicks the button. The dialog has three
steps:

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

The focused tests are `tests/unit/features/misc/nexusAccountGenerator.spec.ts`,
`tests/unit/features/misc/SoraNexusAccountGenerator.spec.ts`, and the existing
burn page/dialog suites.
