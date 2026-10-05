# Install and run

This package needs a local shell, Node 26, network access to the deployed Polkaswap app and its configured public SORA endpoints, and a compatible Playwright Chromium runtime. No wallet, Polkaswap account, model-provider key or funded balance is required. Your coding agent's own access and usage terms still apply.

The runtime is a local browser runner, not a hosted MCP endpoint. A skill install alone does not provision it. The full Polkaswap checkout and its Yarn dependencies are unnecessary for running the installed package.

## Install the skill from a reviewed local checkout

Choose an empty project directory for an isolated trial. Set `REPO_DIR` to the reviewed checkout's absolute path. With that project as the current directory:

```sh
DISABLE_TELEMETRY=1 npx --yes skills@1.7.0 add \
  "$REPO_DIR/skills/polkaswap-trade-preflight" \
  --skill polkaswap-trade-preflight --agent codex --copy --yes
```

The Codex project path is `.agents/skills/polkaswap-trade-preflight`. For Claude Code replace `--agent codex` with `--agent claude-code`; its project path is `.claude/skills/polkaswap-trade-preflight`. Omit `--yes` if you want to inspect the installer's prompts. Use project scope for the trial; no `--global` or account credentials are needed.

The command downloads the pinned official Vercel skills CLI if necessary and copies this package to the agent's skill directory. `DISABLE_TELEMETRY=1` disables that CLI's telemetry and remote security-audit request. It does not suppress downloads or the later public site/RPC requests. See the [official CLI repository](https://github.com/vercel-labs/skills) and [CLI documentation](https://www.skills.sh/docs/cli). Published `skills@1.7.0` was checked against the [npm registry](https://registry.npmjs.org/skills/1.7.0) on 5 October 2026.

For a manual install, copy the complete `polkaswap-trade-preflight` folder to the appropriate project skill directory. Keep `scripts/` and `references/` together with `SKILL.md`; copying only the Markdown file loses the runner. Reload or start a new agent session if the agent does not discover it immediately.

## Public distribution status

The new skill is under local review. The existing public Polkaswap repository does not imply that this package has been published, and no skills.sh listing is claimed.

Once a reviewed revision containing the package is public, set `REVIEWED_SKILL_SOURCE` to its exact public GitHub tree URL and use the same pinned command:

```sh
DISABLE_TELEMETRY=1 npx --yes skills@1.7.0 add \
  "$REVIEWED_SKILL_SOURCE" \
  --skill polkaswap-trade-preflight --agent codex --copy --yes
```

Do not use an unpublished branch URL or silently fall back to the repository's default branch. Inspect the installed files before running them.

## Install a separate runtime

First check `node --version`; use Node 26. If it is unavailable, report that requirement and use the user's existing approved Node installation method. The skill does not install a Node version manager. Playwright's [official system requirements](https://playwright.dev/docs/intro#system-requirements) include Node 26; this package pins [Playwright 1.63.0](https://github.com/microsoft/playwright/releases/tag/v1.63.0).

Resolve `SKILL_DIR` to the installed package and select a fresh absolute runtime directory outside both the repository and the installed skill. For Codex project scope, from that project directory:

```sh
SKILL_DIR="$PWD/.agents/skills/polkaswap-trade-preflight"
RUNTIME_DIR="$HOME/.local/share/polkaswap-preflight-runtime-1.63.0"
node "$SKILL_DIR/scripts/setup.mjs" --runtime-dir "$RUNTIME_DIR"
```

For Claude Code, use `.claude/skills/polkaswap-trade-preflight` for `SKILL_DIR`. The setup helper takes only `--runtime-dir`; it validates Node 26 and the runtime directory before installation. It creates its own private runtime package, or validates a previously created runtime it owns. It refuses an unrelated existing package instead of overwriting it; choose a fresh directory in that case.

This is an explicit download step. The helper invokes npm for pinned `playwright@1.63.0` with install scripts, audits and funding requests disabled, then runs the official Playwright CLI to download only the matching Chromium headless shell into `RUNTIME_DIR/browsers`. It does not install into the Polkaswap repo, which uses Yarn and incompatible `patch:` dependency specifications. Keep the generated runtime `package-lock.json` for repeatability. Playwright requires matching browser binaries; [official browser documentation](https://playwright.dev/docs/browsers) explains `--only-shell` and `PLAYWRIGHT_BROWSERS_PATH`.

On Linux, Chromium may also need operating-system libraries. If launch fails, report the missing libraries and use the host's approved setup process. Do not silently run a privileged package-manager command, disable the browser sandbox, or attach to a personal browser to bypass a launch error.

## First preflight

After setup, use the same `SKILL_DIR` and `RUNTIME_DIR`:

```sh
node "$SKILL_DIR/scripts/preflight.mjs" --help
node "$SKILL_DIR/scripts/preflight.mjs" \
  --asset-in XOR --asset-out PSWAP --amount 1 \
  --slippage 0.5 --runtime-dir "$RUNTIME_DIR"
```

For exact output, request an output amount and report the maximum input:

```sh
node "$SKILL_DIR/scripts/preflight.mjs" \
  --asset-in XOR --asset-out VAL --amount 10 --side output \
  --slippage 0.5 --runtime-dir "$RUNTIME_DIR"
```

The runner uses `https://polkaswap.io/?polkaswap-agent=1#/swap` in an empty, ephemeral context. It does not reuse cookies, account state, wallet extensions or a persistent browser profile. It closes its browser after obtaining a result or failing.

A successful first run means fresh public assets and an unsigned plan were returned, with a route, bound, network identity, timestamp, expiry and fee sources. It does not mean the proposed trade executed. A missing route, ambiguous asset, disconnected node or unavailable production API is a failed preflight with a concrete reason, not a zero-price quote.

The runner accepts positive decimal amounts, `input` or `output` side, and slippage from `0.01` to `10` percent. DEX selection is fixed to `best`; this first version does not select a custom DEX, liquidity source or endpoint. Its live run has a bounded total timeout. Errors produce `ok: false`, a fixed `error.code` and a nonzero exit status; upstream browser/provider details are deliberately excluded.

If downloads or site/RPC access are blocked, preserve the returned error code and stop that run. Do not grant a wallet, create a hosted service, change production endpoints or repair servers as part of setup. If public `polkaswap_*` tools are already configured, they provide an alternative transport without this local browser installation.
