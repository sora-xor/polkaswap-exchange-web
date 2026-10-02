# General Buy XOR entry

`/#/buy-xor` opens the general Polkaswap purchase flow. The shared header provides the single prominent Buy XOR button on both the swap and wallet pages; the main menu retains its navigation link. The button uses the theme's accessible action colors, a visible mobile label, and a minimum 44px height. Its decorative halo pulses twice on mount, then settles without moving the hit target; reduced-motion preferences disable the halo and transitions. The wallet and swap content do not repeat the purchase button. `/#/get-ts` remains a separate TONSWAP journey; the general checkout uses Polkaswap branding, including its guided bridge return path. Existing deposit and exchange-withdrawal pages remain available for other assets.

The shared purchase page receives `purpose="xor"`. It ends when the user's SORA wallet receives XOR and offers the TS burn as a separate optional follow-up. It does not select a campaign or initiate a burn. General funding estimates reserve the SORA swap fee; TS funding estimates also reserve the marked burn fee. Amount, network, quote-expiry, and signing checks remain mandatory in both flows.

`GetTsWalletSetup` accepts an optional `purpose: 'ts' | 'xor'`, defaulting to `ts` for existing consumers. General purchases describe the SORA account as the receiving wallet and explain that it will hold the user's XOR. Payment-wallet connection order and explicit connection controls are unchanged.

`/#/swap?acquire=XOR` independently presets XOR as the receiving asset and clears the spending asset. A campaign parameter is optional; explicit asset-pair route parameters take precedence. This preset never picks an input asset or submits a transaction.

The authoritative general-flow copy is `src/features/misc/buyXor.en.json`, imported by `src/lang/messages.ts` and merged into all main locale catalogs together with `pageTitle.BuyXor` and `mainMenu.BuyXor`. Modern locale additions use placeholder- and token-preserving machine translation; Akkadian, Egyptian, and Pijin use the existing scoped semantic fallback workflow. Automated parity and script checks do not establish native-speaker review. Financial copy in these locales should receive qualified language review.

Focused unit coverage checks both public routes, lazy route loading, menu order, the visible general purchase links, wallet-purpose copy, and acquisition preset precedence. General Buy XOR and campaign Get TS financial-flow coverage lives alongside the shared page, preview, liquidity, and bridge tests.

Reviewed bridge drafts survive a reload or navigation before the Ethereum hash arrives. Only the saved row ID with a matching purpose, incoming mainnet DAI amount, and connected-account digest can provide the hash. The plan stores no raw wallet addresses or completed flags; finalized bridge evidence is still required. Generic and TS draft recovery remain isolated, and editing the spending plan invalidates the pending association.
