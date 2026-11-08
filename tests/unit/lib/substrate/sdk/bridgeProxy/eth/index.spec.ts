import { describe, expect, it, vi } from 'vitest';

vi.mock('@polkadot/ui-keyring', () => ({
  Keyring: class {
    public loadAll = vi.fn();

    public getAccounts = vi.fn(() => []);
  },
}));

import { EthBridgeApi } from '@sora-substrate/sdk/build/bridgeProxy/eth';
import { EthNetwork } from '@sora-substrate/sdk/build/bridgeProxy/eth/consts';

/** Attaches a fake API object so the bridge methods run without a node connection. */
const createApi = (api: Record<string, unknown>) => {
  const bridge = new EthBridgeApi();
  bridge.setConnection({ api } as never);
  return bridge;
};

const u64 = (value: number) => ({ toNumber: () => value });

describe('EthBridgeApi request submission height', () => {
  it('reads the registration height of an Ethereum bridge request', async () => {
    const requestSubmissionHeight = vi.fn(async () => u64(28_200_000));
    const bridge = createApi({ query: { ethBridge: { requestSubmissionHeight } } });

    await expect(bridge.getRequestSubmissionHeight('0xrequest')).resolves.toBe(28_200_000);
    expect(requestSubmissionHeight).toHaveBeenCalledWith(EthNetwork.Ethereum, '0xrequest');
  });

  it('resolves the SORA block hash at that height', async () => {
    const getBlockHash = vi.fn(async () => ({ toString: () => '0xblock' }));
    const bridge = createApi({
      query: { ethBridge: { requestSubmissionHeight: vi.fn(async () => u64(42)) } },
      rpc: { chain: { getBlockHash } },
    });

    await expect(bridge.getSoraBlockHashByRequestHash('0xrequest')).resolves.toBe('0xblock');
    expect(getBlockHash).toHaveBeenCalledWith(42);
  });
});

describe('EthBridgeApi.getOutgoingApprovalDelayMs', () => {
  it('returns the runtime constant in milliseconds', () => {
    const bridge = createApi({ consts: { ethBridge: { outgoingApprovalDelayMs: u64(120_000) } } });

    expect(bridge.getOutgoingApprovalDelayMs()).toBe(120_000);
  });

  it('returns 0 for runtimes without the constant', () => {
    expect(createApi({ consts: {} }).getOutgoingApprovalDelayMs()).toBe(0);
    expect(createApi({ consts: { ethBridge: {} } }).getOutgoingApprovalDelayMs()).toBe(0);
  });

  it('returns 0 for a value that cannot be a delay', () => {
    expect(
      createApi({ consts: { ethBridge: { outgoingApprovalDelayMs: u64(Number.NaN) } } }).getOutgoingApprovalDelayMs()
    ).toBe(0);
    expect(
      createApi({ consts: { ethBridge: { outgoingApprovalDelayMs: u64(-1) } } }).getOutgoingApprovalDelayMs()
    ).toBe(0);
  });
});
