# Dedicated Polkaswap IPFS origin

The approved static backing host is the macOS machine `208.83.1.62`. Bunny's
production Origin URL is `https://pi.soramitsu.io/ipfs/<production-cidv1>` and
its Host header is `pi.soramitsu.io`. Keep origin TLS verification enabled.
Use the approved IP for operator access; do not derive another SSH target from
the public hostname.

The restored release is the original September 28 production root:
`bafybeidb3gmikyesy7f6gvs24zpqevf2n7pf2sxfbcjmvc6bbkhudvvl3a`.
Its retained CAR was imported and recursively pinned without rebuilding or
changing the CID. Full pin integrity, the root/index, and nine assets through
both their published paths and raw CIDs passed exact-byte loopback checks.
Direct HTTPS checks also passed for those 20 responses. This establishes
origin content availability; completed Bunny transfers and browser checks
remain separate release requirements. The recovery restored this production
DAG and does not establish that a testnet release was replicated.

## Service

| Setting | Value |
| --- | --- |
| Approved host/account | `208.83.1.62`, `administrator` (UID 501) |
| Private application directory | `/Users/administrator/apps/polkaswap-ipfs` |
| Kubo binary | `/Users/administrator/apps/polkaswap-ipfs/bin/ipfs` |
| Vendor version/platform | Kubo `0.43.0`, `darwin-arm64` |
| Private IPFS repository | `/Users/administrator/apps/polkaswap-ipfs/repo` |
| Runner | `/Users/administrator/apps/polkaswap-ipfs/run-ipfs.sh` |
| Ensure helper | `/Users/administrator/apps/polkaswap-ipfs/ensure-ipfs.py` |
| Background launchd service | `user/501/org.polkaswap.ipfs-origin` |
| Private LaunchAgent | `/Users/administrator/Library/LaunchAgents/org.polkaswap.ipfs-origin.plist` |
| Logs | `/Users/administrator/apps/polkaswap-ipfs/logs/ipfs.out.log`, `ipfs.err.log` |
| Local RPC API/gateway | `127.0.0.1:5181` / `127.0.0.1:5182` |
| nginx include | `/opt/homebrew/etc/nginx/servers/pi.soramitsu.io.conf` |
| Memory/process/priority settings | `GOMEMLIMIT=512MiB`, `GOMAXPROCS=2`, `Nice=10` |
| Collection target | `Datastore.StorageMax=5GB`, hourly garbage collection |

The executable matches the verified official vendor artifact. Its SHA-256 is
`ef8783052cbdeb5cab0b767fd98e181252acea9a440a75fef569d469cb44eda2`.

The runner uses `daemon --offline --enable-gc`. Swarm addresses and Bootstrap
are empty, `AutoConf.Enabled=false`, `Gateway.NoFetch=true`, and
`Gateway.NoDNSLink=true`. Delegated routers and publishers are empty. The
telemetry plugin is disabled, its mode is `off`, and the runner also sets
`IPFS_TELEMETRY=off` and `DO_NOT_TRACK=1`. Missing content must be imported
locally; this service does not fetch it from the IPFS network. The 5 GB setting
is a collection target for unpinned cache, not a disk quota; release pins remain
retained.

The app/repository are owner-private. The runner and ensure helper are mode
`0700`; the LaunchAgent is mode `0600`, with `Background` session/process type,
`RunAtLoad`, and `KeepAlive`. A bootstrap establishes the current user service;
it alone does not establish recovery after reboot. The separately reviewed
watchdog integration is pending and must add this exact hook after Pi's ensure
hook before reboot persistence is claimed:

```sh
/usr/bin/python3 -I /Users/administrator/apps/polkaswap-ipfs/ensure-ipfs.py >/dev/null 2>&1 || true
```

Keep both Kubo listeners on loopback. The TLS server exposes only GET/HEAD
content requests under `location ^~ /ipfs/`, forwarding the unchanged URI to
`http://127.0.0.1:5182` with Host `pi.soramitsu.io`. It does not expose the Kubo
API or `/ipns/`. The static location must use `proxy_buffering off;` to stream
large files without nginx temporary-file spooling. A successful status alone
does not prove that a complete body arrived. Preserve the existing TLS and API
routes and unrelated services, including the separate Tonswap IPFS service.

HTML must use `Cache-Control: no-cache, max-age=0, must-revalidate`. JavaScript,
CSS, image, font, and Wasm responses use `public, max-age=31536000, immutable`.
Raw CID responses with other content types retain the default no-cache policy.
Keep Bunny Smart Cache enabled and check both stable HTML paths after changes.
The gateway's restrictive raw-file CSP is replaced on `polkaswap.io` by the
`SetPolkaswapCSP` rule in [AGENTS.md](../AGENTS.md); direct origin HTML is a byte
verification target, while the application browser checks use the stable site.

## Inspect without restarting

