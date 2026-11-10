# Current Polkaswap IPFS origin on OVH

Pi moved on 6 November 2026 to the approved OVH host `141.94.30.127`
(`mof-ovh`). This supersedes the former MacStadium operator paths in
`ipfs-origin.md` and `AGENTS.md`. The public origin URL and Host header remain
`https://pi.soramitsu.io/ipfs/<production-cidv1>` and `pi.soramitsu.io`.
The 7 November node-list release independently verified these live settings.

| Setting | Current value |
| --- | --- |
| SSH | `mofops@141.94.30.127`, port `2222`, existing pinned key |
| Unit / service user | `pi-ipfs-private.service` / `pi-ipfs` |
| Kubo | `/opt/kubo-v0.43.1/ipfs` |
| Repository | `/srv/services/pi-ipfs/repo` |
| API / gateway | `127.0.0.1:5191` / `127.0.0.1:5192` |
| Mode | offline, `Gateway.NoFetch=true` |

Use the retained strict operator helper
`/Users/takemiyamakoto/dev/.mof-ovh-migration-20261103/target_ssh.py`.
It fixes the approved host, user, key and known-hosts pins, disables inherited
SSH settings and forwarding, and accepts `--stdin-file` for a CAR transfer.
Never print credential material. Do not replay the migration initialization or
import scripts: they were written for empty repositories.

Export production and testnet DAGs separately with `ipfs dag export`. Transfer
each CAR to a new private staging path, compare its complete SHA-256, then import
through the existing loopback API as the service user:

```sh
sudo -n -u pi-ipfs env IPFS_PATH=/srv/services/pi-ipfs/repo   /opt/kubo-v0.43.1/ipfs --api /ip4/127.0.0.1/tcp/5191   dag import --pin-roots=true --fast-provide-root=false --fast-provide-dag=false   --stats /srv/services/pi-ipfs/<unique-release>/<network>.car
```

Verify both recursive roots and full `pin verify --verbose`, preserving all
existing release pins. Normalize CID versions when comparing pins: Kubo's
CIDv1-filtered listing may not match a stored CIDv0 representation. No database,
other IPFS repository, node, relay or nginx restart is required for publication.
Keep API access private. Retain the static gateway's `proxy_buffering off` and
verify complete response bodies, not just HTTP status.

The static feature-parity check, separate production/testnet DAG replication,
Bunny settings/CSP checks, saved origin verification, authorized cache purge,
sequential asset warming, and candidate/live WebKit route gates from
`AGENTS.md` remain required. Both approved live RPCs are permitted after the
user's explicit 7 November instruction restoring MOF2.

Provenance: the retained November migration records under
`/Users/takemiyamakoto/dev/.mof-ovh-migration-20261103/`, the current production
API target in `../polkaswap-indexer/AGENTS.md`, and the node-list release's
read-only origin inspection evidence.


When the publisher uses `IPFS_PUBLIC_GATEWAY_URL=https://pi.soramitsu.io`, it
verifies each recursive local pin and prints both roots for CAR replication.
The dedicated gateway serves the imported DAGs offline. Other gateways keep
the publisher’s recursive DHT announcement.
