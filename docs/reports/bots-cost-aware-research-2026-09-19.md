# Cost-aware Bots research — September 19, 2026

The simple 10 KUSD → XOR research flow previously asked the assistant for a
strategy before obtaining the fee observation. It also permitted 24-hour
intervals even though its 50-close validation segment could not produce the
required five fills at that cadence. The generic rejection discarded the checks
that failed, preventing users from distinguishing unavailable data, insufficient
trades, losses after costs, and excess drawdown.

## Corrections

- Obtain and validate finalized network and pool fee observations before
  drafting. The assistant receives the exact quoted amount, directional fees,
  slippage assumption, unchanged fee reserve, sample counts and minimum fill
  requirement. Requote changed notionals or expired observations.
- Bound the interval to the available sample. With 117 training closes, one
  purged boundary close and 50 validation closes, the ceiling is 12 hours.
  Both desktop transports expose and enforce this ceiling. Public sample counts
  contain no validation prices or outcomes.
- Preserve bounded local rejection reasons in a collapsed “Why it stopped”
  explanation. Provider-supplied errors cannot impersonate trusted diagnostics.
  User amount and token selection remain available after rejection.
- Protect the unspent XOR fee allowance throughout sizing, replay, paper fills,
  atomic live reservations and checks before signing and broadcast. Actual paid
  fees reduce this floor once; newly earned XOR above it remains tradable.
- Keep an allocation-blocked buy classified as a buy during research replay.
  Previously the generic no-allocation hold was treated as a hypothetical sell.
  The passive benchmark now preserves the same fee reserve.

The full-coverage, five-fill, positive net-return and user loss-limit gates remain
unchanged. Training selects at most three neighboring configurations. The frozen
winner is tested once on the separate validation period; a rejected validation
does not trigger a search for a different winner on that period.

## Validation and release evidence

Full validation passed: 884 application test files / 6,099 tests and 25 script
test files / 299 tests. Translation validation passed all 13 tests across four
files. The isolated Chromium/WebKit connection, research and consent matrix
passed all 20 cases. Changed modules passed ESLint. These mocked wallet tests
establish control-flow behavior, not live transaction success.

Evidence is recorded under `output/go-history/deploy-cost-aware/` in
`unit-tests.log`, `translation-tests.log`, `autopilot-e2e.log`, and `lint.log`.
Release checks are added there as deployment completes.

The first cost-aware release, production root
`bafybeidf3c7zntewzfn5ar6gb2z6k3ckyttkybujd54v6rfznuomfj26na`, passed static
origin checks, saved/purged Bunny, and passed independent WebKit acceptance for
desktop Swap, desktop Bots and 320px Bots. Every case reached its real page title
with zero request, HTTP, page and console errors. The official loader check also
passed, but its bootstrap-only snapshot is not treated as sufficient evidence;
`final-title.json` contains the real rendered-page acceptance.

## Live sizing diagnosis

The real Chrome request confirmed the new cost data: 0.100020612589707326 XOR
network fee per direction, approximately 0.6% pool fee, and 0.5% assumed
slippage. It also exposed an inherited default: the simple flow was using the
advanced lab's 10% order size, limiting this 10 KUSD budget to 1 KUSD orders.
The user had supplied a total budget, not selected that per-order limit.

Using only the supplied training slice, three representative strategies failed
the unchanged limits after costs. There is also a structural bound: before the
first price change all observed closes were equal. Even retaining all cash
produced 8.743367% drawdown in XOR units at that change. At the inherited 1 KUSD
ceiling, a preceding buy made the XOR result worse after its fixed fee; preceding
round trips also add costs. That ceiling made this training window incompatible
with the 5% loss limit. Evidence: `chrome-training-context.json`,
`training-cost-analysis.json` and `inherited-size-diagnosis.json`.

The unsigned request was cancelled. No draft was submitted from that diagnosis,
no held-out data was inspected, and no wallet authorization or transaction
occurred. The separate sizing correction offers the assistant the full spendable input
capital and the same output order ceiling that replay enforces. It never expands
an existing saved bot. A selected smaller order receives a fresh quote and is
shown as its own per-trade limit at final review. The total capital, fee reserve,
loss limit and qualification criteria remain unchanged. All 1,452 bot tests
passed after this correction, including exact 18-decimal sizing and reserve
boundaries. Follow-up release evidence is under
`output/go-history/deploy-budget-sizing/`.

## Final deployment and live request

The final production root is
`bafybeihmwvoidcxn4e4dgnh4eghlg4codjeiclxmoxwdpovtwccbkebfia`. Both release
DAGs were replicated and recursively pinned at MOF. The exact origin assets
passed before Bunny saved the new production origin and confirmed its purge.
Live root/JS/CSS bytes matched the frozen build. Final independent WebKit
acceptance reached `Swap - Polkaswap` and `Bots - Polkaswap` on desktop and
320px mobile, with zero failed requests, HTTP errors, page errors or console
errors. The final unit run passed 6,105 application tests and 299 script tests.

The existing wallet-connected Chrome tab completed its same-page assistant
handshake without an API key. Its fresh public request showed:

- Exact starting allocation: 10 KUSD; output goal: XOR.
- Input order ceiling: 10 KUSD, chosen amount left to the assistant.
- Output order ceiling: 2.259926255156933861 XOR, matching replay's first-price
  valuation; this is a limit, not available inventory.
- 117 training closes, a separate 50-close validation segment, and a 12-hour
  maximum interval.
- Quoted network fee: 0.100020612589707326 XOR in either direction, approximately
  0.6% pool fee, and the unchanged 0.5% slippage assumption.

Offline assistant reasoning tested 15 simple training configurations and found
none meeting the unchanged checks. Smaller order sizes used the ceiling's fee
observation as an estimate and would require fresh quotes before acceptance.
No validation observations were loaded for that analysis. A separate optimistic
bound, which omits pool fees and slippage, also shows the current training window
cannot sustain even a second fill inside the 5% loss limit under the observed
network-fee model: the loss allowance is 0.162996312757846693… XOR, while the
second-fill lower bound is 0.176101394772688173… XOR. This is a statement about
the supplied history and replay assumptions, not future markets.

The assistant abstained and cancelled the unsigned request. The user's amount
and pair were preserved, and a decision was requested before changing financial
limits. **Zero transactions were submitted. A successful live-trade recording
remains outstanding.** Earlier failure footage has not been relabelled as
success. Evidence: `chrome-verification.json`, `training-cost-analysis.json`,
`training-feasibility-bound.json`, `final-title.json`, `cdn-save-purge.json` and
`completion.json` in the follow-up release directory.

Earlier recordings show a real research rejection and zero submitted
transactions. They are not evidence of successful trading or profit. A new live
trade requires the user's wallet authorization and a finalized successful
receipt before it can be reported as such.
