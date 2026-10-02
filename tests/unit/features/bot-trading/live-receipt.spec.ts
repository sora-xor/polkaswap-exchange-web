import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hexToU8a } from '@polkadot/util';
import { blake2AsHex, encodeAddress } from '@polkadot/util-crypto';
import { createBotLiveDependencies, type BotChainEvent } from '@/features/bot-trading/live';
import type { BotOrder } from '@/features/bot-trading/types';
import type { BotStorage } from '@/features/bot-trading/storage';
import type { PolkaswapAgentApi } from '@/features/agent-trading/types';
import { XOR } from '@/lib/substrate/sdk/assets/consts';

const wallet = vi.hoisted(() => ({ api: null as unknown }));
// Override the concrete wallet module as allowed by tests/README.md; no wallet is constructed.
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: wallet, connection: {} }));
vi.unmock('@polkadot/util-crypto');

const account = encodeAddress(new Uint8Array(32).fill(1), 69);
const otherAccount = encodeAddress(new Uint8Array(32).fill(2), 69);
const kusd = `0x02000c${'0'.repeat(58)}`;
const network = `0x${'d'.repeat(64)}`;
const hex = (value: string) => ({ toHex: () => value });
const blockHash = (height: number) => `0x${height.toString(16).padStart(64, '0')}`;
const valueHex = (value: string | ReturnType<typeof hex>) => (typeof value === 'string' ? value : value.toHex());
const envelopeDigest = (bytes: string) => createHash('sha256').update(hexToU8a(bytes)).digest('hex');

afterEach(() => vi.useRealTimers());

/** Invented SDK-decoded block data: no keys, real signatures, network, market history or submission. */
function harness() {
  const bytes = '0x010203040506';
  const txHash = blake2AsHex(hexToU8a(bytes), 256);
  const inclusion = blockHash(100);
  const head = blockHash(105);
  let finalizedHeight = 105;
  const order: BotOrder = {
    id: 'receipt-order',
    botId: 'receipt-bot',
    account,
    network,
    intentId: 'reviewed-swap',
    status: 'submitted',
    inputAsset: kusd,
    inputCodec: '2000000000000000000',
    outputAsset: XOR.address,
    minOutputCodec: '210000000000000000',
    feeAsset: XOR.address,
    feeCodec: '100000000000000000',
    createdAt: 1,
    signedAtBlock: 98,
    txHash,
    signedEnvelopeDigest: envelopeDigest(bytes),
    signedCallHex: '0x123456',
  };
  const transaction = {
    hash: hex(txHash),
    isSigned: true,
    signer: { toString: () => account },
    method: hex(order.signedCallHex!),
    toHex: () => bytes,
  };
  const unrelated = { ...transaction, hash: hex(`0x${'f'.repeat(64)}`) };
  const header = { hash: hex(inclusion), number: { toNumber: () => 100 } };
  const block = { header, extrinsics: [unrelated, transaction] };
  const event = (section: string, method: string, data: unknown[], index = 1): BotChainEvent => ({
    phase: { isApplyExtrinsic: true, asApplyExtrinsic: { toNumber: () => index } },
    event: { section, method, data },
  });
  const records: BotChainEvent[] = [
    event('xorFee', 'FeeWithdrawn', [otherAccount, XOR.address, '999'], 0),
    event('liquidityProxy', 'Exchange', [otherAccount, '0', XOR.address, kusd, '999', '999'], 0),
    event('system', 'ExtrinsicSuccess', [], 0),
    event('xorFee', 'FeeWithdrawn', [account, XOR.address, '91000000000000000']),
    event('liquidityProxy', 'Exchange', [account, '0', kusd, XOR.address, order.inputCodec, '230000000000000000']),
    event('system', 'ExtrinsicSuccess', []),
  ];
  const events = vi.fn(async () => records);
  const client = {
    isConnected: true,
    genesisHash: hex(network),
    rpc: {
      chain: {
        getFinalizedHead: vi.fn(async () => hex(head)),
        getHeader: vi.fn(async (hash: string | ReturnType<typeof hex>) =>
          valueHex(hash) === head ? { hash: hex(head), number: { toNumber: () => finalizedHeight } } : header
        ),
        getBlockHash: vi.fn(async (height: number) => hex(blockHash(height))),
        getBlock: vi.fn(async (hash: ReturnType<typeof hex>) => ({
          block:
            hash.toHex() === inclusion
              ? block
              : {
                  header: { hash, number: { toNumber: () => Number.parseInt(hash.toHex().slice(2), 16) } },
                  extrinsics: [],
                },
        })),
      },
    },
    at: vi.fn(async (_hash: ReturnType<typeof hex>) => ({ query: { system: { events } } })),
  };
  wallet.api = client;
  const receipt = createBotLiveDependencies({} as BotStorage, {} as PolkaswapAgentApi).receipt;
  return {
    order,
    transaction,
    block,
    header,
    records,
    event,
    events,
    client,
    inclusion,
    txHash,
    setFinalizedHeight: (height: number) => {
      finalizedHeight = height;
    },
    read: (candidate: string | undefined = inclusion) => receipt(order, candidate),
    scan: () => receipt(order),
  };
}

