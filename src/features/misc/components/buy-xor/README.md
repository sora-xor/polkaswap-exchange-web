# Buy XOR start screen

`BuyXorQuickStart.vue` is the first step of `/#/buy-xor`. `GetTsPage` renders it only for `purpose="xor"` on the source step.

```vue
<buy-xor-quick-start
  ref="stepHeading"
  :source="view.source"
  :amount="paymentAmount"
  :payment-asset="paymentSymbol"
  :can-continue="canContinuePlan"
  :locked="!!planProtection"
  @select-source="chooseSource"
  @update:amount="setPaymentAmount"
  @update:payment-asset="setPaymentSymbol"
  @preview="onPreview"
  @continue="goToStep(planProtection ? planProtection.step : 'wallets')"
/>
```

- It only emits intents. The page owns the plan, its locks and the continue gate (`canContinue`).
- Estimates come from `useGetTsPlanPreview`, the same composable as `GetTsPlanPreview`.
- The maximum purchase comes from `findBuyXorMaxDai` and `scaleBuyXorMaxPayment` in `lib/buyXorMaxAmount.ts`. These are read-only SORA quotes, searched at most once a minute.
- The steps list comes from `buyXorNextSteps` in `lib/buyXorStart.ts`.
- `focus()` is exposed so the page can move focus to the heading when the step changes.

Copy lives under `buyXor.start` in `src/features/misc/buyXor.en.json`. Background and limits are in `docs/buy-xor-flow.md`.

# Card purchase step list

`BuyXorCardRun.vue` shows a Buy XOR card purchase after payment as five steps (pay, MoonPay sends ETH, send ETH to SORA, ETH arrives, swap ETH for XOR) and moves it on (`composables/useBuyXorCardRun.ts`). Since 10 October 2026 the ETH goes to SORA in one bridge transfer; there is no swap to DAI on Ethereum. Step titles take the swap asset (`run.swapAsset`: ETH, or DAI left from the earlier DAI route). `GetTsPage` mounts it for `purpose="xor"`, `source=card` from the fund step to the swap.

```vue
<buy-xor-card-run
  :enabled="cardRunEnabled"
  :conversion-progress="conversionProgress"
  :bridge-progress="bridgeProgress"
  :swap-progress="swapProgress"
  :refresh-conversion="refreshConversionProgress"
  :refresh-bridge="refreshBridgeProgress"
  @preparing="conversionPreparing = $event"
  @received="goToStep('swap')"
  @ready="cardRunReady = $event"
  @restart="reviewNewCardPurchase"
/>
```

- With no Ethereum wallet connected, it opens the SORA account's saved purchase wallet (or makes one) and lets the page sign the purchase's Ethereum steps (`createBuyXorPurchasePolicy` in `lib/buyXorCardPurchase.ts`). With the buyer's own wallet, each step asks that wallet.
- It passes the page's progress readers in, so nothing is polled twice, and never signs on SORA.
- A stopped step shows the reason and **Try again**. While waiting for MoonPay it links to the MoonPay history and emits `restart` for a new card review.
- `ready` is false until the purchase wallet exists and is saved (or the buyer confirmed saving its phrase).

Copy lives under `buyXor.run` in `src/features/misc/buyXor.en.json`.

# Temporary Ethereum wallet

Card buyers can use a wallet made on the page instead of an Ethereum wallet app. Background, security model and limits: `docs/buy-xor-temporary-wallet.md`.

```vue
<!-- BuyXorCardRun's purchase wallet section; GetTsWalletSetup for the Get TS card route and the connected-wallets list -->
<temporary-wallet-panel />
```

- `TemporaryWalletPanel.vue` takes no props. It offers to make or restore a wallet, shows the phrase for saving (copy, download, "I saved it" checkbox), connects it with `web3Store.selectEvmProvider(TemporaryWalletAppProvider)`, and can show the phrase again or close the wallet. Closing reads the ETH and DAI balance and warns when money is left.
- `TemporaryWalletRequestDialog.vue` takes no props. `AppShellOverlays` mounts it while `temporaryWalletSession.request` is set; Approve and Reject call `approveTemporaryWalletRequest` / `rejectTemporaryWalletRequest`. For an ETH or DAI transfer to SORA it names the receiving SORA account and warns when it is not the connected one. Purchase transactions accepted by the automatic-signing policy never open it.
- The wallet itself is `src/utils/connection/evm/temporaryWallet.ts`. Next to it, `temporaryWalletVault.ts` holds the encrypted purchase wallets, and `temporaryWalletSession.ts` holds the reactive state the shell watches.

Copy lives under `temporaryWallet` in `src/features/misc/temporaryWallet.en.json`.

# Journey art and motion

`BuyXorJourneyArt.vue` is the water-bubble header of `BuyXorCardRun`: three bubbles (ETH, the same ETH on SORA, XOR) that show which step of the card purchase is running. It is decorative (`aria-hidden`, no text) and never receives amounts or addresses.

```vue
<buy-xor-journey-art class="buy-xor-run__art" :stage="art.stage" :failed="art.failed" />
```

- `stage` is a `BuyXorRunStep` or `'done'`; `failed` marks the step as stopped. `BuyXorCardRun` passes the failed step if there is one, else `run.stage`, the same step its list shows.
- What each stage looks like is `buyXorJourneyTargets(stage, failed)` in `lib/buyXorJourney.ts`: bubble sizes, liveliness, the droplet flow, the coin in focus, and the mood (pink, green, amber). `buyXorJourneyLayout(aspect)` places the coins for the art's width.
- `lib/buyXorJourneyWater.ts` (`createJourneySimulation`) moves the bubbles with springs and ringing surfaces, sends the droplets and rings the bubble each one reaches. It returns the `WaterFrame` the Quant Loop's renderer draws, so `quant-water-renderer.ts` and `quant-water-coins.ts` are reused unchanged apart from `setView`.
- The water code is imported when the component starts, after first paint, so it stays out of the page's first chunk. If WebGL is missing, fails (also while starting) or is lost, `data-renderer="static"` shows CSS drops with the same sizes, flow, glow, shiver and celebration. Twelve frames in a row more than 150 ms apart (software WebGL) leave one still frame for the rest of the page. `data-renderer`, `data-stage`, `data-mood` and `data-flow` describe what is on screen.
- Logos come from bundled assets (`lib/buyXorJourneyCoins.ts`). The middle bubble (`ETH-SORA`) is printed with the ETH logo. `src/assets/img/dai-coin.svg` (the whitelist's DAI logo with its gradient flattened) is no longer used by the art.
- Keep the shared scene's counts in mind: the water scene has three bubbles and four beads, and the simulation uses all of them (`buyXorJourneyWater.spec.ts` pins this).

`BuyXorReceivedAmount.vue` (`:amount` is the natural decimal XOR amount) is the payoff in the received block of `GetTsPage`: a coin that pops in and flips, ripples, confetti (`RewardsBurst`) and an amount that counts up (`useCountUp`, which skips the count for reduced motion). The finished amount is hidden text from the start.

Step-list motion lives in `BuyXorCardRun.vue`'s styles: the timeline line, the ripple on the active marker and the pop of a finished step (class `is-fresh`, only for steps finished while the list is on screen).
