// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { blake2AsHex, encodeAddress } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import {
  goalSignedEnvelopeDigest,
  readGoalFinalizedReceipt,
  type GoalReceiptClient,
  type GoalReceiptEvent,
} from '@/features/bot-trading/goal-receipt';
import { GOAL_EXECUTION_PROTOCOL, type GoalExecutionOrder } from '@/features/bot-trading/goal-execution-types';
import {
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  GOAL_EXACT_POLICY,
} from '@/features/bot-trading/goal-exact-ledger';

vi.unmock('@polkadot/util-crypto');
const hash = (character: string) => `0x${character.repeat(64)}`;
const hex = (value: string) => ({ toHex: () => value });
const account = encodeAddress(new Uint8Array(32).fill(1), 69);
const other = encodeAddress(new Uint8Array(32).fill(2), 69);
const event = (section: string, method: string, data: unknown[], index = 1) =>
  ({
    phase: { isApplyExtrinsic: true, asApplyExtrinsic: { toNumber: () => index } },
    event: { section, method, data },
  }) satisfies GoalReceiptEvent;

/** Invented SDK-decoded records; no wallet, real signature, chain, market data or submission. */
function harness() {
  const bytes = '0x01020304';
  const txHash = blake2AsHex(hexToU8a(bytes), 256);
  const candidate = hash('b');
  const head = hash('c');
  let time = 1000;
  let current = true;
  let finalizedHeight = 105;
  const listeners = new Map<string, Set<() => void>>();
  const order = {
    id: 'order-one',
    botId: 'bot-one',
    account,
    network: GOAL_EXACT_POLICY.genesisHash,
    intentId: 'prepared-intent',
    status: 'submitted',
    inputAsset: KUSD,
    outputAsset: XOR,
    inputCodec: '2500000000000000000',
    minOutputCodec: '200',
    feeAsset: XOR,
    feeCodec: '10',
    createdAt: 1000,
    txHash,
    signedAtBlock: 98,
    goalExecution: {
      protocol: GOAL_EXECUTION_PROTOCOL,
      execution: { protocol: 'finalized-xyk-native-fee-v1', expectedDenominator: '1' },
      goalId: 'goal-one',
      consentDigest: 'a'.repeat(64),
      qualificationDigest: 'b'.repeat(64),
      policyDigest: 'c'.repeat(64),
      ledgerRevision: 1,
      ledgerStateSha256: 'd'.repeat(64),
      quoteDigest: 'e'.repeat(64),
      envelopeDigest: 'f'.repeat(64),
      feePolicyDigest: '0'.repeat(64),
      orderRevision: 2,
      phase: 'submitted',
      signedEnvelopeDigest: goalSignedEnvelopeDigest(bytes),
    },
  } satisfies GoalExecutionOrder;
  const records = [
    event('system', 'ExtrinsicSuccess', [], 0),
    event('xorFee', 'FeeWithdrawn', [account, XOR, '11']),
    event('liquidityProxy', 'Exchange', [account, '0', KUSD, XOR, order.inputCodec, '190']),
    event('system', 'ExtrinsicSuccess', []),
  ];
  const targetHeader = { hash: hex(candidate), number: { toNumber: () => 100 } };
  const target = { hash: hex(txHash), toHex: () => bytes, isSigned: true, signer: { toString: () => account } };
  const block = {
    header: targetHeader,
    extrinsics: [
      { hash: hex(hash('d')), toHex: () => '0x00', isSigned: false, signer: { toString: () => other } },
      target,
    ],
  };
  const client = {
    isConnected: true,
    genesisHash: hex(GOAL_EXACT_POLICY.genesisHash),
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
        getFinalizedHead: vi.fn(async () => hex(head)),
        getHeader: vi.fn(async (value: string) =>
          value === head ? { hash: hex(head), number: { toNumber: () => finalizedHeight } } : targetHeader
        ),
        getBlockHash: vi.fn(async (height: number) => hex(height === finalizedHeight ? head : candidate)),
        getBlock: vi.fn(async (_hash: string) => ({ block })),
      },
    },
    at: vi.fn(async (_hash: string) => ({ query: { system: { events: vi.fn(async () => records) } } })),
  } satisfies GoalReceiptClient;
  return {
    client,
    order,
    records,
    block,
    target,
    targetHeader,
    bytes,
    txHash,
    candidate,
    head,
    listeners,
    setTime: (next: number) => {
      time = next;
    },
    setCurrent: (next: boolean) => {
      current = next;
    },
    setFinalizedHeight: (next: number) => {
      finalizedHeight = next;
    },
    read: (signal?: AbortSignal) =>
      readGoalFinalizedReceipt({
        client,
        order,
        blockHash: candidate,
        now: () => time,
        isCurrent: () => current,
        signal,
      }),
  };
}
afterEach(() => vi.useRealTimers());

