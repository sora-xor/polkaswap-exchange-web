import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref } from 'vue';
import { Operation } from '@sora-substrate/sdk';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import { evaluateGetTsBridgeProgress, matchGetTsBridgeHistory } from '@/features/misc/lib/getTsBridgeProgress';
import { useGetTsPlan } from '@/features/misc/composables/useGetTsPlan';
import { useGetTsBridgeProgress } from '@/features/misc/composables/useGetTsBridgeProgress';
import { useGetTsBridgeDraftTracking } from '@/features/misc/composables/useGetTsBridgeDraftTracking';

const mocks = vi.hoisted(() => ({
  genesis: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
  finalized: vi.fn(),
  at: vi.fn(),
  mapping: vi.fn(),
  status: vi.fn(),
  requests: vi.fn(),
}));
const hash = `0x${'1'.repeat(64)}`;
const block = `0x${'2'.repeat(64)}`;
const soraHash = `0x${'3'.repeat(64)}`;
const row: EthHistory = {
  id: 'local-row',
  type: Operation.EthBridgeIncoming,
  externalNetwork: 1,
  externalHash: hash,
  assetAddress: DAI.address,
  from: 'sora-one',
  to: '0xethereum',
  amount: '2',
  transactionState: 'SORA_COMMITED',
  payload: { tonswapFunding: 'ethereum-dai-v1' },
};
const context = { reference: hash, soraAddress: row.from!, evmAddress: row.to!, mainnet: true };
const evidence = {
  status: 'Done',
  finalizedBlock: block,
  ethereumHash: hash,
  from: row.to!,
  to: row.from!,
  assetAddress: DAI.address,
  amountCodec: '2000000000000000000',
};
const wallet = reactive({ address: row.from });
const web3 = reactive({ evmAddress: row.to, ethBridgeEvmNetwork: 1 });
const settings = reactive({ nodeIsConnected: true, soraNetwork: 'Prod' });
const bridge = reactive<{ historyRecord: Record<string, EthHistory> }>({ historyRecord: { row } });
const chain = {
  isConnected: true,
  genesisHash: { toString: () => mocks.genesis },
  rpc: { chain: { getFinalizedHead: mocks.finalized } },
  at: mocks.at,
};
vi.mock('@/utils/bridge/common/account', () => ({
  areBridgeExternalAccountsEqual: (a: unknown, b: unknown) =>
    typeof a === 'string' && !!a && typeof b === 'string' && a.toLowerCase() === b.toLowerCase(),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    connection: {
      get api() {
        return chain;
      },
    },
  },
}));
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => wallet }));
vi.mock('@/stores/web3', () => ({ useWeb3Store: () => web3 }));
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => settings }));
vi.mock('@/stores/bridge', () => ({ useBridgeStore: () => bridge }));
const scopes: ReturnType<typeof effectScope>[] = [];
const flush = async () => {
  for (let n = 0; n < 15; n++) await Promise.resolve();
  await nextTick();
};

