# Embedded wallet password policy

New built-in wallets require at least eight Unicode characters, matching the
existing translated password guidance. `util/password.ts` defines the shared
minimum. The creation form disables invalid submissions and `util/account.ts`
enforces the same rule before keyring creation, backup export, local persistence,
or Google Drive upload.

Use `createAccount` for a newly generated wallet. Recovery from an existing
mnemonic uses `importAccountFromSeed`; JSON verification/restoration, exports,
and unlocks retain their existing password behavior. Never apply the creation
minimum to recovery or unlock, and never trim or normalize a wallet password.
`ConnectionView` keeps separate callbacks for creation and mnemonic recovery
so navigating between steps cannot change which policy is applied.

Regression coverage lives in `tests/unit/lib/soraneo-wallet/util/` and
`tests/unit/lib/soraneo-wallet/components/Connection/`. These tests use synthetic
inputs and mocked wallet/Google services; they require no real wallet or network.

## Transaction confirmation

`beforeTransactionSign` requires an explicit confirmation for each displayed
local-wallet signing prompt. Closing the dialog is cancellation, even if the
key was unlocked by an earlier operation. The request captures the original
account, signer and connection; changing that context invalidates the request.

Custom confirmation dialogs must capture `getTransactionSignRequest(chainApi)`
at the user's confirmation click, before asynchronous work, then pass the token
to `confirmTransactionSign(chainApi, password, token)` before closing. Calling
`unlockAccountPair` alone does not confirm a transaction. Root and bridge dialogs
share requests through their underlying keyring pair. A delayed callback cannot
approve a replacement request. The transaction composables relock their captured
local key on success or failure, including rejected preflight checks.
They retain an SDK signing-context scope through asynchronous preparation and
submission. The SDK checks it before signing, after nonce retrieval and before
broadcast, so a network or account switch after confirmation also cancels the
operation. Each scope is disposed independently; another pending confirmation
cannot overwrite an earlier operation's guard.

External signers and the existing opt-in cached-password behavior retain their
own signing flows. Regression tests cover cancellation, stale callbacks, context
changes, bridge dialog sharing and the mounted confirmation component.
