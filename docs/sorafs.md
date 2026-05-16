# SoraFS Deploy

This repo now ships a CLI-first SoraFS workflow alongside the existing IPFS flow.
The primary browser target is a CID gateway path on Torii, not the Torii root host.

## Prerequisites

- `yarn install`
- A working `../iroha` checkout
- Rust/Cargo available for `cargo run` fallback when `../iroha/target/debug/{sorafs_cli,iroha}` are not built yet
- For live publish:
  - `SORAFS_AUTHORITY`
  - exactly one of `SORAFS_PRIVATE_KEY` or `SORAFS_PRIVATE_KEY_FILE`
  - optional `SORAFS_CHAIN_ID`
  - optional `SORAFS_NETWORK_PREFIX`
  - optional `SORAFS_SUBMITTED_EPOCH`
  - optional `SIGSTORE_ID_TOKEN` for manifest signing

## Commands

```sh
yarn taira:package
yarn taira:proposal
yarn taira:publish
yarn taira:probe
```

The generic `yarn sorafs:*` commands default to `https://taira.sora.org` and can be overridden with `--torii-url`.
The Taira presets also pin the live chain id and I105 network prefix so
address normalization and the temporary `iroha` client config match the testnet.

To request an optional named host binding in addition to the CID gateway output, pass:

```sh
yarn sorafs:publish --site-hostname polkaswap.sora.org --site-bindings-file ../iroha/configs/soranexus/taira/sorafs_sites.json
```

## Runtime config

The SoraFS packaging flow stages a copy of `dist/` under `artifacts/sorafs/<host>/<timestamp>/site/` and replaces `site/env.json` with `public/env.taira.json`.

The original `dist/` output is left untouched.

The app cache-busts mutable public runtime files with `?v=<build-version>` when
it requests `env.json`, marketing config, and wallet allow/deny lists. The
gateway should still serve `index.html` with `Cache-Control: no-store` on any
stable hostname because an old HTML shell can keep pointing at an old set of
hashed bundle files.

Important: this Polkaswap app is still a Substrate websocket client built on
`@polkadot/api`. Hosting the static bundle on Taira does not make the app speak
Torii, MCP, or Iroha Connect. The shipped `env.taira.json` therefore points at
live SORA Substrate websocket nodes so the Taira-hosted copy is usable in a
browser.

The publish CLI now validates `public/env.taira.json` before staging. It will
fail fast if that file still points at the legacy `*.dev.sora2.soramitsu.co.jp`
websocket list that previously left the Taira-hosted site unable to connect to
any nodes.

## Publish flow

`yarn taira:publish` now:

1. builds and stages the static site
2. registers the manifest on-chain
3. uploads the staged site payload into SoraFS storage
4. derives the canonical content CID from `site.manifest.json`
5. writes the CID gateway URL into `package.summary.json`
6. derives the authority public key from the I105 address and uses an ephemeral `iroha --config ...` client file for the storage-pin call

The default browser result is:

- `https://taira.sora.org/sorafs/cid/<cid>/`

Host bindings are now optional and must be requested explicitly with
`--site-hostname`.

The temporary `iroha` client file is written outside the artifact directory and
deleted after the publish attempt so private keys do not get persisted into the
SoraFS artifact bundle.

`POST /v1/sorafs/storage/pin` currently uploads the full staged site as one JSON
request. For the current Polkaswap bundle this is about `18 MiB` raw and about
`24 MiB+` once base64-encoded into the request body. The public edge in front of
Torii must therefore allow a body larger than the packaged site. The shipped
Taira nginx template sets `client_max_body_size 64m;` and keeps
`proxy_request_buffering off;`.

If `yarn taira:publish` fails with `413 Payload Too Large`, redeploy the edge
host with `../iroha/configs/soranexus/taira/taira-explorer.nginx.conf` before
retrying.

## Artefacts

Each run writes into `artifacts/sorafs/<host>/<timestamp>/`:

- `site.car`
- `site.plan.json`
- `site.car.summary.json`
- `site.manifest.to`
- `site.manifest.json`
- `site.proof.summary.json`
- `site.pin.proposal.json` after `proposal` or `publish`
- `site.manifest.bundle.json` and `site.manifest.sig` when `SIGSTORE_ID_TOKEN` is available
- `site.submit.summary.json` and `site.submit.response.json` after `publish`
- `site.storage_pin.summary.json` and `site.storage_pin.response.json` after `publish`
- `site.gateway.route_plan.json` and `site.gateway.headers.txt` only when `--site-hostname` is supplied
- `site.binding.json` only when `--site-hostname` is supplied
- `package.summary.json`

The package summary now includes:

- `gateway.content_cid`
- `gateway.cid_gateway_path`
- `gateway.cid_gateway_url`

## Epoch resolution

If `SORAFS_SUBMITTED_EPOCH` is not set, the app deploy CLI resolves the epoch from `GET /status` before it builds `site.pin.proposal.json` and before it submits the manifest.

## Governance flow

When Taira rejects direct pin registration for lack of `CanRegisterSorafsPin`, the publish flow now leaves behind a ready-to-use `site.pin.proposal.json` and surfaces that path in the error message. Use `yarn taira:proposal` if you want the governance artefacts without attempting a privileged publish.

## CID gateway serving

The primary SoraFS web path is:

- `GET /sorafs/cid/<cid>/`
- `GET /sorafs/cid/<cid>/<path...>`

Once the live Taira nodes run the patched `../iroha` build and the publish
completes successfully, the Polkaswap bundle is viewed in a browser at:

- `https://taira.sora.org/sorafs/cid/<cid>/`

Gateway behavior:

- CID routes are local-first and remote-on-miss.
- If a node does not already have the requested manifest locally, Torii resolves
  the CID through the approved replication order and provider advert cache,
  fetches the manifest and payload from a remote SoraFS provider, stores the
  bundle locally, and then serves it from cache on later requests.
- For this to work on a public node, the Torii deployment must keep
  `torii.sorafs.discovery_enabled = true` and `torii.sorafs_storage.enabled = true`.

Named host bindings in `sorafs_sites.json` remain supported, but they are
secondary and are no longer the default output of the deploy CLI.

## Probe checks

`yarn taira:probe` validates:

- `/sorafs/cid/<cid>/` returns HTML
- `/v1/sorafs/cid/<cid>` returns JSON
- `/status` returns JSON
- `/v1/sumeragi/status` returns JSON
