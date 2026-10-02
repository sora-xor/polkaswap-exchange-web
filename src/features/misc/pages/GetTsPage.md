# Buy XOR and Get TS guided funding

`/#/buy-xor` is the general Polkaswap acquisition entry, exposed in the app header, main menu, Swap and Wallet. `BuyXorPage` renders the shared funding orchestration with `purpose="xor"`; the default `purpose="ts"` preserves `/#/get-ts`. Generic purchase branding, estimates, receiving-wallet guidance and completion all refer to XOR. The successful swap ends with verified XOR received and a Wallet action. A collapsed optional link can open the separate TS journey; it never submits or preselects a burn.

The two purposes use independent session-storage keys and reactive drafts. Their transaction references and progress readers remain separate. Generic links allow card, Ethereum, TON and existing SORA DAI; `source=xor` and `step=burn` are rejected. Generic bridge review uses `/bridge?buyXor=1&asset=DAI` and retains that explicit purpose through review, transaction and history screens. Ambiguous tags cannot enable either guided flow.

Generic planning requires the normal mainnet, quote-expiry, network-fee and 5% price-impact checks. It estimates `spendableXor` after the swap fee and slippage reserve, without querying the TS campaign or reserving a burn fee. A delayed preview from a different purpose is ignored. Submitted hashes remain pending until canonical receipt checks confirm completion; wallet balances never establish receipt.

Direct card-to-native-SORA-XOR is not currently supported by the configured provider. The card route explicitly buys Ethereum ETH, converts to DAI, bridges DAI to SORA and swaps to XOR. TON still requires the provider handoff and Ethereum continuation described below. Quotes can reject purchases when downstream liquidity is insufficient; the generic route does not relax those limits.

## Neumorphic design notes

- **Visual thesis:** match Polkaswap's soft native material with rounded raised workspace/summary surfaces, recessed selection wells, and one restrained pink action accent across light and dark themes. Use the existing surface, shadow and action tokens rather than introducing a separate checkout palette.
- **Content plan:** retain the current amount-first plan, sequential wallet setup and one reviewed financial action, with supporting route/status details inside the same workspace and a quieter adjacent summary. Component wrappers remain transparent so their fields do not create nested cards.
- **Interaction thesis:** selections settle into inset surfaces; hover and press use brief native shadow/color transitions; the summary stays in view on desktop and joins the document flow on mobile. Keyboard focus, minimum 44px controls and reduced-motion preferences remain explicit. No transaction state, motion implying completion, or financial behavior changes.

`/#/get-ts` is a static, wallet-driven journey. Supported entry links use `?source=card|ethereum|ton|xor|sora`; `step` may select a valid review stage for that source. Opening a link never connects a wallet, purchases, signs, or submits a transaction.

The default funding route is Ethereum DAI → SORA DAI → SORA XOR → campaign burn. Existing SORA XOR and DAI expose shorter routes. Current card support buys native Ethereum ETH through the configured MoonPay widget, then requires a separate conversion to DAI. TON starts with USDT on TON; users of native TON need a prior TON-to-USDT swap. The conversion panel determines current route and execution availability rather than the page claiming a provider route is always available.

## Component contracts

