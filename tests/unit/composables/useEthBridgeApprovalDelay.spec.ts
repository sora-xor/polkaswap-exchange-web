import { computed, nextTick, reactive, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEthBridgeApprovalDelay } from '@/composables/useEthBridgeApprovalDelay';
import { ETH_BRIDGE_APPROVAL_ALLOWANCE_MS } from '@/features/bridge/pages/bridgeTransactionPage.utils';
import { Operation } from '@/lib/substrate/sdk/types';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

import type { IBridgeTransaction } from '@sora-substrate/sdk';

const mocks = vi.hoisted(() => ({
  getOutgoingApprovalDelayMs: vi.fn(() => 120_000),
  getRequestSubmissionHeight: vi.fn(async () => 100),
  settings: { blockNumber: 100 },
}));

vi.mock('@/utils/bridge/eth/api', () => ({
  ethBridgeApi: {
    getOutgoingApprovalDelayMs: mocks.getOutgoingApprovalDelayMs,
    getRequestSubmissionHeight: mocks.getRequestSubmissionHeight,
  },
}));

const settingsStore = reactive(mocks.settings);

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStore,
}));

const flush = async () => {
  await Promise.resolve();
  await nextTick();
};

const outgoingTx = (overrides: Partial<IBridgeTransaction> = {}): IBridgeTransaction =>
  ({
    id: 'history-1',
    type: Operation.EthBridgeOutgoing,
    transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
    hash: '0xrequest',
    ...overrides,
  }) as IBridgeTransaction;

describe('useEthBridgeApprovalDelay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOutgoingApprovalDelayMs.mockReturnValue(120_000);
    mocks.getRequestSubmissionHeight.mockResolvedValue(100);
    settingsStore.blockNumber = 100;
  });

  it('follows the live SORA block number from the request registration height', async () => {
    const tx = ref<IBridgeTransaction | null>(outgoingTx());
    const { progress, delayMs } = useEthBridgeApprovalDelay(computed(() => tx.value));
    await flush();

    expect(mocks.getRequestSubmissionHeight).toHaveBeenCalledWith('0xrequest');
    expect(delayMs.value).toBe(120_000);
    expect(progress.value).toEqual({ percent: 0, remainingMs: 120_000 + ETH_BRIDGE_APPROVAL_ALLOWANCE_MS });

    settingsStore.blockNumber = 110;
    expect(progress.value).toEqual({ percent: 40, remainingMs: 90_000 });

    settingsStore.blockNumber = 130;
    expect(progress.value).toEqual({ percent: 100, remainingMs: 0 });
  });

  it('shows nothing when the runtime has no outgoing approval delay', async () => {
    mocks.getOutgoingApprovalDelayMs.mockReturnValue(0);
    const { progress } = useEthBridgeApprovalDelay(computed(() => outgoingTx()));
    await flush();

    expect(mocks.getRequestSubmissionHeight).not.toHaveBeenCalled();
    expect(progress.value).toBeNull();
  });

  it('shows nothing for other phases, directions, or before the request hash is known', async () => {
    const cases = [
      outgoingTx({ transactionState: ETH_BRIDGE_STATES.SORA_SUBMITTED }),
      outgoingTx({ transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED }),
      outgoingTx({ type: Operation.EthBridgeIncoming }),
      outgoingTx({ hash: undefined }),
    ];

    for (const item of cases) {
      const { progress } = useEthBridgeApprovalDelay(computed(() => item));
      await flush();
      expect(progress.value).toBeNull();
    }
    expect(mocks.getRequestSubmissionHeight).not.toHaveBeenCalled();
  });

  it('shows nothing for an unregistered request', async () => {
    mocks.getRequestSubmissionHeight.mockResolvedValue(0);
    const { progress } = useEthBridgeApprovalDelay(computed(() => outgoingTx()));
    await flush();

    expect(progress.value).toBeNull();
  });

  it('hides the progress once approvals arrive and the transfer moves to Ethereum', async () => {
    const tx = ref<IBridgeTransaction>(outgoingTx());
    const { progress } = useEthBridgeApprovalDelay(computed(() => tx.value));
    await flush();
    expect(progress.value).not.toBeNull();

    tx.value = outgoingTx({ transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED });
    await flush();
    expect(progress.value).toBeNull();
  });

  it('ignores a registration height that arrives for a request the page no longer shows', async () => {
    let resolveFirst: (height: number) => void = () => undefined;
    mocks.getRequestSubmissionHeight
      .mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce(200);
    settingsStore.blockNumber = 205;
    const tx = ref<IBridgeTransaction>(outgoingTx());
    const { progress } = useEthBridgeApprovalDelay(computed(() => tx.value));
    await flush();

    tx.value = outgoingTx({ id: 'history-2', hash: '0xsecond' });
    await flush();
    resolveFirst(100);
    await flush();

    expect(mocks.getRequestSubmissionHeight).toHaveBeenLastCalledWith('0xsecond');
    expect(progress.value).toEqual({ percent: 20, remainingMs: 120_000 });
  });

  it('logs and shows nothing when the chain query fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.getRequestSubmissionHeight.mockRejectedValue(new Error('disconnected'));
    const { progress } = useEthBridgeApprovalDelay(computed(() => outgoingTx()));
    await flush();

    expect(progress.value).toBeNull();
    expect(warn).toHaveBeenCalledWith('[Bridge] Failed to read the outgoing approval delay', expect.any(Error));
    warn.mockRestore();
  });
});
