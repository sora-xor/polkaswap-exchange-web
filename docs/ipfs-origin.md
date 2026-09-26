# Dedicated Polkaswap IPFS origin

Polkaswap uses the existing approved MOF host to serve pinned release content
directly to Bunny. The origin is `https://mof.sora.org/ipfs/<production-cidv1>`
with the host header `mof.sora.org`. Its TLS certificate is valid; keep Bunny's
origin certificate verification enabled.

The gateway serves raw files with a restrictive sandboxed CSP that allows image styling but blocks scripts. Run the interactive application on `https://polkaswap.io`, where the
`SetPolkaswapCSP` response rule supplies the application policy documented in
[the publishing guide](ipfs.md). Keep that rule for every origin. Direct origin
HTML is useful for content verification, not a browser application smoke test.

Keep Bunny **Smart Cache** enabled. The IPFS origin serves immutable content,
but the stable hostname's `/` and `/index.html` must retain `Cache-Control:
no-cache` so browsers can discover later releases. The live production root was
verified with `no-cache` during this migration; check both HTML paths again
after origin or cache-setting changes.

## Service

| Setting | Value |
| --- | --- |
| Host | `mof.sora.org` |
| Service account | `administrator` |
| Application directory | `/Users/administrator/apps/polkaswap-ipfs` |
| Kubo binary | `/Users/administrator/apps/polkaswap-ipfs/bin/ipfs` |
| Kubo version | `0.43.0` |
| IPFS repository | `/Users/administrator/apps/polkaswap-ipfs/repo` |
| Runner | `/Users/administrator/apps/polkaswap-ipfs/run-ipfs.sh` |
| Standard output log | `/Users/administrator/apps/polkaswap-ipfs/logs/ipfs.out.log` |
| Error log | `/Users/administrator/apps/polkaswap-ipfs/logs/ipfs.err.log` |
| launchd label | `org.polkaswap.ipfs-origin` |
| LaunchDaemon | `/Library/LaunchDaemons/org.polkaswap.ipfs-origin.plist` |
| Local RPC API | `127.0.0.1:5181` |
| Local gateway | `127.0.0.1:5182` |
| HTTPS gateway | Existing nginx on `mof.sora.org` |
| nginx snippet | `/opt/homebrew/etc/nginx/snippets/polkaswap-ipfs.conf` |
| Routing | `Routing.Type=dhtclient`; delegated routers and publishers empty |
| Cache collection | `Datastore.StorageMax=5GB`, hourly garbage collection |
| Go memory target | `GOMEMLIMIT=512MiB` |
| Go processor limit | `GOMAXPROCS=2` |
| Process priority | `Nice=10` |
| Telemetry | Disabled |

The binary was copied from the locally installed Kubo `0.43.0` binary. SHA-256
was verified on both hosts during provisioning:
`3b315e68e18f89903e9ba3417d1eba4d3f3c727e73463c31628e694976ee33f4`.

Keep the RPC API and HTTP gateway bound to loopback. Only nginx exposes the
HTTPS content routes: the snippet adds only `/ipfs` and `/ipns` paths to the
existing `mof.sora.org` TLS server. The `ws.mof.sora.org` SORA RPC server block
is unchanged. Routing uses the IPFS DHT without delegated HTTP routers,
publishers, or public HTTP gateway dependencies. The 5 GB setting is a garbage
collection target for unpinned cache, not a hard disk quota; recursive release
pins are preserved. This service is separate from the SORA RPC node and
indexer on the same host; never stop unrelated services to repair it. Confirm
the exact command and process owner before stopping any process.

Use existing SSH agent access or credentials supplied through a secure
environment/operator workflow. Do not commit credentials, put them in command
arguments or logs, or extract browser credentials. Company infrastructure
restrictions remain in force; do not use banned providers or legacy credential
material.

## Service and content checks

Inspect the service status and verify the installed binary without restarting
anything:

```bash
ssh administrator@mof.sora.org \
  'launchctl print system/org.polkaswap.ipfs-origin'
ssh administrator@mof.sora.org \
  '/Users/administrator/apps/polkaswap-ipfs/bin/ipfs version'
