# 90-second product and participation video

Deliverable: a recording script, not a rendered video. Record 1920×1080 with a 9:16-safe central area; export a captioned horizontal version and a vertical crop. Use a dedicated testnet wallet for the product shots. Use a disconnected or dedicated demonstration profile for the mainnet review shots. Do not create a real burn to obtain footage.

## Script and shots

| Time | Shot | Narration | Visible label |
| --- | --- | --- | --- |
| 00–10 | Open Tonswap homepage, then the public testnet via its official link | “Meet Tonswap. Explore trading, liquidity and token launch workflows on its public TON testnet. You can try the product with test assets.” | `TON PUBLIC TESTNET · TEST ASSETS` |
| 10–22 | Show a testnet swap preview; move to a liquidity screen. Record only features that work in this session | “Start with the product. Try a swap preview, explore liquidity, and see how the interface works. Mainnet is still ahead.” | Keep the testnet label throughout |
| 22–33 | Hard cut to a title slate, then Polkaswap's TONSWAP campaign card | “There is also a separate XOR burn campaign on Polkaswap. It reserves a future TS allocation, intended to become claimable on Tonswap at launch.” | `SORA MAINNET CAMPAIGN · REAL XOR` / `FUTURE TS CLAIM` |
| 33–46 | Show campaign curve and an amount preview, with capture timestamp | “Preview the estimate before deciding. Rewards decline as eligible burns accumulate, and other transactions can change your allocation. Amounts beyond the rewarded cap earn no TS.” | `ESTIMATE · MAY CHANGE` / `EXCESS EARNS 0 TS` |
| 46–60 | Show wallet selection and a visual checklist: native XOR, burn amount, fee reserve | “Use a SORA wallet you control. You need native XOR for the burn and its fee. Keep your recovery backup private. Support never needs it.” | `YOUR SORA WALLET OWNS THE CLAIM` |
| 60–73 | Show burn review and irreversible-burn notice. Stop before the signing action | “Review the amount and campaign terms carefully. XOR burns are irreversible. If you choose to sign, the receipt tracks your transaction through finality and indexing.” | `REVIEW DEMONSTRATION · NO TRANSACTION SENT` |
| 73–82 | Animate three simple status labels, visibly marked illustration; no fake transaction hash | “Save the transaction record and keep control of your signing wallet. A receipt records the burn; the wallet controls the future claim.” | `ILLUSTRATION: SUBMITTED → FINALIZED → INDEXED` |
| 82–90 | End slate with two separate readable links | “Explore Tonswap with test assets. Read the separate campaign terms and preview your future allocation on Polkaswap.” | `Product: tonswap.org` / `Campaign terms: tonswap.org/ts` |

Narration is 181 words. Time the actual read and pauses to fit 90 seconds; do not speed up the irreversible-burn notice or end links. Add word-for-word captions.

## Recording acceptance

- Testnet label remains visible on every product frame; mainnet campaign begins with an explicit visual cut.
- No live signature, payment, exchange order or burn is submitted for recording.
- No seed phrase, password, recovery code, API credential, personal browser profile or unrelated wallet balance appears.
- No speculative TS value or made-up transaction is displayed. An illustrated receipt is clearly labeled.
- If allocation data is unavailable, show the honest unavailable state or defer that shot; do not insert a fabricated current rate.
- All filmed UI controls exist on the tested release. Proposed TON/card checkout is absent from the video.
- The deployment workstream confirmed `https://tonswap.org/ts` live and verified on 25 September 2026. Verify the separate `https://polkaswap.io/#/burn?campaign=tonswap` release evidence before recording/publication.
- At 360-pixel display width, the asset/network label, irreversible-burn notice and links remain readable.

Product scope comes from the [official homepage](https://tonswap.org/); campaign behavior comes from the [repository specification](../../tonswap-burn.md). Recheck both before recording.
