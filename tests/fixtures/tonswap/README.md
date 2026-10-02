# Confirmed TONSWAP burn evidence

These public mainnet fixtures record transaction `0x0e302df6e88e4c0a6f208df146a3bab41f1d3d39de0198f6653f2b8dc0749896`: a successful 2 XOR burn at block 27,721,093, extrinsic 1, timestamp 2026-09-21T02:09:24Z.

- `confirmed-burn-chain-20260921.json` was read from `wss://ws.mof.sora.org`. It contains the atomic burn/marker call and successful receipt events.
- `confirmed-burn-snapshot-20260921.json` was read from `https://pi.soramitsu.io/graphql`. Its finalized snapshot includes the same transaction and the live health/checkpoint metadata.

`tests/unit/indexer/queries/tonswapBurn.fixture.spec.ts` freezes time at the capture time and mocks fetch with the recorded response. It uses real SS58 decoding and checks the complete query-to-allocation path, including the exact first-burn reward of 99.999948669894379752 TS. No test performs network calls.

The observation does not record the first time the indexer published this burn. During six later observations from 02:16:48Z to 02:17:18Z, the worker had zero lag relative to finalized RPC in every sample, while the best chain head was two blocks ahead. The worker processes finalized blocks immediately, with a one-second polling fallback; its batch-size setting does not delay writes until a batch fills.
