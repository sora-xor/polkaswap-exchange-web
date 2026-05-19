import { afterEach, describe, expect, it, vi } from 'vitest';

import { installPolkaswapAgentApi } from '@/features/agent-trading';
import { POLKASWAP_AGENT_READY_EVENT } from '@/features/agent-trading/types';

import type { AgentTradingDependencies } from '@/features/agent-trading/service';

const createDependencies = (): AgentTradingDependencies =>
  ({
    api: {},
    getSettingsStore: vi.fn(),
    getWalletStore: vi.fn(),
    getAssetsStore: vi.fn(),
    getWalletProvider: vi.fn(),
    delay: vi.fn(),
    now: vi.fn(),
  }) as unknown as AgentTradingDependencies;

describe('installPolkaswapAgentApi', () => {
  afterEach(() => {
    delete window.PolkaswapAgent;
  });

  it('installs window.PolkaswapAgent and dispatches the ready event', () => {
    const events: Array<CustomEvent> = [];
    const listener = vi.fn((event: CustomEvent) => events.push(event));

    window.addEventListener(POLKASWAP_AGENT_READY_EVENT, listener as EventListener);
    const api = installPolkaswapAgentApi({ dependencies: createDependencies() });
    window.removeEventListener(POLKASWAP_AGENT_READY_EVENT, listener as EventListener);

    expect(window.PolkaswapAgent).toBe(api);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(events[0].detail).toEqual({
      api,
      version: api.version,
    });
  });

  it('is idempotent and does not re-dispatch readiness', () => {
    const listener = vi.fn();
    window.addEventListener(POLKASWAP_AGENT_READY_EVENT, listener);

    const first = installPolkaswapAgentApi({ dependencies: createDependencies() });
    const second = installPolkaswapAgentApi({ dependencies: createDependencies() });

    window.removeEventListener(POLKASWAP_AGENT_READY_EVENT, listener);

    expect(second).toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
