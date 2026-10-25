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
