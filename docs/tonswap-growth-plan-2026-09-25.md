# XOR → TS promotion and onboarding plan

## Current priority: guided purchase and burn

Updated after the user's explicit correction on 25 September 2026. External outreach is paused; the two email drafts remain unsent. The active goal is a usable **Get TS** journey, with card funding first and Ethereum/TON wallet entry points. The earlier guided route is live. The new amount-first checkout, draft continuity and verified progress upgrade is implemented; final production release checks are in progress and the upgrade is not yet recorded as complete.

| Goal | Acceptance | Current evidence |
| --- | --- | --- |
| Preview before wallet setup | Choose source, asset and amount; show public indicative output, fees and future-claim terms | Implemented; automatic read-only preview, exact arithmetic and stale-result tests pass; final production checks in progress |
| Ship guided card funding | ETH-only MoonPay, budget prefill, displayed Ethereum destination, fresh SORA liquidity check, no unintended automatic ETH bridge | Implemented in the new build; public card quotes verified; final production checks in progress |
| Ship Ethereum conversion | ETH/USDT → DAI quote, exact approvals, verified contract/calldata, receipt handling and ETH gas reserve | Implemented; mocked execution tests and read-only mainnet verification |
| Guide TON holders | TON wallet connection, TON USDT → Ethereum quote, explicit provider handoff, then ETH → DAI | Implemented; local TON payload execution remains unavailable |
| Complete SORA steps | Exact DAI bridge plan and return, finalized bridge/swap evidence, fixed DAI/XOR swap, original marked burn | Implemented; component, precision and transaction-evidence regressions passing; no funded end-to-end trial performed |
| Publish verified entry | Pin new IPFS DAGs, validate/save Bunny origin, purge, verify current CID and live WebKit routes | New production/testnet build candidates ready; deployment verification in progress. TONSWAP source links are already published |
| Direct card → native SORA2 XOR | Verified embedded provider, correct chain/denomination, quote and delivery | No supported provider found; do not advertise as available |

The current production candidate is `bafybeignxpiuidwvdottzfku7ve7cdqlsdtuvqr4iw46jnzoc4ajdulype` (`QmcBkPpcEdpngX3VJY8xBhf7dWyRULLC2eKkcat1uLN6BA`); the testnet candidate is `bafybeibujiisxjk7zx6vk5zmboo4s66cm67ncjnyel2zwczfbnw4u6yi64` (`QmRrmR2hgEBeALgUC5s3LLMThuJmHqaBihwRRXyz1LBo3C`). Candidate IDs do not by themselves prove that production serves the release. The release record will capture the final origin, purge and browser evidence.

See [funding implementation](tonswap-get-ts-funding.md), [draft and verified progress](tonswap-get-ts-plan.md), and [release evidence](campaigns/tonswap-2026-09/get-ts-release-2026-09-25.md). The release record currently documents the earlier deployed version until the new production checks finish. Funding checks are indicative: at 09:26:30 UTC on 25 September, a 100 USD card quote led to an estimated 89.06483 DAI and 16.7691% DAI/XOR price impact, above the 5% route limit. This amount is blocked by current market liquidity even though the external card and conversion quotes are available. No money was moved or token burn signed during QA; newcomer completion, native TON execution, direct card delivery and verified campaign cash receipts remain open product goals.

The earlier outreach tables below are retained as history, not the current execution queue or authorization to send.


Prepared 25 September 2026. This is a proposed campaign and product plan, based on the current working tree and public official information. It does not change campaign rules, publish promotions, or assert that proposed payment integrations are available.

## Recommendation

Make it easy to understand and reserve a future TS allocation, beginning with the people closest to completing the current flow. Promote a demonstrated Tonswap product, explain what TS entitles its holder to, and provide a continuous path from wallet setup through funding to a verified burn receipt.

Run a small organic pilot before paying for traffic. Build a TON-funded route after proving the simpler SORA flow. Treat a checkout that requires no SORA wallet at all as a separate settlement and claim-design project.

## 1. Define the cash outcome alongside participation

Burning XOR destroys it; it does not transfer money to the operator. A market purchase pays the seller or trading pool. Existing holders can burn without making any new purchase.

The intended cash mechanism remains unconfirmed. Before setting an acquisition budget, record:

- Which entity receives money, from whom, and in which asset.
- Whether receipts come from disclosed treasury XOR sales, earned fees, or another defined source.
- The amount and deadline needed, and the costs of earning that amount.
- Any treasury participation or conflict that participants need to understand.

Track two outcomes separately:

1. **Participation:** finalized eligible burns, distinct participating addresses, newly acquired XOR where verifiable, and accurately attributed future TS allocations.
2. **Cash:** realized receipts attributable to the campaign, less payment, execution, inventory, support, subsidy and acquisition costs. Treasury asset sales are asset disposals, not recurring operating revenue; report them separately. An unrealized token-price increase is not cash.

