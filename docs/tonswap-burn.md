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

A reading that was verified within the last 60 seconds stays on screen while its
replacement loads, so the rate, totals, chart point, history rows and the
sidebar's Live mark do not blink on every poll (the user approved this on
10 November 2026). It is not a fallback for missing data:

- a failed read withdraws every number at once and tells the sidebar;
- a reading expires at 60 seconds even if its replacement is still loading or
  the tab is hidden; returning to the tab also checks expiry before waiting on a read;
- leaving mainnet or changing the indexer endpoint withdraws it immediately;
- certified older data replaces a fresh reading and is labelled as such.

`READING_KEEP_MS`, `expireReading` and `clearReading` in `TonswapBurnCampaign.vue` hold this rule;
the "Tonswap campaign reading during background reads" tests cover each case.
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

### Page layout (November 2026 redesign)

`/#/burn` reads top to bottom as: the TONSWAP card, the two public burn totals,
the SOLSWAP card, and a one-paragraph disclaimer. Nothing covers a card while
data loads.

The TONSWAP card is laid out by its own width (`@container tonswap`), so the
same rules serve a phone, the Burn page and the 464px card inside Get TS:

- **Intro.** The title, one sentence (`burnPage.tonswap.curve.description`) and
  the claim notice. On a narrow card the mark sits beside the title only.
- **Burn form** (`.tonswap-burn__preview`). It reads like a swap: the XOR amount
  on top, a flame between, the estimated TS below. Quick amounts (10, 100,
  1,000) fill the field; they never open the review or sign. The output shows
  `0` without an amount, `≈ <TS>` with verified campaign data, and a dash when
  there is an amount but no data. The "estimate unavailable" sentence waits
  until the data is known to be missing, not while a read is only in flight.
- **Campaign numbers** (`.tonswap-burn__market`). The current rate is the one
  large number; burned, remaining and reserved totals are plain rows above the
  cap meter, the reward curve (`TonswapRewardCurve` with `compact`) and the data
  status line.
- **Folded reading** (`.tonswap-burn__extras`). "How it works" holds three
  numbered steps, the full campaign description, the start block and the terms
  link; "Need XOR or a wallet?" holds the funding guide. Both are closed by
  default. From 760px of card width they sit under the form, beside the numbers.
- **Your burn history.** One compact record per burn. The receipt notice is
  shown once for the list, and the hash is one line (the copy button gives all
  of it).

### Burn status banner

`TonswapBurnStatus.vue` gives feedback for the newest burn of the connected
wallet. It appears above the form as soon as the burn is signed, and the page
scrolls it into view. It shows the burned XOR, the progress sentence and four
steps: sent, in a block, final, TS reserved (`getTonswapBurnSteps` in
`src/features/misc/lib/tonswapBurnStatus.ts`). While the burn is pending the
card's mark flares and the banner shows the estimate the user reviewed when
signing, labelled as an estimate. When the indexer lists the transaction, the
headline becomes the TS that exact transaction reserved, a short burst of sparks
plays, and **Burn more** closes the banner and returns focus to the amount
field. A failed burn and a SORA Trust burn show no TS number; a Trust burn has
no "TS reserved" step and ends at finality. Slow indexing adds a status refresh
button.

Rules the banner keeps:

- Only an indexed reservation is ever shown as earned TS. An estimate stays in
  the small line and never becomes the headline.
- Reserved TS always comes from this transaction's row in the current admitted
  reading. Expiry, read failure, endpoint change or a replacement snapshot that
  omits the burn withdraws both the TS number and the completed reservation step.
  Proved chain finality and the transaction hash stay available while reservation
  evidence is unavailable. No stored receipt reward acts as a fallback.
- A pending burn's signing estimate is withdrawn with its reading and is never
  restored from an old receipt after an endpoint change or failed admission.
- A burn recovered after a reload has no estimate, because none was reviewed in
  this visit. A burn that was already indexed before the page loaded gets no
  banner at all; its record is in the history list.
- Sparks and other motion are decoration and do not run with
  `prefers-reduced-motion`. Numbers always show their final value.

`tests/unit/components/pages/Burn/TonswapBurnStatus.spec.ts` and
`tests/unit/features/misc/tonswapBurnStatus.spec.ts` cover the banner; the
layout rules are pinned in `tests/unit/features/misc/burnLayout.source.spec.ts`.

### Public totals and the SOLSWAP card

`PublicBurnActivity.vue` keeps the recent interval and the campaign history as
two separate tables. Amounts and block numbers are grouped for reading with
`groupExactDecimal`, which works on the decimal string, so no digit is rounded;
the untouched amount is in the cell's `title`.

The SOLSWAP card shows a thin moving line while its totals load (`aria-busy`
on the form) instead of a mask. The sentence about unavailable reward totals is
inside the card. The SORA Nexus address tool is a closed disclosure while the
campaign runs. After a signed burn the card says "Burn sent" until the account
changes.

The ten strings added for this redesign (`burnPage.sent`,
`burnPage.tonswap.burnMore`, `.more`, `.how.*`, `.steps.*`) were translated by
the model that wrote the change, not reviewed by native speakers. The `akk`,
`egy` and `pis` entries come from the same word tables as
`scripts/lang/semantic-locales.ts`.

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

The burn confirmation deliberately uses `BurnLogoFire` with `:animate="false"`
and `DialogBase` with `:blur-overlay="false"`. This avoids continuously repainting
a WebGL logo alongside a full-screen backdrop-filter layer, a suspected cause of
the reported modal flashing. The static SVG keeps the same footprint; amount
autofocus, exact decimal handling, estimates and submission checks are unchanged.
Other dialogs retain their default blur and campaign-page logos retain animation.
An explicitly static logo never allocates WebGL resources, including after late
image loads or visibility callbacks. Changing `animate` also cancels queued frames.

Regression coverage lives in `BurnLogoFire.spec.ts`, `TonswapBurnCampaign.spec.ts`
and `DialogBase.spec.ts`. Browser verification should exercise opening, typing,
refreshing reward data, closing and reopening on desktop and mobile in Chromium
and WebKit, with both short and overflowing amounts. Verify a static dialog logo,
computed backdrop-filter `none`, stable dialog bounds and focus after transitions,
and no page errors. Headless checks did not reproduce the reported
full-screen flash, so they verify the rendering safeguards and interaction stability.
