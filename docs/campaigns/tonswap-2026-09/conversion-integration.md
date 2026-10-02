# Get TS conversion integration

Verified with read-only mainnet data on 25 September 2026. No funds moved, approvals requested, wallet signatures obtained, or provider orders created. Outreach is on hold following the user's correction; the two Gmail messages remain unsent drafts.

## Current implementation

`src/features/misc/lib/tonswapConversion.ts` offers live quotes for Ethereum ETH/USDT to Ethereum DAI, and TON-USDT to Ethereum ETH/DAI. Only Ethereum-to-DAI quotes which pass the narrow decoder below are executable in the adapter. The UI must show `executionEnabled` and the actual `minOutputAmount`, not infer execution support from a successful quote.

Call `requestTonswapConversionQuote({source, target, amount, fromAddress, toAddress})` with natural-unit strings. Quantities in the returned quote are exact codec strings. Inject `fetch`, `now`, and `signal` for deterministic tests and cancellation. Sources are `eth`, `usdt-ethereum`, `usdt-ton`; targets are `eth`, `dai`. ETH→ETH is rejected. The API endpoint, token identities and networks are fixed. XOR is deliberately excluded after poor executable-value results and denomination verification.

After an explicit user action, call `executeTonswapConversionQuote(quote, {evm: {getSigner}, canContinue})`. `getSigner` supplies the current ethers signer; `canContinue` binds the UI's amount/source/account generation and downstream liquidity freshness. The adapter reacquires the signer around asynchronous boundaries. A returned hash means submitted, not confirmed or received. The UI emits the hash immediately for recovery, then advances only after the canonical transaction and receipt match the current Ethereum mainnet account and the receipt contains a positive net canonical DAI credit to the quoted recipient. The amount comes from that receipt’s Transfer logs; wallet balance deltas are not evidence of this conversion. No private keys are handled by this module.

Quotes expire after 30 seconds including request latency. Do not store or replay calldata. A confirmed USDT allowance can outlive its quote: refresh the quote before the swap if approval confirmation took too long. The adapter only remembers 32 quote fingerprints in memory and rejects altered/replayed quotes. This survives Vue proxies without trusting caller-supplied execution flags.

The panel now debounces read-only quotes and downstream liquidity checks automatically. It freezes refresh while an explicit wallet review is in progress, and its continuation guard binds both the conversion quote and the accepted liquidity-result objects to that click. Expiry or replaced terms requires fresh displayed evidence and a new click; a rejected or expired financial action is never automatically re-executed. Display amounts are rounded separately from exact execution values. Successful completion emits the observed DAI amount together with the confirmed transaction hash so the parent journey can preserve a reviewable result.

## Ethereum execution policy and evidence

The current API uses a newer gateway than the older SDK configuration cited by the general documentation. It was independently checked through verified deployed source and mainnet `eth_getCode`/`eth_call`. This is a specific version allowlist, not a blanket trust in all API transactions.

| Contract | Ethereum address | Runtime Keccak-256 |
| --- | --- | --- |
| Symbiosis OnchainGateway | `0xE7e68D336F90f98D22A479253eafA5f2424aCaD8` | `0xa5609ff7a3eab8c2666b7b96c52e7e23313f539878fb07852345cf77e5d713b7` |
| Gateway's OnchainExecutorDontApprove | `0x7C84fC7b4EebdFE96339Fd89eF5eeA24cECf20B9` | `0x7160c4e2796198a25f2c8d7e459972da04307f42b4e40d34999f589ce7556695` |
| 1inch AggregationRouterV6 | `0x111111125421cA6dc452d289314280a0f8842A65` | `0xa5a286be4b80006cc547d7e899871aa01a0e0551e2a509233375405f92098c2f` |
| 1inch aggregation executor | `0x111116053F09d34a7Eae8102887004445176CA11` | `0x17060e8cd05749bed98f4810852c270ee5458a4f0761f1b0a15bc4730babe18f` |

