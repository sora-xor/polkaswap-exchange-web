# Production feature preservation — 28 September 2026

The Store-only production release omitted Bots, Buy XOR, and Get TS. Its router fell back to Swap for those URLs. The replacement release combines the existing full application with the Store frontend and its deployed configuration; it does not revert the Store release wholesale.

## Release identity

The combined release is live after the Bunny origin update and full-zone cache purge. Public root, entry JavaScript, and CSS match the published production CID. All five live WebKit route checks pass with zero failed requests or console errors; the header Buy XOR button and sidebar Bots link were also clicked and verified in the user’s Chrome.

- Prior Store root: `bafybeibfifc6u7rt6iuzhnxiuyidm4ly3fobkhcb45xl7faz537yn532ve`.
- Combined production root: `bafybeidb3gmikyesy7f6gvs24zpqevf2n7pf2sxfbcjmvc6bbkhudvvl3a`.
- Combined testnet root: `bafybeihhkbs5monmkfm6ihxfqd6zp7ew6pv4guit5ivoyfakzi7llzervq`.

Both roots were imported into the dedicated MOF origin, recursively pinned, and checked for complete retained blocks. The root, entry script, CSS, five feature chunks, Store configuration, and companion download returned their exact published bytes without redirects.

## Preservation checks

The compiled build retains all 45 route declarations from the prior Bots and Store releases. All 48 lazy page components and 3,491 relative module imports resolve. All 60 prior Bots public files and 53 Store public files remain present. Runtime configuration matches the prior full application except for the Store configuration intentionally retained from its deployed release.

Buy XOR retains its primary header action, sidebar entry, routed checkout, general XOR purpose, wallet handling, and finalized XOR receipt behavior. Get TS keeps its separate route and campaign flow. Store retains Sora Pay 0.2.2, its production relay, checkout, and refund behavior. The previously validated Bots source and companion remain unchanged.

Validation evidence is retained under `output/go-history/bots-route-repair-20260928/`; Store and Buy XOR integration evidence is under `output/go-history/bots-store-integration-20260928/`. The feature-parity receipt records source and compiled-byte hashes. Browser checks verify actual hash paths, route titles, mounted controls, network requests, and console errors. Local candidate evidence is distinct from live deployment evidence.

## Prevention

The deployment checker now rejects a requested route that silently falls back to another route, even when stale title or DOM could otherwise pass. Swap, Bots, Store, Buy XOR, and Get TS have specific mounted-interface checks. The release runbook requires all five routes before promotion and after purging. Future releases must compare the candidate against the complete shipped application before replacing the production root.

The standard publisher now checks the built entry's reachable JavaScript modules before adding or pinning either production or testnet. The guard requires the combined 45-route baseline, each of the five page bindings, and valid relative imports. The frozen restored release passes; the prior Store-only build is rejected before any IPFS or repository lookup. Its 88 focused tests pass. This checks accidental omissions, not complete runtime behavior; the five browser checks remain required.

The full regression command passed all 9,688 app tests and 2,992 script tests, but exited 1 because one Store rehearsal test still assumed a disabled production relay. The corrected suite covers both disabled and enabled relay settings and passes all 66 tests without changing production configuration. The original failure and targeted repair are recorded separately; no complete rerun is claimed. The updated browser checker passes 53 tests, and a fresh live Get TS check passes with the exact production root and no request or console errors.

No purchase, wallet signing, trading transaction, or profit is established by these navigation and application checks.
