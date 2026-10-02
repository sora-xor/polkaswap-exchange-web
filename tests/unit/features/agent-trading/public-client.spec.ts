// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

interface PublicClientGlobal {
  createClient(api: Record<string, unknown>): {
    prepareAndExecuteSwap(request: unknown, options?: { clientOrderId?: string }): Promise<unknown>;
  };
}

let clientGlobal: PublicClientGlobal;

beforeAll(async () => {
  const source = await readFile(resolve(process.cwd(), 'public/.well-known/polkaswap-agent-client.js'), 'utf8');
  const target: Record<string, unknown> = {};
  new Function('window', source)(target);
  clientGlobal = target.PolkaswapAgentClient as PublicClientGlobal;
});

describe('published PolkaswapAgent client', () => {
  it('prepares economics but passes exactly the two identifiers to execute', async () => {
    const economicRequest = {
      assetIn: { symbol: 'XOR' },
      assetOut: { symbol: 'VAL' },
      amount: '1',
      side: 'input',
    };
    const prepareSwap = vi.fn().mockResolvedValue({
      canExecute: true,
      intentId: `polkaswap:swap:sha256:${'a'.repeat(64)}`,
    });
    const executeSwap = vi.fn().mockResolvedValue({ transaction: null });
    const client = clientGlobal.createClient({ version: 'v1', prepareSwap, executeSwap });

    await client.prepareAndExecuteSwap(economicRequest, { clientOrderId: 'strategy-1' });

    expect(prepareSwap).toHaveBeenCalledWith(economicRequest);
    expect(executeSwap).toHaveBeenCalledWith({
      intentId: `polkaswap:swap:sha256:${'a'.repeat(64)}`,
      clientOrderId: 'strategy-1',
    });
    expect(Object.keys(executeSwap.mock.calls[0][0])).toEqual(['intentId', 'clientOrderId']);
  });

  it.each([undefined, {}, { clientOrderId: '' }, { clientOrderId: 'contains whitespace' }])(
    'rejects an invalid clientOrderId before preparing (%j)',
    async (options) => {
      const prepareSwap = vi.fn();
      const executeSwap = vi.fn();
      const client = clientGlobal.createClient({ version: 'v1', prepareSwap, executeSwap });

      await expect(client.prepareAndExecuteSwap({ amount: '1' }, options)).rejects.toMatchObject({
        code: 'INVALID_CLIENT_ORDER_ID',
      });
      expect(prepareSwap).not.toHaveBeenCalled();
      expect(executeSwap).not.toHaveBeenCalled();
    }
  );

  it('does not execute a prepared operation that reports canExecute false', async () => {
    const prepared = { canExecute: false, intentId: `polkaswap:swap:sha256:${'b'.repeat(64)}` };
    const prepareSwap = vi.fn().mockResolvedValue(prepared);
    const executeSwap = vi.fn();
    const client = clientGlobal.createClient({ version: 'v1', prepareSwap, executeSwap });

    await expect(
      client.prepareAndExecuteSwap({ amount: '1' }, { clientOrderId: 'strategy-blocked' })
    ).rejects.toMatchObject({ prepared });
    expect(executeSwap).not.toHaveBeenCalled();
  });
});
