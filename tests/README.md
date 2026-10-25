## Testing Conventions

### Wallet runtime

- Mock the wallet runtime through `createWalletMock` from `@tests/stubs/createWalletMock` or by overriding the concrete wallet modules your suite imports.
- `createWalletMock` merges the shared wallet runtime stubs in `tests/stubs/walletRuntime` with required fallbacks such as translations, storages, and `WALLET_CONSTS`, so suites start from a consistent baseline without relying on deleted shim paths.
- Pass overrides for the specific pieces a suite needs, for example:

```ts
import { walletRuntimeFactory } from '@tests/stubs/createWalletMock';

vi.mock(
  '@tests/stubs/walletRuntime',
  walletRuntimeFactory({
    components: { DialogBase: DialogBaseStub },
    api: { kensetsu: { closeVault: vi.fn() } },
  })
);
```

- Reuse stubs exported from `tests/stubs/walletComponents.ts` (e.g., `tokenLogoStub`) instead of redefining local placeholders when possible.

### Offline runtime fixtures

Exact-runtime bot tests use the public, hash-pinned binaries and metadata in
[`fixtures/bots/runtime-artifacts`](fixtures/bots/runtime-artifacts/README.md) and
[`fixtures/bots/runtime-metadata`](fixtures/bots/runtime-metadata/README.md).
Resolve them through `runtime-artifacts.ts` or `runtime-metadata.ts`; tests must
not depend on ignored operator output or an absolute developer checkout path.
The fixture documentation records provenance and explains which inputs are
invented. These fixtures are test inputs, not application or deployment assets.

Reviewed historical source helpers live in
[`fixtures/bots/runtime-tools`](fixtures/bots/runtime-tools/README.md).
Tests provide fake transports and never invoke their collection entrypoints.
The cases proving operating-system network denial require macOS and
`/usr/bin/sandbox-exec`; the portable host and decoder cases run on every
platform. Missing fixture files are errors, not grounds for skipping tests.

`yarn test:unit` runs the application and script projects in separate processes.
The complete script suite includes long offline runtime replays; allow those
cases to finish without replacing their real runtime execution with mocks.
