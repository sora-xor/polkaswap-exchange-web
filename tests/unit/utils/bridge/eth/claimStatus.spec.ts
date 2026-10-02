import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserProvider, Interface } from 'ethers';

import { getOutgoingClaimStatus } from '@/utils/bridge/eth/claimStatus';

const recipient = '0xdd96a23689c94e75e3f5aaf6292aabde148be17d';
const contract = '0x313416870a4da6f12505a550b67bb73c8e21d5d3';
const requestHash = '0xe78b866e8b983a4a0b69b0ed5266f7e4a2675bca4ecff8ff06b42e9352b77256';
const abi = new Interface(['function used(bytes32) view returns (bool)']);

const createProvider = () => {
  const state = { chain: '0x1', mined: '0xa', pending: ['0xa'], used: false };
  const send = vi.fn(async (method: string, params: readonly unknown[]) => {
    if (method === 'eth_chainId') return state.chain;
    if (method === 'eth_blockNumber') return '0x4d2';
    if (method === 'eth_getTransactionCount') {
      return params[1] === 'pending'
        ? state.pending.length > 1
          ? state.pending.shift()
          : state.pending[0]
        : state.mined;
    }
    if (method === 'eth_call') return abi.encodeFunctionResult('used', [state.used]);
    throw new Error(`Unexpected RPC method: ${method}`);
  });
  return { send, state };
};

const check = (provider: ReturnType<typeof createProvider> | BrowserProvider) =>
  getOutgoingClaimStatus(provider, 1, [contract], recipient, requestHash);

