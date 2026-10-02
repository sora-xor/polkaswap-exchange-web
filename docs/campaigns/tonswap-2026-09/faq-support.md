# Participant FAQ and support runbook

Prepared 25 September 2026. Public campaign destination: `https://tonswap.org/ts`, confirmed live and verified by the deployment workstream. Participation destination: `https://polkaswap.io/#/burn?campaign=tonswap`; consult the tracker for its separate release evidence. The existing burn page remains `https://polkaswap.io/#/burn`.

## Public FAQ

**What is the XOR → TS campaign?**

It is a way to reserve a future Tonswap TS allocation through a qualifying XOR burn on SORA. Claims are intended to open on Tonswap at launch. You do not receive spendable TS when you burn.

**Is Tonswap already on mainnet?**

The [official site](https://tonswap.org/) currently offers a public testnet, with mainnet ahead. Testnet activity uses test assets and does not itself reserve TS through this campaign.

**Do I need a TON wallet to burn?**

The current campaign uses your SORA wallet. The signing SORA account owns the future claim; the burn does not ask for a TON destination. Preserve control of that account. Follow the official claim instructions when they are released.

**I have no SORA wallet. Where do I start?**

Open Polkaswap's account connection flow and choose an available supported wallet. A Google-backed option may be available in the configured browser flow. It still creates a SORA account and requires recovery setup; it is not a promise of seedless access. Confirm you can recover your wallet before funding it.

**I have another asset on SORA but no XOR.**

A supported Polkaswap swap into XOR may be available. Review the actual route, price impact, minimum received and fees. Some swaps can pay their fee from received XOR when the output is sufficient. You still need enough XOR left for the separate burn fee.

**I have TON, USDT, or only a bank card. Can I buy TS directly?**

No direct TON/card-to-TS flow has been verified for this campaign. You need a working route that delivers native XOR to your SORA wallet first. Provider support depends on the exact asset, network and region. Do not send funds to an address simply because its token label says XOR, SORA or USDT.

**Can I withdraw XOR from an exchange?**

Only when that exchange currently supports native SORA withdrawals for the correct XOR asset. Check the network, receiving address, current denomination, minimum, fee and withdrawal status before paying. An exchange appearing inside a widget does not prove that this particular route works. See the [provider review](funding-provider-review.md) for research status, not a guarantee.

**How much TS will I reserve?**

The marginal rate decreases from 50 to 5 TS per XOR over the rewarded cap of 1,753,357 XOR. Your allocation is calculated across the curve segment consumed by your eligible burn. The first displayed rate multiplied by your full amount is not the calculation. Earlier finalized transactions can change the estimate.

**What happens at the cap?**

The full rewarded cap allocates 48,217,317.5 TS. The entire submitted XOR amount burns irreversibly, even when part or all of it is beyond the cap. That excess earns zero TS. The excluded SORA Trust account receives zero TS and its burns do not consume the rewarded cap.

**The estimate is unavailable. Is burning disabled?**

No. The existing flow permits burning independently of reward-data availability. An unavailable estimate means the UI cannot currently establish that estimate. It must not be treated as either a zero or guaranteed positive allocation. Review the irreversible-burn and cap notices before deciding.

**Can I undo a burn or obtain a refund?**

XOR burns are irreversible. A provider's refund policy for an incomplete funding order does not reverse a completed burn.

**Why is my receipt still pending?**

Submission, inclusion, finality and campaign indexing are separate stages. Keep the transaction hash and use the receipt's status refresh. A send error may leave the transaction's outcome uncertain; do not submit the same intended burn again merely to make the status disappear.

**Does a receipt let me claim without my wallet?**

No. The receipt is evidence of the transaction. You must retain control of its signing SORA wallet. Never put recovery phrases or passwords into a receipt or send them to support.

**Where are the claim date, complete TS rights and launch allocation terms?**

Use the dated canonical campaign terms once published. The implementation specifies a future claim at Tonswap launch; it does not establish a guaranteed launch date. Older articles contain proposed tokenomics that need reconciliation with the current campaign. Support must identify unresolved terms rather than improvise them.

## Beginner walkthrough

1. Read the current campaign explanation. Distinguish it from the separate SOLSWAP/SS/Nexus campaign.
2. Create or connect a SORA wallet you control; complete its recovery setup privately.
3. Choose a currently supported funding route. Verify that it ends with native XOR on SORA, including enough for the burn fee.
4. Return to the TONSWAP campaign and review a fresh estimate and total amount. Funding does not lock a TS allocation.
5. Review and sign only if you choose to proceed. The entire amount is irreversibly burned.
6. Follow the transaction receipt through finality and indexed allocation. Save the record and retain the wallet.

## Support triage

First ask only for the stage, device/browser, displayed error category and approximate time. Request a public transaction hash only when it is necessary to investigate a submitted transaction, through the designated support channel. Explain that a hash exposes public wallet activity. Do not ask for a phrase, key, password, Google recovery code, exchange API secret, remote-control access or money to “unlock” a claim.

| Symptom | Next action | Resolution evidence |
| --- | --- | --- |
| Wallet connection fails | Confirm supported wallet/network and whether a mobile browser return was interrupted; use the wallet's documented reconnect flow | Correct SORA account is connected; no signature is submitted by support |
| No supported funding route | Record asset/network and show only verified options; do not recommend an unverified bridge or exchange | Usable route and quoted fees are established, or the limitation is stated plainly |
| Exchange shows XOR but no SORA withdrawal | Stop that funding path and confirm provider network support | Native SORA withdrawal enabled with correct denomination and destination |
| Funding sent but balance absent | Track the existing provider order/transaction with the provider; separate payment confirmation from SORA delivery | Matching delivery transaction and correct destination balance |
| Insufficient burn funds | Recompute burn amount plus current atomic-burn fee; leave an appropriate reserve | UI balance check passes for the reviewed amount and fee |
| Estimate missing or stale | Explain the advisory estimate and existing availability policy; escalate indexer issue without changing burn entitlement | Complete finalized snapshot reconciles; no invented allocation |
| Send error or uncertain status | Preserve the deterministic transaction identity and inspect its state; never instruct a blind repeat | Existing transaction identified as finalized, failed, or still unresolved |
| Finalized burn absent from reservation | Check mainnet, start block, signer, exact marked atomic structure and complete global indexing | Exact signer and transaction hash match the finalized allocation, or concrete ineligibility is explained |
| Zero reward | Check cap position and Trust exclusion; distinguish legitimate zero from unavailable data | Chain-order allocation explains the amount; no promise of a manual override |
| Lost wallet access | Direct user to their wallet's recovery instructions and backup; do not promise claim reassignment | User recovers the original signing account, or limitation remains explicit |

## Escalation and response templates

**Uncertain submission:** “Your transaction outcome is still being checked. Keep the existing transaction record and use status refresh. Please do not repeat this same intended burn while its outcome is uncertain.”

**Missing allocation:** “Finality and campaign indexing are separate. We will check the finalized transaction against the exact campaign marker, signer and global ordering. We cannot confirm an allocation from a pending receipt alone.”

**Unavailable route:** “We have not verified native XOR delivery for that asset and network. Please do not send funds using that route yet. The current campaign requires XOR on SORA and a SORA wallet you control.”

**Unknown launch term:** “That term has not been confirmed in the current campaign documentation. We will refer it to the campaign owner and update the dated terms once confirmed.”

Escalate entitlement mismatches or possible duplicate fulfillment immediately to engineering; pause expansion of the affected promotional/funding route. Preserve existing direct-burn availability. Record confirmed facts, public transaction identity only when required, owner and next update time; avoid speculative balances or blame. Proposed support target during staffed sessions: acknowledge within 15 minutes, give an evidence-based status within one business day. This is an internal target, not an advertised 24/7 guarantee.

Behavior reference: [campaign specification](../../tonswap-burn.md) and [availability decision](../../tonswap-burn-availability-2026-09-21.md).
