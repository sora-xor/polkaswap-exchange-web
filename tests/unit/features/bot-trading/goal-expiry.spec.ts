// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  discoverGoalExpiry,
  assertGoalExpiryEvidence,
  consumeGoalExpiryEvidence,
  readGoalExpiryEvidence,
  GOAL_EXPIRY_LIMITS,
} from '@/features/bot-trading/goal-expiry';
import { readGoalExecutionOrder } from '@/features/bot-trading/goal-storage';
import { verifyGoalPersistedSigning, exportGoalPersistedSigning } from '@/features/bot-trading/goal-mortality';
import { goalExpiryFixture, expiredGoalOrderFixture } from './goal-expiry-fixture';
vi.unmock('@polkadot/util-crypto');
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
afterEach(() => vi.useRealTimers());
describe('complete canonical signed lifetime recovery', () => {
  it('reverifies persisted payload after reload and atomically resolves full finalized absence without fees', async () => {
    const f = goalExpiryFixture(),
      before = f.read();
    const reloaded = readGoalExecutionOrder(clone(f.order));
    expect(
      verifyGoalPersistedSigning(reloaded.signingEvidence, {
        account: reloaded.account,
        network: reloaded.network,
        txHash: reloaded.txHash!,
        signedEnvelopeDigest: reloaded.goalExecution.signedEnvelopeDigest!,
      })
    ).toMatchObject({ birthBlockNumber: 335, deathBlockNumber: 399, nonceCodec: '7' });
    const result = await discoverGoalExpiry({ ...f.options, order: reloaded });
    expect(result.status).toBe('expired');
    if (result.status !== 'expired') throw Error('missing proof');
    expect(f.client.rpc.chain.getBlock).toHaveBeenCalledTimes(65);
    expect(result.evidence).toMatchObject({
      birthBlockNumber: 335,
      deathBlockNumber: 399,
      scannedBlocks: 65,
      finalizedBlockNumber: 500,
    });
    await expect(
      f.storage.expire({
        orderId: f.order.id,
        expected: { goalId: f.bot.goalExecution.goalId, controlRevision: 0 },
        evidence: clone(result.evidence),
      })
    ).rejects.toThrow();
    const expired = await f.storage.expire({
      orderId: f.order.id,
      expected: { goalId: f.bot.goalExecution.goalId, controlRevision: 0 },
      evidence: result.evidence,
    });
    expect(expired).toMatchObject({
      status: 'failed',
      txHash: f.order.txHash,
      signingEvidence: f.order.signingEvidence,
      goalExecution: { phase: 'expired', orderRevision: 2 },
    });
    expect(readGoalExecutionOrder(clone(expired))).toEqual(expired);
    expect(f.read().bots).toEqual(before.bots);
    expect(expired.actualFeeCodec).toBeUndefined();
    expect([...f.listeners.values()].every((x) => x.size === 0)).toBe(true);
    expect(() => assertGoalExpiryEvidence(result.evidence, reloaded, 0)).toThrow();
  });
  it.each(['payload', 'envelope', 'metadata'] as const)(
    'rejects tampered persisted %s before any RPC',
    async (kind) => {
      const f = goalExpiryFixture();
      const record = clone(f.order.signingEvidence!);
      if (kind === 'payload') Object.assign(record.payload, { blockHash: f.hash(999) });
      if (kind === 'envelope')
        Object.assign(record, { signedEnvelopeHex: record.signedEnvelopeHex.slice(0, -2) + '00' });
      if (kind === 'metadata') Object.assign(record, { metadataHexChunks: ['0x0000'] });
      f.order.signingEvidence = record;
      await expect(f.discover()).rejects.toThrow();
      expect(f.client.rpc.chain.getFinalizedHead).not.toHaveBeenCalled();
    }
  );
  it('does not export evidence for a detached signed object or infer old-record expiry from signedAtBlock', async () => {
    const f = goalExpiryFixture();
    expect(exportGoalPersistedSigning({ toHex: () => f.signed.toHex() })).toBeUndefined();
    delete f.order.signingEvidence;
    f.order.signedAtBlock = 1;
    expect(await f.discover()).toEqual({ status: 'unresolved' });
    expect(f.client.rpc.chain.getFinalizedHead).not.toHaveBeenCalled();
  });
  it.each([335, 350, 399])('discovers actual inclusion at block %i through the real receipt reader', async (height) => {
    const f = goalExpiryFixture();
    f.blocks.set(height, [f.signed]);
    const result = await f.discover();
    expect(result).toMatchObject({
      status: 'included',
      receipt: { blockNumber: height, success: true, actualFeeCodec: '11', outputCodec: '1000000000000000000' },
    });
    expect([...f.listeners.values()].every((x) => x.size === 0)).toBe(true);
  });
  it('finds inclusion while mortality is still live and does not declare absence at death', async () => {
    const f = goalExpiryFixture();
    f.setFinalHeight(350);
    f.blocks.set(349, [f.signed]);
    expect(await f.discover()).toMatchObject({ status: 'included', receipt: { blockNumber: 349 } });
    f.blocks.clear();
    f.setFinalHeight(399);
    expect(await f.discover()).toEqual({ status: 'unresolved' });
  });
  it.each(['gap', 'checkpoint', 'parent', 'reorg'] as const)('keeps %s failures unresolved', async (kind) => {
    const f = goalExpiryFixture();
    if (kind === 'gap')
      f.client.rpc.chain.getBlock.mockImplementationOnce(async () => {
        throw Error('pruned');
      });
    if (kind === 'checkpoint')
      f.client.rpc.chain.getBlockHash.mockImplementation(async (h) => ({
        toHex: () => (h === 335 ? f.hash(999) : f.hash(h)),
      }));
    if (kind === 'parent')
      f.client.rpc.chain.getBlock.mockImplementation(async (h) => {
        const n = h === f.facts.checkpoint.hash ? 335 : Number(BigInt(h));
        return { block: { header: { ...f.header(n), parentHash: { toHex: () => f.hash(100) } }, extrinsics: [] } };
      });
    if (kind === 'reorg') {
      let anchors = 0;
      f.client.rpc.chain.getBlockHash.mockImplementation(async (h) => ({
        toHex: () => (h === 500 && ++anchors > 1 ? f.hash(999) : f.hash(h)),
      }));
    }
    await expect(f.discover()).rejects.toThrow();
    expect(f.read().orders[0].status).toBe('signed');
    expect([...f.listeners.values()].every((x) => x.size === 0)).toBe(true);
  });
  it('revokes a returned capability on disconnect and on exact order or control mutation', async () => {
    const f = goalExpiryFixture(),
      result = await f.discover();
    if (result.status !== 'expired') throw Error('proof');
    expect(() => assertGoalExpiryEvidence(result.evidence, { ...f.order, inputCodec: '1' }, 0)).toThrow();
    expect(() => assertGoalExpiryEvidence(result.evidence, f.order, 1)).toThrow();
    f.listeners.get('disconnected')!.forEach((fn) => fn());
    expect(() => assertGoalExpiryEvidence(result.evidence, f.order, 0)).toThrow();
  });
  it('times out a hung RPC and expires unconsumed capabilities without leaving listeners', async () => {
    vi.useFakeTimers();
    const f = goalExpiryFixture();
    f.client.rpc.chain.getBlock.mockImplementationOnce(() => new Promise(() => undefined));
    const rejected = expect(f.discover()).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(GOAL_EXPIRY_LIMITS.timeoutMs);
    await rejected;
    expect([...f.listeners.values()].every((x) => x.size === 0)).toBe(true);
    const next = goalExpiryFixture(),
      result = await next.discover();
    if (result.status !== 'expired') throw Error('proof');
    await vi.advanceTimersByTimeAsync(GOAL_EXPIRY_LIMITS.timeoutMs);
    expect(() => consumeGoalExpiryEvidence(result.evidence, next.order, 0)).toThrow();
  });
  it('can parse audit JSON without allowing it to mint fresh cancellation authority', async () => {
    const expired = await expiredGoalOrderFixture();
    const audit = readGoalExpiryEvidence(clone(expired.expiryEvidence));
    expect(audit.scannedBlocks).toBe(65);
    expect(() => assertGoalExpiryEvidence(audit, expired, 0)).toThrow();
  });
});
