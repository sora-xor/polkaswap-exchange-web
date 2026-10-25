# TS campaign onboarding

`TonswapOnboarding.vue` is the funding guide embedded in the TS campaign. Pass
the connected state, the public XOR preview amount, and whether Google appears
in the available wallet list. Handle `connect` with the existing wallet chooser
and `review` with the existing burn review dialog. The component never signs,
swaps, purchases, or burns automatically.

The four starting points use existing paths: the current burn review, the swap
page, Cede's exchange transfer page, and the deposit options page. A SORA-token
swap links to `/swap?campaign=tonswap&acquire=XOR`; the swap integration should
offer XOR as output while leaving the user to choose their input token. Existing
output-funded swap fee handling remains authoritative. A separate burn still
requires its amount plus the burn transaction fee in XOR.

The browser Google wallet route is only advertised when it is available. It uses
the current seed phrase, password and encrypted Drive-backup process. Ordinary
browser mode does not currently register the local desktop SORA wallet adapter.
The guide does not promise a direct card-to-XOR, TON-to-XOR, or card-to-TS service.

`tonswapOnboarding.ts` stores a versioned intent in **sessionStorage** under
`polkaswap:tonswap:onboarding:v1`. The only fields are campaign, starting point,
optional exact public preview amount, fixed `/burn` return path, and timestamp.
It contains no account addresses, wallet material, balances, payment details, or
analytics identifiers. Records expire after 24 hours; malformed, extended,
oversized and future-dated records are ignored. Blocked storage does not stop
navigation. Funding-page return links use `buildTonswapReturnRoute()` so the
existing Vue hash router preserves IPFS content paths. The return notice clears the intent on
explicit dismissal; otherwise it remains for up to 24 hours so a participant
can resume or make a separate, deliberately reviewed burn. It never triggers
a repeated transaction.

The onboarding guide does not change the campaign's existing availability,
allocation formula, cap rules, or ability to burn without a reward estimate.
Quotes remain indicative until the marked burn is finalized and indexed.

Focused tests: `tests/unit/features/misc/tonswapOnboarding.spec.ts` and
`tests/unit/components/pages/Burn/TonswapOnboarding.spec.ts`.

## Preview, return navigation, receipts and measurement

The public preview accepts exact positive amounts with at most 18 decimal places.
It displays the XOR amount plus estimated burn fee without rounding down, and
passes the amount to the existing review dialog. It never connects or signs by
itself. Both initial and same-page campaign navigation select XOR as swap output;
explicit token-pair links retain their pair. The funding notice on swap, deposit
and bridge screens returns to the campaign without automatically moving funds.

Finalized records can be downloaded as JSON using `tonswapReceipt.ts`. Receipts
contain only the public SORA account, transaction reference and exact allocation
amounts. They are evidence, not a substitute for control of the signing wallet.
A download failure displays a retry message and leaves the record and burn
availability intact.

`tonswapTelemetry.ts` emits the fixed `tonswap_funnel` steps through the existing
`trackEvent` hook with campaign, step and product-location source only. It sends
no amount, address, transaction hash or identity. The hook needs a configured
analytics client to collect events; development console output alone is not a
measurement pipeline. External partner attribution and traffic collection must
be verified separately before reporting conversion rates.

Additional focused tests cover receipts, telemetry payloads, funding defaults,
route updates, the return notice and the full campaign component under
`tests/unit/features/misc`, `tests/unit/features/swap`,
`tests/unit/shared/navigation` and `tests/unit/components/pages/Burn`.

The shared funding notice also resumes the guided `/get-ts` flow when a validated
`getTsFlow.ts` view exists or the route contains `getTs=1`. This takes precedence
over an older burn-only intent; the old preview amount is not displayed for the
wizard. Explicit dismissal clears both session records and the guide's own query
fields, retaining unrelated query fields and the hash. A saved step is navigation
state only and never marks a transaction as completed.
