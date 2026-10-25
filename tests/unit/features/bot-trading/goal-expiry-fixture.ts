/** Synthetic real signed envelopes plus canonical finalized SDK replies. No external data or wallet. */
import { vi } from 'vitest';
import { goalSigningFixture } from './goal-signing-fixture';
import { goalStorageBot, goalStorageOrder, goalTestHash } from './goal-storage-fixtures';
import {
  captureGoalSigningPayload,
  retainGoalSignedMortality,
  exportGoalPersistedSigning,
  readGoalSignedMortality,
} from '@/features/bot-trading/goal-mortality';
import { discoverGoalExpiry } from '@/features/bot-trading/goal-expiry';
import { createGoalStorage, type GoalStorageLedger } from '@/features/bot-trading/goal-storage';
import type { GoalReceiptClient, GoalReceiptEvent } from '@/features/bot-trading/goal-receipt';
import type { GoalExecutionOrder } from '@/features/bot-trading/goal-execution-types';
const hex = (value: string) => ({ toHex: () => value });
export function goalExpiryFixture() {
  const signing = goalSigningFixture(),
    signed = signing.signed();
  retainGoalSignedMortality(captureGoalSigningPayload(signing.input), signed);
  const facts = readGoalSignedMortality(signed)!;
  const bot = goalStorageBot();
  bot.account = signing.pair.address;
  const order = goalStorageOrder(bot);
  Object.assign(order, {
    status: 'signed',
    txHash: facts.txHash,
    signedAtBlock: 1,
    signingEvidence: exportGoalPersistedSigning(signed),
    inputCodec: '2500000000000000000',
    minOutputCodec: '990000000000000000',
  });
  Object.assign(order.goalExecution, {
    phase: 'signed',
    orderRevision: 1,
    signedEnvelopeDigest: facts.signedEnvelopeDigest,
  });
  let time = 1_000_000,
    current = true,
    finalHeight = 500;
  const hash = (height: number) => (height === 335 ? facts.checkpoint.hash : goalTestHash(height));
  const height = (value: string) => (value === facts.checkpoint.hash ? 335 : Number(BigInt(value)));
  const header = (number: number) => ({
    hash: hex(hash(number)),
    number: { toNumber: () => number },
    parentHash: hex(hash(number - 1)),
  });
  const blocks = new Map<number, (typeof signed)[]>();
  const listeners = new Map<string, Set<() => void>>();
  const event = (section: string, method: string, data: unknown[]): GoalReceiptEvent => ({
    phase: { isApplyExtrinsic: true, asApplyExtrinsic: { toNumber: () => 0 } },
    event: { section, method, data },
  });
  const records = [
    event('xorFee', 'FeeWithdrawn', [bot.account, order.feeAsset, '11']),
    event('liquidityProxy', 'Exchange', [
      bot.account,
      '0',
      order.inputAsset,
      order.outputAsset,
      order.inputCodec,
      '1000000000000000000',
    ]),
    event('system', 'ExtrinsicSuccess', []),
  ];
  const client = {
    isConnected: true,
    genesisHash: hex(order.network),
    runtimeVersion: hex('0x82'),
    runtimeMetadata: {},
    on: vi.fn((key: string, listener: () => void) => {
      const group = listeners.get(key) ?? new Set();
      group.add(listener);
      listeners.set(key, group);
    }),
    off: vi.fn((key: string, listener: () => void) => listeners.get(key)?.delete(listener)),
    rpc: {
      chain: {
        getFinalizedHead: vi.fn(async () => hex(hash(finalHeight))),
        getHeader: vi.fn(async (h: string) => header(height(h))),
        getBlockHash: vi.fn(async (n: number) => hex(hash(n))),
        getBlock: vi.fn(async (h: string) => ({
          block: { header: header(height(h)), extrinsics: blocks.get(height(h)) ?? [] },
        })),
      },
    },
    at: vi.fn(async () => ({ query: { system: { events: vi.fn(async () => records) } } })),
  } satisfies GoalReceiptClient;
  let ledger: GoalStorageLedger = { bots: [bot], orders: [order] };
  const storage = createGoalStorage(
    async (write, action) => {
      const next = JSON.parse(JSON.stringify(ledger));
      const result = action(next);
      if (write) ledger = next;
      return result;
    },
    () => time
  );
  const options = {
    client,
    order,
    now: () => time,
    isCurrent: () => current,
    controlRevision: bot.goalControl.revision,
  };
  return {
    bot,
    order,
    signed,
    facts,
    signing,
    client,
    blocks,
    listeners,
    records,
    storage,
    options,
    hash,
    header,
    read: () => JSON.parse(JSON.stringify(ledger)) as GoalStorageLedger,
    setLedger: (next: GoalStorageLedger) => {
      ledger = next;
    },
    setNow: (next: number) => {
      time = next;
    },
    setCurrent: (next: boolean) => {
      current = next;
    },
    setFinalHeight: (next: number) => {
      finalHeight = next;
    },
    discover: () => discoverGoalExpiry(options),
  };
}
/** Returns an actual storage-produced expired record, suitable for UI projection tests. */
export async function expiredGoalOrderFixture(): Promise<GoalExecutionOrder> {
  const f = goalExpiryFixture(),
    result = await f.discover();
  if (result.status !== 'expired') throw Error('Expected synthetic expiry');
  return f.storage.expire({
    orderId: f.order.id,
    expected: { goalId: f.bot.goalExecution.goalId, controlRevision: f.bot.goalControl.revision },
    evidence: result.evidence,
  });
}
