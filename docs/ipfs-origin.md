# Dedicated Polkaswap IPFS origin

The approved static backing host is the MOF macOS machine `207.254.29.218`. Bunny's
production Origin URL is `https://pi.soramitsu.io/ipfs/<production-cidv1>` and
its Host header is `pi.soramitsu.io`. Keep origin TLS verification enabled.
Use the approved IP for operator access; do not derive another SSH target from
the public hostname.

The October 9 migration restored the then-current production root unchanged:
`bafybeidevp4ms5lsmoxqzcqkkgjtzxqmqgkqootc5zh574lfn6xqkrbr5e`.
Its paired testnet root is
`bafybeia2spxspa3cjf7h4fyagdkn7lmbjbtel4zbfr522nqf4dmzdkqcmq`.
Both retained CARs were imported separately and full recursive pin integrity
passed. Production HTML, configuration, entry JavaScript and CSS passed
complete-body SHA-256 checks through HTTPS. Bunny retained the production CID,
its cache was purged, and the official WebKit checks passed Swap, Bots, Store,
Buy XOR and Get TS with zero failed requests and zero console errors.
The September 28 recovery on the disconnected `208.83.1.62` is historical;
do not use that host or its old service paths for new publications.

The October 22 remove-liquidity layout release uses production root
`bafybeicjwe24zlmugkwtmtue6ynybsyqfcnzfjyeipdbonsinv7gt2ig7i` and paired testnet root
`bafybeice6og6ia5vtmx7bj4vnqjo6kotrqlplr6sse4pomwzwnqip2mumy`.
Its build inputs preserve the October 10 deployed release except for the
percentage input and slider layout fix. Both DAGs were imported separately,
all 11 retained pins passed full integrity, and 410 public complete-body checks
passed after the saved Bunny origin update and full cache purge. All five
required candidate and public WebKit routes passed with zero failed requests
and zero console errors. See the [release report](reports/deployment-2026-10-22.md).

The October 24 dependency/security release uses production root
`bafybeicqvi4opmxmxoqem73mtybdh4ka2ltx3wo7nlvr5k46tqypd3bxea` and paired testnet root
`bafybeihezo3i5u3ohglt47rrjddcdy3ecacvooys3kze6mext5cwlyxshi`.
Both DAGs were imported separately; all 13 retained pins passed full integrity.
The isolated release preserves the shipped October 22 features and applies the
security fixes. Bunny was updated and purged, 409 complete public body checks
passed, and all five candidate/live WebKit routes reported zero failed requests
and zero raw console errors. See the [release report](reports/deployment-2026-10-24.md).

The October 25 password-policy release uses production root
`bafybeictpwld4czgcwbzwxaegopxsgzeaax52mykee2scwa7wonhz7ja7u` and paired testnet root
`bafybeielqxowawakjsw24xku3bivyj25wgqfra435zngplbqosqkqlrxma`.
Both DAGs were imported separately, and all 15 retained pins passed full
integrity. The release preserves the October 24 shipped assembly while enforcing
the new-wallet password minimum and retaining existing-wallet recovery behavior.
Bunny was updated and purged, 419 complete public body checks passed, and all
five candidate/live WebKit routes passed with zero failed requests and zero raw
console errors. See the [release report](reports/deployment-2026-10-25.md) for
source provenance and encrypted-wallet compatibility checks.

## Service

