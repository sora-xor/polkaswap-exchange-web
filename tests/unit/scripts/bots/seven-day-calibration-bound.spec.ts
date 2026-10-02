import { describe, expect, it } from 'vitest';
import {
  assessCalibration,
  EPISODE_HOURS,
  FIRST_CLOSE,
  GENESIS,
  HOUR,
  joinedCalibrationMarks,
  KUSD,
  optimisticOneBuyEpisode,
  UNIT,
  verifyRegistration,
  XOR,
  DENOMINATOR,
} from '../../../../scripts/bots/seven-day-calibration-bound.mjs';

const hash = (number: number) => `0x${number.toString(16).padStart(64, '0')}`;
const mark = (index: number, target = 10n * UNIT) => ({
  completedAt: FIRST_CLOSE + index * HOUR,
  closingHeight: 1000 + index,
  closingHash: hash(1000 + index),
  successorHeight: 1001 + index,
  successorHash: hash(1001 + index),
  base: UNIT,
  target,
});
const rows = (assetId: string, symbol: string) => Array.from({ length: 673 }, (_, index) => {
  const completedAt = FIRST_CLOSE + index * HOUR;
  return {
    id: `asset-${assetId}-HOUR-${completedAt - HOUR}`,
    assetId,
    type: 'HOUR',
    timestamp: completedAt - 6,
    denominator: DENOMINATOR,
    closeEvidence: {
      kind: 'finalized-hour-close', genesisHash: GENESIS, completedAt,
      blockHeight: 1000 + index, blockHash: hash(1000 + index), timestamp: completedAt - 6,
      nextBlockHeight: 1001 + index, nextBlockHash: hash(1001 + index), nextTimestamp: completedAt,
      requestedSymbol: symbol, symbol, decimals: 18,
      xorPool: assetId === XOR ? null : {
        baseAssetId: XOR, targetAssetId: KUSD,
        baseAssetReserves: UNIT.toString(), targetAssetReserves: (10n * UNIT).toString(),
        baseDecimals: 18, targetDecimals: 18,
      },
    },
  };
});

describe('training-only seven-day one-buy screen', () => {
  it('joins 673 completed marks only when both assets share each closing and successor identity', () => {
    const kusd = rows(KUSD, 'KUSD'), xor = rows(XOR, 'XOR');
    expect(joinedCalibrationMarks(kusd, xor)).toHaveLength(673);
    xor[4].closeEvidence.nextBlockHash = hash(99999);
    expect(() => joinedCalibrationMarks(kusd, xor)).toThrow('pair-boundary');
    xor[4].closeEvidence.nextBlockHash = hash(1005);
    kusd[2].closeEvidence.xorPool = null;
    expect(() => joinedCalibrationMarks(kusd, xor)).toThrow('direct-pool');
  });

  it('charges one observed fee against the protected reserve and counts it in opening and idle equity', () => {
    const episode = Array.from({ length: EPISODE_HOURS + 1 }, (_, index) => mark(index));
    const result = optimisticOneBuyEpisode(episode, '3900000000000000000', '100000000000000000');
    expect(result.idleOpeningXorCodec).toBe((2n * UNIT).toString());
    expect(result.idleFinalXorCodec).toBe((2n * UNIT).toString());
    expect(result.best?.finalXorCodec).toBe((19n * UNIT / 10n).toString());
    expect(result.best?.worstDrawdownPercent).toBe('5.000000');
    expect(result.best?.targetHit).toBe(false);
    expect(result.satisfyingBuyCloses).toBe(0);
  });

  it('keeps a target latch separate from the final drawdown and resets each seven-day episode', () => {
    const all = Array.from({ length: 4 * EPISODE_HOURS + 1 }, (_, index) => mark(index));
    all[1] = mark(1, 5n * UNIT);
    const results = assessCalibration(all, '100000000000000000');
    expect(results).toHaveLength(2);
    const first = results[0].episodes[0];
    expect(first.best?.targetHit).toBe(true);
    expect(first.best?.withinDrawdown).toBe(false);
    expect(first.satisfyingBuyCloses).toBe(0);
    expect(results[0].episodes[1].idleOpeningXorCodec).toBe((2n * UNIT).toString());
  });

  it('requires a sealed training-only registration with the exact source and economic limits', async () => {
    const { createHash } = await import('node:crypto');
    const source = Buffer.from('frozen analyzer');
    const sha = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
    const body = {
      access: { mode: 'training-calibration-only', validationAllowed: false, holdoutAllowed: false },
      scope: { firstClose: FIRST_CLOSE, lastClose: FIRST_CLOSE + 4 * EPISODE_HOURS * HOUR, episodeCount: 4, episodeHours: EPISODE_HOURS },
      sourceHashes: { analyzerSha256: sha(source) },
      economics: { allocationKusdCodec: (10n * UNIT).toString(), feeReserveXorCodec: UNIT.toString(),
        maxDrawdownPercent: '10', maxImpactPercent: '1', targetGainPercent: '5', slippageBps: 50,
        datedNetworkFeeCodec: '100020712589707326' },
    };
    const registration = { kind: 'tc1-seven-day-calibration-registration-v1', body, sha256: sha(JSON.stringify(body)) };
    expect(verifyRegistration(registration, source)).toBe(body);
    expect(() => verifyRegistration(registration, Buffer.from('different'))).toThrow('analyzer-digest');
    expect(() => verifyRegistration({ ...registration, body: { ...body, access: { ...body.access, holdoutAllowed: true } } }, source)).toThrow('registration-digest');
  });
});