If verified participation rises but realized cash does not, the campaign is not solving the immediate funding need. Keep a parallel operating-income/runway plan rather than increasing promotional spending on that assumption.

## 2. Establish one current explanation

The [official announcement](https://t.me/sora_announcements/1514) links to [Polkaswap's burn page](https://polkaswap.io/#/burn). The current [Tonswap homepage](https://tonswap.org/) describes a live public testnet and future mainnet. The campaign therefore needs to say **reserve a future TS allocation**, not imply delivery of spendable TS today.

The [repository campaign specification](tonswap-burn.md) establishes:

- Eligibility starts at SORA block 27,720,478.
- The burning SORA wallet owns the future claim. The current transaction collects no TON beneficiary address.
- The marginal rate declines from 50 to 5 TS/XOR as eligible burns accumulate, over a rewarded cap of 1,753,357 XOR. Time alone does not lower the rate.
- Each allocation is the area under the curve across that burn, not simply the displayed starting rate multiplied by its amount.
- The full rewarded cap allocates 48,217,317.5 TS. Transactions ahead of a participant affect the estimate.
- XOR is irreversibly burned. Excess beyond the cap earns no TS; the SORA Trust account is excluded from rewards.
- Claims are intended to open on Tonswap at launch. This repository specification does not demonstrate a deployed end-to-end TS claim distributor.

Publish one dated campaign page on the Tonswap website, with a prominent homepage link, covering these facts, current finalized statistics, the TS allocation's source within total supply, launch/claim dependencies, holder rights, vesting or transfer restrictions if any, and what happens if launch is delayed. Confirm unresolved terms with the campaign owner; do not invent them.

Reconcile the [2024 introduction's tentative PSWAP burn proposal](https://tonswap.org/blog/introducing-tonswap) and the [2025 TS token article](https://tonswap.org/blog/ts-token), which describes 100 million maximum TS and 70 million distributed at launch. Explain where this campaign's 48,217,317.5 TS sits in the current allocation table. Add dated update notices linking older articles to current terms rather than silently rewriting their history.

The page should answer, in order: What is Tonswap? What does this TS allocation provide? What is working now? What do I spend? What do I receive now and later? How do I recover and exercise my claim?

## 3. Make the current journey accessible first

Proposed journey:

**Preview allocation → choose starting point → create/connect wallet → acquire XOR → review burn → sign → verify reservation and save receipt.**

The first screen should not require a wallet. Show the existing public curve, estimated allocation for an entered amount, and total-cost components. Where no executable funding quote exists, label estimates as such. Avoid presenting a dollar budget as a guaranteed TS purchase price.

| Starting point | First release | Important limitation |
| --- | --- | --- |
| Already has XOR on SORA | Direct campaign review and burn | Keep enough XOR for the separate burn fee |
| Has another supported asset on SORA | Preselect XOR in swap; preserve campaign intent and return automatically | Use an executable route and slippage-protected amounts |
| Has XOR on an exchange | Explain the SORA network and prefill the receiving address using existing deposit integration where supported | Verify current exchange withdrawals; a matching ticker on another network is insufficient |
| Has no SORA wallet | Surface the configured Google wallet path and supported external-wallet alternatives | Google avoids an extension where available, but still requires account creation and recovery setup |
| Has TON/USDT outside SORA | Explain currently verified acquisition options; collect optional interest in a simpler route | Direct TON-funded checkout is proposed, not available merely because both assets exist |
| Has only fiat | Provide a tested route only after validating the complete provider/bridge journey | Existing MoonPay integration is not direct card-to-XOR or card-to-TS delivery |

Specific implementation work:

1. Add an explicit **New here? Get started** entry beside the existing wallet/burn action. Use ordinary language and offer only routes that work for the user's assets and network.
2. Preserve selected campaign, intended amount and return destination across wallet, deposit and swap screens. Re-quote on return and never auto-submit the irreversible burn.
3. Reuse output-funded swap fees. The current swap code can pay fees from received XOR when sufficient output exists; users with another supported SORA asset do not necessarily need a separate gas top-up. Reserve the later burn fee as well.
4. Validate Google onboarding on actual mobile Safari/Chrome before advertising an extension-free route. Ordinary browser mode registers the Google option conditionally; local SORA-wallet creation is currently desktop-specific. Do not describe this as seedless or passkey login.
5. Show separate funding, swap, burn-finality and reservation statuses. Existing burn receipts already handle pending/finalized evidence; extend those instead of replacing them with a success animation.
6. Add an exportable receipt containing campaign/version, signing address, amount, finalized transaction hash, allocated TS, official claim location and backup reminder. A receipt is evidence, not a substitute for control of the signing wallet. Never export seed phrases or passwords into receipts.
7. Allow users to resume after reload or wallet return. Do not retry an uncertain payment or burn as a new transaction.

Preserve the existing direct-burn availability policy documented in [the availability decision](tonswap-burn-availability-2026-09-21.md). Do not silently introduce a reward-data gate into that flow. Explain unavailable estimates and unrewarded amounts plainly. A future payment service should stop accepting new orders when it cannot establish supportable terms; this is distinct from changing existing holders' ability to burn. A frontend cap check alone cannot guarantee allocation against concurrent burns.

## 4. Add payment options in two stages

### Stage A: pay with TON/USDT, receive XOR into your own SORA wallet

This is the nearer-term route to evaluate with an exchange or liquidity partner:

1. User creates or connects a SORA wallet and verifies control before payment.
2. Partner quotes one supported source asset/network, exact total cost, XOR delivery including the burn fee reserve, expiry and refund terms.
3. User pays using their existing source-chain wallet.
4. After confirmed payment, the partner delivers XOR to that user's SORA wallet.
5. The user reviews a fresh allocation estimate and signs the existing qualifying burn.
6. The campaign records the user-owned reservation after finality and indexing.

This can remove the need to own XOR beforehand while preserving current claim ownership. It still uses a SORA wallet and is not an atomic cross-chain purchase. No suitable partner, route, liquidity depth or commercial terms were verified in this planning exercise.

For a pilot, select one network and one asset rather than accepting everything. Define underpayments, duplicate payments, wrong networks, late payments, failed delivery, price movement, campaign-cap changes and who bears execution costs. Make clear when the provider's XOR delivery is complete and when the separate TS reservation is complete. Do not promise refunds of already burned XOR.

Verify the provider's permitted markets and ability to support this offering before collecting funds. Keep order reconciliation and any operator keys outside the static frontend, in an approved service or provider. The Polkaswap site must remain deployable as static IPFS assets.

### Stage B: a TON wallet is the only wallet the participant manages

This is the desired eventual experience for a TON audience, but it requires an explicit beneficiary and claim protocol. [TON Connect](https://docs.ton.org/applications/ton-connect/overview) connects TON wallets; it does not make them SORA signers.

Today, a service burning from its own account owns the claim. Recording a customer's TON address in a database does not change the existing campaign entitlement. Nor can the current exact two-call burn be silently extended into an atomic swap-plus-burn transaction: that would change eligibility.

Before shipping this route, design and review a versioned beneficiary mechanism, proof of beneficiary control, replay prevention, unique payment-to-burn attribution, finality/reconciliation, recovery, and the claim distributor. Preserve existing claims and total-cap accounting across versions; do not invent a second overlapping allocation. A custodial promise to transfer TS later must be identified as custody and counterparty exposure rather than described as a user-owned on-chain reservation.

Passkeys or other embedded-wallet technology also need a SORA-compatible signing and recovery design. They are not a drop-in consequence of adding a generic wallet SDK. Card/bank checkout follows only when provider support, source-chain fees, geography and the complete delivery path are established.

## 5. Promote to audiences in order of readiness

| Audience | Message | Distribution experiment | What success means |
| --- | --- | --- | --- |
| Existing XOR holders | Understand and verify the TS reservation opportunity | Official SORA/Polkaswap channels and an in-app entry | Eligible allocations; do not count all burns as new purchases |
| Other SORA asset holders | A guided path from your current asset to a TS reservation | Short walkthrough and live onboarding session | Completed acquisition plus burn, with manageable support |
| TON traders and prospective LPs | See Tonswap work; understand TS and participation terms | Product demos and educational sessions with relevant TON communities | Qualified interest now; funded conversion after the route works |
| People new to crypto | Clear costs, recovery and claim expectations | Beginner guide after funding is proven | Independent completion without hidden wallet/gas surprises |

Prepare a small campaign kit:

- A 60–90 second product-and-participation video. Identify testnet footage explicitly and keep real-asset burn instructions separate.
- One beginner walkthrough, one wallet/funding troubleshooting guide, and a pinned FAQ.
- A weekly, timestamped report of finalized eligible burns and reservations, product progress and unresolved issues.
- Two scheduled community office-hour sessions during the pilot, with moderators helping people use their own devices. Support never receives recovery phrases or controls participants' wallets.
- Outreach drafts for a small set of relevant community operators offering a useful product demonstration and Q&A. Send only when explicitly authorized; disclose paid relationships.

Use product evidence and verifiable campaign progress. Do not promise token appreciation, fixed yield, launch dates that are not committed, or artificial countdowns. The curve rewards earlier eligible burn positions; it does not establish financial returns.

### Draft announcement

> You can reserve a future TONSWAP TS allocation by burning XOR on Polkaswap. Preview the estimated allocation, review the campaign terms, and keep the SORA wallet used for your burn: it owns your future claim. Claims are planned to open on Tonswap at launch. XOR burns are irreversible and campaign limits apply. Start here: https://polkaswap.io/#/burn

### Draft product post

> TONSWAP's public testnet is live. Explore the product with test assets, then read how the separate XOR burn campaign reserves future TS allocations. Testnet activity does not itself buy or reserve TS. Product: https://tonswap.org/ · Campaign: https://polkaswap.io/#/burn

### Draft onboarding post, publish only after the journey is implemented and verified

> Interested in TS but don't hold XOR? The guided campaign flow now helps you choose a supported wallet and funding route, acquire XOR, and review your burn before signing. You'll see the costs and receive a record of your finalized reservation. Check the supported routes and claim terms before starting.

The first two drafts describe the existing documented offering; review them against the new canonical terms before publishing. The third is conditional copy and must not be used to imply a feature already exists.

## 6. Execute a 30-day pilot

Dates below are a proposed sequence, not delivery promises. Payment integrations may extend beyond the pilot.

| Period | Owner role | Deliverable and exit condition |
| --- | --- | --- |
| Days 1–3 | Campaign owner + content | Confirm cash mechanism and current TS terms; reconcile allocation table; prepare canonical page and campaign kit |
| Days 1–7 | Product + frontend | Observe 10 volunteers across funding/wallet starting points; build the guided entry and return flow; verify supported routes on mobile |
| Days 8–14 | Community + product | Publish approved materials, run two office hours, pilot the supported route with a small audience; fix the largest measured abandonment point |
| Days 15–21 | Partnerships + engineering | Evaluate one TON/USDT-to-XOR delivery partner and test order recovery; if unavailable, continue improving verified routes without advertising the proposal |
| Days 22–30 | Campaign owner + analytics | Review cohort conversion, support burden, verified new purchases and realized cash; expand only the routes and channels that meet their criteria |

Default to **zero paid-media spend** for the initial pilot and existing team capacity. Any provider deposit, inventory commitment, gas subsidy or paid promotion needs a separate capped operating budget based on the confirmed cash mechanism. Do not start with large influencer retainers or token referral promises.

Proposed usability target: at least 8 of 10 representative volunteers complete a supported journey without live intervention, and every completed burn is attributed correctly. These are release criteria, not measured results or forecasts. Record completion time and support minutes; set route-specific targets after observing the baseline rather than promising a universal two-minute checkout.

## 7. Measure the whole journey

Capture aggregate events for campaign view, preview, wallet ready, funding started, funding confirmed, swap complete, burn submitted, burn finalized and reservation indexed. Keep stages distinct. Use campaign/source tags across the wizard and outbound-provider return where possible. Collect only necessary analytics; avoid attaching personal identity or unnecessary wallet balances to marketing data.

Report weekly:

- Completion and abandonment by starting asset, wallet type, device and acquisition channel.
- Distinct participating addresses, new versus returning campaign addresses, and eligible burns. Addresses are not a verified count of individual people.
- Verifiable newly acquired XOR separately from pre-existing inventory burns; do not infer fresh external money from volume alone.
- Funding/burn fees, price impact, elapsed time, failures, duplicate attempts and support minutes.
- Finalized TS allocation accuracy and time to a visible receipt.
- Realized cash and contribution after all direct costs, separately from campaign notional value.

Pause promotional expansion if allocations or claim ownership disagree, a funding route becomes unreliable, or people cannot recover the relevant wallet. Pause paid acquisition if attributable contribution cannot cover its costs. If revenue mechanics remain undefined, keep reporting participation without calling it fundraising success.

## Implementation references

- [Burn UI](../src/features/misc/components/burn/TonswapBurnCampaign.vue): current XOR-only entry, fees and receipts.
- [Burn math and marker](../src/features/misc/lib/tonswapBurn.ts): exact accounting and eligibility marker.
- [Wallet bootstrap](../src/lib/soraneo-wallet/src/bootstrap.ts), [Google registration](../src/lib/soraneo-wallet/src/services/google/wallet/index.ts), and [account creation](../src/lib/soraneo-wallet/src/components/Connection/Step/CreateAccount.vue).
- [Swap fee assessment](../src/features/swap/services/feeAssessment.ts): output-funded XOR swap fees.
- [Exchange deposit integration](../src/features/deposit/pages/CedeStorePage.vue).
- [Deposit prerequisites](../src/features/deposit/pages/DepositOptionsPage.vue) and [MoonPay bridge](../src/composables/useMoonpayBridge.ts).

Implementation must retain denomination-aware exact arithmetic, existing campaign eligibility, static/IPFS compatibility, unit coverage, synchronized translations and mobile browser verification. Public website and source review were read-only; no real wallet transaction or new provider integration was tested for this plan.