describe('canonical finalized goal receipts', () => {
  it('binds the exact included bytes and records actual below-minimum proceeds and fee overruns', async () => {
    const h = harness();
    const result = await h.read();
    expect(result).toMatchObject({
      goalId: 'goal-one',
      orderId: 'order-one',
      account,
      network: GOAL_EXACT_POLICY.genesisHash,
      txHash: h.txHash,
      blockHash: h.candidate,
      blockNumber: 100,
      extrinsicIndex: 1,
      success: true,
      outputCodec: '190',
      actualFeeCodec: '11',
    });
    expect(result.evidenceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.isFrozen(result)).toBe(true);
    expect(h.client.rpc.chain.getBlockHash).toHaveBeenCalledWith(100);
    expect(h.client.at).toHaveBeenCalledWith(h.candidate);
    expect(h.client.off).toHaveBeenCalledTimes(2);
    expect([...h.listeners.values()].every((group) => group.size === 0)).toBe(true);
  });

  it('keeps the same receipt digest when a later finalized head proves the same inclusion again', async () => {
    const h = harness();
    const first = await h.read();
    h.setFinalizedHeight(200);
    expect(await h.read()).toEqual(first);
  });

  it('records a failed extrinsic native fee without inventing proceeds', async () => {
    const h = harness();
    h.records.splice(2, 2, event('system', 'ExtrinsicFailed', []));
    expect(await h.read()).toMatchObject({ success: false, outputCodec: '0', actualFeeCodec: '11' });
  });

  it('accepts the two-field native fee event and alternate SS58 prefixes for the same account', async () => {
    const h = harness();
    h.records[1] = event('xorFee', 'FeeWithdrawn', [encodeAddress(new Uint8Array(32).fill(1), 42), '11']);
    expect(await h.read()).toMatchObject({ actualFeeCodec: '11' });
  });

  it.each<[string, (h: ReturnType<typeof harness>) => void]>([
    ['unfinalized height', (h) => h.setFinalizedHeight(99)],
    [
      'contradictory finalized hash at the same height',
      (h) => {
        h.setFinalizedHeight(100);
        h.client.rpc.chain.getBlockHash.mockResolvedValue(hex(h.candidate));
      },
    ],
    [
      'zero block height',
      (h) => {
        h.targetHeader.number = { toNumber: () => 0 };
      },
    ],
    ['noncanonical hash', (h) => h.client.rpc.chain.getBlockHash.mockResolvedValue(hex(hash('e')))],
    [
      'wrong returned header',
      (h) => {
        h.targetHeader.hash = hex(hash('e'));
      },
    ],
    [
      'wrong block header height',
      (h) => {
        h.block.header = { hash: hex(h.candidate), number: { toNumber: () => 101 } };
      },
    ],
    [
      'missing transaction',
      (h) => {
        h.block.extrinsics.splice(1);
      },
    ],
    [
      'duplicate transaction hash',
      (h) => {
        h.block.extrinsics.push(h.target);
      },
    ],
    [
      'unsigned transaction',
      (h) => {
        h.target.isSigned = false;
      },
    ],
    [
      'different signer',
      (h) => {
        h.target.signer = { toString: () => other };
      },
    ],
    [
      'changed exact bytes',
      (h) => {
        h.target.toHex = () => '0x01020305';
      },
    ],
    [
      'wrong stored envelope digest',
      (h) => {
        h.order.goalExecution.signedEnvelopeDigest = '0'.repeat(64);
      },
    ],
    [
      'wrong DEX',
      (h) => {
        h.records[2].event.data[1] = '1';
      },
    ],
    [
      'wrong input amount',
      (h) => {
        h.records[2].event.data[4] = '1';
      },
    ],
    [
      'wrong input asset',
      (h) => {
        h.records[2].event.data[2] = XOR;
      },
    ],
    [
      'wrong fee payer',
      (h) => {
        h.records[1].event.data[0] = other;
      },
    ],
    [
      'wrong fee asset',
      (h) => {
        h.records[1].event.data[1] = KUSD;
      },
    ],
    [
      'duplicate fee',
      (h) => {
        h.records.push(h.records[1]);
      },
    ],
    [
      'missing fee',
      (h) => {
        h.records.splice(1, 1);
      },
    ],
    [
      'missing swap',
      (h) => {
        h.records.splice(2, 1);
      },
    ],
    [
      'duplicate success',
      (h) => {
        h.records.push(event('system', 'ExtrinsicSuccess', []));
      },
    ],
    [
      'conflicting result',
      (h) => {
        h.records.push(event('system', 'ExtrinsicFailed', []));
      },
    ],
    [
      'failed swap with success effects',
      (h) => {
        h.records[3] = event('system', 'ExtrinsicFailed', []);
      },
    ],
    [
      'overflowing actual fee',
      (h) => {
        h.records[1].event.data[2] = (1n << 128n).toString();
      },
    ],
    [
      'noninteger proceeds',
      (h) => {
        h.records[2].event.data[5] = '1.2';
      },
    ],
  ])('rejects %s', async (_name, mutate) => {
    const h = harness();
    mutate(h);
    await expect(h.read()).rejects.toMatchObject({ name: 'GoalReceiptError', reason: 'invalid' });
  });

  it('copies the order before awaits so mutation cannot redirect the receipt', async () => {
    const h = harness();
    h.client.rpc.chain.getFinalizedHead.mockImplementation(async () => {
      h.order.inputCodec = '1';
      h.order.goalExecution.goalId = 'changed';
      h.order.id = 'changed';
      return hex(h.head);
    });
    expect(await h.read()).toMatchObject({ goalId: 'goal-one', orderId: 'order-one', outputCodec: '190' });
  });

  it('rejects request accessors without invoking them', async () => {
    const h = harness();
    const getter = vi.fn(() => h.txHash);
    Object.defineProperty(h.order, 'txHash', { get: getter, enumerable: true });
    await expect(h.read()).rejects.toMatchObject({ reason: 'invalid' });
    expect(getter).not.toHaveBeenCalled();
    expect(h.client.rpc.chain.getFinalizedHead).not.toHaveBeenCalled();
  });

  it.each(['client', 'runtime', 'metadata', 'genesis'] as const)(
    'rejects changed %s after an SDK await',
    async (kind) => {
      const h = harness();
      h.client.rpc.chain.getFinalizedHead.mockImplementation(async () => {
        if (kind === 'client') h.setCurrent(false);
        if (kind === 'runtime') h.client.runtimeVersion = hex('0x0100');
        if (kind === 'metadata') h.client.runtimeMetadata = {};
        if (kind === 'genesis') h.client.genesisHash = hex(hash('f'));
        return hex(h.head);
      });
      await expect(h.read()).rejects.toMatchObject({ reason: 'context-changed' });
      expect(h.client.rpc.chain.getHeader).not.toHaveBeenCalled();
    }
  );

  it('permanently revokes on a disconnect/reconnect ABA and ignores the late result', async () => {
    const h = harness();
    let finish!: (value: ReturnType<typeof hex>) => void;
    h.client.rpc.chain.getFinalizedHead.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = h.read();
    const rejected = expect(pending).rejects.toMatchObject({ reason: 'context-changed' });
    for (const listener of h.listeners.get('disconnected')!) listener();
    for (const listener of h.listeners.get('connected')!) listener();
    await rejected;
    finish(hex(h.head));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.client.rpc.chain.getHeader).not.toHaveBeenCalled();
    expect(h.client.off).toHaveBeenCalledTimes(2);
  });

  it('bounds a hanging SDK read with a total deadline and ignores late completion', async () => {
    vi.useFakeTimers();
    const h = harness();
    let finish!: (value: ReturnType<typeof hex>) => void;
    h.client.rpc.chain.getFinalizedHead.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = expect(h.read()).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(30_000);
    await pending;
    finish(hex(h.head));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.client.rpc.chain.getHeader).not.toHaveBeenCalled();
    expect(h.client.off).toHaveBeenCalledTimes(2);
  });

  it('rejects an elapsed deadline even when timers have not fired', async () => {
    const h = harness();
    h.client.rpc.chain.getFinalizedHead.mockImplementation(async () => {
      h.setTime(31_000);
      return hex(h.head);
    });
    await expect(h.read()).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('supports immediate and pending abort without subsequent reads', async () => {
    const h = harness();
    const initial = new AbortController();
    initial.abort();
    await expect(h.read(initial.signal)).rejects.toMatchObject({ reason: 'aborted' });
    expect(h.client.rpc.chain.getFinalizedHead).not.toHaveBeenCalled();
    const pendingController = new AbortController();
    h.client.rpc.chain.getFinalizedHead.mockImplementation(() => new Promise(() => undefined));
    const pending = expect(h.read(pendingController.signal)).rejects.toMatchObject({ reason: 'aborted' });
    pendingController.abort();
    await pending;
    expect(h.client.rpc.chain.getHeader).not.toHaveBeenCalled();
  });

  it('does not expose SDK error text, including failures during initial identity reads', async () => {
    const h = harness();
    h.client.runtimeVersion.toHex = () => {
      throw Error('provider-secret-not-for-diagnostics');
    };
    await expect(h.read()).rejects.toEqual(expect.objectContaining({ message: 'Goal receipt unavailable' }));
  });

  it('hashes normalized exact bytes and rejects malformed or oversized envelopes', () => {
    expect(goalSignedEnvelopeDigest('0xABCD')).toBe(goalSignedEnvelopeDigest('0xabcd'));
    for (const bad of ['0x', 'abc', '0x1', '0xzz', `0x${'00'.repeat(4097)}`])
      expect(() => goalSignedEnvelopeDigest(bad)).toThrow('Goal receipt invalid');
  });
});
