import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref } from 'vue';
import { Operation, type HistoryItem } from '@sora-substrate/sdk';
import { DAI, XOR } from '@sora-substrate/sdk/build/assets/consts';
import {
  matchGetTsSwapHistory,
  readGetTsSwapProgress,
  type GetTsSwapReadClient,
} from '@/features/misc/lib/getTsSwapProgress';
import { useGetTsSwapProgress } from '@/features/misc/composables/useGetTsSwapProgress';
import { useGetTsPlan } from '@/features/misc/composables/useGetTsPlan';
vi.unmock('@polkadot/util-crypto');

const hash = `0x${'1'.repeat(64)}`;
const block = `0x${'2'.repeat(64)}`;
const head = `0x${'3'.repeat(64)}`;
const row: HistoryItem = {
  id: hash,
  type: Operation.Swap,
  assetAddress: DAI.address,
  asset2Address: XOR.address,
  from: 'sora-one',
  blockId: block,
  status: 'finalized',
};
const wallet = reactive({
  address: 'sora-one',
  history: { [hash]: row },
  externalHistory: {} as Record<string, HistoryItem>,
  externalHistoryUpdates: {} as Record<string, HistoryItem>,
});
let sdkHistory: Record<string, HistoryItem> = {};
const settings = reactive({ nodeIsConnected: true, soraNetwork: 'Prod' });
const header = (height: number, hash: string) => ({
  number: { toNumber: () => height },
  hash: { toString: () => hash },
});
const event = (section: string, method: string, data: unknown[] = [], index = 0) => ({
  phase: { isApplyExtrinsic: true, asApplyExtrinsic: { toNumber: () => index } },
  event: { section, method, data },
});
const extrinsic = () => ({
  hash: { toString: () => hash },
  isSigned: true,
  signer: { toString: () => 'sora-one' },
  method: { section: 'liquidityProxy', method: 'swap', args: [0, DAI.address, XOR.address] },
});
const records = () => [
  event('system', 'ExtrinsicSuccess'),
  event('liquidityProxy', 'Exchange', [
    'sora-one',
    '0',
    DAI.address,
    XOR.address,
    '2000000000000000000',
    '1500000000000000000',
  ]),
  event('xorFee', 'FeeWithdrawn', ['sora-one', '10000000000000000']),
];
const calls = { head: vi.fn(), header: vi.fn(), blockHash: vi.fn(), block: vi.fn(), at: vi.fn(), events: vi.fn() };
let chainInitialized = true;
let genesisReads = 0;
const chain = {
  isConnected: true,
  isReady: Promise.resolve(),
  get genesisHash() {
    genesisReads += 1;
    if (!chainInitialized) throw new Error("Api interfaces needs to be initialized before using, wait for 'isReady'");
    return { toString: () => '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5' };
  },
  rpc: {
    chain: {
      getFinalizedHead: calls.head,
      getHeader: calls.header,
      getBlockHash: calls.blockHash,
      getBlock: calls.block,
    },
  },
  at: calls.at,
};
let selectedChain = chain;
vi.mock('@/utils/bridge/common/account', () => ({
  areBridgeExternalAccountsEqual: (a: unknown, b: unknown) => typeof a === 'string' && !!a && a === b,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    getHistory: (id: string) => sdkHistory[id] ?? null,
    get historyList() {
      return Object.values(sdkHistory);
    },
    connection: {
      get api() {
        return selectedChain;
      },
    },
  },
}));
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => wallet }));
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => settings }));
const scopes: ReturnType<typeof effectScope>[] = [];
const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
  await nextTick();
};
const read = (record = row, current = () => true) =>
  readGetTsSwapProgress(chain as GetTsSwapReadClient, record, hash, 'sora-one', current);
