import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdkMocks = vi.hoisted(() => ({
  Operation: {
    AddLiquidity: 'AddLiquidity',
    Burn: 'Burn',
    ClaimRewards: 'ClaimRewards',
    CreatePair: 'CreatePair',
    DemeterFarmingDepositLiquidity: 'DemeterFarmingDepositLiquidity',
    DemeterFarmingGetRewards: 'DemeterFarmingGetRewards',
    DemeterFarmingStakeToken: 'DemeterFarmingStakeToken',
    DemeterFarmingUnstakeToken: 'DemeterFarmingUnstakeToken',
    DemeterFarmingWithdrawLiquidity: 'DemeterFarmingWithdrawLiquidity',
    EthBridgeIncoming: 'EthBridgeIncoming',
    EthBridgeOutgoing: 'EthBridgeOutgoing',
    Mint: 'Mint',
    OrderBookCancelLimitOrder: 'OrderBookCancelLimitOrder',
    OrderBookCancelLimitOrders: 'OrderBookCancelLimitOrders',
    OrderBookPlaceLimitOrder: 'OrderBookPlaceLimitOrder',
    ReferralReserveXor: 'ReferralReserveXor',
    ReferralSetInvitedUser: 'ReferralSetInvitedUser',
    ReferralUnreserveXor: 'ReferralUnreserveXor',
    RemoveLiquidity: 'RemoveLiquidity',
    Swap: 'Swap',
    SwapAndSend: 'SwapAndSend',
    SwapTransferBatch: 'SwapTransferBatch',
    Transfer: 'Transfer',
    VestedTransfer: 'VestedTransfer',
  },
  TransactionStatus: {
    Error: 'Error',
    Finalized: 'Finalized',
    Invalid: 'Invalid',
    Usurped: 'Usurped',
  },
}));

const operationsMocks = vi.hoisted(() => ({
  account: {
    address: 'sender-address',
    name: 'Sender',
    source: 'polkadot-js',
  },
  groupRewardsByAssetsList: vi.fn(() => []),
}));

vi.mock('@sora-substrate/sdk', () => sdkMocks);

import { Operation, TransactionStatus } from '@sora-substrate/sdk';

vi.mock('@/lib/soraneo-wallet/src/consts', () => ({
  HiddenValue: '***',
  accountIdBasedOperations: [sdkMocks.Operation.Transfer],
}));

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  formatAddress: (value: string) => `formatted-address:${value}`,
  groupRewardsByAssetsList: operationsMocks.groupRewardsByAssetsList,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    account: operationsMocks.account,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}`,
  }),
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    formatStringValue: (value: string) => `formatted:${value}`,
  }),
}));

describe('useOperations', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    operationsMocks.account.address = 'sender-address';
    operationsMocks.groupRewardsByAssetsList.mockReset();
    operationsMocks.groupRewardsByAssetsList.mockReturnValue([]);
  });

  it('formats account-based operations with the active wallet account', async () => {
    const { useOperations } = await import('@/composables/useOperations');
    const { getOperationMessage } = useOperations();

    const result = getOperationMessage({
      type: Operation.Transfer,
      status: TransactionStatus.Finalized,
      from: 'sender-address',
      to: 'recipient-address',
      amount: '10',
      decimals: 18,
    } as any);

    expect(result).toContain('operations.Finalized.Transfer');
    expect(result).toContain('"action":"sentText:{}"');
    expect(result).toContain('"address":"formatted-address:recipient-address"');
    expect(result).toContain('"direction":"transaction.to:{}"');
    expect(result).toContain('"amount":"formatted:10"');
  });

  it('formats incoming account operations from the counterparty address', async () => {
    operationsMocks.account.address = 'recipient-address';
    const { useOperations } = await import('@/composables/useOperations');
    const { getOperationMessage } = useOperations();

    const result = getOperationMessage({
      type: Operation.Transfer,
      status: TransactionStatus.Finalized,
      from: 'sender-address',
      to: 'recipient-address',
      amount: '10',
      decimals: 18,
    } as any);

    expect(result).toContain('"action":"receivedText:{}"');
    expect(result).toContain('"address":"formatted-address:sender-address"');
    expect(result).toContain('"direction":"transaction.from:{}"');
  });

  it('groups claim rewards and hides reward amounts when requested', async () => {
    operationsMocks.groupRewardsByAssetsList.mockReturnValue([
      { amount: '10', asset: { symbol: 'XOR' } },
      { amount: '20', asset: { symbol: 'VAL' } },
    ]);
    const { useOperations } = await import('@/composables/useOperations');
    const { getOperationMessage } = useOperations();

    const visibleResult = getOperationMessage({
      type: Operation.ClaimRewards,
      status: TransactionStatus.Finalized,
      rewards: [{ amount: '10', asset: { symbol: 'XOR' } }],
    } as any);
    const hiddenResult = getOperationMessage(
      {
        type: Operation.ClaimRewards,
        status: TransactionStatus.Finalized,
        rewards: [{ amount: '10', asset: { symbol: 'XOR' } }],
      } as any,
      true
    );

    expect(visibleResult).toContain('"rewards":"formatted:10 XOR operations.andText:{} formatted:20 VAL"');
    expect(hiddenResult).toContain('"rewards":"*** XOR operations.andText:{} *** VAL"');
    expect(hiddenResult).toContain('"amount":"***"');
    expect(hiddenResult).toContain('"amount2":"***"');
  });

  it('formats referral links from the active account perspective', async () => {
    const { useOperations } = await import('@/composables/useOperations');
    const { getOperationMessage } = useOperations();

    const invitedUserResult = getOperationMessage({
      type: Operation.ReferralSetInvitedUser,
      status: TransactionStatus.Finalized,
      from: 'sender-address',
      to: 'referrer-address',
    } as any);

    operationsMocks.account.address = 'referrer-address';

    const referrerResult = getOperationMessage({
      type: Operation.ReferralSetInvitedUser,
      status: TransactionStatus.Finalized,
      from: 'sender-address',
      to: 'referrer-address',
    } as any);

    expect(invitedUserResult).toContain('"role":"transaction.referrer:{}"');
    expect(invitedUserResult).toContain('"address":"formatted-address:referrer-address"');
    expect(referrerResult).toContain('"role":"transaction.referral:{}"');
    expect(referrerResult).toContain('"address":"formatted-address:sender-address"');
  });

  it('normalizes error-like statuses and uppercases order book sides', async () => {
    const { useOperations } = await import('@/composables/useOperations');
    const { getOperationMessage } = useOperations();

    const invalidResult = getOperationMessage({
      type: Operation.OrderBookPlaceLimitOrder,
      status: TransactionStatus.Invalid,
      side: 'buy',
    } as any);
    const usurpedResult = getOperationMessage({
      type: Operation.OrderBookCancelLimitOrder,
      status: TransactionStatus.Usurped,
      side: 'sell',
    } as any);

    expect(invalidResult).toContain('operations.Error.OrderBookPlaceLimitOrder');
    expect(invalidResult).toContain('"side":"BUY"');
    expect(usurpedResult).toContain('operations.Error.OrderBookCancelLimitOrder');
    expect(usurpedResult).toContain('"side":"SELL"');
  });

  it('returns an empty message for missing or unknown operations', async () => {
    const { useOperations } = await import('@/composables/useOperations');
    const { getOperationMessage } = useOperations();

    expect(getOperationMessage()).toBe('');
    expect(getOperationMessage({ type: 'UnknownOperation' } as any)).toBe('');
  });
});
