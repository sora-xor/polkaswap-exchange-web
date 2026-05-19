(function attachPolkaswapAgentClient(global) {
  const READY_EVENT = 'polkaswap-agent-ready';

  function createClient(api) {
    if (!api) {
      throw new Error('window.PolkaswapAgent is not available.');
    }

    async function prepareAndExecute(request, options, prepare, execute, label) {
      const prepared = await prepare(request);
      if (!prepared.canExecute) {
        const error = new Error(`Prepared ${label} is not executable.`);
        error.prepared = prepared;
        throw error;
      }

      return execute({
        ...request,
        intentId: prepared.intentId,
        clientOrderId: options.clientOrderId || request.clientOrderId,
      });
    }

    return Object.freeze({
      api,
      version: api.version,
      ready: (options) => api.ready(options),
      prepareAndExecuteSwap: (request, options = {}) =>
        prepareAndExecute(request, options, api.prepareSwap, api.executeSwap, 'swap'),
      prepareAndExecuteTransfer: (request, options = {}) =>
        prepareAndExecute(request, options, api.prepareTransfer, api.executeTransfer, 'transfer'),
      prepareAndExecuteAddLiquidity: (request, options = {}) =>
        prepareAndExecute(request, options, api.prepareAddLiquidity, api.executeAddLiquidity, 'add-liquidity'),
      prepareAndExecuteRemoveLiquidity: (request, options = {}) =>
        prepareAndExecute(
          request,
          options,
          api.prepareRemoveLiquidity,
          api.executeRemoveLiquidity,
          'remove-liquidity'
        ),
      waitForTransaction: (request) => api.waitForTransaction(request),
    });
  }

  function attach(options = {}) {
    const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 30000;

    if (global.PolkaswapAgent) {
      return Promise.resolve(createClient(global.PolkaswapAgent));
    }

    return new Promise((resolve, reject) => {
      const timeout = global.setTimeout(() => {
        global.removeEventListener(READY_EVENT, onReady);
        reject(new Error('Timed out waiting for window.PolkaswapAgent.'));
      }, timeoutMs);

      function onReady(event) {
        global.clearTimeout(timeout);
        global.removeEventListener(READY_EVENT, onReady);
        resolve(createClient(event.detail && event.detail.api ? event.detail.api : global.PolkaswapAgent));
      }

      global.addEventListener(READY_EVENT, onReady);
    });
  }

  global.PolkaswapAgentClient = Object.freeze({
    attach,
    createClient,
  });
})(window);
