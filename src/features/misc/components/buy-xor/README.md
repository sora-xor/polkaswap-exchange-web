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
