## UCAN token generation script

This legacy utility emits a UCAN token valid for 10 days, delegating upload capabilities to the marketplace. Treat the generated token as a scoped credential: publishing it makes those capabilities available to anyone who can read it.

NFT.Storage Classic [stopped accepting new uploads on June 30, 2024](https://classic-app.nft.storage/docs/). Updating this utility's dependencies does not restore the retired service. Confirm a supported storage integration before using this script for a new upload flow.

### Setup

This directory is a standalone legacy npm package with its own lockfile. Run the following from `scripts/ucan`; the application root uses Yarn and must not use npm installation commands.

```sh
npm ci --ignore-scripts
```

Once the dependencies are installed it is possible to generate UCAN token. The output file (_ucan.json_) will be located in the same directory where scripts resides.

Supply the service API key through the `API_KEY` environment variable without adding it to source control or command arguments.

### Dependency verification

```sh
npm audit --package-lock-only
```

The October 24, 2026 refresh updates `node-fetch` to 3.3.2 and the compatible transitive dependencies, including `base-x` 4.0.1, which fixes [Unicode lookalike validation bypass](https://github.com/advisories/GHSA-xq7p-g2vc-g82p). Audit this lockfile separately from the application's Yarn dependencies.

### UCAN generation

Run the command below to emit this file:

```
node generateNftServiceKeypair.js
```
