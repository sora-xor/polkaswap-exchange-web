// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { blake2AsHex, encodeAddress } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import { discoverGoalFinalizedReceipt, GOAL_RECOVERY_LIMITS } from '@/features/bot-trading/goal-recovery';
import {
  goalSignedEnvelopeDigest,
  type GoalReceiptClient,
  type GoalReceiptEvent,
} from '@/features/bot-trading/goal-receipt';
import { goalStorageOrder, goalTestHash } from './goal-storage-fixtures';

vi.unmock('@polkadot/util-crypto');
const hex = (value: string) => ({ toHex: () => value });
const owner = encodeAddress(new Uint8Array(32).fill(1), 69);
const other = encodeAddress(new Uint8Array(32).fill(2), 69);
const bytes = '0x01020304';
const txHash = blake2AsHex(hexToU8a(bytes), 256);
const target = () => ({ hash: hex(txHash), toHex: () => bytes, isSigned: true, signer: { toString: () => owner } });
const header = (height: number) => ({ hash: hex(goalTestHash(height)), number: { toNumber: () => height } });
const event = (section: string, method: string, data: unknown[]): GoalReceiptEvent => ({
  phase: { isApplyExtrinsic: true, asApplyExtrinsic: { toNumber: () => 0 } },
  event: { section, method, data },
});

/** Synthetic public SDK replies, using the actual discovery and receipt parsers; no network or signature. */
function setup(height = 200) {
  const order = goalStorageOrder();
  Object.assign(order, { account: owner, status: 'submitted', txHash, signedAtBlock: 1 });
  Object.assign(order.goalExecution, {
    phase: 'submitted',
    orderRevision: 2,
    signedEnvelopeDigest: goalSignedEnvelopeDigest(bytes),
  });
  const blocks = new Map<number, ReturnType<typeof target>[]>();
  blocks.set(height - 2, [target()]);
  let time = 1000;
  let current = true;
  const listeners = new Map<string, Set<() => void>>();
  const records = [
    event('xorFee', 'FeeWithdrawn', [owner, order.feeAsset, '11']),
    event('liquidityProxy', 'Exchange', [owner, '0', order.inputAsset, order.outputAsset, order.inputCodec, '190']),
    event('system', 'ExtrinsicSuccess', []),
  ];
  const client = {
    isConnected: true,
    genesisHash: hex(order.network),
    runtimeVersion: hex('0x0100'),
    runtimeMetadata: {},
    on: vi.fn((key: string, listener: () => void) => {
      const group = listeners.get(key) ?? new Set();
      group.add(listener);
      listeners.set(key, group);
    }),
    off: vi.fn((key: string, listener: () => void) => listeners.get(key)?.delete(listener)),
    rpc: {
      chain: {
        getFinalizedHead: vi.fn(async () => hex(goalTestHash(height))),
        getHeader: vi.fn(async (hash: string) => header(Number(BigInt(hash)))),
        getBlockHash: vi.fn(async (number: number) => hex(goalTestHash(number))),
        getBlock: vi.fn(async (hash: string) => {
          const number = Number(BigInt(hash));
          return { block: { header: header(number), extrinsics: blocks.get(number) ?? [] } };
        }),
      },
    },
    at: vi.fn(async () => ({ query: { system: { events: vi.fn(async () => records) } } })),
  } satisfies GoalReceiptClient;
  return {
    client,
    order,
    blocks,
    records,
    listeners,
    setTime: (value: number) => {
      time = value;
    },
    setCurrent: (value: boolean) => {
      current = value;
    },
    discover: (signal?: AbortSignal) =>
      discoverGoalFinalizedReceipt({ client, order, signal, now: () => time, isCurrent: () => current }),
  };
}
afterEach(() => vi.useRealTimers());

