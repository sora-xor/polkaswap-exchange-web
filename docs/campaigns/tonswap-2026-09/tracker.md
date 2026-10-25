# Editable campaign launch tracker

## Current priority: guided purchase and burn

Updated after the user's explicit correction on 25 September 2026. External outreach is paused; the two email drafts remain unsent. The active implementation goal is a usable **Get TS** journey, with card funding first and Ethereum/TON wallet entry points.

| Goal | Acceptance | Current evidence |
| --- | --- | --- |
| Ship guided card funding | ETH-only MoonPay, displayed Ethereum destination, fresh SORA liquidity check, no unintended automatic ETH bridge | Live; production Get TS and Swap WebKit checks pass |
| Ship Ethereum conversion | ETH/USDT → DAI quote, exact approvals, verified contract/calldata, receipt handling | Implemented; mocked execution tests and read-only mainnet verification |
| Guide TON holders | TON wallet connection, TON USDT → Ethereum quote, explicit provider handoff, then ETH → DAI | Implemented; local TON payload execution remains unavailable |
| Complete SORA steps | DAI bridge preparation and return, fixed DAI/XOR swap, original marked burn | Implemented; component and bridge signing regressions passing |
| Publish verified entry | New Polkaswap IPFS release, Bunny purge, live WebKit pass; canonical TONSWAP page links to Get TS | Live; new IPFS origin saved and purged, both WebKit routes pass, TONSWAP source links published |
| Direct card → native SORA2 XOR | Verified embedded provider, correct chain/denomination, quote and delivery | No supported provider found; do not advertise as available |

See [funding implementation](../../tonswap-get-ts-funding.md) for routes and limitations, and [release evidence](get-ts-release-2026-09-25.md) for the deployed version and checks. Funding checks are indicative; low XOR liquidity can block an amount even if the external conversion is available. No money was moved or token burn signed during QA.

The earlier outreach tables below are retained as history, not the current execution queue or authorization to send.


Last updated: 25 September 2026. Status describes evidence available to the campaign-materials workstream, not assumptions about concurrent code/deployment work. Replace role owners with names and attach evidence as work completes. No recurring automation has been created.

**Current user direction supersedes the outreach calendar:** do not send outreach. Keep both Gmail drafts unsent. Active work is the actual Get TS funding wizard; see [conversion implementation and route evidence](conversion-integration.md). The dated external approach targets below are retained as historical planning, on hold until the user changes this direction.

**Actual acquisition results:** 0 external approaches sent/submitted; 0 earned placements; 0 observed newcomer journeys recorded. Two unsent Gmail drafts have been created and verified. Prepared materials and drafts do not complete the acquisition goal.

## Deliverables and acceptance

