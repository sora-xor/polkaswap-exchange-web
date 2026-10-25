/**
 * Autonomous, wallet-free planning console for the same-origin Polkaswap Agent API.
 *
 * The playground deliberately keeps the application iframe private, stores no
 * session data outside memory, and sanitizes every response before retaining it.
 */
(function setupAgentPlayground() {
  'use strict';

  const AGENT_SESSION_SEARCH_PARAM = 'polkaswap-agent';
  const AGENT_READY_EVENT = 'polkaswap-agent-ready';
  const AGENT_FAILURE_EVENT = 'polkaswap-agent-install-failed';
  const WEBMCP_STATUS_EVENT = 'polkaswap-webmcp-status';
  const WEBMCP_INVOCATION_EVENT = 'polkaswap-webmcp-invocation';
  const HISTORY_LIMIT = 40;
  const AUTO_PLAN_DELAY_MS = 500;
  const AUTO_PLAN_RETRY_DELAYS_MS = [1000, 5000, 15000];
  const MAX_COLLECTION_ITEMS = 100;
  const MAX_SANITIZED_NODES = 1500;
  const MAX_STRING_LENGTH = 4000;
  const DECIMAL_PATTERN = /^(?:0|[1-9][0-9]{0,59})(?:\.[0-9]{1,30})?$/;
  const SECRET_KEY_PATTERN =
    /(?:private.?key|mnemonic|seed|secret|pass(?:word|phrase)|authorization|bearer|access.?token|refresh.?token)/i;
  const WALLET_CONTEXT_PATTERN = /(?:wallet|signer|account|owner|recipient|beneficiary|identity)/i;
  const ASSET_CONTEXT_PATTERN = /(?:asset|token|currency)/i;

  const frame = document.getElementById('app-frame');
  if (!frame) return;

  const elements = {
    amount: document.getElementById('amount'),
    amountLabel: document.getElementById('amount-label'),
    amountSymbol: document.getElementById('amount-symbol'),
    autoPlan: document.getElementById('auto-plan'),
    autonomyStatus: document.getElementById('autonomy-status'),
    callOutput: document.getElementById('call-output'),
    checkNode: document.getElementById('check-node'),
    clearHistory: document.getElementById('clear-history'),
    contractOutput: document.getElementById('contract-output'),
    copyRaw: document.getElementById('copy-raw'),
    dexId: document.getElementById('dex-id'),
    diagnosticMessage: document.getElementById('diagnostic-message'),
    flipAssets: document.getElementById('flip-assets'),
    formError: document.getElementById('form-error'),
    freshness: document.getElementById('review-freshness'),
    historyCount: document.getElementById('history-count'),
    historyOutput: document.getElementById('history-output'),
    liquiditySource: document.getElementById('liquidity-source'),
    plan: document.getElementById('plan'),
    prepare: document.getElementById('prepare'),
    provenanceApi: document.getElementById('provenance-api'),
    provenanceBuild: document.getElementById('provenance-build'),
    provenanceGenesis: document.getElementById('provenance-genesis'),
    provenanceIpfs: document.getElementById('provenance-ipfs'),
    provenanceRuntime: document.getElementById('provenance-runtime'),
    provenanceSchema: document.getElementById('provenance-schema'),
    quote: document.getElementById('quote'),
    quoteTimeout: document.getElementById('quote-timeout'),
    rawOutput: document.getElementById('raw-output'),
    refreshDiagnostics: document.getElementById('refresh-diagnostics'),
    slippage: document.getElementById('slippage'),
    summaryOutput: document.getElementById('summary-output'),
    walletOptIn: document.getElementById('wallet-data-opt-in'),
  };

  const state = {
    activeOperation: null,
    agent: null,
    agentPromise: null,
    automation: { enabled: elements.autoPlan.checked, failures: 0, inFlight: false, pending: false, timer: 0 },
    catalogue: [],
    engineAbort: new AbortController(),
    expiryTimer: 0,
    formRevision: 0,
    history: [],
    initializationPromise: null,
    initialized: false,
    latest: null,
    mode: 'input',
    operationSequence: 0,
    pickers: {
      in: createPickerState('in'),
      out: createPickerState('out'),
    },
    preparation: null,
    privacy: { walletData: false },
    quote: null,
    quotedRevision: -1,
    runningOperations: 0,
    started: false,
    status: null,
  };

  /** Return a new asset-picker state backed by the accessible DOM. */
  function createPickerState(side) {
    return {
      activeIndex: -1,
      debounceTimer: 0,
      input: document.getElementById(`asset-${side}-search`),
      list: document.getElementById(`asset-${side}-options`),
      meta: document.getElementById(`asset-${side}-meta`),
      querySequence: 0,
      results: [],
      selected: null,
      side,
    };
  }

  /** Build an element with text-only content to avoid HTML interpretation. */
  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  /** Read the first defined value from a list of object paths. */
  function firstDefined(source, paths) {
    for (const path of paths) {
      const parts = path.split('.');
      let value = source;
      for (const part of parts) {
        if (value === null || value === undefined || typeof value !== 'object') {
          value = undefined;
          break;
        }
        value = value[part];
      }
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
  }

  /** Convert arbitrary display data to a short, non-empty string. */
  function displayValue(value, fallback = 'Unavailable') {
    if (value === undefined || value === null || value === '') return fallback;
    if (Array.isArray(value)) return value.length ? value.map(String).join(', ') : fallback;
    if (typeof value === 'object') {
      try {
        const serialized = JSON.stringify(value);
        return serialized.length > 180 ? `${serialized.slice(0, 177)}…` : serialized;
      } catch {
        return fallback;
      }
    }
    return String(value);
  }

  /** Abbreviate identifiers while keeping enough material for comparison. */
  function abbreviate(value, leading = 10, trailing = 8) {
    const text = displayValue(value, 'Unavailable');
    if (text === 'Unavailable' || text.length <= leading + trailing + 1) return text;
    return `${text.slice(0, leading)}…${text.slice(-trailing)}`;
  }

  /** Keep only canonical, public asset metadata in browser state. */
  function toCanonicalAsset(asset) {
    if (!asset || typeof asset !== 'object') return null;
    const address = typeof asset.address === 'string' ? asset.address.trim() : '';
    if (!address) return null;
    return {
      address,
      canonical: Boolean(asset.canonical),
      decimals: Number.isInteger(asset.decimals) ? asset.decimals : undefined,
      name: typeof asset.name === 'string' ? asset.name.slice(0, 160) : '',
      symbol: typeof asset.symbol === 'string' ? asset.symbol.slice(0, 64) : '',
      type: typeof asset.type === 'string' ? asset.type.slice(0, 80) : undefined,
    };
  }

  /**
   * Copy untrusted API data into a bounded, prototype-free structure.
   * Wallet/account identifiers are always redacted; balances are opt-in.
   */
  function sanitizeValue(value, options = {}, path = [], seen = new WeakSet(), depth = 0) {
    if (!options.nodeBudget) options.nodeBudget = { remaining: MAX_SANITIZED_NODES };
    if (options.nodeBudget.remaining <= 0) return '[sanitization budget reached]';
    options.nodeBudget.remaining -= 1;
    const includeWalletData = Boolean(options.includeWalletData);
    if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'string') {
      return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
    }
    if (typeof value === 'function' || typeof value === 'symbol') return '[unsupported value]';
    if (depth >= 10) return '[maximum depth reached]';
    if (typeof value !== 'object') return String(value);
    if (seen.has(value)) return '[circular reference]';
    seen.add(value);

    if (value instanceof Error) {
      const errorResult = {
        code: sanitizeValue(value.code, options, path.concat('code'), seen, depth + 1),
        message: sanitizeValue(value.message, options, path.concat('message'), seen, depth + 1),
        name: sanitizeValue(value.name, options, path.concat('name'), seen, depth + 1),
      };
      seen.delete(value);
      return errorResult;
    }

    if (Array.isArray(value)) {
      const arrayResult = value
        .slice(0, MAX_COLLECTION_ITEMS)
        .map((entry, index) => sanitizeValue(entry, options, path.concat(String(index)), seen, depth + 1));
      seen.delete(value);
      return arrayResult;
    }

    const result = Object.create(null);
    for (const [key, entry] of Object.entries(value).slice(0, MAX_COLLECTION_ITEMS)) {
      const nextPath = path.concat(key);
      const joinedPath = nextPath.join('.');
      const parentPath = path.join('.');

      if (SECRET_KEY_PATTERN.test(key)) {
        continue;
      } else if (/^(?:endpoint|rpcUrl|wsUrl|url)$/i.test(key) && /(?:node|network|rpc|status)/i.test(parentPath)) {
        result[key] = '[endpoint hidden]';
      } else if (
        /^(?:address|account|owner|recipient|beneficiary|to)$/i.test(key) &&
        WALLET_CONTEXT_PATTERN.test(joinedPath) &&
        !ASSET_CONTEXT_PATTERN.test(parentPath)
      ) {
        result[key] = '[account address redacted]';
      } else if (!includeWalletData && /(?:availableWallets|accountsCount|providers?)$/i.test(key)) {
        result[key] = '[not shared]';
      } else if (
        !includeWalletData &&
        (/^(?:balance|balances|available|availableCodec|sufficient|transferable|free|reserved|locked)$/i.test(key) ||
          /(?:wallet|signer)\.(?:source|balance|balances)$/i.test(joinedPath))
      ) {
        result[key] = '[not shared]';
      } else {
        result[key] = sanitizeValue(entry, options, nextPath, seen, depth + 1);
      }
    }
    seen.delete(value);
    return result;
  }

  /** Extract a privacy-safe status shape rather than retaining the raw object. */
  function toSafeStatus(status) {
    const source = status && typeof status === 'object' ? status : {};
    return sanitizeValue(
      {
        network: {
          genesisHash: firstDefined(source, ['network.genesisHash', 'node.genesisHash', 'provenance.genesisHash']),
          name: firstDefined(source, ['network.name', 'node.chain', 'chain.name']),
        },
        node: {
          blockNumber: firstDefined(source, ['node.blockNumber', 'node.bestBlock', 'network.blockNumber']),
          connected: Boolean(firstDefined(source, ['node.connected', 'network.connected'])),
          endpoint: firstDefined(source, ['node.endpoint', 'network.endpoint']),
        },
        runtime: {
          specName: firstDefined(source, ['runtime.specName', 'node.runtime.specName', 'network.runtime.specName']),
          specVersion: firstDefined(source, [
            'runtime.specVersion',
            'runtime.runtimeSpecVersion',
            'node.runtimeSpecVersion',
            'node.runtime.specVersion',
            'network.runtimeSpecVersion',
            'network.runtime.specVersion',
          ]),
          transactionVersion: firstDefined(source, [
            'runtime.transactionVersion',
            'node.runtime.transactionVersion',
            'network.runtime.transactionVersion',
          ]),
        },
        settings: { slippageTolerance: firstDefined(source, ['settings.slippageTolerance']) },
        version: firstDefined(source, ['version', 'apiVersion']),
        wallet: {
          address: firstDefined(source, ['wallet.address', 'signer.address']),
          connected: Boolean(firstDefined(source, ['wallet.connected', 'signer.connected'])),
          loaded: Boolean(firstDefined(source, ['wallet.loaded'])),
          source: firstDefined(source, ['wallet.source', 'signer.source']),
        },
      },
      { includeWalletData: state.privacy.walletData }
    );
  }

  /** Return a fixed safe error without retaining upstream messages or details. */
  function normalizeError(error) {
    let proposedCode = '';
    try {
      proposedCode = typeof error?.code === 'string' ? error.code : '';
    } catch {
      proposedCode = '';
    }
    const safeMessages = {
      AGENT_API_UNAVAILABLE: 'The Polkaswap Agent API is unavailable.',
      ASSET_AMBIGUOUS: 'More than one asset matches that reference.',
      ASSET_NOT_FOUND: 'The selected asset is unavailable.',
      INVALID_AMOUNT: 'The amount is invalid.',
      INVALID_ARGUMENT: 'One or more request arguments are invalid.',
      INVALID_PERCENT: 'The percentage is outside the supported range.',
      NETWORK_CONTEXT_UNAVAILABLE: 'The SORA network context is unavailable or changed during planning.',
      NODE_NOT_READY: 'The SORA node is not ready.',
      PATH_UNAVAILABLE: 'No swap path is available for this request.',
      QUOTE_TIMEOUT: 'The quote did not become available before the timeout.',
      WALLET_NOT_CONNECTED: 'A connected wallet is required for this preparation.',
    };
    const code = Object.hasOwn(safeMessages, proposedCode) ? proposedCode : 'UNEXPECTED_ERROR';
    const actions = {
      AGENT_API_UNAVAILABLE: 'Reload the page and confirm the embedded application can start.',
      ASSET_AMBIGUOUS: 'Choose the asset by canonical address from the selector.',
      ASSET_NOT_FOUND: 'Search again and select an asset from the canonical results.',
      NETWORK_CONTEXT_UNAVAILABLE: 'Wait for a stable SORA connection, then request a new plan.',
      NODE_NOT_READY: 'Use Check node, then retry after the SORA node is connected.',
      PATH_UNAVAILABLE: 'Try another pair or allow all liquidity sources.',
      QUOTE_TIMEOUT: 'Increase the quote timeout or retry after node conditions improve.',
      WALLET_NOT_CONNECTED: 'Connect a wallet in Polkaswap only if you want a balance-aware preparation.',
    };
    return {
      action: actions[code] || 'Review the inputs and retry. No transaction was submitted.',
      code,
      message: safeMessages[code] || 'The request could not be completed safely.',
    };
  }

  /** Build the static-site-safe same-origin iframe URL. */
  function getAppUrl() {
    const url = new URL('.', window.location.href);
    url.searchParams.set(AGENT_SESSION_SEARCH_PARAM, '1');
    url.hash = '/swap';
    return url.toString();
  }

  /** Update one compact status-rail cell. */
  function setStatus(key, text, statusState) {
    const output = document.getElementById(`status-${key}`);
    const item = document.querySelector(`[data-status-key="${key}"]`);
    if (output) output.textContent = text;
    if (item) {
      if (statusState) item.dataset.state = statusState;
      else delete item.dataset.state;
    }
  }

  /** Present one actionable diagnostic without leaking error internals. */
  function setDiagnostic(message, diagnosticState) {
    elements.diagnosticMessage.textContent = message;
    if (diagnosticState) elements.diagnosticMessage.dataset.state = diagnosticState;
    else delete elements.diagnosticMessage.dataset.state;
  }

  /** Render status from the restricted status snapshot. */
  function renderStatus() {
    const status = state.status;
    if (!status) return;
    const nodeConnected = Boolean(status.node?.connected);
    const block = status.node?.blockNumber;
    const walletConnected = Boolean(status.wallet?.connected);
    const networkName = status.network?.name || 'SORA';
    setStatus('api', status.version ? `Ready · ${status.version}` : 'Ready', 'ready');
    setStatus(
      'node',
      nodeConnected ? `Connected${block !== undefined ? ` · #${block}` : ''}` : 'Disconnected',
      nodeConnected ? 'ready' : 'warning'
    );
    setStatus(
      'wallet',
      walletConnected ? 'Connected · hidden' : 'Not connected',
      walletConnected ? 'ready' : 'warning'
    );
    setStatus('network', displayValue(networkName, 'SORA'), nodeConnected ? 'ready' : 'warning');
    elements.provenanceApi.textContent = displayValue(status.version);
  }

  /** Wait for the Agent API from the same-origin application frame. */
  async function getAgent(timeoutMs = 30000) {
    if (state.agent) return state.agent;
    if (state.agentPromise) return state.agentPromise;
    const appWindow = frame.contentWindow;
    if (!appWindow) throw new Error('The embedded Polkaswap application is unavailable.');
    if (appWindow.PolkaswapAgent) {
      state.agent = appWindow.PolkaswapAgent;
      return state.agent;
    }

    const pending = new Promise((resolve, reject) => {
      const poll = window.setInterval(() => {
        let currentAgent;
        try {
          currentAgent = frame.contentWindow?.PolkaswapAgent;
        } catch {
          currentAgent = null;
        }
        if (!currentAgent) return;
        cleanup();
        state.agent = currentAgent;
        resolve(currentAgent);
      }, 100);
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(
          Object.assign(new Error('Timed out waiting for the Polkaswap Agent API.'), { code: 'AGENT_API_UNAVAILABLE' })
        );
      }, timeoutMs);

      function cleanup() {
        window.clearInterval(poll);
        window.clearTimeout(timeout);
        appWindow.removeEventListener(AGENT_READY_EVENT, onReady);
        appWindow.removeEventListener(AGENT_FAILURE_EVENT, onFailure);
      }

      function onReady(event) {
        const api = event?.detail?.api || appWindow.PolkaswapAgent;
        if (!api) return;
        cleanup();
        state.agent = api;
        resolve(api);
      }

      function onFailure() {
        cleanup();
        reject(
          Object.assign(new Error('The Polkaswap Agent API could not be installed.'), { code: 'AGENT_API_UNAVAILABLE' })
        );
      }

      appWindow.addEventListener(AGENT_READY_EVENT, onReady);
      appWindow.addEventListener(AGENT_FAILURE_EVENT, onFailure);
    });

    state.agentPromise = pending.catch((error) => {
      state.agentPromise = null;
      throw error;
    });
    return state.agentPromise;
  }

  /** Update the status snapshot without adding noise to the trade history. */
  async function refreshStatus() {
    const agent = await getAgent();
    const rawStatus = await agent.status();
    state.status = toSafeStatus(rawStatus);
    renderStatus();
    renderProvenanceFromStatus();
    return sanitizeValue(state.status, { includeWalletData: state.privacy.walletData });
  }

  /** De-duplicate search results by canonical address. */
  function uniqueAssets(assets) {
    const seen = new Set();
    const result = [];
    for (const entry of Array.isArray(assets) ? assets : []) {
      const asset = toCanonicalAsset(entry);
      if (!asset || seen.has(asset.address)) continue;
      seen.add(asset.address);
      result.push(asset);
      if (result.length >= 12) break;
    }
    return result;
  }

  /** Format public asset metadata for the canonical selector. */
  function assetMeta(asset) {
    if (!asset) return 'Select a canonical asset';
    const details = [asset.name, abbreviate(asset.address, 12, 10)];
    if (Number.isInteger(asset.decimals)) details.push(`${asset.decimals} decimals`);
    return details.filter(Boolean).join(' · ');
  }

  /** Close an asset listbox and reset its active descendant. */
  function closePicker(picker) {
    picker.list.hidden = true;
    picker.input.setAttribute('aria-expanded', 'false');
    picker.input.removeAttribute('aria-activedescendant');
    picker.activeIndex = -1;
  }

  /** Render an asset listbox using only text nodes. */
  function renderPickerResults(picker) {
    picker.list.replaceChildren();
    if (!picker.results.length) {
      const empty = createElement('li', 'asset-option', 'No canonical assets found');
      empty.setAttribute('role', 'option');
      empty.setAttribute('aria-disabled', 'true');
      picker.list.append(empty);
    } else {
      picker.results.forEach((asset, index) => {
        const option = createElement('li', 'asset-option');
        option.id = `asset-${picker.side}-option-${index}`;
        option.dataset.index = String(index);
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(index === picker.activeIndex));
        option.append(
          createElement('strong', '', asset.symbol || 'Unnamed asset'),
          createElement('small', '', asset.name || `${asset.decimals ?? '?'} decimals`),
          createElement('code', '', asset.address)
        );
        picker.list.append(option);
      });
    }
    picker.list.hidden = false;
    picker.input.setAttribute('aria-expanded', 'true');
  }

  /** Choose one canonical result and update dependent form language. */
  function selectAsset(picker, asset, markDirty = true) {
    const canonical = toCanonicalAsset(asset);
    if (!canonical) return;
    picker.selected = canonical;
    picker.input.value = canonical.symbol || canonical.address;
    picker.meta.textContent = assetMeta(canonical);
    closePicker(picker);
    updateAmountLanguage();
    if (markDirty) markFormDirty();
  }

  /** Search the runtime asset catalogue without requesting wallet balances. */
  async function searchAssets(picker, query) {
    const sequence = ++picker.querySequence;
    picker.meta.textContent = 'Searching canonical assets…';
    try {
      const agent = await getAgent();
      const assets = await agent.assets({ query: query.slice(0, 128), includeBalances: false });
      if (sequence !== picker.querySequence) return;
      picker.results = uniqueAssets(assets);
      picker.activeIndex = picker.results.length ? 0 : -1;
      picker.meta.textContent = picker.selected ? assetMeta(picker.selected) : 'Choose one canonical result';
      renderPickerResults(picker);
    } catch (error) {
      if (sequence !== picker.querySequence) return;
      picker.results = [];
      picker.meta.textContent = normalizeError(error).message;
      renderPickerResults(picker);
    }
  }

  /** Resolve defaults from the runtime rather than trusting typed symbols. */
  async function initializeAssets(agent) {
    let common = [];
    try {
      common = uniqueAssets(await agent.commonAssets({ includeBalances: false }));
    } catch {
      common = [];
    }

    for (const [side, symbol] of [
      ['in', 'XOR'],
      ['out', 'PSWAP'],
    ]) {
      const picker = state.pickers[side];
      let asset = common.find((entry) => entry.symbol.toUpperCase() === symbol);
      if (!asset) {
        try {
          asset = toCanonicalAsset(await agent.resolveAsset({ asset: { symbol }, includeBalance: false }));
        } catch {
          asset = null;
        }
      }
      if (asset) {
        picker.results = common.length ? common : [asset];
        selectAsset(picker, asset, false);
      } else {
        picker.selected = null;
        picker.meta.textContent = `Search and select the canonical ${symbol} asset`;
      }
    }
    updateAmountLanguage();
  }

  /** Update exact-input/exact-output copy and denomination. */
  function updateAmountLanguage() {
    const exactInput = state.mode === 'input';
    elements.amountLabel.textContent = exactInput ? 'Amount to spend exactly' : 'Amount to receive exactly';
    const asset = exactInput ? state.pickers.in.selected : state.pickers.out.selected;
    elements.amountSymbol.textContent = asset?.symbol || 'Asset';
  }

  /** Cancel UI ownership of an in-flight result after any request change. */
  function markFormDirty() {
    state.formRevision += 1;
    state.activeOperation = null;
    state.automation.failures = 0;
    hideFormError();
    renderFreshness();
    updateActionState();
    schedulePlan();
  }

  /** Queue one debounced, visible-page plan; coalesce edits while a call is running. */
  function schedulePlan(delay = AUTO_PLAN_DELAY_MS) {
    window.clearTimeout(state.automation.timer);
    state.automation.timer = 0;
    if (!state.automation.enabled || !state.initialized) return;
    state.automation.pending = true;
    if (document.hidden) return;
    state.automation.timer = window.setTimeout(runAutomaticPlan, delay);
  }

  /** Run at most one automatic planning pipeline, never a wallet-aware preparation. */
  async function runAutomaticPlan() {
    state.automation.timer = 0;
    if (!state.automation.enabled || document.hidden || !state.initialized) return;
    if (state.automation.inFlight || state.runningOperations) return;
    state.automation.pending = false;
    try {
      getRequest();
    } catch {
      elements.autonomyStatus.textContent = 'Waiting for a valid pair and amount.';
      return;
    }
    state.automation.inFlight = true;
    try {
      await planSwap(true);
    } finally {
      state.automation.inFlight = false;
      if (state.automation.pending && !state.automation.timer) schedulePlan();
    }
  }

  /** Enable or pause session-only automatic planning without granting wallet access. */
  function setAutomaticPlanning(enabled) {
    if (typeof enabled !== 'boolean') throw new TypeError('enabled must be a boolean.');
    state.automation.enabled = enabled;
    elements.autoPlan.checked = enabled;
    window.clearTimeout(state.automation.timer);
    state.automation.timer = 0;
    state.automation.pending = false;
    state.automation.failures = 0;
    if (!enabled && state.activeOperation?.automatic) state.activeOperation = null;
    elements.autonomyStatus.textContent = enabled ? 'Automatic planning enabled.' : 'Automatic planning paused.';
    renderFreshness();
    updateActionState();
    if (enabled) schedulePlan();
  }

  /** Test a decimal string for a positive token quantity without float math. */
  function isPositiveDecimal(value) {
    return DECIMAL_PATTERN.test(value) && /[1-9]/.test(value);
  }

  /** Ensure a decimal percent is between zero and one hundred lexically. */
  function isPercent(value) {
    if (!DECIMAL_PATTERN.test(value)) return false;
    const [integer, fraction = ''] = value.split('.');
    if (integer.length < 3) return true;
    if (integer.length > 3) return false;
    if (integer < '100') return true;
    return integer === '100' && !/[1-9]/.test(fraction);
  }

  /** Validate inputs and emit a canonical-address swap request. */
  function getRequest() {
    const assetIn = state.pickers.in.selected;
    const assetOut = state.pickers.out.selected;
    const amount = elements.amount.value.trim();
    const slippageTolerance = elements.slippage.value.trim();
    const dexText = elements.dexId.value.trim().toLowerCase();
    const quoteTimeoutMs = Number.parseInt(elements.quoteTimeout.value, 10);

    if (!assetIn || !assetOut) throw new Error('Select both assets from the canonical results.');
    if (assetIn.address === assetOut.address) throw new Error('Choose two different assets.');
    if (!isPositiveDecimal(amount)) throw new Error('Enter a positive decimal amount with at most 30 decimal places.');
    if (!isPercent(slippageTolerance)) throw new Error('Slippage must be a decimal from 0 through 100.');
    if (dexText !== 'best' && !/^\d{1,5}$/.test(dexText)) {
      throw new Error('DEX must be “best” or an integer from 0 through 65535.');
    }
    const dexId = dexText === 'best' ? 'best' : Number.parseInt(dexText, 10);
    if (dexId !== 'best' && dexId > 65535) throw new Error('DEX must be “best” or an integer from 0 through 65535.');
    if (!Number.isInteger(quoteTimeoutMs) || quoteTimeoutMs < 100 || quoteTimeoutMs > 120000) {
      throw new Error('Quote timeout must be between 100 and 120000 milliseconds.');
    }

    const request = {
      amount,
      assetIn: { address: assetIn.address },
      assetOut: { address: assetOut.address },
      dexId,
      quoteTimeoutMs,
      side: state.mode,
      slippageTolerance,
    };
    if (elements.liquiditySource.value) request.liquiditySource = elements.liquiditySource.value;
    return request;
  }

  /** Show one local validation failure. */
  function showFormError(message) {
    elements.formError.textContent = message;
    elements.formError.hidden = false;
  }

  /** Clear local form validation copy. */
  function hideFormError() {
    elements.formError.textContent = '';
    elements.formError.hidden = true;
  }

  /** Add one bounded, already-sanitized entry to session-only history. */
  function addHistory(entry) {
    state.history.unshift(sanitizeValue(entry, { includeWalletData: state.privacy.walletData }));
    state.history = state.history.slice(0, HISTORY_LIMIT);
    renderHistory();
  }

  /** Retain only compact review facts for old calls; the latest raw view stays separate. */
  function summarizeHistoryResponse(kind, response) {
    const quote = kind === 'prepare' || kind === 'plan' ? response?.quote : response;
    return {
      amountIn: quote?.amountIn,
      amountOut: quote?.amountOut,
      canExecute: kind === 'prepare' ? response?.canExecute : undefined,
      intentId: kind === 'prepare' ? firstDefined(response, ['intentId', 'envelope.intentId']) : undefined,
      quoteDigest: firstDefined(quote, ['quoteDigest', 'digest']),
      warningCount: Array.isArray(response?.warnings) ? response.warnings.length : undefined,
    };
  }

  /** Planning is permissionless; only wallet-aware preparation needs session consent. */
  function updateActionState() {
    const loading = Boolean(state.activeOperation);
    elements.plan.disabled = loading;
    elements.quote.disabled = loading;
    elements.prepare.disabled = loading || !state.privacy.walletData;
    elements.plan.textContent = state.activeOperation?.kind === 'plan' ? 'Planning…' : 'Plan swap';
    elements.quote.textContent = state.activeOperation?.kind === 'quote' ? 'Requesting quote…' : 'Quote only';
    elements.prepare.textContent = state.activeOperation?.kind === 'prepare' ? 'Preparing…' : 'Prepare unsigned swap';
  }

  /** Read the actual API-provided expiry, never inventing validity for a bare quote. */
  function latestExpiresAt() {
    const expiry = state.latest?.response?.expiresAt ?? state.latest?.response?.envelope?.expiresAt;
    return Number.isSafeInteger(expiry) ? expiry : null;
  }

  /** Expire the visual result even when automatic network planning is paused. */
  function scheduleExpiryDisplay() {
    window.clearTimeout(state.expiryTimer);
    const expiresAt = latestExpiresAt();
    if (expiresAt !== null && expiresAt > Date.now()) {
      state.expiryTimer = window.setTimeout(renderFreshness, Math.min(2147483647, expiresAt - Date.now()));
    }
  }

  /** Keep a clear visual distinction between fresh and superseded results. */
  function renderFreshness() {
    if (state.activeOperation) {
      elements.freshness.textContent =
        state.activeOperation.kind === 'plan'
          ? 'Planning swap…'
          : state.activeOperation.kind === 'quote'
            ? 'Requesting live quote…'
            : 'Preparing unsigned intent…';
      delete elements.freshness.dataset.state;
    } else if (state.latest?.error) {
      elements.freshness.textContent = 'Latest request failed · refresh needed';
      elements.freshness.dataset.state = 'stale';
    } else if (!state.quote) {
      elements.freshness.textContent = 'No quote yet';
      delete elements.freshness.dataset.state;
    } else if (latestExpiresAt() !== null && latestExpiresAt() <= Date.now()) {
      elements.freshness.textContent = 'Result expired · refresh needed';
      elements.freshness.dataset.state = 'stale';
    } else if (state.quotedRevision !== state.formRevision) {
      elements.freshness.textContent = 'Inputs changed · quote is stale';
      elements.freshness.dataset.state = 'stale';
    } else {
      elements.freshness.textContent = 'Fresh for current inputs';
      elements.freshness.dataset.state = 'fresh';
    }
  }

  /**
   * Run a quote or preparation under latest-request-wins semantics.
   * Resolved stale calls are recorded as superseded but never rendered.
   */
  async function runOperation(kind, request, task, automatic = false) {
    window.clearTimeout(state.automation.timer);
    state.automation.timer = 0;
    state.automation.pending = false;
    state.runningOperations += 1;
    const operation = {
      automatic,
      id: ++state.operationSequence,
      kind,
      revision: state.formRevision,
      startedAt: Date.now(),
    };
    state.activeOperation = operation;
    hideFormError();
    renderFreshness();
    updateActionState();
    const isCurrent = () => state.activeOperation?.id === operation.id && state.formRevision === operation.revision;
    const engineSignal = state.engineAbort.signal;
    let rejectOnReload;
    const reloaded = new Promise((_resolve, reject) => {
      rejectOnReload = () =>
        reject(Object.assign(new Error('The application engine reloaded.'), { code: 'AGENT_API_UNAVAILABLE' }));
      engineSignal.addEventListener('abort', rejectOnReload, { once: true });
    });

    try {
      const rawResponse = await Promise.race([
        (async () => {
          const agent = await getAgent();
          if (!isCurrent()) return undefined;
          return task(agent);
        })(),
        reloaded,
      ]);
      const response = sanitizeValue(rawResponse, { includeWalletData: state.privacy.walletData });
      const durationMs = Date.now() - operation.startedAt;
      const current = isCurrent();
      addHistory({
        durationMs,
        finishedAt: new Date().toISOString(),
        kind,
        request,
        response: summarizeHistoryResponse(kind, response),
        status: current ? 'complete' : 'superseded',
      });
      if (!current) return { status: 'superseded' };

      const reviewedQuote = kind === 'prepare' && state.quotedRevision === operation.revision ? state.quote : null;
      state.latest = { durationMs, kind, request: sanitizeValue(request), response, reviewedQuote };
      if (kind === 'quote') {
        state.quote = response;
        state.preparation = null;
      } else {
        state.preparation = kind === 'prepare' ? response : null;
        state.quote = response.quote || state.quote;
      }
      state.quotedRevision = operation.revision;
      state.activeOperation = null;
      renderLatest();
      if (kind !== 'plan' && state.automation.enabled) {
        schedulePlan(Math.min(300000, Math.max(1000, (latestExpiresAt() ?? Date.now() + 300000) - Date.now())));
      }
      return response;
    } catch (error) {
      const durationMs = Date.now() - operation.startedAt;
      const current = state.activeOperation?.id === operation.id && state.formRevision === operation.revision;
      const normalized = normalizeError(error);
      addHistory({
        durationMs,
        error: normalized,
        finishedAt: new Date().toISOString(),
        kind,
        request,
        status: current ? 'error' : 'superseded',
      });
      if (!current) return { status: 'superseded' };
      state.activeOperation = null;
      state.quotedRevision = -1;
      state.latest = { durationMs, error: normalized, kind, request: sanitizeValue(request) };
      renderLatest();
      if (kind !== 'plan' && state.automation.enabled) {
        schedulePlan(300000);
        elements.autonomyStatus.textContent = 'Automatic wallet-free planning resumes in five minutes.';
      }
      return { error: normalized };
    } finally {
      engineSignal.removeEventListener('abort', rejectOnReload);
      state.runningOperations -= 1;
      if (state.activeOperation?.id === operation.id) state.activeOperation = null;
      renderFreshness();
      updateActionState();
      if (state.automation.pending && !state.automation.inFlight && !state.runningOperations && !state.automation.timer)
        schedulePlan();
    }
  }

  /** Resolve, quote, and build a non-authorizing plan with no prior quote or wallet consent. */
  async function planSwap(automatic = false) {
    try {
      if (!automatic) state.automation.failures = 0;
      const request = getRequest();
      elements.autonomyStatus.textContent = 'Waiting for SORA, then planning the current request…';
      const result = await runOperation('plan', request, (agent) => agent.planSwap(request), automatic);
      if (result?.status === 'superseded') return result;
      if (!result?.error && result?.network) {
        state.status = {
          ...state.status,
          node: { ...state.status?.node, blockNumber: result.network.blockNumber, connected: true },
          network: { ...state.status?.network, genesisHash: result.network.genesisHash },
          runtime: { ...state.status?.runtime, specVersion: result.network.runtimeSpecVersion },
        };
        renderStatus();
        renderProvenanceFromStatus();
      }
      elements.autonomyStatus.textContent = result?.error
        ? 'Planning stopped after an error. Edit the request or choose Plan swap to retry.'
        : 'Plan complete. No wallet access, approval, signature, or submission.';
      if (
        result?.error &&
        automatic &&
        state.automation.enabled &&
        ['NODE_NOT_READY', 'QUOTE_TIMEOUT', 'NETWORK_CONTEXT_UNAVAILABLE'].includes(result.error.code) &&
        state.automation.failures < AUTO_PLAN_RETRY_DELAYS_MS.length
      ) {
        const delay = AUTO_PLAN_RETRY_DELAYS_MS[state.automation.failures++];
        elements.autonomyStatus.textContent = `Waiting to retry automatically (${state.automation.failures}/3)…`;
        schedulePlan(delay);
      }
      if (!result?.error && Number.isSafeInteger(result?.expiresAt) && state.automation.enabled) {
        state.automation.failures = 0;
        schedulePlan(Math.min(300000, Math.max(1000, result.expiresAt - Date.now())));
      }
      return result;
    } catch (error) {
      showFormError(error.message || 'Review the request inputs.');
      return { error: normalizeError(error) };
    }
  }

  /** Request a read-only swap quote from canonical form values. */
  async function quoteSwap() {
    try {
      const request = getRequest();
      return await runOperation('quote', request, (agent) => agent.quoteSwap(request));
    } catch (error) {
      showFormError(error.message || 'Review the request inputs.');
      return { error: normalizeError(error) };
    }
  }

  /** Build a fresh wallet-bound intent after session consent; preparation quotes internally. */
  async function prepareSwap() {
    try {
      if (!state.privacy.walletData) {
        throw new Error('Enable connected wallet data before requesting a balance-aware preparation.');
      }
      const request = getRequest();
      return await runOperation('prepare', request, (agent) => agent.prepareSwap(request));
    } catch (error) {
      showFormError(error.message || 'Review the request inputs.');
      return { error: normalizeError(error) };
    }
  }

  /** Add a label/value definition to a review grid. */
  function appendReviewRow(grid, label, value) {
    const wrapper = createElement('div');
    wrapper.append(createElement('dt', '', label), createElement('dd', '', displayValue(value)));
    grid.append(wrapper);
  }

  /** Format an amount using API-provided metadata where available. */
  function formattedAmount(quote, direction) {
    const meta = quote?.[direction === 'in' ? 'amountInMeta' : 'amountOutMeta'];
    const asset = quote?.[direction === 'in' ? 'assetIn' : 'assetOut'];
    const amount = quote?.[direction === 'in' ? 'amountIn' : 'amountOut'];
    const display = firstDefined(meta, ['display']);
    return {
      asset: displayValue(asset?.name || asset?.symbol, 'Asset'),
      value: display || `${displayValue(amount, '—')} ${displayValue(asset?.symbol, '')}`.trim(),
    };
  }

  /** Format an epoch timestamp for review without assuming seconds or milliseconds. */
  function formattedTimestamp(value) {
    if (value === undefined || value === null || value === '') return 'Unavailable';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return displayValue(value);
    const milliseconds = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? displayValue(value) : date.toISOString();
  }

  /** Render the route as non-interactive review chips. */
  function renderRoute(quote) {
    const route = Array.isArray(quote?.route) ? quote.route : [];
    const line = createElement('div', 'route-line');
    const labels = route.length
      ? route
      : [quote?.assetIn?.symbol || quote?.assetIn?.address, quote?.assetOut?.symbol || quote?.assetOut?.address].filter(
          Boolean
        );
    if (!labels.length) {
      line.append(createElement('span', '', 'Route unavailable'));
      return line;
    }
    labels.forEach((entry, index) => {
      if (index) line.append(createElement('i'));
      line.append(createElement('span', '', abbreviate(entry, 11, 7)));
    });
    return line;
  }

  /** Render shared quote facts into a human-scannable review card. */
  function renderQuoteFacts(card, quote) {
    const spend = formattedAmount(quote, 'in');
    const receive = formattedAmount(quote, 'out');
    const summary = createElement('div', 'trade-summary');
    for (const [label, amount] of [
      ['You spend', spend],
      ['You receive', receive],
    ]) {
      const block = createElement('div', 'trade-summary__amount');
      block.append(
        createElement('span', '', label),
        createElement('strong', '', amount.value),
        createElement('small', '', amount.asset)
      );
      summary.append(block);
    }
    card.append(summary);

    const grid = createElement('dl', 'review-grid');
    const bound =
      quote?.minAmountOutMeta?.display || quote?.maxAmountInMeta?.display || quote?.minAmountOut || quote?.maxAmountIn;
    appendReviewRow(grid, quote?.maxAmountIn ? 'Maximum spend' : 'Minimum receive', bound);
    appendReviewRow(grid, 'Price impact', quote?.priceImpact !== undefined ? `${quote.priceImpact}%` : undefined);
    appendReviewRow(grid, 'Liquidity sources', quote?.liquiditySources);
    appendReviewRow(grid, 'DEX', quote?.dexId);
    appendReviewRow(
      grid,
      'Slippage',
      quote?.request?.slippageTolerance ? `${quote.request.slippageTolerance}%` : undefined
    );
    appendReviewRow(
      grid,
      'Quote digest',
      abbreviate(firstDefined(quote, ['quoteDigest', 'digest', 'intentId']), 14, 10)
    );
    appendReviewRow(
      grid,
      'Prepared block',
      firstDefined(quote, ['preparedAtBlock', 'quoteBlock', 'blockNumber', 'envelope.quoteBlock'])
    );
    appendReviewRow(
      grid,
      'Valid until',
      firstDefined(quote, ['validUntilBlock', 'expiresAtBlock', 'expiry', 'envelope.validUntilBlock'])
    );
    card.append(grid, renderRoute(quote));
  }

  /** Render one read-only quote card. */
  function renderQuoteSummary(quote) {
    const card = createElement('article', 'review-card');
    const banner = createElement('div', 'review-card__banner');
    banner.dataset.state = 'ready';
    banner.append(createElement('span', '', 'Read-only quote'), createElement('strong', '', 'No signature requested'));
    card.append(banner);
    renderQuoteFacts(card, quote);
    card.append(
      createElement(
        'p',
        'unsigned-note',
        'This quote is informational. Nothing has been signed, broadcast, or submitted.'
      )
    );
    elements.summaryOutput.replaceChildren(card);
  }

  /** Render preparation warnings without interpreting details as HTML. */
  function renderWarnings(preparation) {
    const warnings = Array.isArray(preparation?.warnings) ? preparation.warnings : [];
    if (!warnings.length) return null;
    const list = createElement('ul', 'warning-list');
    warnings.forEach((warning) => {
      const item = createElement('li', 'warning-item');
      item.dataset.severity = warning?.severity === 'critical' ? 'critical' : 'warning';
      item.append(
        createElement('strong', '', warning?.message || 'Review warning'),
        createElement('code', '', warning?.code || warning?.severity || 'WARNING')
      );
      if (warning?.details) item.append(createElement('p', '', displayValue(warning.details)));
      list.append(item);
    });
    return list;
  }

  /** Compare the reviewed quote to a freshly prepared quote. */
  function renderQuoteDiff(reviewed, prepared) {
    if (!reviewed || !prepared) return null;
    const comparisons = [
      ['Receive amount', reviewed.amountOut, prepared.amountOut],
      ['Minimum receive', reviewed.minAmountOut, prepared.minAmountOut],
      ['Maximum spend', reviewed.maxAmountIn, prepared.maxAmountIn],
      ['Price impact', reviewed.priceImpact, prepared.priceImpact],
      ['Route', reviewed.route, prepared.route],
      ['Liquidity sources', reviewed.liquiditySources, prepared.liquiditySources],
    ];
    const fragment = document.createDocumentFragment();
    fragment.append(createElement('h3', 'diff-heading', 'Changed since the reviewed quote'));
    const list = createElement('ul', 'diff-list');
    comparisons.forEach(([label, before, after]) => {
      const beforeText = displayValue(before, 'Unavailable');
      const afterText = displayValue(after, 'Unavailable');
      const changed = beforeText !== afterText;
      const item = createElement('li', 'diff-item');
      item.dataset.changed = String(changed);
      item.append(
        createElement('strong', '', label),
        createElement('code', '', changed ? 'CHANGED' : 'UNCHANGED'),
        createElement('p', '', changed ? `${beforeText} → ${afterText}` : afterText)
      );
      list.append(item);
    });
    fragment.append(list);
    return fragment;
  }

  /** Summarize fee estimates without assuming one fee asset. */
  function formatFees(fees) {
    if (!Array.isArray(fees) || !fees.length) return 'Unavailable';
    return fees
      .map((fee) =>
        fee?.source === 'unavailable'
          ? `${displayValue(fee?.asset?.symbol, 'Network')} fee unavailable`
          : `${displayValue(fee?.amount, '—')} ${displayValue(fee?.asset?.symbol, '')}`.trim()
      )
      .join(', ');
  }

  /** Show machine-generated plan metadata without implying execution permission. */
  function renderPlanSummary(plan) {
    const card = createElement('article', 'review-card');
    const banner = createElement('div', 'review-card__banner');
    banner.dataset.state = 'ready';
    banner.append(createElement('span', '', 'Agent swap plan'), createElement('strong', '', 'No approval needed'));
    card.append(banner);
    renderQuoteFacts(card, plan?.quote || {});
    const grid = createElement('dl', 'review-grid');
    appendReviewRow(grid, 'Estimated fee', formatFees(plan?.fees));
    appendReviewRow(grid, 'Network genesis', abbreviate(plan?.network?.genesisHash, 14, 10));
    appendReviewRow(grid, 'Runtime spec', plan?.network?.runtimeSpecVersion);
    appendReviewRow(grid, 'Observed block', plan?.network?.blockNumber);
    appendReviewRow(grid, 'Plan expires', formattedTimestamp(plan?.expiresAt));
    appendReviewRow(grid, 'Wallet access', 'Not required');
    card.append(grid);
    const warnings = renderWarnings(plan);
    if (warnings) card.append(warnings);
    card.append(
      createElement(
        'p',
        'unsigned-note',
        'Planning only: the Agent call tab contains SDK arguments, not a signed transaction or execution authorization.'
      )
    );
    elements.summaryOutput.replaceChildren(card);
  }

  /** Summarize opt-in balance checks while redacting account addresses. */
  function formatBalances(requiredBalances) {
    if (!state.privacy.walletData) return 'Wallet data not shared';
    if (!Array.isArray(requiredBalances) || !requiredBalances.length) return 'No balance requirements returned';
    return requiredBalances
      .map((balance) => {
        const symbol = displayValue(balance?.asset?.symbol, 'asset');
        const sufficiency =
          balance?.sufficient === true ? 'sufficient' : balance?.sufficient === false ? 'insufficient' : 'unknown';
        return `${symbol}: need ${displayValue(balance?.required, '—')}, available ${displayValue(balance?.available, '—')} (${sufficiency})`;
      })
      .join(' · ');
  }

  /** Render a fresh, unsigned preparation with execution boundaries. */
  function renderPreparationSummary(preparation, reviewedQuote) {
    const quote = preparation?.quote || {};
    const executable = preparation?.canExecute === true;
    const card = createElement('article', 'review-card');
    const banner = createElement('div', 'review-card__banner');
    banner.dataset.state = executable ? 'ready' : 'blocked';
    banner.append(
      createElement('span', '', 'Unsigned swap preparation'),
      createElement('strong', '', executable ? 'Signer-ready intent' : 'Requirements not met')
    );
    card.append(banner);
    renderQuoteFacts(card, quote);

    const grid = createElement('dl', 'review-grid');
    appendReviewRow(grid, 'Estimated fee', formatFees(preparation?.fees));
    appendReviewRow(grid, 'Wallet balance check', formatBalances(preparation?.requiredBalances));
    appendReviewRow(grid, 'Signer', state.privacy.walletData ? 'Account address redacted' : 'Wallet data not shared');
    appendReviewRow(
      grid,
      'Prepared intent',
      abbreviate(firstDefined(preparation, ['intentId', 'envelope.intentId']), 14, 10)
    );
    appendReviewRow(
      grid,
      'Call digest',
      abbreviate(firstDefined(preparation, ['callDigest', 'envelope.callDigest', 'preview.callDigest']), 14, 10)
    );
    appendReviewRow(
      grid,
      'Network genesis',
      abbreviate(firstDefined(preparation, ['networkGenesisHash', 'envelope.network.genesisHash']), 14, 10)
    );
    appendReviewRow(
      grid,
      'Runtime spec',
      firstDefined(preparation, ['runtimeSpecVersion', 'envelope.network.runtimeSpecVersion'])
    );
    appendReviewRow(grid, 'Prepared block', firstDefined(preparation, ['preparedAtBlock', 'envelope.preparedAtBlock']));
    appendReviewRow(
      grid,
      'Expires after block',
      firstDefined(preparation, ['expiresAtBlock', 'envelope.expiresAtBlock'])
    );
    appendReviewRow(
      grid,
      'Expires at',
      formattedTimestamp(firstDefined(preparation, ['expiresAt', 'envelope.expiresAt']))
    );
    card.append(grid);

    const warnings = renderWarnings(preparation);
    if (warnings) card.append(warnings);
    const diff = renderQuoteDiff(reviewedQuote, quote);
    if (diff) card.append(diff);
    card.append(
      createElement(
        'p',
        'unsigned-note',
        'Unsigned only: inspect this preparation in a trusted wallet before any separate signing or submission step.'
      )
    );
    elements.summaryOutput.replaceChildren(card);
  }

  /** Render a safe error panel for the latest operation. */
  function renderErrorSummary(error) {
    const card = createElement('article', 'review-card');
    const banner = createElement('div', 'review-card__banner');
    banner.dataset.state = 'blocked';
    banner.append(createElement('span', '', 'Request not completed'), createElement('strong', '', error.code));
    card.append(
      banner,
      createElement('h3', '', error.message),
      createElement('p', '', error.action),
      createElement('p', 'unsigned-note', 'No transaction was signed or submitted.')
    );
    elements.summaryOutput.replaceChildren(card);
  }

  /** Render canonical invocation details separately from the visual summary. */
  function renderCallTrace(latest) {
    if (!latest) return;
    const wrapper = createElement('div', 'call-trace');
    const header = createElement('div', 'call-trace__header');
    header.append(
      createElement(
        'code',
        '',
        latest.kind === 'plan'
          ? 'PolkaswapAgent.planSwap'
          : latest.kind === 'prepare'
            ? 'PolkaswapAgent.prepareSwap'
            : 'PolkaswapAgent.quoteSwap'
      ),
      createElement('span', '', `${latest.durationMs} ms`)
    );
    const payload = { request: latest.request };
    if (latest.response?.preview) {
      payload.unsignedPreview = {
        args: latest.response.preview.args,
        sdkCall: latest.response.preview.sdkCall,
        summary: latest.response.preview.summary,
      };
    }
    wrapper.append(header, createElement('pre', 'call-trace__json', JSON.stringify(payload, null, 2)));
    elements.callOutput.replaceChildren(wrapper);
  }

  /** Render latest sanitized JSON and associated structured views. */
  function renderLatest() {
    const latest = state.latest;
    if (!latest) return;
    renderCallTrace(latest);
    if (latest.error) {
      renderErrorSummary(latest.error);
      elements.rawOutput.textContent = JSON.stringify({ error: latest.error }, null, 2);
    } else {
      const response = sanitizeValue(latest.response, { includeWalletData: state.privacy.walletData });
      latest.response = response;
      elements.rawOutput.textContent = JSON.stringify(response, null, 2);
      if (latest.kind === 'prepare') renderPreparationSummary(response, latest.reviewedQuote);
      else if (latest.kind === 'plan') renderPlanSummary(response);
      else renderQuoteSummary(response);
    }
    elements.copyRaw.disabled = false;
    scheduleExpiryDisplay();
    renderFreshness();
    updateActionState();
  }

  /** Render newest-first bounded in-memory history. */
  function renderHistory() {
    elements.historyCount.textContent = String(state.history.length);
    elements.clearHistory.disabled = state.history.length === 0;
    elements.historyOutput.replaceChildren();
    if (!state.history.length) {
      elements.historyOutput.append(createElement('li', 'empty-history', 'No calls in this session.'));
      return;
    }
    state.history.forEach((entry) => {
      const item = createElement('li', 'history-entry');
      const time = createElement('time', '', new Date(entry.finishedAt).toLocaleTimeString());
      time.dateTime = entry.finishedAt;
      const description = createElement('div');
      const title =
        entry.kind === 'webmcp'
          ? `WebMCP · ${displayValue(entry.toolName, 'unknown tool')}`
          : entry.kind === 'prepare'
            ? 'Unsigned preparation'
            : entry.kind === 'plan'
              ? 'Agent swap plan'
              : 'Read-only quote';
      const detail =
        entry.kind === 'webmcp'
          ? `Invocation metadata only · ${entry.durationMs} ms`
          : `${displayValue(entry.request?.amount, '—')} · ${entry.durationMs} ms`;
      description.append(createElement('strong', '', title), createElement('small', '', detail));
      const status = createElement('span', 'history-entry__status', entry.status);
      status.dataset.state = entry.status;
      item.append(time, description, status);
      elements.historyOutput.append(item);
    });
  }

  /** Activate one output tab and maintain standard tab semantics. */
  function activateTab(tab) {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    tabs.forEach((entry) => {
      const selected = entry === tab;
      entry.setAttribute('aria-selected', String(selected));
      entry.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(entry.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
  }

  /** Safely render the actual generated WebMCP catalogue. */
  function renderCatalogue() {
    elements.contractOutput.replaceChildren();
    if (!state.catalogue.length) {
      elements.contractOutput.textContent = 'No tool catalogue was published by this build.';
      return;
    }
    state.catalogue.forEach((tool) => {
      const item = createElement('article', 'tool-entry');
      const heading = createElement('div', 'tool-entry__heading');
      const readOnly = tool?.annotations?.readOnlyHint === true;
      heading.append(
        createElement('code', '', tool?.name || 'Unnamed tool'),
        createElement('span', '', readOnly ? 'Read-only' : 'Review required')
      );
      const required = Array.isArray(tool?.inputSchema?.required) ? tool.inputSchema.required.join(', ') : 'none';
      item.append(
        heading,
        createElement('p', '', tool?.description || tool?.title || 'No description published.'),
        createElement('p', '', `Required arguments: ${required}`)
      );
      elements.contractOutput.append(item);
    });
  }

  /** Fetch the generated tool catalogue used by the WebMCP adapter. */
  async function loadCatalogue() {
    try {
      const response = await fetch('./.well-known/polkaswap-mcp-tools.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalogue request returned ${response.status}.`);
      const catalogue = await response.json();
      state.catalogue = Array.isArray(catalogue) ? sanitizeValue(catalogue).slice(0, MAX_COLLECTION_ITEMS) : [];
      renderCatalogue();
      return state.catalogue;
    } catch {
      state.catalogue = [];
      renderCatalogue();
      return [];
    }
  }

  /** Detect browser WebMCP and run the adapter's idempotent registration. */
  async function detectWebMcp() {
    if (!document.modelContext || typeof document.modelContext.registerTool !== 'function') {
      setStatus('webmcp', 'Not supported', 'warning');
      return;
    }
    try {
      const adapter = window.PolkaswapPlaygroundWebMcp;
      const result = adapter?.register ? await adapter.register() : null;
      const count = result?.toolCount ?? state.catalogue.length;
      setStatus('webmcp', `${count} tools ready`, 'ready');
    } catch {
      setStatus('webmcp', 'Registration failed', 'error');
    }
  }

  /** Reflect adapter lifecycle events without relying on a register return value. */
  function handleWebMcpStatus(event) {
    try {
      const detail = event?.detail;
      if (!detail || typeof detail !== 'object') return;
      const toolCount =
        Number.isSafeInteger(detail.toolCount) && detail.toolCount >= 0 ? detail.toolCount : state.catalogue.length;
      const eventState = typeof detail.state === 'string' ? detail.state : '';
      if (eventState === 'ready' || eventState === 'registered') {
        setStatus('webmcp', `${toolCount} tools ready`, 'ready');
      } else if (eventState === 'registering' || eventState === 'loading') {
        setStatus('webmcp', 'Registering tools', 'warning');
      } else if (eventState === 'unsupported' || eventState === 'unavailable') {
        setStatus('webmcp', 'Not supported', 'warning');
      } else if (eventState === 'failed' || eventState === 'error') {
        setStatus('webmcp', 'Registration failed', 'error');
      }
    } catch {
      // Ignore malformed synthetic events; the adapter emits a fixed safe shape.
    }
  }

  /** Add metadata-only WebMCP invocation events to the session trace. */
  function handleWebMcpInvocation(event) {
    try {
      const detail = event?.detail;
      if (!detail || typeof detail !== 'object' || detail.source !== 'webmcp') return;
      const toolName =
        typeof detail.toolName === 'string' && /^[a-z0-9_]{1,100}$/.test(detail.toolName)
          ? detail.toolName
          : 'unknown_tool';
      const durationMs =
        Number.isSafeInteger(detail.durationMs) && detail.durationMs >= 0 ? Math.min(detail.durationMs, 120000) : 0;
      const status =
        detail.status === 'error' || detail.status === 'failed'
          ? 'error'
          : detail.status === 'cancelled'
            ? 'superseded'
            : 'complete';
      addHistory({
        durationMs,
        finishedAt: new Date().toISOString(),
        kind: 'webmcp',
        source: 'webmcp',
        status,
        toolName,
      });
    } catch {
      // Ignore malformed synthetic events; never copy their payload to history.
    }
  }

  /** Calculate a browser-native SHA-256 for the published schema. */
  async function sha256(text) {
    const Encoder = window.TextEncoder || globalThis.TextEncoder;
    if (!window.crypto?.subtle || typeof Encoder !== 'function') return null;
    const digest = await window.crypto.subtle.digest('SHA-256', new Encoder().encode(text));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /** Extract an IPFS root from headers or a CID subdomain. */
  function detectIpfsRoot(headers) {
    const header = headers?.get?.('x-ipfs-roots') || headers?.get?.('x-ipfs-path') || '';
    const match = String(header).match(/(?:\/ipfs\/)?(bafy[a-z0-9]+|Qm[1-9A-HJ-NP-Za-km-z]{44})/);
    if (match) return match[1];
    const hostnameMatch = window.location.hostname.match(/^(bafy[a-z0-9]+)\.(?:ipfs\.)?/);
    return hostnameMatch ? hostnameMatch[1] : null;
  }

  /** Render network/runtime provenance from the safe status snapshot. */
  function renderProvenanceFromStatus() {
    const genesis = state.status?.network?.genesisHash;
    const specName = state.status?.runtime?.specName;
    const specVersion = state.status?.runtime?.specVersion;
    const transactionVersion = state.status?.runtime?.transactionVersion;
    elements.provenanceGenesis.textContent = genesis ? abbreviate(genesis, 14, 10) : 'Unavailable';
    elements.provenanceRuntime.textContent =
      specName || specVersion !== undefined
        ? `${specName || 'SORA runtime'}${specVersion !== undefined ? ` · spec ${specVersion}` : ''}${transactionVersion !== undefined ? ` · tx ${transactionVersion}` : ''}`
        : 'Unavailable';
  }

  /** Refresh independently verifiable build and network provenance. */
  async function refreshDiagnostics() {
    elements.refreshDiagnostics.disabled = true;
    setDiagnostic('Refreshing published schema, build, IPFS, and network evidence.');
    try {
      const [manifestResponse, schemaResponse, rootResponse] = await Promise.all([
        fetch('./.well-known/polkaswap-agent.json', { cache: 'no-store' }),
        fetch('./.well-known/polkaswap-agent.schema.json', { cache: 'no-store' }),
        fetch(new URL('.', window.location.href), { cache: 'no-store', method: 'HEAD' }).catch(() => null),
      ]);
      const manifest = manifestResponse?.ok ? await manifestResponse.json() : {};
      const schemaText = schemaResponse?.ok ? await schemaResponse.text() : '';
      const schemaDigest = schemaText ? await sha256(schemaText) : null;
      const appWindow = frame.contentWindow;
      const buildVersion =
        firstDefined(manifest, ['build.version', 'build.commit', 'version']) ||
        appWindow?.__PS_BUILD_VERSION__ ||
        appWindow?.__PS_BUILD_VARIANT__;
      const ipfsRoot = detectIpfsRoot(rootResponse?.headers);
      elements.provenanceBuild.textContent = displayValue(buildVersion, 'Static build');
      elements.provenanceIpfs.textContent = ipfsRoot ? abbreviate(ipfsRoot, 14, 10) : 'Not served from IPFS';
      elements.provenanceApi.textContent = displayValue(state.status?.version || manifest?.version);
      elements.provenanceSchema.textContent = schemaDigest ? abbreviate(schemaDigest, 14, 10) : 'Unavailable';
      renderProvenanceFromStatus();
      setDiagnostic(
        ipfsRoot
          ? 'Published artifacts and IPFS root detected. Compare full response headers externally for release verification.'
          : 'Published artifacts detected. This origin did not expose an IPFS root header.',
        'ready'
      );
    } catch {
      setDiagnostic(
        'Some provenance could not be loaded. Trade calls remain local to the embedded Polkaswap page.',
        'error'
      );
    } finally {
      elements.refreshDiagnostics.disabled = false;
    }
  }

  /** Initialize the API, status, and canonical defaults once. */
  function initialize() {
    if (state.initializationPromise) return state.initializationPromise;
    state.initializationPromise = (async () => {
      try {
        const agent = await getAgent();
        setStatus('api', 'Ready', 'ready');
        await Promise.all([refreshStatus(), initializeAssets(agent)]);
        state.initialized = true;
        schedulePlan();
        setDiagnostic(
          state.status?.node?.connected
            ? 'Agent API and SORA node are ready. Wallet-free planning is available.'
            : 'Agent API is ready. Planning waits for the SORA node automatically.',
          state.status?.node?.connected ? 'ready' : undefined
        );
        return getSnapshot();
      } catch (error) {
        const normalized = normalizeError(error);
        setStatus('api', 'Unavailable', 'error');
        setDiagnostic(`${normalized.message} ${normalized.action}`, 'error');
        state.initializationPromise = null;
        throw error;
      }
    })();
    return state.initializationPromise;
  }

  /** Reconnect after iframe navigation without holding on to a destroyed API or pending call. */
  function handleEngineReload() {
    state.activeOperation = null;
    state.formRevision += 1;
    state.initialized = false;
    state.engineAbort.abort();
    state.engineAbort = new AbortController();
    state.agent = null;
    state.agentPromise = null;
    state.initializationPromise = null;
    state.automation.failures = 0;
    state.automation.pending = false;
    window.clearTimeout(state.automation.timer);
    state.automation.timer = 0;
    elements.autonomyStatus.textContent = 'Connecting to the application engine…';
    renderFreshness();
    updateActionState();
    initialize().catch(() => undefined);
  }

  /** Explicitly verify node readiness without adding a trade call. */
  async function checkNode() {
    elements.checkNode.disabled = true;
    elements.checkNode.textContent = 'Checking…';
    try {
      const agent = await getAgent();
      const status = await agent.ready({ requireNode: true, timeoutMs: 30000 });
      state.status = toSafeStatus(status);
      renderStatus();
      renderProvenanceFromStatus();
      setDiagnostic('SORA node readiness check passed.', 'ready');
      return getSnapshot();
    } catch (error) {
      const normalized = normalizeError(error);
      setStatus('node', 'Unavailable', 'error');
      setDiagnostic(`${normalized.message} ${normalized.action}`, 'error');
      return { error: normalized };
    } finally {
      elements.checkNode.disabled = false;
      elements.checkNode.textContent = 'Check node';
    }
  }

  /** Return a sanitized snapshot without exposing the iframe API. */
  function getSnapshot() {
    return sanitizeValue(
      {
        assets: { in: state.pickers.in.selected, out: state.pickers.out.selected },
        automation: { enabled: state.automation.enabled, planning: state.automation.inFlight },
        catalogueCount: state.catalogue.length,
        formRevision: state.formRevision,
        history: state.history,
        latest: state.latest,
        privacy: state.privacy,
        quoteFresh:
          Boolean(state.quote) &&
          !state.latest?.error &&
          state.quotedRevision === state.formRevision &&
          (latestExpiresAt() === null || latestExpiresAt() > Date.now()),
        status: state.status,
      },
      { includeWalletData: state.privacy.walletData }
    );
  }

  /** Wire accessible asset-combobox behavior. */
  function bindPicker(picker) {
    picker.input.addEventListener('input', () => {
      picker.selected = null;
      picker.meta.textContent = 'Choose one canonical result';
      markFormDirty();
      window.clearTimeout(picker.debounceTimer);
      picker.debounceTimer = window.setTimeout(() => searchAssets(picker, picker.input.value.trim()), 160);
    });
    picker.input.addEventListener('focus', () => {
      if (picker.results.length) renderPickerResults(picker);
      else searchAssets(picker, picker.input.value.trim());
    });
    picker.input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closePicker(picker);
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
      event.preventDefault();
      if (picker.list.hidden) {
        renderPickerResults(picker);
        return;
      }
      if (event.key === 'Enter') {
        const selected = picker.results[picker.activeIndex];
        if (selected) selectAsset(picker, selected);
        return;
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const count = picker.results.length;
      if (!count) return;
      picker.activeIndex = (picker.activeIndex + direction + count) % count;
      picker.input.setAttribute('aria-activedescendant', `asset-${picker.side}-option-${picker.activeIndex}`);
      renderPickerResults(picker);
    });
    picker.list.addEventListener('mousedown', (event) => event.preventDefault());
    picker.list.addEventListener('click', (event) => {
      const option = event.target.closest('[data-index]');
      if (!option) return;
      const asset = picker.results[Number.parseInt(option.dataset.index, 10)];
      if (asset) selectAsset(picker, asset);
    });
    picker.input.addEventListener('blur', () => window.setTimeout(() => closePicker(picker), 0));
  }

  /** Wire tab click and keyboard behavior. */
  function bindTabs() {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    tabs.forEach((tab, index) => {
      tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
      tab.addEventListener('click', () => activateTab(tab));
      tab.addEventListener('keydown', (event) => {
        let nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        activateTab(tabs[nextIndex]);
        tabs[nextIndex].focus();
      });
    });
  }

  /** Attach all top-level interaction handlers. */
  function bindInteractions() {
    bindPicker(state.pickers.in);
    bindPicker(state.pickers.out);
    bindTabs();
    elements.plan.addEventListener('click', () => planSwap());
    elements.autoPlan.addEventListener('change', () => setAutomaticPlanning(elements.autoPlan.checked));
    elements.quote.addEventListener('click', quoteSwap);
    elements.prepare.addEventListener('click', prepareSwap);
    elements.checkNode.addEventListener('click', checkNode);
    elements.refreshDiagnostics.addEventListener('click', refreshDiagnostics);
    elements.flipAssets.addEventListener('click', () => {
      const previousIn = state.pickers.in.selected;
      const previousOut = state.pickers.out.selected;
      if (previousOut) selectAsset(state.pickers.in, previousOut, false);
      else state.pickers.in.selected = null;
      if (previousIn) selectAsset(state.pickers.out, previousIn, false);
      else state.pickers.out.selected = null;
      markFormDirty();
    });
    document.querySelectorAll('input[name="swap-mode"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        state.mode = input.value === 'output' ? 'output' : 'input';
        updateAmountLanguage();
        markFormDirty();
      });
    });
    [elements.amount, elements.slippage, elements.dexId, elements.liquiditySource, elements.quoteTimeout].forEach(
      (input) => {
        input.addEventListener('input', markFormDirty);
        input.addEventListener('change', markFormDirty);
      }
    );
    elements.walletOptIn.addEventListener('change', () => {
      state.privacy.walletData = elements.walletOptIn.checked;
      if (!state.privacy.walletData && state.activeOperation?.kind === 'prepare') state.activeOperation = null;
      state.status = state.status ? sanitizeValue(state.status, { includeWalletData: state.privacy.walletData }) : null;
      state.latest = state.latest ? sanitizeValue(state.latest, { includeWalletData: state.privacy.walletData }) : null;
      state.history = state.history.map((entry) =>
        sanitizeValue(entry, { includeWalletData: state.privacy.walletData })
      );
      if (!state.privacy.walletData && state.preparation) {
        state.preparation = sanitizeValue(state.preparation, { includeWalletData: false });
      }
      renderStatus();
      renderHistory();
      if (state.latest) renderLatest();
      setDiagnostic(
        state.privacy.walletData
          ? 'Wallet balance display is enabled for new preparations. Account addresses remain redacted.'
          : 'Wallet-derived data is hidden. Existing in-memory traces were redacted.',
        'ready'
      );
      updateActionState();
    });
    elements.clearHistory.addEventListener('click', () => {
      state.history = [];
      renderHistory();
    });
    elements.copyRaw.addEventListener('click', async () => {
      const text = elements.rawOutput.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
        elements.copyRaw.textContent = 'Copied';
      } catch {
        elements.copyRaw.textContent = 'Copy unavailable';
      }
      window.setTimeout(() => {
        elements.copyRaw.textContent = 'Copy JSON';
      }, 1200);
    });
    document.addEventListener('click', (event) => {
      Object.values(state.pickers).forEach((picker) => {
        if (!event.target.closest(`[data-asset-picker="${picker.side}"]`)) closePicker(picker);
      });
    });
    document.addEventListener('visibilitychange', () => {
      window.clearTimeout(state.automation.timer);
      state.automation.timer = 0;
      renderFreshness();
      if (!document.hidden) schedulePlan();
    });
    window.addEventListener('pagehide', () => setAutomaticPlanning(false));
  }

  bindInteractions();
  window.addEventListener(WEBMCP_STATUS_EVENT, handleWebMcpStatus);
  window.addEventListener(WEBMCP_INVOCATION_EVENT, handleWebMcpInvocation);
  renderHistory();
  updateAmountLanguage();
  updateActionState();

  Object.defineProperty(window, 'PolkaswapAgentPlayground', {
    configurable: false,
    enumerable: true,
    value: Object.freeze({
      checkNode,
      getSnapshot,
      plan: () => planSwap(),
      prepare: prepareSwap,
      quote: quoteSwap,
      ready: initialize,
      refreshDiagnostics,
      setAutomaticPlanning,
    }),
    writable: false,
  });

  frame.addEventListener('load', handleEngineReload);
  const start = () => {
    if (state.started) return;
    state.started = true;
    Promise.allSettled([loadCatalogue(), refreshDiagnostics()]).then(() => detectWebMcp());
  };
  frame.src = getAppUrl();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else window.setTimeout(start, 0);
})();
