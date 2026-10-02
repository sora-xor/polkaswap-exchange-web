# Prospective collector recovery — 20 September 2026

At 03:54 UTC the original tool session `37273` no longer existed and the exact OS writer, PID `48081`, was absent. No matching collector process was running. The last retained observation was scheduled at 03:32:23 UTC and recorded at 03:32:35.156 UTC. The cause of the interruption is undetermined; it was not treated as a temporary polling timeout or attributed to market/RPC failure.

The original journal had 77 complete records and one retained timeout. Its full hash chain and all 46 frozen source hashes validated. The verified stale lock was archived before removing only that lock; no observations, manifests, protocols, or frozen source files were changed.

## Recovery and verification

The unchanged collector's `--resume` mode now runs under the one-shot macOS launchd job `gui/501/org.sora.polkaswap-day001-20260920`. The job is explicitly loaded from an output-directory plist, with an absolute Node 26 executable, a fixed PATH, and `caffeinate -i`. There is no `KeepAlive` or retry loop. It is independent of the Codex tool session; a reboot/logout or another process failure can still interrupt it.

The wrapper verifies the original protocol, manifest, 46 source hashes, and retained journal prefix before collection. After a successful collector exit, it requires all 722 scheduled records and repeats those checks before invoking the unchanged offline evaluator. It refuses to overwrite the original final-report destination.

At 03:58:46 UTC, launchd reported the first run active and the collector process was verified directly. The first resumed observation, slot 90, completed at 03:58:41.769 UTC. Counts were **78 complete, one error, and 12 missed**. All original 78 records remained byte-for-byte identical. The 12 elapsed slots from 03:34:23 through 03:56:23 UTC were marked `missed`; none was queried retrospectively or replaced. The existing collector/store suites passed **33 tests across two files**.

- [Recovery preflight](../../output/go-history/research-20260920/day-001-recovery/preflight.json)
- [Launch receipt](../../output/go-history/research-20260920/day-001-recovery/bootstrap.json)
- [Live verification](../../output/go-history/research-20260920/day-001-recovery/verification.json)
- [Test log](../../output/go-history/research-20260920/day-001-recovery-tests.log)
- [One-shot wrapper](../../output/go-history/research-20260920/day-001-recovery/resume.zsh)

The scheduled final observation remains **21 September at 01:00:23 UTC / 10:00:23 JST**. Inspect the actual job with `launchctl print gui/501/org.sora.polkaswap-day001-20260920`; the obsolete tool session is no longer its liveness handle. Logs are retained in `output/go-history/research-20260920/day-001-recovery/`. Do not load a duplicate writer or remove a live lock.

## Goal status

This repairs an interrupted evidence-collection process. The retained timeout and missed slots preclude uninterrupted full-episode evidence. The data remain development observations, not fills, profitable execution, or strategy qualification. No funds moved. A qualifying strategy, personally authorized finalized transaction, and successful-process recording remain outstanding. No production code or deployment changed during this recovery.
