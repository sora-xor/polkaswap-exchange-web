# Campaign measurement contract

This specification matches the implementation being prepared through the existing configured `trackEvent` client. It does not add an analytics backend. Code instrumentation alone does not establish that events are being collected in production; verify configuration, dispatch and aggregate reporting before claiming measurement is live.

## Event and allowed payload

Event name: `tonswap_funnel`.

```json
{
  "campaign": "tonswap",
  "step": "view",
  "source": "campaign"
}
```

Only these three campaign fields are intended. `campaign` is always `tonswap`. `source` is one of `campaign`, `swap`, `deposit`, `bridge`; it describes the product location, not a referral identity. `step` is one of:

| Step | Meaning | What it must not imply |
| --- | --- | --- |
| `view` | Campaign entry is shown | Unique visitor or informed intent |
| `preview` | User deliberately previews allocation | Funding or a guaranteed allocation |
| `wallet_ready` | A usable wallet connection is ready for this flow | Funding, backup completion or verified human identity |
| `funding_started` | User starts a funding/acquisition route | Provider payment or SORA delivery completed |
| `burn_submitted` | The application submits/tracks the signed burn | Finality, eligibility or TS allocation |
| `reservation_indexed` | Exact receipt reconciles to authoritative indexed campaign evidence | Spendable TS delivery; the allocation may legitimately be zero |
| `receipt_saved` | User activates the receipt-saving action | Proof that a file is retained or wallet recovery is secure |

Emit at meaningful action/state transitions rather than every render or poll. Account/route rerenders, status polling and repeated downloads must be considered when interpreting counts. Focused tests should verify allowed payloads and prevent balance/address leakage.

## Privacy constraints

Do not add SORA/TON addresses, transaction hashes, token amounts, wallet balances, email addresses, provider order IDs, raw error messages, recovery data, full URLs/query strings or free-text user input to this event. Do not hash an address and call that anonymous; it still allows linkage.

Use the application's existing consent and collection settings. Inspect the analytics transport's common/default properties as well as this payload: these three fields do not by themselves prove the whole transport is free of identifiers. Do not introduce fingerprinting, session replay, automatic identity association or a new advertising pixel for this pilot.

The proposed reporting policy is aggregate campaign counts, restricted reporting access and no wallet-identity joins. Before enabling any new collection behavior, document the actual retention, default transport metadata and privacy notice. If the existing configured service does not meet this contract, keep instrumentation inactive and use the observation log rather than silently adding another service.

## What the data can establish

With only these fields, the result is aggregate event counts. It cannot deduplicate people, prove that one person progressed through every step, attribute a receipt to a promotional post, or establish external cash receipts. Event ratios such as `burn_submitted / preview` are directional activity ratios, not user conversion rates. Report collection gaps, ad blockers and repeated actions.

Keep three evidence streams separate:

1. **Product events:** counts by step/source/day after configured collection is verified.
2. **Public campaign accounting:** complete finalized global data gives eligible burns, distinct addresses, cap usage and TS allocations. Addresses are not people. Do not join that stream to marketing identities.
3. **Consented observation:** 10 volunteer sessions provide actual journey completion, device, starting point, misunderstandings and support time. Use participant codes independent of wallet addresses; no recording of recovery screens. Record mock scenarios separately from voluntary live actions.

Cash outcomes come from the operating entity's receipts and costs, not burn events. Newly acquired XOR can be reported only when the funding evidence establishes it; volume alone does not show fresh external money.

## External audience attribution

The [external queue](external-acquisition.md) reserves eight fixed, non-personal referral labels: `ton_app`, `my_wallet`, `gatehub`, `product_hunt`, `ston_dev`, `cryptoslate`, `the_defiant`, `decrypt`. Proposed landing URLs use `https://tonswap.org/ts?ref=ton_app`, with only an allowlisted value. These labels must not replace the product-location `source` enum, and raw URL/query strings must not enter this event.

Ref handling, retention and reporting are a separate implementation decision; this document does not assert they are active. Until the deployed page and collector prove aggregate attribution, use the plain campaign link and record live placement URLs, publishers' aggregate click reports and voluntary newcomer-study answers. A query parameter alone does not measure a visit or prove a completed burn came from that destination.

An external visit is not automatically a newly acquired person. During consented sessions ask only: “Before this session, did you already follow SORA or Polkaswap?” Record yes/no/unsure without social handles. Keep existing-audience comparison results separate. Do not join referral labels to wallet addresses or claim signer counts as new customers.

## Manual observation record

| Field | Allowed record |
| --- | --- |
| Participant | Random study code, not an account address |
| Environment | Desktop/mobile and browser family; no fingerprint |
| Starting point | Existing XOR / other SORA asset / exchange asset / TON asset / fiat |
| Prior awareness | Already followed SORA/Polkaswap: yes / no / unsure; no account handles |
| Discovery | One fixed partner label / existing community / other / unknown, volunteered; no full referrer URL |
| Scenario | Mock/test scenario or voluntary production journey, explicitly labeled |
| Stage reached | Preview / wallet / funding / review / submitted / finalized / indexed |
| Result | Completed independently / completed with help / stopped / unsupported |
| Time | Rounded minutes; support minutes separately |
| Issue | Predefined category and brief sanitized note |
| Understanding | Future claim / signer ownership / irreversible burn understood |

Delete individual study notes after the pilot report is settled unless the participant separately agrees to a defined follow-up. Keep aggregate findings without wallet data. Transaction evidence needed for a real support case belongs in restricted support handling, outside this study log.

## Verification checklist

- [ ] Each event uses the documented name and allowlisted values.
- [ ] Tests inspect payloads for addresses, hashes, amounts and arbitrary text.
- [ ] Collection configuration and common transport metadata are reviewed.
- [ ] A controlled test reaches the configured collector, or the report clearly states collection is inactive.
- [ ] Dashboard labels distinguish activity ratios, observed conversion and finalized accounting.
- [ ] Receipt/indexing events cannot be mistaken for immediately delivered TS.
