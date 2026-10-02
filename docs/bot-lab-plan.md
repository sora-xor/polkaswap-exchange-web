# Strategy lab implementation and deployment

The goal is a scientific, cyberpunk Bots workspace that makes parallel experiments easy to run and compare while preserving Polkaswap's animated trade distribution, light and noir modes, and neumorphic design system. Every experiment has explicit input and output tokens. LLM-assisted creation produces reviewed deterministic rules, followed by a real-history test and an idle paper bot.

## Completion goals

- [x] Parallel computation with exact arithmetic, actual progress, cancellation, and verified per-pair data/fees.
- [x] Saved experiments, comparison, duplication, selectable input/output tokens, and bounded parameter batches.
- [x] Parallel animated trade flows, equity comparison, readable responsive controls, and useful empty/loading/error states.
- [x] Memory-only LLM connection, reviewed suggestions, exact strategy testing, and bot creation with fresh holdings.
- [x] Final unit/browser checks, translations, documentation, and production build for the corrected interaction.
- [x] Publish the corrected production/testnet build, import both DAGs on MOF, and validate the candidate origin.
- [x] Save the validated Bunny origin and purge after access returned.
- [x] Verify the corrected release CID/assets, official WebKit Swap, and Light/Noir production Bots including XOR/KUSD.

The existing browser-session execution boundary remains explicit. This release adds browser research workers, not an always-on signing service. Animation presents actual evaluator checkpoints during calculation and freezes on completion. Existing saved hourly settings keep their meaning; new strategies default to one block (about six seconds). No API key, wallet identity, or signing session is included in a saved experiment.

## User corrections

- [x] Show actual partial decisions and accounting during computation, with no automatic result replay.
- [x] Default to one finalized block (~6 seconds), preserve legacy settings, and describe hourly historical resolution.
- [x] Load current provider models into a selector rather than requiring typed model IDs.
- [x] Use the complete whitelist filtered by XOR pools containing strictly more than 1 XOR.
- [x] Accept actual denomination-verified partial history; XOR/KUSD completed all three default strategies against live history.

- [x] Add visible particle traversal for each live checkpoint and verify actual moving pixels during calculation in Light and Noir.
- [x] Publish the final motion/UX/Codex production and testnet DAGs, recursively pin both on MOF, and verify exact candidate origin files.
- [x] Save the final motion release origin in Bunny, purge the zone, and verify the new public CID, WebKit UI, XOR/KUSD studies, and rendered motion. Production verification passed in both themes with zero console errors and failed requests; all three live study animations moved during computation and froze on completion.