- `GetTsCardReadiness` checks the complete current budget, gas reserves, bridge and native liquidity before opening payment. The card action requires a matching unexpired positive result and the component's captured wallet/provider context at the click boundary. See [cost review](../../../../docs/buy-xor-card-cost-review.md). It remains an estimate, not guaranteed delivery after card processing.
- `Moonpay` receives `currency-code="eth"`, the exact USD `base-currency-amount`, the current `receiving-address` for read-only completion matching, and `:auto-prepare-bridge="false"`. Its `completed` event reports provider status only. The guided flow does not prepare the normal direct ETH bridge. The EVM receiving address is shown with a copy action; unsigned destination address parameters are not passed to MoonPay.
- `TonswapConversionPanel` receives `source="ethereum"` or `source="ton"`. Its `submitted: { transactionHash }` event immediately saves the Ethereum transaction pointer and hands recovery to `useGetTsConversionProgress`. The page then removes the signing form, so refresh cannot offer a duplicate card purchase. The reader derives exact net canonical DAI from that transaction's canonical receipt and current wallet context; existing balances cannot establish receipt. Its standalone `completed` event never opens the bridge or advances the page. A failed saved Ethereum conversion retries the Ethereum phase, including for a journey originally funded on TON.
- The bridge review route is `/bridge?campaign=tonswap&getTs=1&asset=DAI`. The existing bridge validates Ethereum mainnet, asset registration, wallets and network. Bridge history retains the Get TS return context.
- `SwapFormWidget` is embedded with `fixed-pair` and `max-price-impact="5"`. The page initializes empty inputs and the DAI/XOR pair through the existing swap store, without the full SwapPage's chart or route synchronization. The swap widget owns live quotes, review, signing, and its submission impact guard.
- `TonswapBurnCampaign` owns the actual final review and burn. TS remains a future claim planned for TONSWAP launch, with no confirmed launch date.

`getTsFlow.ts` persists only `{ version: 1, source, step }` in per-tab session storage. It rejects other versions, unknown keys, unsupported sources and invalid steps. It never persists account identities, balances, quotes, or completion flags. `clearGetTsView()` removes only this view hint. Wallet prerequisites are re-evaluated on every render; direct URLs cannot bypass them.

`useGetTsPlan` separately stores a validated payment draft and submitted hashes. A new earlier-stage hash invalidates downstream receipts and derived amounts; repeated notification of the same hash is idempotent. The amount/outcome summary retains its before-Ethereum-gas qualification outside the planning screen. Card liquidity readiness alone does not establish later conversion and bridge gas coverage.

Spendable DAI/XOR balances are read only after the connected SORA account's asset synchronization completes. They allow explicit shortcuts but never infer a purchase, bridge, swap, or burn completion. Missing/malformed balances are unavailable rather than zero.

`src/features/misc/getTs.en.json` supplies the authoritative English page keys for merging into the locale catalogs. Root integration also needs `pageTitle.GetTs = "Get TS"`; conversion, liquidity and journey-return keys are supplied by their respective components.

Focused verification covers view schema/storage failure, explicit wallet connection, card quote expiry and account change, separate completion/navigation, exact balances and shortcuts, fixed swap configuration, and allowlisted DAI bridge routing. See `tests/unit/features/misc/{GetTsPage,getTsFlow}.spec.ts` and the existing MoonPay suites.

## Card continuation before an on-chain reference exists

Before opening card checkout, `rememberCardDraft()` stores only the reviewed ETH budget and conversion input as a strictly validated navigation hint in this purpose's existing tab-local plan. Closing checkout or reloading returns to the conversion workspace with a neutral explanation and the card history link. Neither the hint nor existing wallet balances restore `cardPurchaseCompleted`, trusted quotes, funds or any transaction receipt. The conversion component obtains fresh wallet, balance, provider and fee evidence before signing.

“Review a new card purchase” explicitly clears only that hint and remounts the complete cost review with payment disabled until a fresh valid check arrives. It is disabled during conversion signing. Original source/budget changes also clear the hint; canonical equivalent USD edits preserve it. A submitted conversion hash replaces the hint with the normal transaction recovery flow. Browser storage denial limits this feature to the current mounted session. It is not a provider order tracker, and the separate history view is for user inspection rather than automatic purchase matching.

## Replacement transaction recovery

`GetTsConversionRecovery` is shown for a submitted, unconfirmed Ethereum conversion before a bridge draft exists. It accepts the original `reference` and `purpose`, then asks for an explicit replacement hash. It emits `verified` only for a same-request replacement with a canonical received/failed receipt. Input, wallet, provider, purpose or reference changes revoke an in-flight check. The page records that verified reference and reruns normal progress reading; the component never connects, signs or submits a transaction. The read-only progress composable separately captures a bounded request digest after submission to support a dropped original hash.
