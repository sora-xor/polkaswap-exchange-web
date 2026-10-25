import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref } from 'vue';
import { id } from 'ethers';
import {
  GET_TS_CONVERSION_PROGRESS_TIMEOUT_MS,
  GET_TS_ETHEREUM_DAI,
  GET_TS_TRANSFER_TOPIC,
  getTsConversionReceiptAmount,
  readGetTsConversionProgress,
  type GetTsConversionLog,
  type GetTsConversionReceipt,
  type GetTsConversionReadClient,
} from '@/features/misc/lib/getTsConversionProgress';
import { TONSWAP_CONVERSION_CONTRACTS } from '@/features/misc/lib/tonswapConversion';
import { useGetTsConversionProgress } from '@/features/misc/composables/useGetTsConversionProgress';
import { useGetTsPlan } from '@/features/misc/composables/useGetTsPlan';
import { GET_TS_CONVERSION_FINGERPRINT_KEYS } from '@/features/misc/lib/getTsConversionRecovery';
vi.unmock('@polkadot/util-crypto');

const hash = `0x${'1'.repeat(64)}`;
const block = `0x${'2'.repeat(64)}`;
const account = `0x${'3'.repeat(40)}`;
const other = `0x${'4'.repeat(40)}`;
const gateway = TONSWAP_CONVERSION_CONTRACTS.gateway;
const topic = (address: string) => `0x${'0'.repeat(24)}${address.slice(2)}`;
const transfer = (amount: bigint, from = other, to = account, index = 0): GetTsConversionLog => ({
  address: GET_TS_ETHEREUM_DAI,
  topics: [GET_TS_TRANSFER_TOPIC, topic(from), topic(to)],
  data: `0x${amount.toString(16).padStart(64, '0')}`,
  index,
  transactionHash: hash,
  blockHash: block,
  blockNumber: 100,
  removed: false,
});
const receipt = (logs = [transfer(1234567890123456789n)]): GetTsConversionReceipt => ({
  hash,
  from: account,
  to: gateway,
  status: 1,
  blockHash: block,
  blockNumber: 100,
  logs,
});
const transaction = () => ({ hash, from: account, to: gateway, chainId: 1n, blockHash: block, blockNumber: 100 });
const calls = {
  network: vi.fn(),
  send: vi.fn(),
  transaction: vi.fn(),
  receipt: vi.fn(),
  block: vi.fn(),
  height: vi.fn(),
};
const client: GetTsConversionReadClient = {
  getNetwork: calls.network,
  send: calls.send,
  getTransaction: calls.transaction,
  getTransactionReceipt: calls.receipt,
  getBlock: calls.block,
  getBlockNumber: calls.height,
};
let selectedClient = client;
const web3 = reactive({ evmAddress: account, evmProviderNetwork: 1, evmProvider: { uuid: 'wallet-one' } });
vi.mock('@/stores/web3', () => ({ useWeb3Store: () => web3 }));
vi.mock('@/utils/ethers-util', () => ({ default: { getEthersInstance: () => selectedClient } }));
const scopes: ReturnType<typeof effectScope>[] = [];
const flush = async () => {
  for (let i = 0; i < 40; i++) await Promise.resolve();
  await nextTick();
};
const read = (current = () => true) => readGetTsConversionProgress(client, hash, account, current);

describe('Get TS conversion receipt output', () => {
  it('returns exact net canonical DAI from this receipt, excluding outgoing and self transfers', () => {
    expect(GET_TS_TRANSFER_TOPIC).toBe(id('Transfer(address,address,uint256)'));
    const logs = [
      transfer(1234567890123456789n),
      transfer(10n, account, other, 1),
      transfer(900n, account, account, 2),
      { ...transfer(999999999999999999n, other, account, 3), address: other },
      transfer(400n, other, gateway, 4),
    ];
    expect(getTsConversionReceiptAmount(receipt(logs), account)).toBe('1.234567890123456779');
    expect(getTsConversionReceiptAmount(receipt([transfer(1n)]), account)).toBe('0.000000000000000001');
    expect(getTsConversionReceiptAmount(receipt([transfer(1n)]), account.toUpperCase().replace('0X', '0x'))).toBe(
      '0.000000000000000001'
    );
  });
  it('requires positive net output and rejects sums beyond uint256', () => {
    expect(getTsConversionReceiptAmount(receipt([]), account)).toBeNull();
    expect(getTsConversionReceiptAmount(receipt([transfer(0n)]), account)).toBeNull();
    expect(getTsConversionReceiptAmount(receipt([transfer(1n, account, other)]), account)).toBeNull();
    expect(
      getTsConversionReceiptAmount(receipt([transfer((1n << 256n) - 1n), transfer(1n, other, account, 1)]), account)
    ).toBeNull();
  });
  it('rejects duplicated, foreign, removed or malformed logs instead of overcounting funds', () => {
    const valid = transfer(1n);
    for (const patch of [
      { transactionHash: block },
      { blockHash: hash },
      { blockNumber: 99 },
      { index: -1 },
      { index: 0.5 },
      { removed: true },
      { address: 'DAI' },
      { topics: [GET_TS_TRANSFER_TOPIC, topic(other)] },
      { topics: [GET_TS_TRANSFER_TOPIC, `0x1${'0'.repeat(63)}`, topic(account)] },
      { topics: [GET_TS_TRANSFER_TOPIC, topic(other), topic(account), topic(other)] },
      { data: '0x1' },
      { data: '0xzz' },
      { data: `0x${'00'.repeat(4097)}` },
    ])
      expect(getTsConversionReceiptAmount(receipt([{ ...valid, ...patch }]), account)).toBeNull();
    expect(getTsConversionReceiptAmount(receipt([valid, valid]), account)).toBeNull();
    expect(
      getTsConversionReceiptAmount(
        receipt(Array.from({ length: 2049 }, (_, i) => transfer(1n, other, account, i))),
        account
      )
    ).toBeNull();
    expect(getTsConversionReceiptAmount({ ...receipt(), status: 0 }, account)).toBeNull();
    expect(getTsConversionReceiptAmount(receipt(), 'wrong')).toBeNull();
  });
});