describe('getOutgoingClaimStatus', () => {
  afterEach(() => vi.useRealTimers());
  it('allows an unconsumed request with no pending wallet transaction on the configured chain', async () => {
    const provider = createProvider();
    expect(await check(provider)).toBe('unclaimed');
    expect(provider.send).toHaveBeenCalledWith('eth_call', [
      { to: contract, data: abi.encodeFunctionData('used', [requestHash]) },
      '0x4d2',
    ]);
    expect(provider.send.mock.calls.filter(([method]) => method === 'eth_getTransactionCount')).toEqual([
      ['eth_getTransactionCount', [recipient, '0x4d2']],
      ['eth_getTransactionCount', [recipient, 'pending']],
      ['eth_getTransactionCount', [recipient, 'pending']],
    ]);
  });

  it('blocks an unused request when the wallet has a pending transaction', async () => {
    const provider = createProvider();
    provider.state.pending = ['0xb'];
    expect(await check(provider)).toBe('pending');
  });

  it('blocks a request consumed by a configured bridge contract', async () => {
    const provider = createProvider();
    provider.state.used = true;
    expect(await check(provider)).toBe('consumed');
  });

  it('rejects a wallet network mismatch before reading claim state', async () => {
    const provider = createProvider();
    provider.state.chain = '0x38';
    expect(await check(provider)).toBe('inconclusive');
    expect(provider.send).toHaveBeenCalledOnce();
  });

  it('bypasses ethers read caching to detect a wallet broadcast racing claim discovery', async () => {
    const rpc = createProvider();
    rpc.state.pending = ['0xa', '0xb'];
    const provider = new BrowserProvider({
      request: ({ method, params }) => rpc.send(method, (params ?? []) as unknown[]),
    });
    try {
      expect(await check(provider)).toBe('pending');
      expect(
        rpc.send.mock.calls.filter(
          ([method, params]) => method === 'eth_getTransactionCount' && params[1] === 'pending'
        )
      ).toHaveLength(2);
    } finally {
      provider.destroy();
    }
  });

  it('detects a network switch during the claim status read', async () => {
    const provider = createProvider();
    const send = provider.send.getMockImplementation()!;
    provider.send.mockImplementation(async (method, params) => {
      const result = await send(method, params);
      if (method === 'eth_call') provider.state.chain = '0x38';
      return result;
    });
    expect(await check(provider)).toBe('inconclusive');
  });

  it.each(['0x', null, 'unavailable'])('rejects malformed nonce result %s', async (value) => {
    const provider = createProvider();
    const send = provider.send.getMockImplementation()!;
    provider.send.mockImplementation(async (method, params) =>
      method === 'eth_getTransactionCount' ? value : send(method, params)
    );
    await expect(check(provider)).rejects.toThrow('Invalid Ethereum quantity');
  });

  it('treats an incomplete contract response as inconclusive instead of unused', async () => {
    const provider = createProvider();
    const send = provider.send.getMockImplementation()!;
    provider.send.mockImplementation(async (method, params) => (method === 'eth_call' ? '0x' : send(method, params)));
    await expect(check(provider)).rejects.toThrow();
  });

  it('rejects malformed request and contract identifiers without calling the provider', async () => {
    const provider = createProvider();
    expect(await getOutgoingClaimStatus(provider, 1, [], recipient, requestHash)).toBe('inconclusive');
    expect(await getOutgoingClaimStatus(provider, 1, ['invalid'], recipient, requestHash)).toBe('inconclusive');
    expect(await getOutgoingClaimStatus(provider, 1, [contract], recipient, '0x00')).toBe('inconclusive');
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('keeps positive consumption evidence when another contract and the mined nonce fail', async () => {
    const provider = createProvider();
    const otherContract = `0x${'12'.repeat(20)}`;
    const send = provider.send.getMockImplementation()!;
    provider.send.mockImplementation(async (method, params) => {
      if (method === 'eth_call') {
        if ((params[0] as { to: string }).to === contract) return abi.encodeFunctionResult('used', [true]);
        throw new Error('legacy contract RPC unavailable');
      }
      if (method === 'eth_getTransactionCount' && params[1] !== 'pending') throw new Error('nonce RPC unavailable');
      return send(method, params);
    });

    expect(await getOutgoingClaimStatus(provider, 1, [contract, otherContract], recipient, requestHash)).toBe(
      'consumed'
    );
  });

  it('keeps a known pending nonce when a bridge contract read fails', async () => {
    const provider = createProvider();
    provider.state.pending = ['0xb'];
    const send = provider.send.getMockImplementation()!;
    provider.send.mockImplementation(async (method, params) => {
      if (method === 'eth_call') throw new Error('contract RPC unavailable');
      return send(method, params);
    });

    expect(await check(provider)).toBe('pending');
  });

  it('keeps a fresh pending nonce when the final network read fails', async () => {
    const provider = createProvider();
    provider.state.pending = ['0xa', '0xb'];
    const send = provider.send.getMockImplementation()!;
    let networkReads = 0;
    provider.send.mockImplementation(async (method, params) => {
      if (method === 'eth_chainId' && ++networkReads === 2) throw new Error('network RPC unavailable');
      return send(method, params);
    });

    expect(await check(provider)).toBe('pending');
  });

  it('does not declare an idle request unclaimed after a partial contract read failure', async () => {
    const provider = createProvider();
    const otherContract = `0x${'12'.repeat(20)}`;
    const send = provider.send.getMockImplementation()!;
    provider.send.mockImplementation(async (method, params) => {
      if (method === 'eth_call' && (params[0] as { to: string }).to === otherContract) {
        throw new Error('legacy contract RPC unavailable');
      }
      return send(method, params);
    });

    await expect(
      getOutgoingClaimStatus(provider, 1, [contract, otherContract], recipient, requestHash)
    ).rejects.toThrow('legacy contract RPC unavailable');
  });

  it('requires a successful fresh network read before declaring an idle request unclaimed', async () => {
    const provider = createProvider();
    const send = provider.send.getMockImplementation()!;
    let networkReads = 0;
    provider.send.mockImplementation(async (method, params) => {
      if (method === 'eth_chainId' && ++networkReads === 2) throw new Error('network RPC unavailable');
      return send(method, params);
    });

    await expect(check(provider)).rejects.toThrow('network RPC unavailable');
  });

  it('bounds a wallet RPC read that never settles and cleans up its timer', async () => {
    vi.useFakeTimers();
    const provider = createProvider();
    provider.send.mockImplementation(() => new Promise(() => undefined));
    const result = expect(check(provider)).rejects.toThrow('RPC timed out');

    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a consumed claim when another contract times out and clears every timer', async () => {
    vi.useFakeTimers();
    const provider = createProvider();
    const otherContract = `0x${'12'.repeat(20)}`;
    const send = provider.send.getMockImplementation()!;
    provider.send.mockImplementation(async (method, params) => {
      if (method === 'eth_call') {
        if ((params[0] as { to: string }).to === contract) return abi.encodeFunctionResult('used', [true]);
        return await new Promise(() => undefined);
      }
      return send(method, params);
    });
    const result = getOutgoingClaimStatus(provider, 1, [contract, otherContract], recipient, requestHash);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(await result).toBe('consumed');
    expect(vi.getTimerCount()).toBe(0);
  });
});
