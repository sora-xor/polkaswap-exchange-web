# General Buy XOR entry

`/#/buy-xor` opens the general Polkaswap purchase flow. The shared header provides the single prominent Buy XOR button on both the swap and wallet pages; the main menu retains its navigation link. The button uses the theme's accessible action colors, a visible mobile label, and a minimum 44px height. Its decorative halo pulses twice on mount, then settles without moving the hit target; reduced-motion preferences disable the halo and transitions. The wallet and swap content do not repeat the purchase button. `/#/get-ts` remains a separate TONSWAP journey; the general checkout uses Polkaswap branding, including its guided bridge return path. Existing deposit and exchange-withdrawal pages remain available for other assets.

## Start screen (October 2026)

The first step of `/#/buy-xor` is `BuyXorQuickStart` (`src/features/misc/components/buy-xor/`). Get TS keeps its original source step. The start screen:

1. Offers two choices, **Card** and **Crypto** (ETH, USDT or DAI on Ethereum). DAI already on SORA and USDT on TON sit under "Other ways to pay". With no saved method it picks Card, and a new card plan starts at `BUY_XOR_DEFAULT_CARD_USD` (20 USD).
2. Shows "You pay" and "You get ≈ X XOR" from the existing amount-first estimate, now shared through `useGetTsPlanPreview`. While the same amount refreshes, the last estimate stays visible but dimmed.
3. Shows the largest purchase the SORA market can take right now. `findBuyXorMaxDai` bisects read-only quotes for the largest swap input that passes the same price-impact and fee check as the estimate: ETH → XOR for card purchases (starting at 0.02 ETH, six decimals), DAI → XOR for every other route. Buy XOR's limit is 15% (`BUY_XOR_MAX_PRICE_IMPACT`, raised from 5% on 10 October 2026 because the XOR markets are thin); Get TS keeps 5%. `scaleBuyXorMaxPayment` converts that amount to the buyer's currency from the latest estimate, with a 2% margin. For card purchases it keeps MoonPay's fees out of the scaling, as if they were fixed, so the advice errs low: from a 20 USD sample on 10 October 2026 it suggested 68 USD, 69 USD passed, and scaling the fees too would have suggested 79 USD, which was refused. The search runs at most once a minute.
4. Explains every blocked estimate in one plain sentence, with the one action that fixes it: use the maximum, use the card minimum, pay with crypto when the card minimum is above the market maximum, or try again.
5. Lists the approvals the route needs (`buyXorNextSteps`) next to a single "Continue to wallets" button. The page's existing plan gate decides whether that button is enabled.

The start screen only emits intents (`selectSource`, `update:amount`, `update:paymentAsset`, `preview`, `continue`). The page's existing handlers apply its plan locks, so an unresolved purchase shows its saved amount and a "Continue buying XOR" button, and no new quotes are requested. Suggested amounts are advice for the input field only. Every later step still runs its own wallet-bound checks before anything is signed.

The card step of Buy XOR lists three numbered actions: copy the Ethereum address (the purchase wallet's, or the buyer's own), paste it when MoonPay asks, come back. Its button copies the connected Ethereum address and then opens MoonPay, because a static site cannot pre-fill MoonPay's wallet address without a signed URL. The copy control shows "Copied!" until the Ethereum account changes. The MoonPay dialog shows the same address with its own copy button above the checkout.

Card buyers need only a SORA wallet (October 2026). The page opens a temporary Ethereum purchase wallet for the connected SORA account and keeps it encrypted in the browser.

**Card route: ETH straight to SORA (10 October 2026).** MoonPay sells ETH; the page sends that ETH to the buyer's SORA account over the Hashi bridge in one transaction (`sendEthToSidechain`: no swap on Ethereum, no token allowance, about 26,000 gas), and the buyer swaps ETH for XOR on SORA. Before, the ETH was swapped for DAI on Ethereum and the DAI bridged, which took three Ethereum transactions. After the payment, **Your purchase** lists five steps: pay, MoonPay sends ETH, send ETH to SORA, ETH arrives on SORA, swap ETH for XOR. The page signs only the bridge transfer to the buyer's own SORA account; any other transaction still needs approval in a page dialog. The buyer confirms the final ETH → XOR swap in their SORA wallet, within Buy XOR's 15% price-impact limit. A step that stops shows why and offers **Try again**; while waiting for MoonPay, the buyer can review a new card purchase. Buyers can connect their own Ethereum wallet instead, which asks them to confirm the transfer. The start screen's card steps say this (`buyXor.start.steps.walletsCard`, `card`, `sendCard`). Details: [buy-xor-temporary-wallet.md](buy-xor-temporary-wallet.md).

