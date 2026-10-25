# TONSWAP XOR burn campaign

The TONSWAP campaign starts at SORA block **27,720,478**, inclusive. It is
separate from SOLSWAP's SS / SORA Nexus XOR campaign. The signing SORA wallet
owns its future TS claim. There is no SORA Nexus or TON destination input and
no XOR migration. TS becomes claimable on **https://tonswap.org at launch**;
burning reserves a future claim rather than delivering TS immediately.

## Identification and ordering

A qualifying transaction is a successful, finalized, atomic
`utility.batchAll([assets.burn(XOR, amount), system.remark(marker)])` with exactly
these two calls in this order. Its public marker is:

```json
{"app":"polkaswap","kind":"tonswap-xor-burn","version":1}
```

The marker has exactly these fields and values. A standalone remark, non-atomic
batch, failed batch, different asset, Nexus marker, or unmarked burn does not
qualify. TS burns must be excluded from SS/Nexus reward accounting.

SORA Trust account `cnRus2m2Rn776v88H5RUtyiaXtr3daN6ePn6yenLKepx1SqYo`
is excluded from both burn reward campaigns. Its burns never contribute to TS
burn totals, cap usage, the reward curve, or claim allocations, including burns
already finalized since the starting block. Match the underlying AccountId32
(`0x12bed8da37e42af92986e9c0988b588da0e23422c287aa81a4bec9bb1e82db02`),
so alternative SS58 prefixes or hexadecimal encodings cannot bypass this rule.
Raw chain/indexer history is retained for audit; eligibility filtering is not
deletion. The future Tonswap claim distributor must apply this same exclusion.

Allocate globally by ascending `(blockHeight, extrinsicIndex)`, using all
qualifying burns from the inclusive starting block. The transaction hash binds
the burn identity and the transaction's signer owns the allocation. Identical
duplicate rows are counted once; conflicting identities or positions and
missing order fail the calculation. An account-only subset, incomplete indexer
page, or optimistic wallet history cannot establish a quote or final claim.
The pure allocator trusts its caller to verify finalized stream completeness,
the marker, and the exact atomic transaction structure.

## Curve and cap

Let `C = 1,753,357 XOR` and `x` be the cumulative eligible XOR already burned.
The marginal reward falls linearly:

```text
r(x) = 50 - 45x/C TS per XOR, for 0 <= x <= C
F(x) = 50x - 45x²/(2C) TS
```

For a requested burn `a`, the eligible portion is
`e = min(a, max(C - x, 0))`. Its reward is the integrated curve interval
`F(x + e) - F(x)`. A burn crossing the global cap earns TS only for its eligible
portion; **the entire amount is still irreversibly burned**. Once the cap is
reached, further burns earn zero. The curve's endpoint remains 5 TS/XOR for
display and integration; it does not imply a reward for burns after the cap.

The total allocation at the cap is exactly **48,217,317.5 TS**. For example,
the first 876,678.5 XOR earns 33,971,291.875 TS, and the second half earns
14,246,025.625 TS. Quotes can change when earlier transactions finalize,
including concurrent burns near the cap.

## Precision and use

`src/features/misc/lib/tonswapBurn.ts` exposes the campaign constants,
`createTonswapXorBurnRemark`, `parseTonswapXorBurnRemark`,
`getTonswapCurrentRate`, `getTonswapRemaining`, `quoteTonswapBurn`, and
`allocateTonswapBurns`. Public monetary inputs and outputs are `FPNumber` natural
amounts. Supply denomination-adjusted XOR from the authoritative chain/indexer
conversion; do not feed raw pre-denomination amounts or JavaScript numbers.
Negative, non-finite, or finer-than-18-decimal amounts are rejected.

The implementation converts natural amounts to exact 18-decimal integers and
uses integer rational arithmetic. `F` is rounded down at each cumulative
boundary, and an allocation is the difference between those boundaries.
This rounding carries fractional atoms across adjacent burns: splitting the
same interval produces exactly the same aggregate entitlement and the full cap
produces exactly the stated TS total. Individual allocations may differ from
independently rounded integrals by at most one `10^-18 TS` atom. The displayed
marginal rate is rounded down to 18 decimal places.

