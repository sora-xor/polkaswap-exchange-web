import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureGetTsConversionFingerprint,
  getTsConversionRequestDigest,
  GET_TS_CONVERSION_FINGERPRINT_KEYS,
  verifyGetTsConversionReplacement,
} from '@/features/misc/lib/getTsConversionRecovery';
import { GET_TS_ETHEREUM_DAI, GET_TS_TRANSFER_TOPIC } from '@/features/misc/lib/getTsConversionProgress';
import { TONSWAP_CONVERSION_CONTRACTS } from '@/features/misc/lib/tonswapConversion';
vi.unmock('@polkadot/util-crypto');

const original = `0x${'1'.repeat(64)}`;
const replacement = `0x${'2'.repeat(64)}`;
const blockHash = `0x${'3'.repeat(64)}`;
const account = `0x${'4'.repeat(40)}`;
const other = `0x${'5'.repeat(40)}`;
const transaction = (hash = original) => ({
  hash,
  from: account,
  to: TONSWAP_CONVERSION_CONTRACTS.gateway,
  chainId: 1n,
  nonce: 10,
  data: '0x1234567890abcdef',
  value: 100n,
  blockHash,
  blockNumber: 100,
});
const fixture = () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => entries.set(key, value)),
  };
  const client = {
    getNetwork: vi.fn(async () => ({ chainId: 1n })),
    send: vi.fn(async (method: string) => (method === 'eth_chainId' ? '0x1' : [account])),
    getTransaction: vi.fn(async (hash: string) => transaction(hash)),
    getTransactionReceipt: vi.fn(async (hash: string) => ({
      hash,
      from: account,
      to: TONSWAP_CONVERSION_CONTRACTS.gateway,
      blockHash,
      blockNumber: 100,
      status: 1,
      logs: [
        {
          address: GET_TS_ETHEREUM_DAI,
          topics: [
            GET_TS_TRANSFER_TOPIC,
            `0x${'0'.repeat(24)}${other.slice(2)}`,
            `0x${'0'.repeat(24)}${account.slice(2)}`,
          ],
          data: `0x${1230000000000000000n.toString(16).padStart(64, '0')}`,
          index: 0,
          transactionHash: hash,
          blockHash,
          blockNumber: 100,
        },
      ],
    })),
    getBlock: vi.fn(async () => ({ hash: blockHash, number: 100 })),
    getBlockNumber: vi.fn(async () => 100),
  };
  return {
    client,
    entries,
    storage,
    capture: () => captureGetTsConversionFingerprint(client, original, account, 'xor', () => true, storage),
    verify: () => verifyGetTsConversionReplacement(client, original, replacement, account, 'xor', () => true, storage),
  };
};
afterEach(() => vi.useRealTimers());
describe('explicit Ethereum conversion replacement recovery', () => {
  it('digests exact request identity without gas terms or transaction hash', () => {
    const expected = getTsConversionRequestDigest(transaction(), original, account);
    expect(expected).toMatch(/^0x[0-9a-f]{64}$/);
    expect(getTsConversionRequestDigest(transaction(replacement), replacement, account)).toBe(expected);
    for (const patch of [{ nonce: 11 }, { data: '0x1234567890abcdee' }, { value: 101n }]) {
      expect(getTsConversionRequestDigest({ ...transaction(), ...patch }, original, account)).not.toBe(expected);
    }
    for (const patch of [
      { nonce: -1 },
      { nonce: 1.1 },
      { data: '0xab' },
      { data: `0x${'ff'.repeat(32769)}` },
      { value: -1n },
      { value: 1n << 256n },
      { from: other },
      { to: other },
      { chainId: 2n },
      { hash: replacement },
    ])
      expect(getTsConversionRequestDigest({ ...transaction(), ...patch }, original, account)).toBeNull();
  });
  it('stores one bounded hash and digest only, independently for each purpose', async () => {
    const { capture, storage, entries, client } = fixture();
    expect(await capture()).toBe(true);
    const saved = JSON.parse(entries.get(GET_TS_CONVERSION_FINGERPRINT_KEYS.xor)!);
    expect(Object.keys(saved).sort()).toEqual(['originalHash', 'requestDigest', 'version']);
    expect(saved).toMatchObject({ originalHash: original, version: 1 });
    expect(JSON.stringify(saved)).not.toContain(account);
    expect(JSON.stringify(saved)).not.toContain(transaction().data);
    expect(entries.has(GET_TS_CONVERSION_FINGERPRINT_KEYS.ts)).toBe(false);
    expect(await captureGetTsConversionFingerprint(client, replacement, account, 'ts', () => true, storage)).toBe(true);
    expect(JSON.parse(entries.get(GET_TS_CONVERSION_FINGERPRINT_KEYS.xor)!).originalHash).toBe(original);
  });
  it('verifies a repriced request and exact canonical DAI receipt, never an unrelated same-nonce transaction', async () => {
    const { verify, client } = fixture();
    expect(await verify()).toMatchObject({ state: 'received', reference: replacement, amount: '1.23' });
    for (const patch of [
      { nonce: 11 },
      { data: '0x1234567800000000' },
      { value: 0n },
      { from: other },
      { to: account },
    ]) {
      client.getTransaction.mockImplementation(async (hash) => ({
        ...transaction(hash),
        ...(hash === replacement ? patch : {}),
      }));
      expect((await verify()).state).toBe('unavailable');
    }
  });
  it('uses the captured fingerprint if the original is evicted, without adopting another purpose or hash', async () => {
    const { capture, verify, client, storage } = fixture();
    await capture();
    client.getTransaction.mockImplementation(async (hash) => (hash === replacement ? transaction(hash) : null!));
    expect((await verify()).state).toBe('received');
    expect(
      (await verifyGetTsConversionReplacement(client, original, replacement, account, 'ts', () => true, storage)).state
    ).toBe('unavailable');
    expect(
      (await verifyGetTsConversionReplacement(client, blockHash, replacement, account, 'xor', () => true, storage))
        .state
    ).toBe('unavailable');
  });
  it('rejects corrupt storage, a queryable mismatched original and missing request evidence', async () => {
    const { verify, capture, client, entries } = fixture();
    await capture();
    client.getTransaction.mockImplementation(async (hash) => ({
      ...transaction(hash),
      ...(hash === original ? { from: other } : {}),
    }));
    expect((await verify()).state).toBe('unavailable');
    client.getTransaction.mockImplementation(async (hash) => (hash === original ? null! : transaction(hash)));
    for (const raw of [
      '{}',
      '{',
      'x'.repeat(513),
      JSON.stringify({ version: 1, originalHash: original, requestDigest: blockHash, status: 'received' }),
    ]) {
      entries.set(GET_TS_CONVERSION_FINGERPRINT_KEYS.xor, raw);
      expect((await verify()).state).toBe('unavailable');
    }
  });
  it('retains pending and verified failure states but rejects noncanonical receipt output', async () => {
    const { verify, client } = fixture();
    client.getTransactionReceipt.mockResolvedValueOnce(null!);
    expect((await verify()).state).toBe('pending');
    client.getTransactionReceipt.mockResolvedValueOnce({
      hash: replacement,
      from: account,
      to: transaction().to,
      blockHash,
      blockNumber: 100,
      status: 0,
      logs: [],
    });
    expect((await verify()).state).toBe('failed');
    client.getBlock.mockResolvedValueOnce({ hash: original, number: 100 });
    expect((await verify()).state).toBe('unavailable');
  });
  it('fails closed after wallet/context changes and when storage is denied', async () => {
    const { client, storage, capture, verify } = fixture();
    client.send.mockImplementation(async (method) => (method === 'eth_chainId' ? '0x2' : [account]));
    expect(await capture()).toBe(false);
    expect((await verify()).state).toBe('unavailable');
    client.send.mockImplementation(async (method) => (method === 'eth_chainId' ? '0x1' : [account]));
    let current = true;
    client.getTransaction.mockImplementationOnce(async (hash) => {
      current = false;
      return transaction(hash);
    });
    expect(await captureGetTsConversionFingerprint(client, original, account, 'xor', () => current, storage)).toBe(
      false
    );
    expect(storage.setItem).not.toHaveBeenCalled();
    storage.setItem.mockImplementation(() => {
      throw new Error('denied');
    });
    expect(await capture()).toBe(false);
  });
  it('bounds slow provider reads and never persists their late result', async () => {
    vi.useFakeTimers();
    const { client, storage, capture } = fixture();
    let finish!: (value: ReturnType<typeof transaction>) => void;
    client.getTransaction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = capture();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await pending).toBe(false);
    finish(transaction());
    await Promise.resolve();
    await Promise.resolve();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('rejects unchanged/invalid hashes before requesting a wallet RPC', async () => {
    const { client, storage } = fixture();
    expect(
      (await verifyGetTsConversionReplacement(client, original, original, account, 'xor', () => true, storage)).state
    ).toBe('unavailable');
    expect(await captureGetTsConversionFingerprint(client, 'bad', account, 'xor', () => true, storage)).toBe(false);
    expect(client.getNetwork).not.toHaveBeenCalled();
  });
});