- The purchase plan records the swap asset (`swapAsset: 'ETH'`, card purchases of XOR only; plans without it use DAI). The bridge row carries the tag `buyXorFunding: 'ethereum-eth-v1'`, and the bridge store re-quotes ETH → XOR within the 15% limit before the transfer is signed. Bridge and swap receipts accept ETH only for Buy XOR.
- The card cost review (`GetTsCardReadiness`, purpose `xor`) simulates the exact `sendEthToSidechain` call with a funded balance override, reserves twice its gas (rounded up), and quotes the rest as ETH on SORA. Get TS keeps its ETH → DAI conversion.
- DAI left in a purchase wallet by the earlier DAI route is still finished: when no new ETH is waiting, the page bridges that DAI and the swap step sells DAI. A purchase whose ETH → DAI conversion was already recorded moves that DAI on.

The new copy lives under `buyXor.start` and `buyXor.card` in `src/features/misc/buyXor.en.json`. Claude (an AI model) translated it by hand for the 27 modern locales; no translation service was used. Akkadian, Egyptian and Pijin come from a scoped run of `scripts/lang/semantic-locales.ts`. No native speaker has reviewed these translations. The same applies to the ETH-route strings of 10 October 2026 (`buyXor.run.steps.*` titles with `{asset}`, `buyXor.start.steps.sendCard`, `buyXor.liquidity.blocked`, `buyXor.preview.impact`, `temporaryWallet.request.bridgeEth`, `getTs.cardReview.bridgeEth*`, `priceImpact` and the `*Eth` errors).

Tests: `tests/unit/features/misc/BuyXorQuickStart.spec.ts`, `buyXorMaxAmount.spec.ts`, `buyXorStart.spec.ts` and the Buy XOR cases in `GetTsPage.spec.ts`.

**Liquidity limit.** On 4 October 2026 the mainnet DAI/XOR pool held about 452 DAI and 83 XOR. At the old 5% price-impact limit a single purchase was roughly 24 DAI, about 27–29 USD by card. On 10 October 2026 the ETH/XOR pool held about 0.147 ETH and 60.2 XOR (earlier that day only 0.0028 ETH and 0.73 XOR). At the 15% limit a single card purchase is about 0.026 ETH, roughly 60–65 USD, and a DAI purchase about 80–85 DAI. A 20 USD card purchase then got about 2.5 XOR at 4% impact. These figures are point-in-time snapshots. The start screen recomputes the limit from live quotes instead of hard-coding it. Larger purchases need more liquidity or a provider that delivers native XOR.

## Motion and status art (October 2026)

The card purchase shows where the money is with water bubbles, and the rest of the flow moves to match. Everything here is decorative: it adds no text and receives no amounts, addresses or balances, only the step in progress and whether it stopped. The step list stays the real status for screen readers.

**Journey art** (`BuyXorJourneyArt`, the header of **Your purchase**). Three bubbles carry the coins of the route, left to right: ETH on Ethereum, the same ETH on SORA (printed with the ETH logo, id `ETH-SORA`) and XOR. They follow the step the list shows.