describe('Get TS verified Ethereum conversion progress', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useGetTsPlan().clearPlan();
    useGetTsPlan('xor').clearPlan();
    selectedClient = client;
    web3.evmAddress = account;
    web3.evmProviderNetwork = 1;
    web3.evmProvider = { uuid: 'wallet-one' };
    calls.network.mockResolvedValue({ chainId: 1n });
    calls.send.mockImplementation(async (method: string) => (method === 'eth_accounts' ? [account] : '0x1'));
    calls.transaction.mockResolvedValue(transaction());
    calls.receipt.mockResolvedValue(receipt());
    calls.block.mockResolvedValue({ hash: block, number: 100 });
    calls.height.mockResolvedValue(100);
  });
  afterEach(() => {
    scopes.splice(0).forEach((scope) => scope.stop());
    vi.useRealTimers();
  });
  it('verifies sender, destination, canonical inclusion and exact receipt output at one confirmation', async () => {
    expect(await read()).toEqual({
      state: 'received',
      reference: hash,
      amount: '1.234567890123456789',
      blockHash: block,
      blockNumber: 100,
    });
    expect(calls.block).toHaveBeenCalledWith(100);
    expect(calls.send).toHaveBeenCalledTimes(4);
    expect(await readGetTsConversionProgress(client, '', account, () => true)).toEqual({ state: 'idle' });
  });
  it('keeps unknown and unmined submitted hashes pending without inferring receipt from balances', async () => {
    calls.receipt.mockResolvedValue(null);
    expect((await read()).state).toBe('pending');
    calls.transaction.mockResolvedValue(null);
    expect((await read()).state).toBe('pending');
    calls.receipt.mockResolvedValue(receipt());
    expect((await read()).state).toBe('unavailable');
  });
  it('rejects wrong chain, account, hash, gateway or receipt identity', async () => {
    calls.network.mockResolvedValueOnce({ chainId: 10n });
    expect((await read()).state).toBe('unavailable');
    calls.send.mockResolvedValueOnce('0xa');
    expect((await read()).state).toBe('unavailable');
    calls.send.mockImplementationOnce(async () => '0x1').mockResolvedValueOnce([other]);
    expect((await read()).state).toBe('unavailable');
    for (const patch of [
      { hash: block },
      { from: other },
      { to: other },
      { chainId: 56n },
      { blockHash: hash },
      { blockNumber: 99 },
    ]) {
      calls.transaction.mockResolvedValueOnce({ ...transaction(), ...patch });
      expect((await read()).state).toBe('unavailable');
    }
    for (const patch of [
      { hash: block },
      { from: other },
      { to: other },
      { blockHash: hash },
      { blockNumber: 99 },
      { status: null },
    ]) {
      calls.receipt.mockResolvedValueOnce({ ...receipt(), ...patch });
      expect((await read()).state).toBe('unavailable');
    }
  });
  it('does not accept noncanonical/unconfirmed data and recognizes a canonical failed receipt', async () => {
    calls.block.mockResolvedValueOnce({ hash, number: 100 });
    expect((await read()).state).toBe('unavailable');
    calls.block.mockResolvedValueOnce({ hash: block, number: 101 });
    expect((await read()).state).toBe('unavailable');
    calls.height.mockResolvedValueOnce(99);
    expect((await read()).state).toBe('pending');
    calls.receipt.mockResolvedValueOnce({ ...receipt([]), status: 0 });
    expect((await read()).state).toBe('failed');
    calls.receipt.mockResolvedValueOnce(receipt([]));
    expect((await read()).state).toBe('unavailable');
  });
  it('discards late responses after context changes and rejects account changes during provider reads', async () => {
    let current = true;
    calls.block.mockImplementationOnce(async () => {
      current = false;
      return { hash: block, number: 100 };
    });
    expect((await read(() => current)).state).toBe('unavailable');
    let accountsCalls = 0;
    calls.send.mockImplementation(async (method: string) =>
      method === 'eth_accounts' ? [++accountsCalls === 1 ? account : other] : '0x1'
    );
    expect((await read()).state).toBe('unavailable');
    calls.transaction.mockRejectedValueOnce(new Error('RPC unavailable'));
    expect((await read()).state).toBe('unavailable');
  });
  it('bounds a stalled provider request without turning missing evidence into failure or success', async () => {
    vi.useFakeTimers();
    calls.transaction.mockImplementationOnce(() => new Promise(() => {}));
    const result = read();
    await flush();
    await vi.advanceTimersByTimeAsync(GET_TS_CONVERSION_PROGRESS_TIMEOUT_MS);
    expect((await result).state).toBe('unavailable');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('restores a submitted reference and verifies its output without storing trusted success or account fields', async () => {
    useGetTsPlan().trackTransaction('conversion', hash);
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsConversionProgress())!;
    await flush();
    expect(view.progress.value).toMatchObject({ state: 'received', amount: '1.234567890123456789' });
    expect(useGetTsPlan().plan.value.references.conversion).toBe(hash);
    expect(useGetTsPlan().plan.value).not.toHaveProperty('completed');
    expect(useGetTsPlan().plan.value).not.toHaveProperty('address');
    web3.evmAddress = other;
    expect(view.progress.value.state).toBe('unavailable');
    await flush();
    expect(view.progress.value.state).toBe('unavailable');
    web3.evmAddress = account;
    await flush();
    expect(view.progress.value.state).toBe('received');
    web3.evmProviderNetwork = 10;
    expect(view.progress.value.state).toBe('unavailable');
    useGetTsPlan().clearPlan();
    expect(view.progress.value.state).toBe('idle');
  });
  it('captures exact submitted request evidence independently of the signing panel while receipt polling continues', async () => {
    window.sessionStorage.removeItem(GET_TS_CONVERSION_FINGERPRINT_KEYS.xor);
    calls.transaction.mockResolvedValue({ ...transaction(), nonce: 2, data: '0x1234567890abcdef', value: 100n });
    useGetTsPlan('xor').trackTransaction('conversion', hash);
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsConversionProgress('xor'))!;
    await flush();
    expect(view.progress.value.state).toBe('received');
    const saved = JSON.parse(window.sessionStorage.getItem(GET_TS_CONVERSION_FINGERPRINT_KEYS.xor)!);
    expect(saved).toMatchObject({ version: 1, originalHash: hash });
    expect(saved.requestDigest).toMatch(/^0x[0-9a-f]{64}$/);
    expect(Object.keys(saved).sort()).toEqual(['originalHash', 'requestDigest', 'version']);
  });
  it('polls pending references and stops reads on scope disposal', async () => {
    vi.useFakeTimers();
    calls.receipt.mockResolvedValue(null);
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsConversionProgress())!;
    await flush();
    expect(calls.transaction).not.toHaveBeenCalled();
    useGetTsPlan().trackTransaction('conversion', hash);
    await flush();
    expect(view.progress.value.state).toBe('pending');
    calls.receipt.mockResolvedValue(receipt());
    await vi.advanceTimersByTimeAsync(10_000);
    await flush();
    expect(view.progress.value.state).toBe('received');
    scope.stop();
    const count = calls.transaction.mock.calls.length;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls.transaction).toHaveBeenCalledTimes(count);
  });
  it('cannot publish a delayed result from a replaced provider', async () => {
    let resolve!: (value: GetTsConversionReceipt) => void;
    calls.receipt.mockImplementationOnce(
      () =>
        new Promise<GetTsConversionReceipt>((done) => {
          resolve = done;
        })
    );
    useGetTsPlan().trackTransaction('conversion', hash);
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsConversionProgress())!;
    await flush();
    selectedClient = { ...client };
    resolve(receipt());
    await flush();
    expect(view.progress.value.state).toBe('unavailable');
    expect(view.refreshing.value).toBe(false);
  });
  it('observes only the selected purpose and discards receipt status when it changes', async () => {
    useGetTsPlan('xor').trackTransaction('conversion', hash);
    const purpose = ref<'xor' | 'ts'>('xor');
    const scope = effectScope();
    scopes.push(scope);
    const view = scope.run(() => useGetTsConversionProgress(purpose))!;
    await flush();
    expect(view.progress.value.state).toBe('received');
    purpose.value = 'ts';
    expect(view.progress.value.state).toBe('idle');
    await flush();
    expect(view.progress.value.state).toBe('idle');
  });
});