Use `allocateTonswapBurns(completeFinalizedBurns)` for the global allocation and
filter its resulting rows by the burning SORA wallet for account totals. Use
`quoteTonswapBurn(allocation.totalBurned, requestedAmount)` for an indicative
next-burn quote. Do not silently replace failed or stale global data with zero.

The focused unit suite is `tests/unit/features/misc/tonswapBurn.spec.ts`.

## Polkaswap interface

`TonswapBurnCampaign.vue` is a separate card on `/#/burn`, alongside the existing
SOLSWAP card. It provides the global rate, cap progress, burning-wallet totals,
and finalized claim records with copyable transaction hashes. Its modal accepts
only an XOR amount and explains that the entire amount burns irreversibly, any
portion over the cap earns no TS, and claims open on Tonswap at launch.
The reward cap does not limit the amount that can be burned. Cap-crossing and
post-cap burns remain available, with the portion earning no TS shown explicitly.
The excluded Trust account may also burn but receives no TS rewards.

The card refreshes complete finalized statistics every five seconds and on block
and tab-return events. Signing does not wait for or require campaign statistics.
A submitted burn has a persistent visible receipt with its
amount, copyable signed transaction hash, and progress through block inclusion,
final confirmation, and indexed TS reservation. Wallet history and block updates
trigger immediate reconciliation; a pending burn also retries every two seconds
for two minutes. Longer delays retain the receipt, explain that tracking continues,
and provide a status refresh button alongside the normal background refresh.
Unresolved finality or indexing does not disable another burn. Separate pending
receipts remain visible when the wallet submits additional transactions.

Only the exact transaction hash and signing account in the complete finalized
snapshot mark the reservation updated. An RPC send error without an on-chain
failure is treated as ambiguous: the SDK's deterministic signed history ID keeps
the transaction traceable even if its `txId` was cleared. History recovery is
restricted to the TS marker, XOR asset, source wallet, amount, and submission time,
so a concurrent unrelated wallet operation cannot claim the receipt. Reloading
recovers a recent unresolved marked burn from the wallet's persisted history
(within 24 hours). Pending local history never increases TS reservations.

Reward estimates are advisory and can change with earlier finalized transactions.
Missing campaign data displays an unavailable estimate; it never invents a zero
or positive reward and never disables burning. Certified older data remains
visible without imposing an age cutoff on submission. The irreversible-burn and
reward-cap notices remain visible when an estimate is unavailable.

Unavailable or malformed atomic-burn fees, invalid amounts or balances,
insufficient funds, a closed dialog, or an active signature/submission prevent
another invalid or duplicate submission. Balance checks use the entered XOR
amount plus its fee independently of any TS estimate. A final check binds the SDK's actual
signing account to the reviewed wallet and verifies the connected chain's SORA
mainnet genesis hash. Account, network and component-lifecycle changes cancel
in-flight preparations.

The bundled logo `src/assets/img/tonswap-mark.svg` comes from the official
TONSWAP site repository, `../tonswap-site-web/src/public/icon.svg`. It is served
as a static build asset so the card also works under an IPFS content path.

UI regressions are covered by
`tests/unit/components/pages/Burn/TonswapBurnCampaign.spec.ts`; the existing
`tests/unit/views/Burn.spec.ts` stubs the independent card while verifying the
SOLSWAP flow remains available.

The account's **Your burn history** section lists finalized TS burns individually,
newest first, with XOR burned, TS reserved, block, and full copyable transaction
hashes. Its source is the entire paginated campaign snapshot, not a recent-history
limit. Pending submissions appear individually with their confirmation status
and are replaced by their finalized records when indexing completes.

## Logo fire

`BurnLogoFire.vue` and `burnLogoFire.ts` render blue fire from the official
Tonswap symbol and red fire from the SORA SVG silhouette on the Nexus campaign.
The SVG is also the static fallback. The shader is presentation-only and never
receives transaction or wallet data. It uses a fixed 224 × 224 pixel surface,
at most 30 frames per second, and low-power WebGL with major performance caveats
rejected. Reduced motion, data saving, or reported hardware with at most two
logical processors or 2 GB memory keeps the static logo. Off-screen or hidden
documents pause animation. Context loss, shader/texture failures, or draw errors
restore the SVG; unmounting releases GPU resources and observers.