describe('Get TS verified swap progress', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useGetTsPlan().clearPlan();
    useGetTsPlan('xor').clearPlan();
    wallet.address = 'sora-one';
    wallet.history = { [hash]: row };
    wallet.externalHistory = {};
    sdkHistory = {};
    settings.nodeIsConnected = true;
    settings.soraNetwork = 'Prod';
    chain.isConnected = true;
    chainInitialized = true;
    chain.isReady = Promise.resolve();
    selectedChain = chain;
    genesisReads = 0;
    calls.head.mockResolvedValue(head);
    calls.header.mockImplementation(async (hash: string) => header(hash === head ? 20 : 10, hash));
    calls.blockHash.mockResolvedValue(block);
    calls.block.mockResolvedValue({ block: { header: header(10, block), extrinsics: [extrinsic()] } });
    calls.at.mockResolvedValue({ query: { system: { events: calls.events } } });
    calls.events.mockResolvedValue(records());
  });
  afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));
  it.each(['ts', 'xor'] as const)('keeps an idle %s purchase away from uninitialized SDK metadata', async (purpose) => {
    chainInitialized = false;
    chain.isReady = new Promise(() => {});
    expect(() => chain.genesisHash).toThrow("Api interfaces needs to be initialized before using, wait for 'isReady'");
    genesisReads = 0;
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsSwapProgress(purpose))!;
    await flush();
    await expect(view.refresh()).resolves.toBeUndefined();
    expect(view.progress.value).toEqual({ state: 'idle' });
    expect(view.refreshing.value).toBe(false);
    expect(genesisReads).toBe(0);
    expect(calls.head).not.toHaveBeenCalled();
  });
  it('preserves a saved draft through deferred metadata initialization and resumes on readiness', async () => {
    const address = `0x${'4'.repeat(64)}`;
    const draftId = 'purchase-swap:xor:11111111-2222-3333-4444-555555555555';
    const unsigned = { ...row, id: draftId, from: address, amount: '5', blockId: undefined };
    const purchase = useGetTsPlan('xor');
    wallet.address = address;
    wallet.history = {};
    expect(purchase.rememberSwapDraft(unsigned, chain.genesisHash.toString())).toBe(true);
    const savedDraft = purchase.plan.value.swapDraft;
    chainInitialized = false;
    settings.nodeIsConnected = false;
    genesisReads = 0;
    let initialize!: () => void;
    chain.isReady = new Promise<void>((resolve) => {
      initialize = resolve;
    });
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsSwapProgress('xor'))!;
    await flush();
    expect(view.progress.value).toEqual({ state: 'unavailable', historyId: draftId });
    expect(purchase.plan.value.swapDraft).toEqual(savedDraft);
    expect(purchase.plan.value.references.swap).toBeUndefined();
    expect(genesisReads).toBe(0);
    settings.nodeIsConnected = true;
    await flush();
    expect(view.refreshing.value).toBe(true);
    expect(view.progress.value.state).toBe('unavailable');
    expect(purchase.plan.value.swapDraft).toEqual(savedDraft);
    expect(genesisReads).toBe(0);
    chainInitialized = true;
    initialize();
    await flush();
    expect(view.refreshing.value).toBe(false);
    expect(view.progress.value).toEqual({ state: 'pending', historyId: draftId });
    expect(purchase.plan.value.swapDraft).toEqual(savedDraft);
    expect(purchase.plan.value.references.swap).toBeUndefined();
    expect(calls.head).not.toHaveBeenCalled();
  });
  it('reads a tracked receipt only after metadata is ready and rejects a replaced connection', async () => {
    useGetTsPlan().trackTransaction('swap', hash);
    chainInitialized = false;
    let initialize!: () => void;
    chain.isReady = new Promise<void>((resolve) => {
      initialize = resolve;
    });
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsSwapProgress())!;
    await flush();
    expect(view.progress.value).toEqual({ state: 'unavailable', reference: hash });
    expect(genesisReads).toBe(0);
    expect(calls.head).not.toHaveBeenCalled();
    selectedChain = Object.create(chain) as typeof chain;
    chainInitialized = true;
    initialize();
    await flush();
    expect(view.progress.value).toEqual({ state: 'unavailable', reference: hash });
    expect(genesisReads).toBe(0);
    expect(calls.head).not.toHaveBeenCalled();
    await view.refresh();
    await flush();
    expect(view.progress.value.state).toBe('received');
    expect(calls.head).toHaveBeenCalledTimes(1);
  });
  it('matches the explicit hash/account/pair and prefers an indexed block locator over an older local pending row', () => {
    const pending = { ...row, blockId: undefined };
    expect(matchGetTsSwapHistory([pending, row], hash, 'sora-one')).toEqual(row);
    expect(matchGetTsSwapHistory([row], hash, 'another')).toBeNull();
    expect(matchGetTsSwapHistory([row], block, 'sora-one')).toBeNull();
    expect(matchGetTsSwapHistory([{ ...row, asset2Address: DAI.address }], hash, 'sora-one')).toBeNull();
  });
  it('requires actual finalized inclusion and exact swap events before reporting received', async () => {
    expect(await read()).toMatchObject({ state: 'received', reference: hash, blockId: block, xorReceived: '1.49' });
    expect(calls.at).toHaveBeenCalledWith(block);
    expect(calls.blockHash).toHaveBeenCalledWith(10);
    expect((await read({ ...row, blockId: undefined })).state).toBe('pending');
    calls.header.mockImplementation(async (hash: string) => header(hash === head ? 5 : 10, hash));
    expect((await read()).state).toBe('pending');
  });
  it('rejects noncanonical blocks and a different signer, hash, or call', async () => {
    calls.blockHash.mockResolvedValueOnce(head);
    expect((await read()).state).toBe('unavailable');
    for (const item of [
      { ...extrinsic(), signer: { toString: () => 'other' } },
      { ...extrinsic(), hash: { toString: () => head } },
      { ...extrinsic(), method: { section: 'balances', method: 'transfer', args: [] } },
    ]) {
      calls.block.mockResolvedValueOnce({ block: { header: header(10, block), extrinsics: [item] } });
      expect((await read()).state).toBe('unavailable');
    }
  });
  it('does not borrow another extrinsic success and preserves an authoritative failure', async () => {
    calls.events.mockResolvedValueOnce([event('system', 'ExtrinsicSuccess', [], 1)]);
    expect((await read()).state).toBe('unavailable');
    calls.events.mockResolvedValueOnce([event('system', 'ExtrinsicFailed')]);
    expect((await read()).state).toBe('failed');
    calls.events.mockResolvedValueOnce([
      event('system', 'ExtrinsicSuccess'),
      event('liquidityProxy', 'Exchange', ['sora-one', '0', XOR.address, DAI.address, '1', '2']),
    ]);
    expect((await read()).state).toBe('unavailable');
  });
  it('discards a response after wallet context changes and contains RPC failures', async () => {
    let current = true;
    calls.block.mockImplementationOnce(async () => {
      current = false;
      return { block: { header: header(10, block), extrinsics: [extrinsic()] } };
    });
    expect((await read(row, () => current)).state).toBe('unavailable');
    calls.events.mockRejectedValueOnce(new Error('offline'));
    expect((await read()).state).toBe('unavailable');
  });
  it('recovers exact archived events only for pruned block decoding or event state', async () => {
    const archived = vi.fn(async () => ({
      block: { header: header(10, block), extrinsics: [extrinsic()] },
      events: records(),
    }));
    calls.block.mockRejectedValueOnce(new Error('State already discarded'));
    expect(await readGetTsSwapProgress(chain, row, hash, 'sora-one', () => true, archived)).toMatchObject({
      state: 'received',
      xorReceived: '1.49',
    });
    expect(archived).toHaveBeenCalledWith(block, 10);
    calls.events.mockRejectedValueOnce(new Error('State already discarded'));
    expect((await readGetTsSwapProgress(chain, row, hash, 'sora-one', () => true, archived)).state).toBe('received');
    expect(archived).toHaveBeenCalledTimes(2);
    calls.events.mockRejectedValueOnce(new Error('offline'));
    expect((await readGetTsSwapProgress(chain, row, hash, 'sora-one', () => true, archived)).state).toBe('unavailable');
    expect(archived).toHaveBeenCalledTimes(2);
    calls.block.mockRejectedValueOnce(new Error('State already discarded'));
    archived.mockResolvedValueOnce({
      block: { header: header(10, block), extrinsics: [extrinsic()] },
      events: [event('system', 'ExtrinsicSuccess', [], 1)],
    });
    expect((await readGetTsSwapProgress(chain, row, hash, 'sora-one', () => true, archived)).state).toBe('unavailable');
  });
  it('retains only an already verified terminal receipt in memory and invalidates it on account change', async () => {
    useGetTsPlan().trackTransaction('swap', hash);
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsSwapProgress())!;
    await flush();
    expect(view.progress.value.state).toBe('received');
    calls.events.mockRejectedValue(new Error('offline'));
    await view.refresh();
    expect(view.progress.value.state).toBe('received');
    expect(calls.events).toHaveBeenCalledTimes(1);
    wallet.address = 'another';
    await flush();
    expect(view.progress.value.state).toBe('unavailable');
    wallet.address = 'sora-one';
    await flush();
    expect(view.progress.value.state).toBe('unavailable');
  });
  it('observes only tracked current-account mainnet swaps and revokes display on disconnect', async () => {
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsSwapProgress())!;
    await flush();
    expect(view.progress.value.state).toBe('idle');
    expect(calls.head).not.toHaveBeenCalled();
    useGetTsPlan().trackTransaction('swap', hash);
    await flush();
    expect(view.progress.value.state).toBe('received');
    wallet.address = 'another';
    await flush();
    expect(view.progress.value.state).toBe('unavailable');
    wallet.address = 'sora-one';
    await flush();
    expect(view.progress.value.state).toBe('received');
    settings.nodeIsConnected = false;
    await flush();
    expect(view.progress.value.state).toBe('unavailable');
  });
  it('does not borrow the other purchase purpose’s tracked swap', async () => {
    useGetTsPlan('xor').trackTransaction('swap', hash);
    const purpose = ref<'xor' | 'ts'>('xor');
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsSwapProgress(purpose))!;
    await flush();
    expect(view.progress.value.state).toBe('received');
    purpose.value = 'ts';
    await flush();
    expect(view.progress.value.state).toBe('idle');
  });
  it('restores a no-hash draft and observes only that exact row when its submitted hash appears later', async () => {
    const address = `0x${'4'.repeat(64)}`;
    const draftId = 'purchase-swap:xor:11111111-2222-3333-4444-555555555555';
    const unsigned = { ...row, id: draftId, from: address, amount: '5', blockId: undefined };
    const purchase = useGetTsPlan('xor');
    wallet.address = address;
    wallet.history = {};
    expect(purchase.rememberSwapDraft(unsigned, chain.genesisHash.toString())).toBe(true);
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsSwapProgress('xor'))!;
    await flush();
    expect(view.progress.value).toMatchObject({ state: 'pending', historyId: draftId });
    expect(purchase.plan.value.references.swap).toBeUndefined();
    wallet.history = { other: { ...unsigned, id: 'unrelated', txId: hash } };
    await view.refresh();
    expect(purchase.plan.value.references.swap).toBeUndefined();
    wallet.history = { [draftId]: { ...unsigned, txId: hash } };
    await flush();
    expect(purchase.plan.value.references.swap).toBe(hash);
    expect(purchase.plan.value.swapDraft).toBeUndefined();
    expect(view.progress.value.state).toBe('pending');
  });
  it('reconciles SDK-only submission and finalized block writes before Pinia history catches up', async () => {
    const address = `0x${'4'.repeat(64)}`;
    const draftId = 'purchase-swap:xor:11111111-2222-3333-4444-555555555555';
    const unsigned = { ...row, id: draftId, from: address, amount: '5', blockId: undefined };
    const purchase = useGetTsPlan('xor');
    wallet.address = address;
    wallet.history = {};
    expect(purchase.rememberSwapDraft(unsigned, chain.genesisHash.toString())).toBe(true);
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsSwapProgress('xor'))!;
    await flush();
    sdkHistory[draftId] = { ...unsigned, txId: hash };
    await view.refresh();
    await flush();
    expect(purchase.plan.value.references.swap).toBe(hash);
    expect(view.progress.value.state).toBe('pending');
    sdkHistory[draftId] = { ...sdkHistory[draftId], blockId: block };
    calls.block.mockResolvedValue({
      block: { header: header(10, block), extrinsics: [{ ...extrinsic(), signer: { toString: () => address } }] },
    });
    const exactRecords = records();
    exactRecords[1].event.data[0] = address;
    exactRecords[2].event.data[0] = address;
    calls.events.mockResolvedValue(exactRecords);
    await view.refresh();
    await flush();
    expect(view.progress.value).toMatchObject({ state: 'received', xorReceived: '1.49' });
    expect(wallet.history).toEqual({});
  });
});