Primary evidence: [gateway verified code and creator](https://etherscan.io/address/0xE7e68D336F90f98D22A479253eafA5f2424aCaD8#code), [gateway executor](https://etherscan.io/address/0x7C84fC7b4EebdFE96339Fd89eF5eeA24cECf20B9#code), [1inch verified code](https://etherscan.io/address/0x111111125421cA6dc452d289314280a0f8842A65#code), [aggregation executor](https://etherscan.io/address/0x111116053F09d34a7Eae8102887004445176CA11#code). Gateway creator is explorer-labeled Symbiosis SyBTC: Deployer `0x6dCB5E43B05918505f65BF423088af172C32be33`. No explorer label alone is used as an execution check. All four runtime hashes are checked through the connected provider before approval/send.

The API request disables other current Ethereum routing providers. Unknown routes remain readable but cannot execute. The adapter decodes `onswap(address,uint256,address,address,bytes)` and the nested 1inch `swap(address,SwapDescription,bytes)`. It verifies the source token, destination DAI, exact nested input, recipient, fixed executor/router/spender, zero flags (no partial-fill/Permit2/extra-ETH modes), and actual minimum. It accepts canonical ABI encoding plus the observed fixed four-byte attribution suffix `3d2f69a4` only.

For native ETH, the provider's outer event amount is input minus fee; deployed gateway source does not use that field to transfer native input. The nested 1inch amount must equal the exact user input and `tx.value` must equal input plus the disclosed fee. For USDT, both outer and nested amounts must equal the exact input and `tx.value` must equal the disclosed native fee. The gateway's mutable `fee()` and fixed executor getter are reread before send. Network gas is additional; the final gas estimate and balance check must pass.

The conversion must leave an ETH reserve for the later DAI approval and Hashi transfer. `estimateTonswapBridgeGasReserve` uses 196,000 gas (twice the existing 45,000 approval plus 53,000 ERC-20 transfer baselines) at current `maxFeePerGas`, falling back to `gasPrice`. The final balance check also includes a 25% upward-rounded margin on the conversion gas estimate. Missing/nonpositive gas evidence blocks sending. The UI shows the bridge reserve estimate; it is retained in the wallet, not paid to the application. This is a conservative budget, not a guarantee against future gas changes.

The provider is requested with 1% slippage. A defensive 2% output floor rejects unexpectedly loose provider responses; the displayed, bound minimum is always the actual encoded minimum. The downstream XOR fee-coverage check uses this accepted 2% bound followed by configured SORA slippage, rather than assuming the requested 1% was enforced. In the captured USDT quote, API JSON slightly overstated the calldata minimum (less than one millionth of a DAI), so the adapter uses calldata. No output is represented as guaranteed before transaction inclusion.

USDT approval is exact input only. An existing different allowance is reset to zero, confirmed, then replaced with the exact input and confirmed. The allowance is reread before swap. Gateway source routes execution through its fixed executor, and the nested checked 1inch route enforces the minimum before transferring output. No maximum allowance, arbitrary router, or caller-defined network/token is supported.

Runtime fixtures and unsigned quotes are stored under `tests/unit/features/misc/fixtures/tonswapConversion.json`; the fixture account is the public API documentation example, not a user wallet. Tests never contact a network or sign. Live small-value execution has not been performed; do not call this flow production-transaction verified.

## TON route status and gas

Read-only quote success proves routing availability at that time, not complete wallet execution. `100 TON-USDT → Ethereum ETH` quoted approximately `0.037108593696342050 ETH` with `0.036737322214134368 ETH` minimum and a `0.2 TON` message attachment. Cross-chain fees also applied. The native attachment is neither the total fee nor a promise that all of it is consumed.

TON execution remains disabled pending a complete message verifier and recovery disclosure. The [completed read-only recovery audit](ton-recovery-audit.md) decoded the canonical USDT transfer amount/opcode, TON excess-refund address, configured bridge destination and intended successful Ethereum recipient. Both host-chain and final Ethereum recovery fields designate `0x67f9b3E561383493B3f874fEAE0c53c2cD23851D`; supplying `revertableAddresses` for chains 13863860 and 1 did not change them. On-chain evidence strongly supports a Symbiosis broadcaster role, consistent with the provider's documented automatic-revert policy. An address-specific official operator declaration was not found.

These fields delegate authority to initiate recovery; they do not establish the refund destination. Symbiosis documents refunds to the original sender, with occasional support intervention. Deployed contract semantics show that the user's different Ethereum wallet cannot initiate the matching ordinary recovery call, while an independent TON source-chain rescue path remains unverified. Disclose that provider-assisted recovery dependency. The production adapter currently checks only address syntax/checksum, message shape, bounded attachments and expiry. Research decoding is not a runtime verifier: canonical user jetton-wallet derivation, complete transfer/bridge/refund/recipient/minimum validation, and connected TON mainnet identity binding still need implementation and tests before on-site signing can be enabled.

The TON panel independently quotes the current TON-USDT→ETH route, then uses that quote's exact minimum ETH output for a read-only ETH→DAI quote. Its SORA liquidity check uses the newly quoted DAI output; a missing or stale original `daiIntent` cannot hide the handoff. Both conversion quotes and the SORA check must remain fresh, and both conversion price impacts must stay within 5%. Amount, wallet, network, source, and purchase-purpose changes cancel pending reads and revoke the handoff. A failed downstream read shows the existing retryable quote error and retries after 15 seconds. This preflight still excludes Ethereum gas; it neither reserves a route nor signs either transaction. After actual ETH arrives, the explicit after-fees budget action and final signing checks apply to the current balance.

The honest current fallback is a labeled handoff to [Symbiosis](https://app.symbiosis.finance/swap), then return after ETH is received on Ethereum. The direct TON-USDT→DAI quote does not supply ETH for later approval/Hashi fees; use the ETH bootstrap when the wallet lacks gas. Sending native TON directly to Ethereum ETH returned no route in the test. A separate STON.fi native-TON→USDT simulation succeeded, but that extra swap is not implemented in this adapter.

The [Symbiosis API documentation](https://docs.symbiosis.finance/developer-tools/symbiosis-api) and [OpenAPI schema](https://api.symbiosis.finance/crosschain/openapi.json) describe `/v2/quote`, integrator-defined partner IDs, transaction status and calldata freshness. No secret key is required for the verified public quote endpoint. A CORS preflight from Polkaswap passed. `fallbackReceiver` is requested as the user's Ethereum destination, but it does not establish ownership of every nested recovery field in TON calldata. No SORA wallet or TS beneficiary claim is created by this adapter.

## Flow acceptance

1. Quote and confirm the actual ETH/USDT input, native fee, minimum DAI and later SORA liquidity/fee reserve before requesting a wallet action.
2. Complete wallet approvals and conversion; confirm receipt and observed output.
3. Bridge DAI through the existing registered Ethereum→SORA route; verify the user's native-chain receipt before the SORA swap.
4. Obtain XOR using a fresh denomination-correct SORA quote, leave the burn fee, then request the separate real burn confirmation.
5. Preserve the existing signer-owned future TS claim and index the finalized burn before showing a reservation/receipt.

This conversion code does not supply bridge liquidity, a gas subsidy, a TON-owned TS claim, immediate TS delivery, or money to the campaign operator. The campaign cash mechanism remains an unanswered business input.
