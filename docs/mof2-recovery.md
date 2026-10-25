# MOF2 RPC and MeowFi recovery

## Service layout

The approved OVH host for `mof2.sora.org` is `51.161.218.175`. Use existing SSH
agent access as `ubuntu`; the recorded SSH host key is associated with the IP.
Never place credentials in commands, logs, or this document.

The shared `nginx.service` terminates HTTPS for both the SORA RPC at
`https://mof2.sora.org/` and the MeowFi game at
`https://meowfi.mof2.sora.org/`. The SORA archive node runs as
`sora-framenode.service` and listens on port 9944. This host is separate from
the macOS host serving `ws.mof.sora.org`.

## Incident on 2026-09-09

At 06:48:05 UTC, during unattended package upgrades and service restarts,
nginx failed its configuration check because `taira.sora.org` could not be
resolved in an unrelated shared proxy include. The DNS resolver restarted in
the same second. The SORA node remained healthy, but nginx stayed failed with
its default `Restart=no`, making the RPC and game unreachable over HTTPS.

At 14:39:51 UTC, nginx was started after `nginx -t` passed. No node restart,
database changes, application rebuild, or DNS changes were needed.

The following systemd override was added at
`/etc/systemd/system/nginx.service.d/10-restart-on-failure.conf`:

```ini
# Retry startup after transient DNS failures in shared proxy upstreams.
[Unit]
StartLimitIntervalSec=0

[Service]
Restart=on-failure
RestartSec=30s
```

`systemctl daemon-reload` loads the override without interrupting nginx.
`systemd-analyze verify nginx.service` and `nginx -t` passed, and the running
unit reports `Restart=on-failure`, `RestartUSec=30s`, and
`StartLimitIntervalUSec=0`. This retries transient startup failures; persistent
invalid configuration still requires repair. An explicit administrative stop
does not trigger automatic restart.

To roll back this override, remove only the file above and run
`sudo systemctl daemon-reload`.

## MeowFi certificate renewal

The MeowFi certificate was due to expire on 2026-09-13. Its renewal used
Certbot's standalone authenticator, which repeatedly failed because nginx
already owned port 80. Renewal now uses the webroot `/var/www/meowfi-acme`.
The dedicated HTTP challenge server is
`/etc/nginx/conf.d/meowfi-acme.conf`, explicitly included from
`/etc/nginx/nginx.conf`. Only `/.well-known/acme-challenge/` serves that webroot;
other HTTP requests redirect to HTTPS.

The targeted `certbot reconfigure` staging test and production renewal passed.
The renewed certificate expires **2026-12-08 13:43:51 UTC**. Its public TLS
fingerprint matched the renewed local certificate, and HTTPS verification
passed. The existing deploy hook gracefully reloads nginx; the renewal timer
remains enabled and active. No nginx restart was used for this change.

Focused pre-change backups and repair notes are retained on the host at
`/var/backups/meowfi-cert-renewal-20260909T144147Z`. They cover the nginx
configuration and MeowFi renewal configuration. Restoring the old standalone
renewal settings would reintroduce the port-80 conflict.

## Verification

From this repository, run:

```sh
node scripts/ops/check-mof-rpc.mjs --endpoint https://mof2.sora.org/
```

The recovery check passed CORS preflight, JSON-RPC health and negative cases,
eight repeated healthy responses, and WebSocket upgrade `101`. The node
reported 28 peers and `isSyncing:false`. A live
`chain_subscribeFinalizedHeads` WebSocket subscription also advanced from block
27590891 to 27590892 after recovery.
The full probe suite passed again after certificate renewal and nginx reload.

MeowFi's onboarding rendered in Chrome and WebKit, with working Next
navigation. The root, TonConnect manifest, and application assets returned
200. Both `meowfi.service` and `meowfi-redis.service` were active/running with
zero restarts, and the game Redis instance on port 43791 returned `PONG`.

The unauthenticated `/meowapi/bot_url`, `/meowapi/total_users`, and
`/meowapi/user_stats` requests returned the expected 401 `Missing tgWebAppData`.
The last endpoint's WebSocket handler is behind the same Telegram auth layer;
an unauthenticated probe must not be counted as a successful game session.

For future checks, open `https://meowfi.mof2.sora.org/` in a browser and verify
actual game assets and onboarding; an HTTP 200 alone is insufficient. A browser
outside Telegram does not carry Telegram launch authentication, so it cannot
prove an authenticated player session or progression. Existing out-of-Telegram
warnings, a hydration warning, and two external wallet-icon failures were
observed and are separate from the shared HTTPS outage.