- Size says where the purchase is: a small seed is ahead, a big breathing bubble is happening now, a medium calm one is done.
- Droplets flow from the coin being spent into the coin being received: in from the left edge while MoonPay is paid, ETH → ETH on SORA while the transfer is sent and across the bridge (slow), and ETH on SORA → XOR in the buyer's own swap (quick). Each droplet that lands rings the bubble it reaches. A soft glow behind the coin in focus repeats the colour of the outcome.
- The water is pink while the purchase runs, green when XOR has arrived and amber when a step stopped (the design system's errors are pink, like a running purchase). A stopped step also stops the droplets and makes its coin shiver.
- When the purchase finishes the XOR coin flips, droplets fly out and confetti spreads over the card. Swiping across a bubble pushes it and flicks its coin.

The sizes, flows and colours of every step are one table in `src/features/misc/lib/buyXorJourney.ts` (`buyXorJourneyTargets`); the physics is `buyXorJourneyWater.ts`. The art uses the Quant Loop's ray-traced WebGL water, loaded as its own chunk after first paint. `quant-water-renderer.ts` gained `setView`, so a wide banner keeps its bubbles round, and a shader guard so beads behind the camera cover nothing (unused droplets are parked below the view). The Quant Loop art is unchanged: drawing its scene with the old and the new shader gives identical pixels.

**When it cannot run.** Reduced motion, data saver, two cores or less, or 2 GB of memory or less: one still frame at the final sizes, redrawn when the step changes. Frames more than 150 ms apart twelve times in a row (software WebGL, a very busy page): the same still frame for the rest of the page. Off-screen, in a hidden tab, or after two minutes without input: paused; a new step, coming back to the tab or scrolling the art into view wakes it. A lost GPU context, or any failure while starting, ends WebGL for that page. Without WebGL, or when the water code cannot load: CSS glass drops at the same places and sizes, with CSS droplets, breathing, shiver, glow and the same finish. With reduced motion the CSS animations are off too and only sizes and colours show the step.

**Around it.**

- The step list joins its steps with a line that fills green as steps finish and runs toward the next one while a step is active. The active marker sends out a ripple, a step that finishes while the page is open pops once (steps that were already done when the page opened do not), a stopped one shakes once, and the detail text of a new active step rises in.
- When the swap is confirmed, `BuyXorReceivedAmount` shows the received XOR beside a coin that pops in and flips, with ripples and confetti, and counts the amount up. The finished amount is also in the page as hidden text from the start, and `useCountUp` skips the count for reduced motion.
- On the start screen a new estimate ticks in, the "getting a price" text shimmers while a price is fetched, and a problem rises into the box. Whatever appears with a new step in the Buy XOR and Get TS pages rises in softly.

Tests: `buyXorJourney.spec.ts`, `buyXorJourneyWater.spec.ts`, `BuyXorJourneyArt.spec.ts`, `BuyXorJourneyArtChunk.spec.ts`, `BuyXorReceivedAmount.spec.ts`, `BuyXorCardRunMotion.spec.ts`, and the added `setView` and shader cases in `quant-water-renderer.spec.ts`.

## Shared purchase page

The shared purchase page receives `purpose="xor"`. It ends when the user's SORA wallet receives XOR and offers the TS burn as a separate optional follow-up. It does not select a campaign or initiate a burn. General funding estimates reserve the SORA swap fee; TS funding estimates also reserve the marked burn fee. Amount, network, quote-expiry, and signing checks remain mandatory in both flows.

`GetTsWalletSetup` accepts an optional `purpose: 'ts' | 'xor'`, defaulting to `ts` for existing consumers. General purchases describe the SORA account as the receiving wallet and explain that it will hold the user's XOR. Payment-wallet connection order and explicit connection controls are unchanged.

`/#/swap?acquire=XOR` independently presets XOR as the receiving asset and clears the spending asset. A campaign parameter is optional; explicit asset-pair route parameters take precedence. This preset never picks an input asset or submits a transaction.

The authoritative general-flow copy is `src/features/misc/buyXor.en.json`, imported by `src/lang/messages.ts` and merged into all main locale catalogs together with `pageTitle.BuyXor` and `mainMenu.BuyXor`. Modern locale additions use placeholder- and token-preserving machine translation; Akkadian, Egyptian, and Pijin use the existing scoped semantic fallback workflow. Automated parity and script checks do not establish native-speaker review. Financial copy in these locales should receive qualified language review.

Focused unit coverage checks both public routes, lazy route loading, menu order, the visible general purchase links, wallet-purpose copy, and acquisition preset precedence. General Buy XOR and campaign Get TS financial-flow coverage lives alongside the shared page, preview, liquidity, and bridge tests.

Reviewed bridge drafts survive a reload or navigation before the Ethereum hash arrives. Only the saved row ID with a matching purpose, incoming mainnet DAI amount, and connected-account digest can provide the hash. The plan stores no raw wallet addresses or completed flags; finalized bridge evidence is still required. Generic and TS draft recovery remain isolated, and editing the spending plan invalidates the pending association.
