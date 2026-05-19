import { createAgentTradingDependencies, createPolkaswapAgentApi, type AgentTradingDependencies } from './service';
import { POLKASWAP_AGENT_READY_EVENT, type PolkaswapAgentApi } from './types';

import type { Pinia } from 'pinia';

export type InstallPolkaswapAgentApiOptions = {
  pinia?: Pinia;
  dependencies?: AgentTradingDependencies;
};

declare global {
  interface Window {
    PolkaswapAgent?: PolkaswapAgentApi;
  }

  interface WindowEventMap {
    [POLKASWAP_AGENT_READY_EVENT]: CustomEvent<{ api: PolkaswapAgentApi; version: string }>;
  }
}

/**
 * Installs the same-page browser API exactly once and announces readiness for
 * agents that inject scripts after opening the static IPFS-hosted app.
 */
export function installPolkaswapAgentApi(options: InstallPolkaswapAgentApiOptions = {}): PolkaswapAgentApi {
  if (typeof window !== 'undefined' && window.PolkaswapAgent) {
    return window.PolkaswapAgent;
  }

  const api =
    options.dependencies !== undefined
      ? createPolkaswapAgentApi(options.dependencies)
      : createPolkaswapAgentApi(createAgentTradingDependencies(options.pinia));

  if (typeof window === 'undefined') {
    return api;
  }

  Object.defineProperty(window, 'PolkaswapAgent', {
    configurable: true,
    enumerable: false,
    value: api,
    writable: false,
  });

  window.dispatchEvent(
    new CustomEvent(POLKASWAP_AGENT_READY_EVENT, {
      detail: {
        api,
        version: api.version,
      },
    })
  );

  return api;
}
