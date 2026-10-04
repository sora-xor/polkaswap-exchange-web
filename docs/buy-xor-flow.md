# General Buy XOR entry

`/#/buy-xor` opens the general Polkaswap purchase flow. The shared header provides the single prominent Buy XOR button on both the swap and wallet pages; the main menu retains its navigation link. The button uses the theme's accessible action colors, a visible mobile label, and a minimum 44px height. Its decorative halo pulses twice on mount, then settles without moving the hit target; reduced-motion preferences disable the halo and transitions. The wallet and swap content do not repeat the purchase button. `/#/get-ts` remains a separate TONSWAP journey; the general checkout uses Polkaswap branding, including its guided bridge return path. Existing deposit and exchange-withdrawal pages remain available for other assets.

## Start screen (October 2026)

The first step of `/#/buy-xor` is `BuyXorQuickStart` (`src/features/misc/components/buy-xor/`). Get TS keeps its original source step. The start screen:

1. Offers two choices, **Card** and **Crypto** (ETH, USDT or DAI on Ethereum). DAI already on SORA and USDT on TON sit under "Other ways to pay". With no saved method it picks Card, and a new card plan starts at `BUY_XOR_DEFAULT_CARD_USD` (20 USD).
2. Shows "You pay" and "You get ≈ X XOR" from the existing amount-first estimate, now shared through `useGetTsPlanPreview`. While the same amount refreshes, the last estimate stays visible but dimmed.
3. Shows the largest purchase the SORA market can take right now. `findBuyXorMaxDai` bisects read-only DAI → XOR quotes for the largest DAI input that passes the same 5% price-impact and fee check as the estimate. `scaleBuyXorMaxPayment` converts that DAI amount to the buyer's currency from the latest estimate, with a 2% margin; the conversion errs low because fixed card and network fees are ignored. The search runs at most once a minute.
4. Explains every blocked estimate in one plain sentence, with the one action that fixes it: use the maximum, use the card minimum, pay with crypto when the card minimum is above the market maximum, or try again.
5. Lists the approvals the route needs (`buyXorNextSteps`) next to a single "Continue to wallets" button. The page's existing plan gate decides whether that button is enabled.

The start screen only emits intents (`selectSource`, `update:amount`, `update:paymentAsset`, `preview`, `continue`). The page's existing handlers apply its plan locks, so an unresolved purchase shows its saved amount and a "Continue buying XOR" button, and no new quotes are requested. Suggested amounts are advice for the input field only. Every later step still runs its own wallet-bound checks before anything is signed.

The card step of Buy XOR lists three numbered actions: copy the Ethereum address, paste it when MoonPay asks, come back. Its button copies the connected Ethereum address and then opens MoonPay, because a static site cannot pre-fill MoonPay's wallet address without a signed URL. The copy control shows "Copied!" until the Ethereum account changes.

The new copy lives under `buyXor.start` and `buyXor.card` in `src/features/misc/buyXor.en.json`. Claude (an AI model) translated it by hand for the 27 modern locales; no translation service was used. Akkadian, Egyptian and Pijin come from a scoped run of `scripts/lang/semantic-locales.ts`. No native speaker has reviewed these translations.

Tests: `tests/unit/features/misc/BuyXorQuickStart.spec.ts`, `buyXorMaxAmount.spec.ts`, `buyXorStart.spec.ts` and the Buy XOR cases in `GetTsPage.spec.ts`.

**Liquidity limit.** On 4 October 2026 the mainnet DAI/XOR pool held about 452 DAI and 83 XOR. At the 5% price-impact limit a single purchase is roughly 24 DAI, about 27–29 USD by card. These figures are a point-in-time snapshot. The start screen recomputes the limit from live quotes instead of hard-coding it. Larger purchases need more liquidity or a provider that delivers native XOR.

## Shared purchase page

The shared purchase page receives `purpose="xor"`. It ends when the user's SORA wallet receives XOR and offers the TS burn as a separate optional follow-up. It does not select a campaign or initiate a burn. General funding estimates reserve the SORA swap fee; TS funding estimates also reserve the marked burn fee. Amount, network, quote-expiry, and signing checks remain mandatory in both flows.

`GetTsWalletSetup` accepts an optional `purpose: 'ts' | 'xor'`, defaulting to `ts` for existing consumers. General purchases describe the SORA account as the receiving wallet and explain that it will hold the user's XOR. Payment-wallet connection order and explicit connection controls are unchanged.

`/#/swap?acquire=XOR` independently presets XOR as the receiving asset and clears the spending asset. A campaign parameter is optional; explicit asset-pair route parameters take precedence. This preset never picks an input asset or submits a transaction.

The authoritative general-flow copy is `src/features/misc/buyXor.en.json`, imported by `src/lang/messages.ts` and merged into all main locale catalogs together with `pageTitle.BuyXor` and `mainMenu.BuyXor`. Modern locale additions use placeholder- and token-preserving machine translation; Akkadian, Egyptian, and Pijin use the existing scoped semantic fallback workflow. Automated parity and script checks do not establish native-speaker review. Financial copy in these locales should receive qualified language review.

Focused unit coverage checks both public routes, lazy route loading, menu order, the visible general purchase links, wallet-purpose copy, and acquisition preset precedence. General Buy XOR and campaign Get TS financial-flow coverage lives alongside the shared page, preview, liquidity, and bridge tests.

Reviewed bridge drafts survive a reload or navigation before the Ethereum hash arrives. Only the saved row ID with a matching purpose, incoming mainnet DAI amount, and connected-account digest can provide the hash. The plan stores no raw wallet addresses or completed flags; finalized bridge evidence is still required. Generic and TS draft recovery remain isolated, and editing the spending plan invalidates the pending association.
