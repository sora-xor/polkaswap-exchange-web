# Polkaswap WebMCP Challenge submission package

Private working package updated September 3, 2026. This file contains submission copy and preparation notes; keep it private. **SUBMITTED:** Devpost confirmed “Project submitted!” at `2026-09-03 13:34:47 UTC`. The public project [Polkaswap](https://devpost.com/software/polkaswap-5pcxgy) shows submission to The WebMCP Challenge. Its embedded video was verified as the correct public SORA-channel upload `S9xtCkkbbAE`.

## Entry fields

| Field | Suggested value or current status |
| --- | --- |
| Project title | Polkaswap |
| Tagline | Browser agents discover assets, quote routes, and build fresh swap plans without wallet access. |
| Public source branch | [codex/webmcp-challenge](https://github.com/sora-xor/polkaswap-exchange-web/tree/codex/webmcp-challenge) |
| Submission commit | [4955eb0cc340e400194a1b013b53fe5a4c1b559f](https://github.com/sora-xor/polkaswap-exchange-web/commit/4955eb0cc340e400194a1b013b53fe5a4c1b559f) |
| Dated contribution comparison | [Baseline 893783b to submission 4955eb0](https://github.com/sora-xor/polkaswap-exchange-web/compare/893783ba6a19c33043eb5dabe42d949c14d0f257...4955eb0cc340e400194a1b013b53fe5a4c1b559f) |
| Published build URL | [Exact-build agent playground](https://bafybeicckxkvbonqvmtmdgj7divj6kireq4ufqycbn24xxqqhvxoiqiupu.ipfs.inbrowser.link/agent-playground.html) |
| Native verification of that exact build | Passed September 3: nine tools discovered; native planner returned unsigned live SORA plan |
| Public source and testing guide | [docs/webmcp-challenge.md at the submission commit](https://github.com/sora-xor/polkaswap-exchange-web/blob/4955eb0cc340e400194a1b013b53fe5a4c1b559f/docs/webmcp-challenge.md) |
| Public YouTube video with audio | [SORA-channel demo](https://youtu.be/S9xtCkkbbAE) — published September 3, 2026; public playback and channel `@sora_xor` verified |
| License | Apache-2.0; repository root `LICENSE` |
| Built with | WebMCP, TypeScript, Vue 3, Vite, SORA SDK, Polkadot APIs, FPNumber, IPFS, Vitest, Playwright; optional Node.js stdio MCP bridge |
| Entrant/team and authorized representative | Individual entrant; other profile details remain in Devpost |
| Devpost status | **SUBMITTED** — receipt confirmed `2026-09-03 13:34:47 UTC`; all additional information saved and final agreement/submission completed |
| Public Devpost project | [Polkaswap](https://devpost.com/software/polkaswap-5pcxgy) — submission ID `1168851`, software ID `1415136`; submitted to The WebMCP Challenge |

The published challenge build contains nine tools and comes from the public clean submission commit above. Its content root is `bafybeicckxkvbonqvmtmdgj7divj6kireq4ufqycbn24xxqqhvxoiqiupu`. Native WebMCP verification of that exact build passed. The browser gateway may need an initial service-worker installation and loading wait; it is an end-user demo URL, never a Bunny origin. Production Bunny has not been updated, and `polkaswap.io` still advertises the older eight-tool catalogue without `polkaswap_plan_swap`.

## Devpost description

### Inspiration

Planning a swap means identifying the correct assets, understanding the route, reading decimal amounts precisely, and checking fees, price impact, and quote freshness. We wanted a browser agent to obtain those facts directly from the exchange and explain them to a person through a structured, inspectable interface.

Polkaswap already connects people to SORA liquidity. WebMCP lets us expose a focused planning interface from that same page, so an agent can work with current exchange data while wallet access remains a separate decision.

### What it does

Polkaswap registers nine public WebMCP tools for capabilities, status, node readiness, asset search and resolution, common assets, swap quotes, unsigned swap plans, and pool information.

An agent can receive a request such as “Plan swapping 1 XOR for VAL with 0.5% slippage,” then call `polkaswap_plan_swap` directly. The tool waits for node readiness, resolves canonical assets, obtains a fresh quote, and returns the route, bounds, public fee estimate when available, warnings, expiry, network context, and unsigned SDK-call metadata. Unavailable fees produce an explicit warning. It requires neither a connected wallet nor a preceding manual quote.

People can inspect the same planning results in an agent playground, change the pair or amount, and see the plan refresh automatically. Visible pages replan after input changes and expiry. An automatic-planning switch controls scheduling, and the interface prevents an older response from replacing a newer request.

These are planning tools. They cannot connect a wallet, expose account identity or balances, create an executable intent, sign, submit, transfer funds, or change liquidity. Every public plan returns `mode: "unsigned"`, `canExecute: false`, and `requiresWallet: false`. Its preview is SDK-call metadata, not a SCALE-encoded transaction. The entry does not provide unattended trading.

### Why WebMCP improves the experience

The page gives agents named operations, strict input schemas, and structured results. Agents can discover the available actions and answer concrete planning questions with the same application logic used by the exchange. People retain a visible interface for inspecting the resulting route, amount bounds, fees, warnings, and freshness.

The main application and the playground register tools at the top level. A browser agent can invoke planning without manipulating form controls; a person can use those controls to explore the same inputs. Public planning never requests wallet consent.

### How we built it

The implementation uses the existing Vue 3 and TypeScript application, SORA SDK, node connection, and precise FPNumber amount handling. The WebMCP adapter registers the public catalogue through `document.modelContext.registerTool()` when available. A top-level playground adapter forwards tool calls into the same-origin application iframe.

The catalogue uses strict schemas and decimal-string amounts. Public response projection excludes wallet and provider details, while bounded error messages and cancellation handling keep invocation results predictable. Planning binds its snapshot to the observed network and expires after five minutes. It rejects a network change during quoting and stores no executable authorization.

The site builds into static Vite assets with relative discovery paths suitable for IPFS hosting. No hosted command middleware is required. An optional local stdio MCP bridge shares the same public catalogue. The WebMCP demonstration uses browser-native discovery and invocation, verified against the exact published build.

### Challenges we addressed

We needed a top-level registration path because tools inside the playground iframe are not discovered by the browser agent. We also needed to expose useful market data without exposing wallet state through the broader application API.

Freshness required more than a refresh button: input changes can race with earlier network requests, quotes expire, and pages become hidden. The scheduler serializes automatic requests, ignores superseded results, pauses while hidden, and bounds retries for transient failures. Precise token amounts stay in decimal strings and FPNumber calculations throughout.

### Accomplishments

The published clean build passed 306 focused tests across 21 files, 13 translation tests across four files, and nine preview-helper tests in one file. The official Node MCP stdio check passed discovery of all nine tool schemas. The browser harness registered the nine tools, invoked unsigned planning, and confirmed automatic replanning after changing an amount from `1` to `2`, with zero captured console, request, or HTTP errors. Unit coverage exercises planning, privacy, cancellation, network changes, expiry, and stale-result handling.

That browser smoke injects a WebMCP registration harness. Separate native browser-agent verification of the [exact published build](https://bafybeicckxkvbonqvmtmdgj7divj6kireq4ufqycbn24xxqqhvxoiqiupu.ipfs.inbrowser.link/agent-playground.html) discovered all nine tools and directly invoked `polkaswap_plan_swap`. It returned an unsigned live SORA plan without wallet access. Automatic page planning also refreshed from 1 to 2 XOR. The [narrated working demo is public on the SORA channel](https://youtu.be/S9xtCkkbbAE).

### Existing project and challenge contribution

Polkaswap is an existing open-source exchange. The pre-existing foundation includes its trading interface, SORA integration, wallet-enabled application workflows, and static deployment infrastructure.

This entry focuses on the WebMCP contribution for the August 25–September 3, 2026 challenge window: the public tool catalogue and adapters, wallet-independent swap planning, the agent playground and automatic replanning behavior, and their documentation and tests. The [public comparison](https://github.com/sora-xor/polkaswap-exchange-web/compare/893783ba6a19c33043eb5dabe42d949c14d0f257...4955eb0cc340e400194a1b013b53fe5a4c1b559f) identifies changes from the already-public `ui-updates` baseline `893783ba6a19c33043eb5dabe42d949c14d0f257` to [submission commit 4955eb0](https://github.com/sora-xor/polkaswap-exchange-web/commit/4955eb0cc340e400194a1b013b53fe5a4c1b559f). The exchange and earlier agent-related foundation remain pre-existing work; the comparison defines the submitted contribution.

### What's next

We want to make multi-route comparisons and planning explanations easier to inspect, expand useful public market reads, and improve recovery messages when node data is temporarily unavailable. Public signing and execution remain disabled. Any future signing profile would need explicit authorization and a complete set of transaction, spending-limit, idempotency, and emergency-stop controls.

## Judge testing instructions

Use a challenge-supported browser with WebMCP enabled, such as the ChatGPT in-app browser or a compatible Chrome setup. Testing this public planning workflow requires no Polkaswap account, wallet, funds, API key, or transaction. The application needs access to its configured public SORA node to obtain live quotes.

1. Open the [exact-build agent playground](https://bafybeicckxkvbonqvmtmdgj7divj6kireq4ufqycbn24xxqqhvxoiqiupu.ipfs.inbrowser.link/agent-playground.html). On the first visit, allow the browser gateway to install its service worker and load the IPFS content; reload once if prompted. Keep wallet-data consent unchecked and wait for the application and node to become ready. A cold first load took several minutes during verification; subsequent planning calls completed successfully.
2. Inspect the browser agent's discovered site tools. Confirm the nine names below, including `polkaswap_plan_swap`. Eight tools means the older deployment is loaded.
3. Ask the agent: **“Use Polkaswap's WebMCP tools to plan swapping 1 XOR for VAL, with 0.5% slippage. Show the route, minimum output, fee estimate, warnings, expiry, and whether the result can execute. Do not connect a wallet or submit a transaction.”**
4. Confirm the native invocation calls `polkaswap_plan_swap` and returns `mode: "unsigned"`, `canExecute: false`, and `requiresWallet: false`. Output amounts depend on current liquidity. Warnings are meaningful results, not permission to execute.
5. In the playground, leave **Plan automatically** enabled and change **Amount to spend** from `1` to `2`. After the debounce and network response, the visible plan should use `2`, with wallet consent still unchecked. Disable automatic planning to stop future automatic requests.
6. Inspect `.well-known/polkaswap-mcp-tools.json` relative to the submitted site's base URL and compare it with the public commit. The URL and repository must remain accessible throughout judging.

The exact tool inventory is:

```text
polkaswap_capabilities
polkaswap_status
polkaswap_ready
polkaswap_assets
polkaswap_resolve_asset
polkaswap_common_assets
polkaswap_quote_swap
polkaswap_plan_swap
polkaswap_pool_info
```

For a client that accepts explicit tool arguments, invoke `polkaswap_plan_swap` with:

```json
{
  "assetIn": { "symbol": "XOR" },
  "assetOut": { "symbol": "VAL" },
  "amount": "1",
  "side": "input",
  "slippageTolerance": "0.5",
  "dexId": "best"
}
```

### Reproduce the submitted build locally

Start from [commit 4955eb0cc340e400194a1b013b53fe5a4c1b559f](https://github.com/sora-xor/polkaswap-exchange-web/tree/4955eb0cc340e400194a1b013b53fe5a4c1b559f) on `codex/webmcp-challenge`. Follow the [public challenge guide](https://github.com/sora-xor/polkaswap-exchange-web/blob/4955eb0cc340e400194a1b013b53fe5a4c1b559f/docs/webmcp-challenge.md), use Node 26 and the repository's pinned Yarn 4 release, and apply the root README's environment requirements:

```sh
nvm use
corepack enable
yarn install
yarn serve --host 127.0.0.1
```

Open `agent-playground.html` under the address printed by Vite in a WebMCP-capable browser. For a static build use `yarn build`; the output is `dist/`. The repository requires Yarn because dependencies use its `patch:` protocol.

Relevant verification commands are:

```sh
yarn test:unit --project unit tests/unit/features/agent-trading
yarn test:translation
yarn test:e2e:agent:smoke
```

Unit tests use mocks. The browser smoke reads live node data and injects a registrar to check the WebMCP adapter; it does not replace native WebMCP testing. Do not configure a funded wallet profile or enable optional transaction-execution flags for judge testing.

## Published narrated video: 2 minutes 26 seconds

Six English narration WAVs are ready under `output/webmcp-challenge/narration/01.wav` through `06.wav`, totaling 141.613208 seconds. They use Kokoro-82M's built-in `af_heart` synthetic voice, with no voice cloning. Exact inputs, license URLs, release hashes, and measurements are saved in `output/webmcp-challenge/narration-segments.json`, `output/webmcp-challenge/narration/manifest.json`, and `output/webmcp-challenge/narration/narration-provenance.json`. Format, duration, and decoding checks passed; subjective listening QA was not available in the generating model session. The finished 2:26 video is [public on the SORA channel](https://youtu.be/S9xtCkkbbAE), with playback verified and its AI-narration disclosure visible.

The published edit uses real native browser-agent footage from the exact build, with audible synthetic narration. The successful native invocation is visible in History; later result panels show the page planner's separate snapshot. The table below preserves the original shot plan and narration for reference. Its timings are approximate; the finished video is 145.593958 seconds, including segment holds and transitions.

| Time | Shot | Narration |
| --- | --- | --- |
| 0:00–0:20 | Show the exchange, then its agent playground. Show the submitted build URL. | “This is Polka Swap, an existing open source exchange on Sora. Our challenge contribution adds Web M C P tools and a wallet independent planning workspace. A browser agent can discover assets, read current quotes, and build an unsigned swap plan from the same application people use.” |
| 0:20–0:40 | Show native browser-agent tool discovery, including `polkaswap_plan_swap`; keep wallet consent visibly unchecked. | “The browser discovers nine public tools on the top-level page. They expose capabilities, readiness, assets, quotes, plans, and pool information. This session has no connected wallet. The planning tools cannot read account balances, connect a wallet, sign, or submit.” |
| 0:40–1:10 | Enter the judge prompt; show the actual `polkaswap_plan_swap` invocation and returned structured result. | “I'll ask the agent to plan one X O R into V A L with half a percent slippage. It uses the site's plan swap tool directly, without a quote button or wallet approval. The tool resolves the assets, waits for the node, and obtains a fresh quote. Here are the route, minimum output, fee estimate, and warnings. If a fee estimate is unavailable, the result makes that explicit.” |
| 1:10–1:30 | Expand expiry, network context, unsigned SDK-call preview, and the three safety fields. | “The result includes an expiry and the network context used for this snapshot. Its call preview is S D K metadata, not a signed or SCALE encoded transaction. These fields are explicit: unsigned, cannot execute, and no wallet required. A quote or plan never grants spending permission.” |
| 1:30–1:55 | Change the playground amount from `1` to `2`; show the refreshed result and untouched wallet consent; turn automatic planning off. | “People can explore the same inputs here. Changing the amount to two starts a fresh plan automatically. Requests are serialized, and an older response cannot overwrite this input. Plans also refresh on expiry while the page is visible. Turning this switch off stops future automatic planning.” |
| 1:55–2:22 | Show public source commit and scoped tests, then return to the visible plan. | “The new interface is TypeScript and Web M C P over Polka Swap's existing S D K, shipped as static assets for I P F S. Tests cover precise amounts, privacy, expiry, cancellation, and stale responses. The public repository identifies the challenge changes. The result is an inspectable planning workflow for people and browser agents, with signing kept outside the public tools.” |

The finished recording is below the three-minute limit and includes native discovery, invocation, unsigned-plan fields, automatic replanning, and public source evidence. Publication and watch-page playback are verified; no further recording or upload step is outstanding.

## Evidence and remaining submission fields

### Preparation checkpoint — September 3, 2026

The clean challenge source and its exact static build are now published:

- Public branch: `codex/webmcp-challenge` in `sora-xor/polkaswap-exchange-web`.
- Submission commit: `4955eb0cc340e400194a1b013b53fe5a4c1b559f`; baseline: `893783ba6a19c33043eb5dabe42d949c14d0f257`.
- Exact-build CIDv0: `QmSobXdggHKujR3UUBrwRt9E4wQxnwpMFPwcqHxpQGSYWQ`.
- Exact-build CIDv1: `bafybeicckxkvbonqvmtmdgj7divj6kireq4ufqycbn24xxqqhvxoiqiupu`.
- End-user browser URL: [submitted agent playground](https://bafybeicckxkvbonqvmtmdgj7divj6kireq4ufqycbn24xxqqhvxoiqiupu.ipfs.inbrowser.link/agent-playground.html). Allow the initial service-worker gateway loading step. This browser gateway must never be configured as a Bunny origin.
- Public source guide: [`docs/webmcp-challenge.md`](https://github.com/sora-xor/polkaswap-exchange-web/blob/4955eb0cc340e400194a1b013b53fe5a4c1b559f/docs/webmcp-challenge.md).
- Clean-build validation passed: 21 focused test files / 306 tests; four translation files / 13 tests; one preview-helper file / nine tests; official Node MCP stdio discovery / nine tool schemas; browser registration-harness planning and amount-change replanning from `1` to `2` / zero captured errors.
- Native WebMCP verification passed on the exact build: nine tools discovered and a direct `polkaswap_plan_swap` call returned `mode: "unsigned"`, `canExecute: false`, and `requiresWallet: false`, with live quote, fee, expiry, and SORA network context. Evidence: `output/webmcp-challenge/capture-final/native-plan.json`.
- The native snapshot observed block 27523368; 1 XOR quoted 732.012254138602455213 VAL, minimum 728.352192867909442937 VAL at 0.5% slippage, with a static public fee estimate of 0.100020712589707326 XOR. These are recorded observations, not current prices or execution guarantees.
- The separate automatic page planner refreshed from 1 to 2 XOR, flagged high price impact, and paused when automatic planning was disabled. The native History entry stores invocation metadata only; Summary/Raw JSON show the page planner's separate snapshot. The video description discloses this distinction.
- Static dweb checks passed for root, playground, entry JavaScript/CSS, SwapPage and agent lazy chunks, WebMCP adapter, and both discovery JSON files: HTTP 200, no redirects, correct types, exact asset bytes and nine-tool schema parity. HTML differs only by an observed Cloudflare-injected hidden anchor, not a service-worker shell.
- Production Bunny has not been updated. `polkaswap.io` still serves the older eight-tool catalogue; the challenge URL above is the submitted build candidate.
- The finished narrated MP4 is 145.593958 seconds (2:26), 1280×720 H.264 at 30 fps with stereo AAC audio. Full decode and visual spot checks passed; audio is non-silent, but subjective listening was unavailable in this session. Real browser clips hold their final frame during narration; no simulated tool results. File: `output/webmcp-challenge/polkaswap-webmcp-demo.mp4`.
- The correct [SORA-channel video](https://youtu.be/S9xtCkkbbAE) is public. YouTube Studio confirmed “Video published,” published September 3, 2026, duration 2:26. The public watch page plays, links to channel `@sora_xor`, and displays the AI-narration disclosure. Playback was confirmed and paused at 00:34.
- **Devpost submission completed at `2026-09-03 13:34:47 UTC`.** Additional information was saved at step 4 of 5 with `Individual`, `Japan`, `Significant`, and `Yes`; the final agreement checkbox and Submit project action then succeeded. Receipt: “Project submitted!” Devpost stated that edits remain available until September 3, 2026 at 4:00 p.m. EDT.
- The public project [Polkaswap](https://devpost.com/software/polkaswap-5pcxgy), submission ID `1168851`, software ID `1415136`, displays submission to The WebMCP Challenge. Its DOM embeds the verified SORA video at [youtube.com/embed/S9xtCkkbbAE](https://www.youtube.com/embed/S9xtCkkbbAE).

Local evidence available now:

- `output/playwright/agent-trading-smoke-autonomy-replan.json`, timestamp `2026-09-03T10:12:30.173Z`: nine registered tools, successful planner invocation, amount-change replanning, no wallet opt-in, `pass: true`, and zero captured console/request/HTTP errors.
- `scripts/playwright/agent-trading-smoke.mjs`: registration harness used by that smoke. Separate completed native verification is recorded in `output/webmcp-challenge/capture-final/native-plan.json`.
- `tests/unit/features/agent-trading/`: service, WebMCP, playground, catalogue, and related unit coverage; clean-build test results are recorded in the checkpoint above.
- `docs/agent-trading.md`, `docs/agent-trading-cookbook.md`, and the public branch's `docs/webmcp-challenge.md`: implementation and usage references.
- `output/webmcp-challenge/narration/manifest.json` and `narration-provenance.json`: six ready narration segments with exact text, file paths, measured durations, licenses, and asset hashes.

Public source publication, the dated contribution comparison, clean-build tests, IPFS publication, native discovery/invocation, the public narrated SORA-channel demo and watch-page playback, registration, all additional information, and final Devpost submission are complete. Submission `1168851` is **SUBMITTED**, with the receipt observed at `2026-09-03 13:34:47 UTC` and the public project/video embed verified.

The four required additional-information values were saved before submission:

- Entrant type: `Individual` — supplied by the user.
- Country of residence: `Japan` — supplied by the user.
- Learning level: `Significant` — selected by the main assistant based on the completed project and explicitly disclosed to the user; not represented as a direct user-provided answer.
- Career value of AI: `Yes` — supplied by the user.

All four values and the technical answers were saved at step 4 of 5. The final agreement and Submit project action succeeded; no submission step remains outstanding.

The [official challenge overview](https://openai.com/webmcp-challenge/) and [official rules](https://webmcp.devpost.com/rules) govern the entry. The submission window ends September 3, 2026 at 1 p.m. PDT. The package needs an English description, accessible live app, full public source with an identifiable open-source license, and a public YouTube working demo with audio under three minutes. Meaningful WebMCP additions to an existing app need dated evidence distinguishing earlier work. Keep judge access free and unrestricted through September 21, 2026.