describe('simple GO canonical finalized receipt adapter', () => {
  it('credits only the matched finalized extrinsic and its actual output and paid fee', async () => {
    const h = harness();
    const before = structuredClone(h.order);
    await expect(h.read()).resolves.toEqual({
      success: true,
      outputCodec: '230000000000000000',
      actualFeeCodec: '91000000000000000',
      finalized: {
        blockHash: h.inclusion,
        blockNumber: 100,
        extrinsicIndex: 1,
        txHash: h.txHash,
        signedEnvelopeDigest: h.order.signedEnvelopeDigest,
      },
    });
    expect(h.client.rpc.chain.getBlockHash).toHaveBeenCalledWith(100);
    expect(h.client.at.mock.calls[0][0].toHex()).toBe(h.inclusion);
    expect(h.events).toHaveBeenCalledOnce();
    expect(h.order).toEqual(before);
  });

  it('finds a retained submitted signature by scanning only canonical finalized blocks', async () => {
    const h = harness();
    await expect(h.scan()).resolves.toMatchObject({
      success: true,
      finalized: { blockNumber: 100, extrinsicIndex: 1 },
    });
    expect(h.client.rpc.chain.getBlockHash.mock.calls.map(([height]) => height)).toEqual([97, 98, 99, 100]);
    expect(h.events).toHaveBeenCalledOnce();
  });

  it('retains a failed swap fee without crediting unrelated successful output', async () => {
    const h = harness();
    h.records.splice(4, 2, h.event('system', 'ExtrinsicFailed', []));
    await expect(h.read()).resolves.toMatchObject({
      success: false,
      outputCodec: '0',
      actualFeeCodec: '91000000000000000',
      finalized: { blockNumber: 100, extrinsicIndex: 1 },
    });
  });

  it('reads actual sell-side proceeds and the separately reported XOR network fee', async () => {
    const h = harness();
    h.order.inputAsset = XOR.address;
    h.order.outputAsset = kusd;
    h.order.inputCodec = '120000000000000000';
    h.order.minOutputCodec = '900000000000000000';
    h.records[4] = h.event('liquidityProxy', 'Exchange', [
      account,
      '0',
      XOR.address,
      kusd,
      h.order.inputCodec,
      '950000000000000000',
    ]);
    await expect(h.read()).resolves.toMatchObject({
      success: true,
      outputCodec: '950000000000000000',
      actualFeeCodec: '91000000000000000',
    });
  });

  it('does not accept a callback block above the independently read finalized height', async () => {
    const h = harness();
    h.setFinalizedHeight(99);
    await expect(h.read()).resolves.toBeNull();
    expect(h.client.rpc.chain.getBlock).not.toHaveBeenCalled();
    expect(h.client.at).not.toHaveBeenCalled();
  });

  it('rejects an orphaned callback hash even when its header has an eligible height', async () => {
    const h = harness();
    await expect(h.read(`0x${'a'.repeat(64)}`)).rejects.toThrow('bots.errors.receipt');
    expect(h.client.rpc.chain.getBlock).not.toHaveBeenCalled();
  });

  it('does not substitute another extrinsic or its events when the recorded hash is absent', async () => {
    const h = harness();
    h.block.extrinsics.splice(1, 1);
    await expect(h.read()).resolves.toBeNull();
    expect(h.client.at).not.toHaveBeenCalled();
  });

  it('rejects events belonging only to the neighboring extrinsic', async () => {
    const h = harness();
    h.records.splice(3);
    await expect(h.read()).rejects.toThrow('bots.errors.receipt');
  });

  it.each(['unsigned', 'signer', 'call', 'digest', 'bytes'] as const)(
    'rejects %s envelope evidence before reading settlement events',
    async (fault) => {
      const h = harness();
      if (fault === 'unsigned') h.transaction.isSigned = false;
      if (fault === 'signer') h.transaction.signer = { toString: () => otherAccount };
      if (fault === 'call') h.transaction.method = hex('0xabcd');
      if (fault === 'digest') h.order.signedEnvelopeDigest = '0'.repeat(64);
      if (fault === 'bytes') {
        h.transaction.toHex = () => '0x070809';
        h.order.signedEnvelopeDigest = envelopeDigest(h.transaction.toHex());
      }
      await expect(h.read()).rejects.toThrow('bots.errors.receipt');
      expect(h.client.at).not.toHaveBeenCalled();
    }
  );

  it.each(['caller', 'pair', 'input', 'fee-asset', 'duplicate-swap', 'duplicate-fee', 'conflicting-outcome'] as const)(
    'rejects mismatched %s in the included extrinsic events',
    async (fault) => {
      const h = harness();
      const swapData = Array.from(h.records[4].event.data);
      if (fault === 'caller') swapData[0] = otherAccount;
      if (fault === 'pair') swapData[3] = kusd;
      if (fault === 'input') swapData[4] = '1';
      h.records[4].event.data = swapData;
      if (fault === 'fee-asset') h.records[3] = h.event('xorFee', 'FeeWithdrawn', [account, kusd, '1']);
      if (fault === 'duplicate-swap') h.records.push(h.records[4]);
      if (fault === 'duplicate-fee') h.records.push(h.records[3]);
      if (fault === 'conflicting-outcome') h.records.push(h.event('system', 'ExtrinsicFailed', []));
      await expect(h.read()).rejects.toThrow('bots.errors.receipt');
    }
  );

  it.each(['height', 'hash', 'duplicate-transaction'] as const)(
    'rejects inconsistent included block %s',
    async (fault) => {
      const h = harness();
      if (fault === 'height') h.header.number = { toNumber: () => 101 };
      if (fault === 'hash') h.header.hash = hex(blockHash(101));
      if (fault === 'duplicate-transaction') h.block.extrinsics.push(h.transaction);
      await expect(h.read()).rejects.toThrow('bots.errors.receipt');
      expect(h.client.at).not.toHaveBeenCalled();
    }
  );

  it.each(['txHash', 'signedAtBlock', 'signedEnvelopeDigest', 'signedCallHex'] as const)(
    'leaves an order without retained %s unresolved without making RPC requests',
    async (field) => {
      const h = harness();
      delete h.order[field];
      await expect(h.read()).resolves.toBeNull();
      expect(h.client.rpc.chain.getFinalizedHead).not.toHaveBeenCalled();
    }
  );

  it('rejects a wallet RPC replacement while finalized events are being read', async () => {
    const h = harness();
    h.events.mockImplementationOnce(async () => {
      wallet.api = { ...h.client };
      return h.records;
    });
    await expect(h.read()).rejects.toThrow('bots.errors.session');
  });

  it('stops scanning after timeout when an outstanding block RPC eventually returns', async () => {
    vi.useFakeTimers();
    const h = harness();
    type BlockReply = Awaited<ReturnType<typeof h.client.rpc.chain.getBlock>>;
    let release!: (block: BlockReply) => void;
    h.client.rpc.chain.getBlock.mockImplementationOnce(
      () =>
        new Promise<BlockReply>((resolve) => {
          release = resolve;
        })
    );
    const observed = h.scan().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(0);
    expect(h.client.rpc.chain.getBlock).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await observed).toEqual(new Error('bots.errors.pending'));
    const requestsAtTimeout = h.client.rpc.chain.getBlockHash.mock.calls.length;
    release({
      block: {
        header: { hash: hex(blockHash(97)), number: { toNumber: () => 97 } },
        extrinsics: [],
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.client.rpc.chain.getBlockHash).toHaveBeenCalledTimes(requestsAtTimeout);
    expect(h.client.at).not.toHaveBeenCalled();
    await expect(h.read()).resolves.toMatchObject({ success: true, finalized: { blockNumber: 100 } });
  });

  it('stops after a late finalized-head reply and allows a subsequent fresh receipt read', async () => {
    vi.useFakeTimers();
    const h = harness();
    let release!: (head: ReturnType<typeof hex>) => void;
    h.client.rpc.chain.getFinalizedHead.mockImplementationOnce(
      () =>
        new Promise<ReturnType<typeof hex>>((resolve) => {
          release = resolve;
        })
    );
    const observed = h.read().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await observed).toEqual(new Error('bots.errors.pending'));
    release(hex(blockHash(105)));
    await vi.advanceTimersByTimeAsync(0);
    expect(h.client.rpc.chain.getHeader).not.toHaveBeenCalled();
    expect(h.client.at).not.toHaveBeenCalled();
    await expect(h.read()).resolves.toMatchObject({ success: true, actualFeeCodec: '91000000000000000' });
  });

  it('discards late event records after timeout and permits fresh canonical accounting', async () => {
    vi.useFakeTimers();
    const h = harness();
    let release!: (events: BotChainEvent[]) => void;
    h.events.mockImplementationOnce(
      () =>
        new Promise<BotChainEvent[]>((resolve) => {
          release = resolve;
        })
    );
    const observed = h.read().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(0);
    expect(h.events).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await observed).toEqual(new Error('bots.errors.pending'));
    const phaseRead = vi.fn(() => h.records[0].phase);
    release([
      {
        event: h.records[0].event,
        get phase() {
          return phaseRead();
        },
      },
      ...h.records.slice(1),
    ]);
    await vi.advanceTimersByTimeAsync(0);
    expect(phaseRead).not.toHaveBeenCalled();
    await expect(h.read()).resolves.toMatchObject({
      success: true,
      outputCodec: '230000000000000000',
      actualFeeCodec: '91000000000000000',
    });
  });
});
