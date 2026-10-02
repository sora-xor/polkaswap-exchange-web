# Hourly watch transport correction

Live verification after the first scheduled hour found that the waiting timer
advanced but did not request a new strategy. `getCurrentIndexer()` creates a new
descriptor on every call. The readiness reader compared descriptor identity,
so its default transport returned `null` before querying coverage. The earlier
unit fixture returned a stable descriptor, and the separate public metadata
smoke did not exercise that transport guard.

Readiness now binds to the stable explorer service and initialized client,
following the existing history loader. The regression fixture creates a fresh
descriptor on every lookup and verifies that both coverage requests run and
return readiness. A check with the installed client also caught an invalid
assumption that URQL exposes a public `url` property; the correction uses client
identity instead. Regression coverage uses the actual explorer client with a
mocked HTTP response. Service or client replacement still rejects stale responses.
No budget, fee, qualification or validation policy changes are included.

Build, focused tests, origin/purge verification and subsequent live evidence are
stored under `output/go-history/autopilot-watch-transport-fix-20260922/`.