describe('bounded canonical goal inclusion discovery', () => {
  it('discovers exact finalized inclusion and independently parses its actual output and fee', async () => {
    const h = setup();
    expect(await h.discover()).toMatchObject({
      status: 'included',
      receipt: { txHash, blockNumber: 198, success: true, outputCodec: '190', actualFeeCodec: '11' },
    });
    expect(h.client.rpc.chain.getBlock).toHaveBeenCalledTimes(4);
    expect(h.client.at).toHaveBeenCalledWith(goalTestHash(198));
    expect([...h.listeners.values()].every((set) => set.size === 0)).toBe(true);
  });
  it('returns a bounded miss without declaring expiry even for an old signedAtBlock', async () => {
    const h = setup();
    h.blocks.clear();
    h.blocks.set(72, [target()]);
    expect(await h.discover()).toEqual({
      status: 'not-found',
      finalizedBlockHash: goalTestHash(200),
      firstScannedBlock: 73,
      lastScannedBlock: 200,
      scannedBlocks: 128,
      expiryProven: false,
    });
    expect(h.client.rpc.chain.getBlock).toHaveBeenCalledTimes(128);
    expect(h.client.at).not.toHaveBeenCalled();
    expect(h.order.status).toBe('submitted');
  });
  it('includes the oldest block within its fixed search window', async () => {
    const h = setup();
    h.blocks.clear();
    h.blocks.set(73, [target()]);
    expect(await h.discover()).toMatchObject({ status: 'included', receipt: { blockNumber: 73 } });
  });
  it('never scans genesis or unfinalized heights', async () => {
    const h = setup(3);
    h.blocks.clear();
    expect(await h.discover()).toMatchObject({
      status: 'not-found',
      firstScannedBlock: 1,
      lastScannedBlock: 3,
      scannedBlocks: 3,
    });
    expect(h.client.rpc.chain.getBlockHash.mock.calls.map(([number]) => number)).toEqual([3, 2, 1]);
  });
  it('rejects a noncanonical finalized head', async () => {
    const h = setup();
    h.client.rpc.chain.getBlockHash.mockResolvedValueOnce(hex(goalTestHash(999)));
    await expect(h.discover()).rejects.toMatchObject({ reason: 'invalid' });
    expect(h.client.rpc.chain.getBlock).not.toHaveBeenCalled();
  });
  it('rejects a mismatched returned block header', async () => {
    const h = setup();
    h.client.rpc.chain.getBlock.mockResolvedValueOnce({ block: { header: header(199), extrinsics: [] } });
    await expect(h.discover()).rejects.toMatchObject({ reason: 'invalid' });
  });
  it.each(['bytes', 'owner', 'unsigned', 'duplicate'] as const)(
    'rejects an apparent hash match with %s disagreement',
    async (kind) => {
      const h = setup(),
        tx = target();
      if (kind === 'bytes') tx.toHex = () => '0x05060708';
      if (kind === 'owner') tx.signer.toString = () => other;
      if (kind === 'unsigned') tx.isSigned = false;
      h.blocks.set(200, kind === 'duplicate' ? [tx, tx] : [tx]);
      await expect(h.discover()).rejects.toMatchObject({ reason: 'invalid' });
      expect(h.client.at).not.toHaveBeenCalled();
    }
  );
  it('does not return inclusion when the actual receipt has unavailable events', async () => {
    const h = setup();
    h.records.length = 0;
    await expect(h.discover()).rejects.toMatchObject({ reason: 'invalid' });
  });
  it('leaves pruned or unavailable blocks unresolved', async () => {
    const h = setup();
    h.client.rpc.chain.getBlock.mockRejectedValueOnce(Error('pruned'));
    await expect(h.discover()).rejects.toMatchObject({ reason: 'unavailable' });
    expect(h.order.status).toBe('submitted');
  });
  it('rejects the aggregate extrinsic budget before iterating an oversized block', async () => {
    const h = setup();
    h.blocks.set(200, new Array(GOAL_RECOVERY_LIMITS.extrinsics + 1));
    await expect(h.discover()).rejects.toMatchObject({ reason: 'invalid' });
  });
  it('copies order identity before the first awaited read', async () => {
    const h = setup();
    h.client.rpc.chain.getFinalizedHead.mockImplementationOnce(async () => {
      h.order.txHash = goalTestHash(999);
      h.order.account = other;
      return hex(goalTestHash(200));
    });
    expect(await h.discover()).toMatchObject({ status: 'included', receipt: { txHash, account: owner } });
  });
  it('rejects a disconnect/reconnect ABA during a pending read', async () => {
    const h = setup();
    h.client.rpc.chain.getBlock.mockImplementationOnce(async () => {
      for (const listener of h.listeners.get('disconnected') ?? []) listener();
      return { block: { header: header(200), extrinsics: [] } };
    });
    await expect(h.discover()).rejects.toMatchObject({ reason: 'context-changed' });
    expect([...h.listeners.values()].every((set) => set.size === 0)).toBe(true);
  });
  it('times out a hung SDK read and removes owned listeners', async () => {
    vi.useFakeTimers();
    const h = setup();
    h.client.rpc.chain.getFinalizedHead.mockImplementation(() => new Promise(() => undefined));
    const result = expect(h.discover()).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(GOAL_RECOVERY_LIMITS.timeoutMs);
    await result;
    expect([...h.listeners.values()].every((set) => set.size === 0)).toBe(true);
  });
  it('aborts a hung SDK read without waiting for the transport', async () => {
    const h = setup(),
      abort = new AbortController();
    h.client.rpc.chain.getFinalizedHead.mockImplementation(() => new Promise(() => undefined));
    const result = expect(h.discover(abort.signal)).rejects.toMatchObject({ reason: 'aborted' });
    abort.abort();
    await result;
    expect(h.client.rpc.chain.getBlock).not.toHaveBeenCalled();
  });
  it('rejects an already aborted read before any RPC', async () => {
    const h = setup(),
      abort = new AbortController();
    abort.abort();
    await expect(h.discover(abort.signal)).rejects.toMatchObject({ reason: 'aborted' });
    expect(h.client.rpc.chain.getFinalizedHead).not.toHaveBeenCalled();
  });
  it('rejects changed client identity and backwards time', async () => {
    for (const kind of ['identity', 'clock']) {
      const h = setup();
      h.client.rpc.chain.getFinalizedHead.mockImplementationOnce(async () => {
        if (kind === 'identity') h.setCurrent(false);
        else h.setTime(999);
        return hex(goalTestHash(200));
      });
      await expect(h.discover()).rejects.toMatchObject({ reason: kind === 'identity' ? 'context-changed' : 'timeout' });
    }
  });
});
