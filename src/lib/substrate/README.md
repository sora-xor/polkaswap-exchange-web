# Polkaswap chain library

This directory contains Polkaswap's maintained, inline SORA Nexus Substrate
client. The source was originally derived from `sora-xor/sora2-substrate-js-library`
under Apache-2.0 and now lives entirely in this repository. Preserve the existing
license and attribution when changing it. No checkout, Git submodule, workspace
link, generated build output, or published package from that repository is needed
to install, develop, test, or build Polkaswap.

Import these modules through the application's `@/` alias:

```ts
import { FPNumber } from '@/lib/substrate/math';
import { api } from '@/lib/substrate/sdk';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
```

| Directory          | Responsibility                                                             |
| ------------------ | -------------------------------------------------------------------------- |
| `sdk`              | Assets, balances, swaps, liquidity, order books, bridges, and transactions |
| `math`             | Exact fixed-point token amounts and codec conversion                       |
| `liquidity-proxy`  | Local liquidity routing and quote calculations                             |
| `api`              | Chain API options, derives, and type registration                          |
| `connection`       | RPC connection lifecycle                                                   |
| `types`            | Runtime interfaces and API augmentations                                   |
| `type-definitions` | Runtime codecs, RPC definitions, and version bundles                       |

Change and test the local implementation here. Do not reintroduce
`@sora-substrate/*` imports, `/build` package paths, or links to a sibling SDK
checkout. Runtime definitions under `types/interfaces` reference the local
`type-definitions` directory. Browser builds, Electron renderers, tests, and
standalone TypeScript tools share the normal `@/*` source mapping.

For app wallet operations, use `@/lib/soraneo-wallet/src/api`, which configures
this SDK's shared instance. Never create a second SDK or fixed-point math copy
through a package dependency. Keep chain-provided denomination and token decimals
explicit when converting amounts.

Run `yarn test:unit` and `yarn build` after changes. Focused checks are:

```sh
yarn test:unit tests/unit/lib/substrate
yarn test:unit --project unit-scripts tests/unit/scripts/substrate-inline.spec.ts tests/unit/scripts/substrate-definitions.spec.ts
```

The independence check loads the real local modules in a separate Node process
using the root TypeScript configuration, without Vite's test mocks or external
SDK aliases. Its checks and the runtime-definition tests require no network.