| Setting | Value |
| --- | --- |
| Approved host/account | `207.254.29.218`, `administrator` (UID 501) |
| Private application directory | `/Users/administrator/apps/pi-ipfs` |
| Kubo binary | `/Users/administrator/apps/pi-ipfs/bin/ipfs` |
| Vendor version/platform | Kubo `0.43.0`, `darwin-arm64` |
| Private IPFS repository | `/Users/administrator/apps/pi-ipfs/repo` |
| Runner | `/Users/administrator/apps/pi-ipfs/run-ipfs.sh` |
| Background launchd service | `system/org.polkaswap.pi-ipfs-origin` |
| LaunchDaemon | `/Library/LaunchDaemons/org.polkaswap.pi-ipfs-origin.plist` |
| Logs | `/Users/administrator/apps/pi-ipfs/logs/ipfs.out.log`, `ipfs.err.log` |
| Local RPC API/gateway | `127.0.0.1:5191` / `127.0.0.1:5192` |
| nginx include | `/opt/homebrew/etc/nginx/servers/pi.soramitsu.io.conf` |
| Memory/process/priority settings | `GOMEMLIMIT=512MiB`, `GOMAXPROCS=2`, `Nice=10` |
| Collection target | `Datastore.StorageMax=5GB`, hourly garbage collection |

The executable was copied from MOF's existing Kubo installation. Its recorded
SHA-256 is `3b315e68e18f89903e9ba3417d1eba4d3f3c727e73463c31628e694976ee33f4`.

The runner uses `daemon --offline --enable-gc`. Swarm addresses and Bootstrap
are empty, `AutoConf.Enabled=false`, `Gateway.NoFetch=true`, and
`Gateway.NoDNSLink=true`. Delegated routers and publishers are empty. The
telemetry plugin is disabled, and the runner also sets
`IPFS_TELEMETRY=off` and `DO_NOT_TRACK=1`. Missing content must be imported
locally; this service does not fetch it from the IPFS network. The 5 GB setting
is a collection target for unpinned cache, not a disk quota; release pins remain
retained.

The app/repository are owner-private and the runner is mode `0700`. The system
LaunchDaemon is root-owned, mode `0644`, with `UserName=administrator`,
`RunAtLoad` and `KeepAlive`. It is configured to launch independently of an
interactive login. A reboot was not performed during migration. Preserve MOF's
separate pre-existing `polkaswap-ipfs` repository and its ports `5181/5182`.

Keep both Kubo listeners on loopback. The TLS server exposes only GET/HEAD
content requests under `location ^~ /ipfs/`, forwarding the unchanged URI to
`http://127.0.0.1:5192` with Host `pi.soramitsu.io`. It does not expose the Kubo
API or `/ipns/`. The static location must use `proxy_buffering off;` to stream
large files without nginx temporary-file spooling. A successful status alone
does not prove that a complete body arrived. Preserve the existing TLS and API
routes and unrelated services. Tonswap's dedicated origin is now on OVH.

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

Use the existing approved MOF authentication and pinned host key. The legacy
DPN SSH key/route is not the MOF route. Password authentication, when needed,
must use an interactive prompt or a private runtime askpass helper; never put
the password in arguments, logs or this repository. For unattended CAR pipes,
establish approved authentication before starting the transfer.

```sh
PI_ORIGIN_SSH=(/usr/bin/ssh
  -o StrictHostKeyChecking=yes
  administrator@207.254.29.218)
"${PI_ORIGIN_SSH[@]}" 'id -u' # Expected: 501.
```

```sh
"${PI_ORIGIN_SSH[@]}" \
  'launchctl print system/org.polkaswap.pi-ipfs-origin'
"${PI_ORIGIN_SSH[@]}" \
  '/Users/administrator/apps/pi-ipfs/bin/ipfs version'
"${PI_ORIGIN_SSH[@]}" \
  'shasum -a 256 /Users/administrator/apps/pi-ipfs/bin/ipfs'
"${PI_ORIGIN_SSH[@]}" \
  'IPFS_PATH=/Users/administrator/apps/pi-ipfs/repo /Users/administrator/apps/pi-ipfs/bin/ipfs pin verify --verbose'
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
  'IPFS_PATH=/Users/administrator/apps/pi-ipfs/repo /Users/administrator/apps/pi-ipfs/bin/ipfs dag import --pin-roots'
"${PI_ORIGIN_SSH[@]}" \
  'IPFS_PATH=/Users/administrator/apps/pi-ipfs/repo /Users/administrator/apps/pi-ipfs/bin/ipfs pin ls --type=recursive <published-cid>'
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