Use operator-approved authentication without putting credentials in command
arguments, logs, or repository files. These commands address the approved host
and the dedicated service explicitly:

On the current operator Mac, the verified administrator identity is
`/Users/takemiyamakoto/.ssh/dpn_test_ed25519`. Its pinned host file is
`/Users/takemiyamakoto/.taira-test-runtime-20260911/deployment-ssh/known-hosts-1`.
The existing `backing_ssh` route in
`/Users/takemiyamakoto/.taira-test-runtime-20260911/storage-binding-20260920/bound-deployment.json`
records this exact account and approved IP. Select the key and pinned host file
explicitly for the inspection and replication commands below:

```sh
PI_ORIGIN_SSH=(/usr/bin/ssh -F /dev/null
  -o BatchMode=yes -o IdentitiesOnly=yes -o IdentityAgent=none
  -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile=/Users/takemiyamakoto/.taira-test-runtime-20260911/deployment-ssh/known-hosts-1
  -i /Users/takemiyamakoto/.ssh/dpn_test_ed25519
  administrator@208.83.1.62)
"${PI_ORIGIN_SSH[@]}" 'id -u' # Expected: 501.
```

```sh
"${PI_ORIGIN_SSH[@]}" \
  'launchctl print user/501/org.polkaswap.ipfs-origin'
"${PI_ORIGIN_SSH[@]}" \
  '/Users/administrator/apps/polkaswap-ipfs/bin/ipfs version'
"${PI_ORIGIN_SSH[@]}" \
  'shasum -a 256 /Users/administrator/apps/polkaswap-ipfs/bin/ipfs'
"${PI_ORIGIN_SSH[@]}" \
  'IPFS_PATH=/Users/administrator/apps/polkaswap-ipfs/repo /Users/administrator/apps/polkaswap-ipfs/bin/ipfs pin verify --verbose'
```

Require every recursive pin to report `ok`. A pin listing alone does not prove
that all blocks are present. Repeat the appropriate CAR import if integrity
fails; preserve prior release pins during deployment.

## Replicate future production and testnet releases

The publisher still has its previous gateway default. Always supply the Pi
override and record the production and testnet roots separately:

```sh
IPFS_PUBLIC_GATEWAY_URL=https://pi.soramitsu.io yarn ipfs:publish
```

Before changing Bunny, export and import each complete DAG, once for the actual
production CID and once for the actual testnet CID. Use only the production
CIDv1 in the `polkaswap.io` Origin URL.

```sh
set -o pipefail
ipfs dag export '<published-cid>' | "${PI_ORIGIN_SSH[@]}" \
  'IPFS_PATH=/Users/administrator/apps/polkaswap-ipfs/repo /Users/administrator/apps/polkaswap-ipfs/bin/ipfs dag import --pin-roots'
"${PI_ORIGIN_SSH[@]}" \
  'IPFS_PATH=/Users/administrator/apps/polkaswap-ipfs/repo /Users/administrator/apps/polkaswap-ipfs/bin/ipfs pin ls --type=recursive <published-cid>'
```

Both imports, both root pin listings, and full `pin verify --verbose` must
succeed. Routing announcements cannot replace replication to this offline
repository. Preserve the CAR hash, root CID, and verification evidence for each
release.

## Verify delivery and recover assets

Validate normal TLS, no redirects, exact complete body sizes/hashes, and the
expected content types for the root, index, entry JS, CSS, and required lazy
chunks. For example:

```sh
curl -q -sS --fail --max-redirs 0 --max-time 30 -D /tmp/origin-root.headers \
  -o /tmp/origin-root.html 'https://pi.soramitsu.io/ipfs/<production-cidv1>/'
curl -q -sS --fail --max-redirs 0 --max-time 30 -D /tmp/origin-css.headers \
  -o /tmp/origin.css 'https://pi.soramitsu.io/ipfs/<production-cidv1>/assets/<style-*.css>'
shasum -a 256 /tmp/origin-root.html /tmp/origin.css
```

Require `200`, real built HTML, JavaScript/CSS content types as appropriate,
and exact expected hashes. Include a throttled large-file transfer when
qualifying nginx changes. If a response truncates, inspect the bounded nginx
error log and the static location's buffering setting before changing global
temporary-directory permissions.

For a missing chunk, resolve its CID locally, confirm `ipfs cat` succeeds,
verify the origin's recursive root pin, and repeat the CAR import if needed.
Then warm the raw CID, the path under the production root, and the corresponding
`https://polkaswap.io/assets/<chunk>` sequentially. Identify the failed asset
before warming the entire build or rebuilding.

After validated origin settings are saved, perform the already authorized Bunny
zone `5860217` purge, complete public asset transfers, and the WebKit checks in
[AGENTS.md](../AGENTS.md). Deployment is complete only when the live root has the
expected CIDv1, the requested routes show their mounted UI, and browser capture
reports zero failed requests and zero console errors.
