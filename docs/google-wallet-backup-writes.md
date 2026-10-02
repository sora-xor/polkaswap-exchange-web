# Confirmed Google wallet backup writes

The browser wallet creates and restores SORA accounts using encrypted Google Drive backups. Creating an account must not advance to the account list until Drive confirms its complete encrypted backup. The existing create form keeps the same seed, name and password in component memory when creation fails, so an explicit retry uses the same account. None of this form state is added to logs or purchase-plan storage.

Previously `GoogleDriveApi.updateFile()` resolved every `request.execute()` callback. Google also delivers API errors through this callback. A mocked asynchronous 403 therefore resolved as success. Creation separately wrote file metadata before uploading content, allowing the account list to discover a file with no usable backup when the upload failed.

`GoogleDriveApi.createBackupFile()` now sends metadata, the backup-folder parent and encrypted content in a single multipart POST. Folder provisioning is unchanged. `updateFile()` uses a multipart PATCH only for the explicitly requested existing file. Both use the documented GAPI request thenable and require a successful HTTP status plus an acknowledged file ID; updates also require the returned ID to match the requested file. Rejected, malformed or unconfirmed responses become a generic error, without logging provider objects that might contain the submitted body. The browser sets the request length; the app no longer supplies a `Content-Length` header.

`GDriveStorage.create()` propagates that failure. Consequently `Accounts.add()` does not refresh or publish a newly backed-up account and `ConnectionView` stays on the creation step. The existing localized generic notification is reused. No old backup is deleted or overwritten during a creation retry.

## Verification and limits

Focused unit tests mock providers only: asynchronous API rejection, malformed success responses, matching IDs, a successful explicit retry, one-request creation, no deletion or metadata-only file creation, unchanged account cache on failure, and retained create credentials/seed. No Google login, customer account, actual Drive write, signature or financial transaction is used.

This prevents new metadata-only files; it does not automatically repair or delete artifacts left by older versions. A lost response after Google accepts a complete upload can leave a complete duplicate backup on retry. Provider authentication, cold mobile popup behavior, account switching, and live device recovery need separate validation. Ordinary web bootstrap still registers Google conditionally; the local SORA wallet is registered only in desktop mode.

Official contracts: [GAPI request thenables and response objects](https://github.com/google/google-api-javascript-client/blob/master/docs/reference.md) and [Drive multipart uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads).

Focused command:

```sh
node .yarn/releases/yarn-4.10.3.cjs exec vitest run --config vitest.config.mjs --project unit tests/unit/lib/soraneo-wallet/services/google/api.spec.ts tests/unit/lib/soraneo-wallet/services/google/index.spec.ts tests/unit/lib/soraneo-wallet/services/google/wallet/accounts.spec.ts tests/unit/lib/soraneo-wallet/components/Connection/ConnectionView.spec.ts tests/unit/lib/soraneo-wallet/components/Connection/CreateAccount.spec.ts
```

Result on 2026-09-25: 5 suites / 54 tests passed; scoped ESLint passed. Logs: `output/tonswap-growth/google-backup-write-tests.log` and `google-backup-write-lint.log`. No full application suite or deployment was run for this isolated change.