describe('Get TS tracked bridge progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGetTsPlan().clearPlan();
    useGetTsPlan('xor').clearPlan();
    wallet.address = row.from;
    web3.evmAddress = row.to;
    web3.ethBridgeEvmNetwork = 1;
    chain.isConnected = true;
    mocks.genesis = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
    settings.nodeIsConnected = true;
    settings.soraNetwork = 'Prod';
    bridge.historyRecord = { row: { ...row } };
    mocks.finalized.mockResolvedValue(block);
    mocks.at.mockResolvedValue({
      query: {
        ethBridge: {
          loadToIncomingRequestHash: mocks.mapping,
          requestStatuses: mocks.status,
          requests: mocks.requests,
        },
      },
    });
    mocks.mapping.mockResolvedValue(soraHash);
    mocks.status.mockResolvedValue({ toHuman: () => 'Done' });
    mocks.requests.mockResolvedValue({
      isSome: true,
      unwrap: () => ({
        isIncoming: true,
        asIncoming: [
          {
            isTransfer: true,
            asTransfer: {
              txHash: hash,
              from: row.to,
              to: row.from,
              assetId: { code: DAI.address },
              amount: '2000000000000000000',
            },
          },
        ],
      }),
    });
  });
  afterEach(() => {
    scopes.splice(0).forEach((scope) => scope.stop());
  });
  it('recovers the reviewed row when its hash arrives after navigating away from the detail page', async () => {
    const purchase = useGetTsPlan();
    purchase.updatePlan({ daiAmount: '2' });
    expect(purchase.rememberBridgeDraft({ ...row, externalHash: undefined })).toBe(true);
    bridge.historyRecord = { row: { ...row, externalHash: undefined } };
    const scope = effectScope();
    scopes.push(scope);
    scope.run(() => useGetTsBridgeDraftTracking());
    expect(purchase.plan.value.references.bridge).toBeUndefined();
    bridge.historyRecord.row = { ...row };
    await flush();
    expect(purchase.plan.value.references.bridge).toBe(hash);
    expect(purchase.plan.value.bridgeDraft).toBeUndefined();
    expect(mocks.finalized).not.toHaveBeenCalled();
  });
  it('recovers on return when the reviewed row already has a hash, then requires finalized receipt data', async () => {
    const purchase = useGetTsPlan();
    purchase.updatePlan({ daiAmount: '2' });
    purchase.rememberBridgeDraft({ ...row, externalHash: undefined });
    mocks.mapping.mockResolvedValue(`0x${'0'.repeat(64)}`);
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsBridgeProgress())!;
    await flush();
    expect(purchase.plan.value.references.bridge).toBe(hash);
    expect(view.progress.value.state).toBe('pending');
    mocks.mapping.mockResolvedValue(soraHash);
    await view.refresh();
    expect(view.progress.value.state).toBe('received');
  });
  it.each([
    [
      'different ID',
      () => {
        bridge.historyRecord.row.id = 'unreviewed';
      },
    ],
    [
      'different amount',
      () => {
        bridge.historyRecord.row.amount = '3';
      },
    ],
    [
      'different receiving wallet',
      () => {
        bridge.historyRecord.row.from = 'other';
      },
    ],
    [
      'different Ethereum wallet',
      () => {
        bridge.historyRecord.row.to = 'other';
      },
    ],
    [
      'different purpose',
      () => {
        bridge.historyRecord.row.payload = { buyXorFunding: 'ethereum-dai-v1' };
      },
    ],
    [
      'different chain',
      () => {
        bridge.historyRecord.row.externalNetwork = 56;
      },
    ],
    [
      'different asset',
      () => {
        bridge.historyRecord.row.assetAddress = 'other';
      },
    ],
    [
      'different direction',
      () => {
        bridge.historyRecord.row.type = Operation.EthBridgeOutgoing;
      },
    ],
    [
      'invalid hash',
      () => {
        bridge.historyRecord.row.externalHash = 'local-row';
      },
    ],
    [
      'wallet disconnected',
      () => {
        wallet.address = '';
      },
    ],
    [
      'Ethereum account changed',
      () => {
        web3.evmAddress = 'other';
      },
    ],
    [
      'Ethereum chain changed',
      () => {
        web3.ethBridgeEvmNetwork = 56;
      },
    ],
    [
      'SORA network changed',
      () => {
        settings.soraNetwork = 'Test';
      },
    ],
    [
      'SORA disconnected',
      () => {
        settings.nodeIsConnected = false;
      },
    ],
    [
      'ambiguous duplicate rows',
      () => {
        bridge.historyRecord.duplicate = { ...row };
      },
    ],
  ])('does not recover a reviewed draft with %s', async (_label, change) => {
    const purchase = useGetTsPlan();
    purchase.updatePlan({ daiAmount: '2' });
    purchase.rememberBridgeDraft({ ...row, externalHash: undefined });
    change();
    const scope = effectScope();
    scopes.push(scope);
    scope.run(() => useGetTsBridgeDraftTracking());
    await flush();
    expect(purchase.plan.value.references.bridge).toBeUndefined();
    expect(purchase.plan.value.bridgeDraft).toBeDefined();
    expect(mocks.finalized).not.toHaveBeenCalled();
  });
  it('never adopts matching history without a reviewed pointer and stops observing on disposal', async () => {
    const purchase = useGetTsPlan();
    purchase.updatePlan({ daiAmount: '2' });
    const scope = effectScope();
    scopes.push(scope);
    scope.run(() => useGetTsBridgeDraftTracking());
    await flush();
    expect(purchase.plan.value.references.bridge).toBeUndefined();
    bridge.historyRecord.row = { ...row, externalHash: undefined };
    purchase.rememberBridgeDraft(bridge.historyRecord.row);
    scope.stop();
    bridge.historyRecord.row = { ...row };
    await flush();
    expect(purchase.plan.value.references.bridge).toBeUndefined();
  });
  it('recovers only the matching purpose while both checkout observers are active', async () => {
    const generic = { ...row, id: 'generic', payload: { buyXorFunding: 'ethereum-dai-v1' } };
    const purchase = useGetTsPlan('xor');
    purchase.updatePlan({ daiAmount: '2' });
    expect(purchase.rememberBridgeDraft({ ...generic, externalHash: undefined })).toBe(true);
    bridge.historyRecord = { row: generic };
    const scope = effectScope();
    scopes.push(scope);
    scope.run(() => {
      useGetTsBridgeDraftTracking();
      useGetTsBridgeDraftTracking('xor');
    });
    await flush();
    expect(purchase.plan.value.references.bridge).toBe(hash);
    expect(useGetTsPlan().plan.value.references).toEqual({});
  });
  it('requires the tracked hash, both accounts, incoming DAI and Ethereum mainnet', () => {
    expect(matchGetTsBridgeHistory([row], context)).toEqual(row);
    for (const patch of [
      { reference: block },
      { soraAddress: 'sora-two' },
      { evmAddress: 'other' },
      { mainnet: false },
    ])
      expect(matchGetTsBridgeHistory([row], { ...context, ...patch })).toBeNull();
    for (const patch of [
      { externalNetwork: 56 },
      { type: Operation.EthBridgeOutgoing },
      { assetAddress: 'wrong' },
      { amount: '-1' },
    ])
      expect(matchGetTsBridgeHistory([{ ...row, ...patch }], context)).toBeNull();
  });
  it('never treats a saved completed history row as received without exact finalized evidence', () => {
    expect(evaluateGetTsBridgeProgress(row, { status: null, finalizedBlock: block }).state).toBe('pending');
    expect(evaluateGetTsBridgeProgress(row, evidence)).toMatchObject({
      state: 'received',
      reference: hash,
      amount: '2',
      finalizedBlock: block,
    });
    for (const patch of [
      { finalizedBlock: '' },
      { from: 'other' },
      { to: 'other' },
      { ethereumHash: block },
      { assetAddress: 'other' },
      { amountCodec: '2000000000000000001' },
    ])
      expect(evaluateGetTsBridgeProgress(row, { ...evidence, ...patch }).state).toBe('unavailable');
    expect(evaluateGetTsBridgeProgress(row, { ...evidence, status: 'Failed' }).state).toBe('failed');
    expect(evaluateGetTsBridgeProgress(row, { ...evidence, status: 'Unknown' }).state).toBe('unavailable');
  });
  it('does not query without a tracked transfer or for a changed account', async () => {
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsBridgeProgress())!;
    await flush();
    expect(view.progress.value.state).toBe('idle');
    expect(mocks.finalized).not.toHaveBeenCalled();
    wallet.address = 'other';
    useGetTsPlan().trackTransaction('bridge', hash);
    await flush();
    expect(view.progress.value.state).toBe('unavailable');
    expect(mocks.finalized).not.toHaveBeenCalled();
  });
  it('reads only finalized storage and discards an in-flight response after account changes', async () => {
    useGetTsPlan().trackTransaction('bridge', hash);
    let resolve!: (value: string) => void;
    mocks.finalized.mockImplementationOnce(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        })
    );
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsBridgeProgress())!;
    wallet.address = 'other';
    await nextTick();
    resolve(block);
    await flush();
    expect(view.progress.value.state).toBe('unavailable');
    expect(view.refreshing.value).toBe(false);
    wallet.address = row.from;
    await flush();
    expect(mocks.at).toHaveBeenCalledWith(block);
    expect(mocks.mapping).toHaveBeenCalledWith(0, hash);
    expect(view.progress.value.state).toBe('received');
    settings.nodeIsConnected = false;
    await flush();
    expect(view.progress.value.state).toBe('unavailable');
  });
  it('reports unavailable after RPC failure rather than trusting the history completion state', async () => {
    useGetTsPlan().trackTransaction('bridge', hash);
    mocks.finalized.mockRejectedValue(new Error('offline'));
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsBridgeProgress())!;
    await flush();
    expect(view.progress.value.state).toBe('unavailable');
    expect(view.refreshing.value).toBe(false);
  });
  it('keeps generic bridge receipts independent from the TS plan and rechecks purpose changes', async () => {
    const generic = { ...row, payload: { buyXorFunding: 'ethereum-dai-v1' } };
    expect(matchGetTsBridgeHistory([generic], { ...context, purpose: 'ts' })).toBeNull();
    expect(matchGetTsBridgeHistory([row], { ...context, purpose: 'xor' })).toBeNull();
    bridge.historyRecord = { row: generic };
    useGetTsPlan('xor').trackTransaction('bridge', hash);
    const purpose = ref<'xor' | 'ts'>('xor');
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsBridgeProgress(purpose))!;
    await flush();
    expect(view.progress.value.state).toBe('received');
    purpose.value = 'ts';
    await flush();
    expect(view.progress.value.state).toBe('idle');
    bridge.historyRecord = { row };
  });
});