| ID | Deliverable | Owner role | Status | Acceptance evidence / next action |
| --- | --- | --- | --- | --- |
| C01 | Short/long/product announcements | Content | Prepared | [Copy](announcements.md); verify production destinations before publication |
| C02 | 90-second video | Content/design | Script prepared; recording outstanding | [Script](demo-script.md); rendered/captioned video passes recording criteria |
| C03 | FAQ and support runbook | Community | Prepared | [FAQ](faq-support.md); name staffed support owner and publish current participant answers |
| C04 | Four-week calendar | Campaign owner | Prepared | [Calendar](launch-calendar.md); set day 1 and owners after terms/links verified |
| C05 | Privacy-conscious event contract | Product/engineering | Specification prepared | [Events](analytics-events.md); verify code, allowlisted payloads, actual transport configuration and aggregate collection |
| C06 | Provider feasibility and conversion | Product/engineering | Ethereum adapter implemented with checked router policy; TON quote/handoff only | [Current implementation](conversion-integration.md); wallet-mocked execution tests, no live signing |
| C07 | Partner/community outreach | Partnerships/community | Drafts prepared; not sent | [Brief and drafts](partner-brief.md); root/owner handles authorized sending through verified contacts |
| C08 | New-audience acquisition research | Partnerships | Eight qualified destinations prepared | [Verified routes](external-acquisition.md); excludes ineligible/archived directories; no reach invented |
| C09 | Individually tailored external submissions | Campaign owner | Eight prepared; two Gmail drafts created; none sent | [Eight submissions](external-outreach.md); send through actual authorized account/form and attach evidence |
| C10 | External referral attribution | Engineering/analytics | Fixed labels specified; implementation/collection unverified | Allowlisted ref labels, aggregate-only reporting, no wallet joins; retain existing product source enum |
| P01 | Canonical page at `https://tonswap.org/ts` | Site owner | Deployed and production verification passed | Deployment workstream confirmed on 2026-09-25; [live page](https://tonswap.org/ts) |
| P02 | Guided Polkaswap entry and return flow | Product/engineering | Deployed and verified | [Release evidence](get-ts-release-2026-09-25.md); production WebKit and mobile/return scenarios pass |
| P03 | Exportable receipt and resume | Product/engineering | Implemented and tested | [Implementation](../../tonswap-onboarding.md); receipt export and navigation-state tests pass; live signing not performed |
| U01 | Ten observed newcomer journeys by 2 October | Product/community | Not run | At least 8/10 independent supported completions; at least 7/10 new to existing channels; no real money required in study; unsupported routes reported |
| U02 | Two staffed office hours | Community | Not scheduled | Dates/owner set, sessions run, issues and support minutes recorded |
| F01 | Cash mechanism and runway target | Campaign owner | Owner information needed | Named entity/source, amount/deadline and cost model; no assumption that burning sends money to operator |
| F02 | Paid/inventory/subsidy budget | Campaign owner | Zero paid media; no new commitment | Capped budget only after F01 and actual provider economics are known |
| F03 | One provider pilot | Partnerships/engineering | Candidate qualification outstanding | Native network, denominator, quote, recovery, commercial permission and costs proven before accepting orders |
| G01 | New beneficiary/TON-only claim protocol | Protocol owner | Separate future design | Existing claims preserved; shared cap; beneficiary proof, replay protection and distributor reviewed before launch |

## Owner decisions still required

1. **Cash:** Which entity should receive how much money by what date, and through what real mechanism? Record receipts, direct costs and treasury asset disposals separately. This decision affects spend, not the ability to finish the existing UX and materials.
2. **TS terms:** Confirm current total-supply allocation, holder rights, launch/claim dependencies, restrictions and delayed-launch handling. Reconcile older proposed tokenomics; do not invent answers in copy.
3. **Operating capacity:** Name the campaign, support and provider owners; set actual staffed session times. A written calendar is not a booked event.

## Release evidence log

| Date | Item | Environment/version | Evidence link | Result / owner |
| --- | --- | --- | --- | --- |
| 2026-09-25 | Campaign kit | Documentation | This directory | Prepared; public sources checked, no orders or messages sent |
| 2026-09-25 | External acquisition correction | Documentation | [Queue](external-acquisition.md), [individual drafts](external-outreach.md) | Eight routes researched; calendar now prioritizes net-new external audiences |
| 2026-09-25 | My Wallet and GateHub drafts | Gmail | IDs below; read back via Gmail connector | Both confirmed `DRAFT`, correct recipients/default sender and bodies; not sent |
| 2026-09-25 | Canonical page | Production | [tonswap.org/ts](https://tonswap.org/ts) | Deployment workstream reports live verification passed |
| 2026-09-25 | Get TS entry and source links | Production | [Release evidence](get-ts-release-2026-09-25.md) | Live on Polkaswap and TONSWAP |
| 2026-09-25 | Guided flow / mobile | Production plus labeled wallet fixture | [Release evidence](get-ts-release-2026-09-25.md) | Two production WebKit checks pass; 390px layout and mocked funding/bridge return pass |
| — | Event collection | Configured analytics environment | — | — |
| — | Provider quote / network | Provider evidence | — | — |
| — | First weekly report | Aggregate/observed results | — | — |

## External execution ledger

Each row is one organization/audience, even when it has several channels. This workstream has prepared these actions; it has not sent them. Replace the status only with actual evidence. No destination guarantees publication or fee-free placement.

| ID | Destination / fixed ref label | First action | Current status | Sent date / evidence | Reply / placement / outcome |
| --- | --- | --- | --- | --- | --- |
| E01 | TON App / `ton_app` | Submit testnet app through existing Telegram login; if needed request correct category | Prepared | — | — |
| E02 | My Wallet / `my_wallet` | Email growth@mywallet.io with mobile demo/guide offer | Unsent Gmail draft created and read back | Draft `r-746585169174851503`; message/thread `1a0d701793b352dc` | Not sent; no reply/placement |
| E03 | GateHub / `gatehub` | Email info@gatehub.net with native-XOR tutorial and route verification | Unsent Gmail draft created and read back | Draft `r-7761023258551220694`; message/thread `1a0d7017dcd5bf05` | Not sent; no reply/placement |
| E04 | Product Hunt / `product_hunt` | Create product draft via existing personal account; use honest beta status | Prepared | — | — |
| E05 | STON.fi / `ston_dev` | Email press@ston.fi with educational builder-session offer | Prepared | — | — |
| E06 | CryptoSlate / `cryptoslate` | Complete editorial contact form with actual authorized sender identity | Prepared; ordinary-browser form check needed after intermittent 403 | — | — |
| E07 | The Defiant / `the_defiant` | Human sends reviewed tip to editorial@thedefiant.io | Prepared for human send under channel rules | — | — |
| E08 | Decrypt / `decrypt` | Email editor@decrypt.co with visual explainer/interview offer | Prepared | — | — |

Drafts are in the connected account's [Gmail drafts mailbox](https://mail.google.com/mail/u/?authuser=takemiya%40soramitsu.co.jp#drafts). Subjects: “A hands-on Tonswap DeFi session for My Wallet's TON users” and “A GateHub-to-Polkaswap XOR guide for new Tonswap participants.” Use the exact draft IDs above for a later authorized send; do not create duplicates. Both use the account's default sender and Makoto Takemiya / Soramitsu signature. The mailbox link is a navigation link; the connector returned IDs, not individual draft URLs.

**Dated execution goals:** complete the first eight qualified external approaches/submissions by **28 September 2026**; aim for **two earned external placements/demos and ten observed newcomer journeys by 2 October**, with at least **8/10 successful supported scenarios** and no money required for study participation. At least seven participants should be unfamiliar with existing SORA/Polkaswap channels. Once aggregate measurement exists, use **500 new-audience landing visits and 50 previews by 23 October** as experiment targets, not forecasts or promised sales. Do not claim partner-attributed previews from location-only events. Access blockers explain misses; they do not count as completed approaches. Materials, drafts, sends and placements are distinct statuses.

## Per-experiment decision record

Copy for each channel/route:

- Experiment and owner:
- Audience and supported starting point:
- Hypothesis and actual baseline:
- Start/end and release version:
- Public message/link used:
- Observed results, data coverage and failures:
- Realized receipts and direct costs, if applicable:
- Decision: retain / improve / stop:
- Next action, owner and evidence needed:

Pause expansion for ownership/allocation discrepancies or a failing funding route. Stop new provider orders if reliable terms cannot be established. Preserve the existing direct-burn availability policy throughout.
