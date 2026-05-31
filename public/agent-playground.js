/**
 * Wires the static same-origin Agent API playground without inline script so
 * the page works under the production CSP served by Bunny/IPFS gateways.
 */
(function setupAgentPlayground() {
  const AGENT_SESSION_SEARCH_PARAM = 'polkaswap-agent';
  const frame = document.getElementById('app-frame');
  const output = document.getElementById('output');

  function getAppUrl() {
    const url = new URL('.', window.location.href);
    url.searchParams.set(AGENT_SESSION_SEARCH_PARAM, '1');
    url.hash = '/swap';
    return url.toString();
  }

  function print(value) {
    output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }

  function getRequest() {
    return {
      assetIn: { symbol: document.getElementById('asset-in').value.trim() },
      assetOut: { symbol: document.getElementById('asset-out').value.trim() },
      amount: document.getElementById('amount').value.trim(),
      side: document.getElementById('side').value,
    };
  }

  async function getAgent(timeoutMs = 30000) {
    const appWindow = frame.contentWindow;
    if (!appWindow) throw new Error('App frame is unavailable.');
    if (appWindow.PolkaswapAgent) return appWindow.PolkaswapAgent;

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        appWindow.removeEventListener('polkaswap-agent-ready', onReady);
        reject(new Error('Timed out waiting for PolkaswapAgent.'));
      }, timeoutMs);

      function onReady(event) {
        window.clearTimeout(timeout);
        appWindow.removeEventListener('polkaswap-agent-ready', onReady);
        resolve(event.detail.api);
      }

      appWindow.addEventListener('polkaswap-agent-ready', onReady);
    });
  }

  async function run(label, task) {
    try {
      print(`${label}...`);
      const agent = await getAgent();
      const result = await task(agent);
      print(result);
    } catch (error) {
      print({
        error: {
          name: error.name,
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }
  }

  document.getElementById('connect').addEventListener('click', () =>
    run('Connecting', async (agent) => agent.ready({ requireNode: true, timeoutMs: 30000 }))
  );

  document.getElementById('status').addEventListener('click', () =>
    run('Reading status', async (agent) => agent.status())
  );

  document.getElementById('resolve').addEventListener('click', () =>
    run('Resolving assets', async (agent) => {
      const request = getRequest();
      const assetIn = await agent.resolveAsset({ asset: request.assetIn, includeBalance: true });
      const assetOut = await agent.resolveAsset({ asset: request.assetOut, includeBalance: true });
      return { assetIn, assetOut };
    })
  );

  document.getElementById('quote').addEventListener('click', () =>
    run('Quoting swap', async (agent) => agent.quoteSwap(getRequest()))
  );

  document.getElementById('prepare').addEventListener('click', () =>
    run('Preparing swap', async (agent) => agent.prepareSwap(getRequest()))
  );

  document.getElementById('clear').addEventListener('click', () => print(''));

  frame.addEventListener('load', () => {
    getAgent()
      .then((agent) => agent.ready({ requireNode: true, timeoutMs: 30000 }))
      .then((status) => print({ ready: true, status }))
      .catch((error) => print({ ready: false, error: { message: error.message, code: error.code } }));
  });

  frame.src = getAppUrl();
})();