ssh administrator@mof.sora.org \
  'shasum -a 256 /Users/administrator/apps/polkaswap-ipfs/bin/ipfs'
```

Check recursive pin integrity after imports or storage repairs:

```bash
ssh administrator@mof.sora.org \
  'IPFS_PATH=/Users/administrator/apps/polkaswap-ipfs/repo /Users/administrator/apps/polkaswap-ipfs/bin/ipfs pin verify --verbose'
```

Require every listed pin to report `ok`; a recursive pin listing alone does not
prove all blocks are present. This check covers all recursive pins and may take
longer as retained releases grow. If a pin is incomplete, repeat its CAR import
before considering a cache purge or origin switch.

Initial provisioning checks on 2026-09-06 confirmed that the current production
root, entry JavaScript, CSS, and a lazy chunk returned `200` from the dedicated
HTTPS origin with exact expected bytes and no redirects. The existing SORA RPC
health check also passed. Repeat the asset and RPC checks after relevant
service changes; this initial evidence does not replace each release's live
Bunny/WebKit verification.

## Replicate every published release

Run `yarn ipfs:publish` locally and record both production and testnet roots.
Before checking a candidate Bunny origin or changing it, export each DAG and
import it into the dedicated repository with root pinning. Substitute one actual
published CID for `<published-cid>` and run once for production and once for
testnet:

```bash
set -o pipefail
ipfs dag export '<published-cid>' | ssh administrator@mof.sora.org \
  'IPFS_PATH=/Users/administrator/apps/polkaswap-ipfs/repo /Users/administrator/apps/polkaswap-ipfs/bin/ipfs dag import --pin-roots'
```

Check each root pin on the remote host:

```bash
ssh administrator@mof.sora.org \
  'IPFS_PATH=/Users/administrator/apps/polkaswap-ipfs/repo /Users/administrator/apps/polkaswap-ipfs/bin/ipfs pin ls --type=recursive <published-cid>'
```

Both transfers and pin checks must succeed. An IPFS routing announcement alone
does not replicate a release to this host. Preserve existing release pins for
rollback; do not unpin or garbage-collect prior releases during deployment.

Validate the production root and representative assets without following
redirects:

```bash
curl -sS --max-time 30 -D - -o /tmp/origin-root.html \
  'https://mof.sora.org/ipfs/<production-cidv1>/'
curl -sS --max-time 30 -D - -o /tmp/origin-index.js \
  'https://mof.sora.org/ipfs/<production-cidv1>/assets/<index-*.js>'
curl -sS --max-time 30 -D - -o /tmp/origin-sample.js \
  'https://mof.sora.org/ipfs/<production-cidv1>/assets/<lazy-chunk>.js'
```

Require `200`, the real built HTML, JavaScript content types for scripts, and no
redirects or service-worker shell. Then follow the save, authorized purge, asset
warmup, and WebKit verification sequence in [AGENTS.md](../AGENTS.md). Deployment
is complete only after the live root reports the new CIDv1, WebKit reaches
`Swap - Polkaswap` with real swap UI, and the capture has zero failed requests
and zero console errors.

## Recovery

For a missing chunk, resolve the file CID locally, verify `ipfs cat` succeeds,
and check the dedicated origin's root pin. Repeat the CAR transfer if required,
then warm the raw file CID, its path beneath the production root, and finally
the stable Bunny asset URL. Identify exact failed chunks before warming all
assets or rebuilding.

If a maintained external gateway is needed as an emergency alternative,
reannounce the file CID and root DAG before retrying its static-file checks:

```bash
ipfs routing provide '<file-cid>'
ipfs routing provide --recursive '<production-cid>'
```

`IPFS_PUBLIC_GATEWAY_URL` can override the publisher's gateway base for an
explicitly approved static gateway. Filebase's `https://ipfs.filebase.io` is an
opt-in emergency candidate with public-gateway limits. Validate it before
switching, keep `SetPolkaswapCSP`, and repeat the save, purge, and live checks.
Never use the retiring `ipfs.io` or `dweb.link` gateways as fallback origins.
Browser-only gateways such as `inbrowser.link` require a service worker and
cannot serve as Bunny origins.
