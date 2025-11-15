## Testing Conventions

### Wallet module

- Always mock `@wallet` (and related paths such as `@wallet/core`) via `createWalletMock` from `@tests/stubs/createWalletMock`.
- `createWalletMock` merges the real wallet shim (`src/shims/wallet.ts`) with the shared component stubs and required fallbacks (translations, storages, `WALLET_CONSTS`, etc.), so tests start from a consistent baseline.
- Pass overrides for the specific pieces a suite needs, for example:

```ts
import { walletModuleFactory } from '@tests/stubs/createWalletMock';

vi.mock(
  '@wallet',
  walletModuleFactory({
    components: { DialogBase: DialogBaseStub },
    api: { kensetsu: { closeVault: vi.fn() } },
  })
);
```

- Reuse stubs exported from `tests/stubs/walletComponents.ts` (e.g., `tokenLogoStub`) instead of redefining local placeholders when possible.
