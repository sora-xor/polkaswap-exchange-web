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
