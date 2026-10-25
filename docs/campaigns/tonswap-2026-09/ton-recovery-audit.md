# TON route recovery audit

Read-only investigation, 25 September 2026. No production code changes, wallet signatures, orders, payments, or recovery transactions were made. The request addresses are public API documentation fixtures, not a user's wallet.

## Finding

The quote API designates `0x67f9b3E561383493B3f874fEAE0c53c2cD23851D` to initiate recovery. There is strong evidence this is a Symbiosis broadcaster account, and delegated recovery matches the provider's documented behavior. This is **not evidence that refunds are paid to that account**. The specific account's operator identity is not stated in the public documentation found.

The quoted user cannot directly initiate the matching recovery through the ordinary Ethereum Portal entry point: its operation identifier includes the caller's address, which must match the designated recovery address. An independent TON source-chain rescue path for this exact route has not been demonstrated. Therefore the integration must not promise recovery using only the user's keys without provider cooperation.

## Observed payload

Two successful `POST /crosschain/v2/quote` requests for 100 TON-USDT → Ethereum ETH were decoded using `@ton/core` 0.63.1 in an isolated temporary research directory and the Symbiosis SDK's published ABI/cell layouts. No new repository dependency was installed for this research.

Both requests set `fallbackReceiver` and the destination to `0x196A45c9ca4270bb714042b7254FbdB50277881B`. The second also supplied the documented `revertableAddresses` parameter for chains `13863860` and `1`, both pointing to that address. The returned BOCs still used `0x67f9…` at both recovery layers. The observation is that the requested override was not reflected; the provider's automatic-revert policy may explain this and it is not sufficient evidence of an API defect.

Decoded fields:

| Layer | Verified value |
| --- | --- |
| Outer jetton transfer | Opcode `0x0f8a7ea5`, amount `100000000` at 6 decimals, null custom payload |
| Native attachment / notification | `200000000` / `50000000` nanoTON |
| TON portal | `EQBZh9CpLZyNlwI7am0PHpVy8T8zdJxAhlG3m3xMi0BoVaUh`, matches SDK mainnet config |
| TON excess response | Original TON sender, bounceability-normalized |
| Meta-synthesize | Opcode `1585287200`, canonical TON USDT master, exact input, intended EVM destination |
| Host chain | `13863860`; Synthesis `0x45CFd6FB7999328F189aaD2739Fba4Be6C45E5bf` |
| Host recovery authority | `0x67f9b3E561383493B3f874fEAE0c53c2cD23851D` |
| Nested meta-burn | Ethereum chain `1`, intended recipient, Ethereum Portal `0xb8f275fBf7A959F4BCE59999A2EF122A099e81A8` |
| Destination recovery authority | Same `0x67f9…` account |
| Final swap | 1inch V6 USDC→ETH; user recipient and minimum decode from nested calldata |

Primary format sources: [official TON builder](https://github.com/symbiosis-finance/js-sdk/blob/main/src/crosschain/chainUtils/ton.ts), [mainnet configuration](https://github.com/symbiosis-finance/js-sdk/blob/main/src/crosschain/config/mainnet.ts), [API schema](https://api.symbiosis.finance/crosschain/openapi.json).

## Account role and recovery authority

`eth_getCode` returned `0x` for `0x67f9…` on both Ethereum and Symbiosis host chain. It is an externally owned account in these observations, not a user-recovery contract. [Etherscan](https://etherscan.io/address/0x67f9b3E561383493B3f874fEAE0c53c2cD23851D) shows initial funding from `symbiosis-broadcaster.eth` (`0xd99ac0681b904991169a4f398B9043781ADbe0C3`), the older broadcaster/revertable address in the official SDK. [A successful Bridge V2 transaction](https://basescan.org/tx/0xdcd28ccb88d4956a07e38c8e3eca42b71371030ff5c3ecea92304b9f10963fea) and many similar operations show `0x67f9…` relaying `receiveRequestV2Signed` calls. These facts support the broadcaster interpretation. Because that entry point accepts MPC signatures, successful relaying alone is not proof that this EOA owns the MPC key or a legal statement of operator identity.

Live EIP-1967 implementation storage was checked for both relevant proxies:

- Host Synthesis implementation: `0x39fFC1045Ad1B5bB5353Da9e106C32771D0cbb43`; [verified source](https://symbiosis.calderaexplorer.xyz/address/0x39fFC1045Ad1B5bB5353Da9e106C32771D0cbb43?tab=contract).
- Ethereum Portal implementation: `0xA0AeE4eEFb0c7c2706a9B2B9c79d082154b5393c`; [published deployed source](https://etherscan.io/address/0xa0aee4eefb0c7c2706a9b2b9c79d082154b5393c#code).

Synthesis derives the operation key from its internal ID, receiving Portal, designated recovery address, and destination chain. Portal's ordinary `revertBurnRequest`/`metaRevertRequest` reconstruct that key using `_msgSender()`. Calling from the user's different EVM account produces a different operation key; merely possessing the destination wallet therefore does not provide this recovery authority. The host has a bridge-only recovery entry point too, which does not establish an independent user-operated alternative.

## Provider policy and remaining limit

The [official emergencies documentation](https://docs.symbiosis.finance/crosschain-liquidity-engine/symbiosis-and-emergencies) describes automatic reverts for newer stuck swaps and designated recovery senders. It describes refunds returning to the original source address, in the route's transit asset, with applicable fees. The [stuck-swap guide](https://docs.symbiosis.finance/user-guide-webapp/swap-stuck) acknowledges cases requiring support. Its timing statement is a provider policy, not a tested guarantee for this route.

No public source found identifies `0x67f9…` by address as the provider's official recovery service, nor was a TON-user-initiated fallback proven for this exact BOC. Required closure is a current provider statement/config binding this address to recovery service, and either a verified direct TON recovery method or an explicit description of the provider-assisted recovery dependency. Separately, enabling TON signing still needs canonical jetton-wallet derivation, complete BOC validation and a tested cross-chain status/recovery UI. Existing quote-only/handoff behavior remains unchanged.
