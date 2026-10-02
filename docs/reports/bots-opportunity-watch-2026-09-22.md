# GO keeps an unsigned plan while waiting for new evidence

Previously a rejected GO research run consumed its intent and returned to the
funding form. Users had to submit the same budget and pair repeatedly. The
composable now retains those exact inputs and the connected AI in a page-local
`watching` stage. The form shows its next check and a stop control; editing cancels
the old plan. No bot, allocation, signer or transaction is created by this state.

The indexer readiness reader requests coverage metadata only for the selected
tokens and XOR. It requires all 168 verified, usable hourly buckets with matching
finalized boundaries and current asset metadata. Reads bypass cache and have a
15-second deadline. A new completed hour is required before another research run;
its full history and fresh fee observations remain independently validated.

The research lifecycle reports only window bounds. Validation exposure is
recorded before worker dispatch, including runs later canceled or rejected.
Automatic and manual retries cannot reuse an overlapping reserved window during
the page lifetime. A full 50-hour new reserved window is needed after validation.
Stopping, changing amounts or reversing the pair does not erase exposure.

Known temporary errors during an automatic retry retain the watch but consume
that attempted hour, preventing repeated provider requests against the same
window. Configuration, credentials and funding errors remain terminal. Desktop
status distinguishes waiting from research and retains bounded error categories.
An attached desktop assistant must still answer a new mailbox request; the site
cannot wake an idle desktop app.

The separate runtime audit found that the observed roughly 0.1 XOR swap fee is
actually charged by the network's stored fee multiplier. The adaptive updater is
not included in the captured production build. This release does not understate
that fee, alter the 10 KUSD budget, relax price impact or drawdown limits, or turn
a rejected strategy into a profitable one. Trading still requires qualification
and the user's authorization. The waiting state is not trading success.

Focused unit, translation, build and deployment evidence is retained in
`output/go-history/autopilot-opportunity-watch-20260922/`. Locale notes are in
`output/go-history/autopilot-watch-locales-20260922/localization-notes.md`.
