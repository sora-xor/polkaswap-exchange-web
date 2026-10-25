/**
 * Read-only, training-only seven-day KUSD/XOR one-buy screen.
 *
 * The result is an optimistic spot-mark calculation: it gives the buyer the
 * completed-hour reserve ratio, chooses the buy time with hindsight, and omits
 * pool fees, impact, slippage and failed transactions. Its dated queryInfo fee
 * scenario is not a historical fee or an executable quote. No wallet or
 * transaction API is available here.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const HOUR = 3600;
export const UNIT = 10n ** 18n;
export const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
export const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
export const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
export const DENOMINATOR = '100000000000000000000000000000000000000';
export const FIRST_CLOSE = Date.parse('2026-06-30T19:00:00.000Z') / 1000;
export const LAST_CLOSE = Date.parse('2026-07-28T19:00:00.000Z') / 1000;
export const EPISODE_HOURS = 168;
export const EPISODE_COUNT = 4;
const HASH = /^0x[0-9a-f]{64}$/;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => {
  if (!condition) throw new Error(`seven-day-calibration: ${message}`);
};

/** Verify a no-clobber registration's canonical body and bound analyzer source. */
export function verifyRegistration(registration, sourceBytes) {
  assert(registration && typeof registration === 'object', 'registration');
  assert(registration.kind === 'tc1-seven-day-calibration-registration-v1', 'registration-kind');
  assert(registration.sha256 === sha256(JSON.stringify(registration.body)), 'registration-digest');
  const body = registration.body;
  assert(body?.access?.mode === 'training-calibration-only', 'access');
  assert(body.access.validationAllowed === false && body.access.holdoutAllowed === false, 'access');
  assert(body?.scope?.firstClose === FIRST_CLOSE && body.scope.lastClose === LAST_CLOSE, 'window');
  assert(body.scope.episodeCount === EPISODE_COUNT && body.scope.episodeHours === EPISODE_HOURS, 'window');
  assert(body.sourceHashes?.analyzerSha256 === sha256(sourceBytes), 'analyzer-digest');
  assert(body.economics?.allocationKusdCodec === (10n * UNIT).toString(), 'allocation');
  assert(body.economics?.feeReserveXorCodec === UNIT.toString(), 'reserve');
  assert(body.economics?.maxDrawdownPercent === '10', 'drawdown');
  assert(body.economics?.maxImpactPercent === '1', 'impact');
  assert(body.economics?.targetGainPercent === '5', 'target');
  assert(body.economics?.slippageBps === 50, 'slippage');
  assert(body.economics?.datedNetworkFeeCodec === '100020712589707326', 'fee');
  return body;
}

/** Fetch exactly the 673 calibration closing marks, retaining response digests. */
export async function fetchCalibrationRows(fetcher = globalThis.fetch) {
  const query = 'query Calibration($filter:AssetSnapshotFilter!,$after:Cursor){assetSnapshots(first:100,after:$after,orderBy:[TIMESTAMP_ASC],filter:$filter){totalCount pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}}}';
  const result = {};
  for (const [name, assetId] of Object.entries({ KUSD, XOR })) {
    const rows = [], receipts = [];
    let after = null;
    for (let page = 0; page < 8; page++) {
      const request = { query, variables: { filter: { assetId: { equalTo: assetId }, type: { equalTo: 'HOUR' }, timestamp: { greaterThanOrEqualTo: FIRST_CLOSE - HOUR, lessThan: LAST_CLOSE } }, after } };
      const response = await fetcher('https://pi.soramitsu.io/graphql', {
        method: 'POST', headers: { 'content-type': 'application/json', 'cache-control': 'no-cache' },
        body: JSON.stringify(request), redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(30_000),
      });
      const raw = await response.text();
      assert(response.status === 200 && !response.redirected && raw.length <= 2_097_152, 'response');
      const parsed = JSON.parse(raw);
      assert(!parsed.errors, 'graphql-error');
      const connection = parsed.data?.assetSnapshots;
      assert(connection && Array.isArray(connection.edges) && connection.edges.length <= 100, 'page');
      rows.push(...connection.edges.map((edge) => edge.node));
      receipts.push({ page, status: response.status, bytes: Buffer.byteLength(raw), sha256: sha256(raw) });
      if (!connection.pageInfo?.hasNextPage) {
        assert(connection.totalCount === 673 && rows.length === 673, 'count');
        result[name] = { rows, receipts };
        break;
      }
      assert(typeof connection.pageInfo.endCursor === 'string' && connection.pageInfo.endCursor !== after, 'cursor');
      after = connection.pageInfo.endCursor;
    }
    assert(result[name], 'pagination');
  }
  return result;
}

/** Join same-block KUSD and XOR observations without reading any other dates. */
export function joinedCalibrationMarks(kusdRows, xorRows) {
  const expected = EPISODE_COUNT * EPISODE_HOURS + 1;
  assert(kusdRows.length === expected && xorRows.length === expected, 'row-count');
  return kusdRows.map((kusd, index) => {
    const xor = xorRows[index];
    const completedAt = FIRST_CLOSE + index * HOUR;
    const opening = completedAt - HOUR;
    for (const [row, assetId, symbol] of [[kusd, KUSD, 'KUSD'], [xor, XOR, 'XOR']]) {
      const proof = row?.closeEvidence;
      assert(row.assetId === assetId && row.type === 'HOUR' && row.denominator === DENOMINATOR, 'row-identity');
      assert(row.id === `asset-${assetId}-HOUR-${opening}`, 'row-id');
      assert(Number.isSafeInteger(row.timestamp) && row.timestamp >= opening && row.timestamp < completedAt, 'row-time');
      assert(proof?.kind === 'finalized-hour-close' && proof.genesisHash === GENESIS, 'finality');
      assert(proof.completedAt === completedAt && proof.timestamp === row.timestamp, 'boundary');
      assert(proof.symbol === symbol && proof.requestedSymbol === symbol && proof.decimals === 18, 'asset-metadata');
      assert(Number.isSafeInteger(proof.blockHeight) && proof.nextBlockHeight === proof.blockHeight + 1, 'height');
      assert(HASH.test(proof.blockHash) && HASH.test(proof.nextBlockHash) && proof.blockHash !== proof.nextBlockHash, 'hash');
      assert(Number.isSafeInteger(proof.nextTimestamp) && proof.nextTimestamp >= completedAt && proof.nextTimestamp < completedAt + HOUR, 'successor-time');
    }
    const k = kusd.closeEvidence, x = xor.closeEvidence;
    assert(JSON.stringify([k.blockHeight,k.blockHash,k.timestamp,k.nextBlockHeight,k.nextBlockHash,k.nextTimestamp]) === JSON.stringify([x.blockHeight,x.blockHash,x.timestamp,x.nextBlockHeight,x.nextBlockHash,x.nextTimestamp]), 'pair-boundary');
    assert(x.xorPool === null, 'xor-pool');
    const pool = k.xorPool;
    assert(pool?.baseAssetId === XOR && pool.targetAssetId === KUSD && pool.baseDecimals === 18 && pool.targetDecimals === 18, 'direct-pool');
    assert(/^[1-9]\d*$/.test(pool.baseAssetReserves) && /^[1-9]\d*$/.test(pool.targetAssetReserves), 'reserves');
    return { completedAt, closingHeight: k.blockHeight, closingHash: k.blockHash, successorHeight: k.nextBlockHeight, successorHash: k.nextBlockHash, base: BigInt(pool.baseAssetReserves), target: BigInt(pool.targetAssetReserves) };
  });
}

const percent = (numerator, denominator) => {
  const scaled = numerator * 100_000_000n / denominator;
  return `${scaled / 1_000_000n}.${String(scaled % 1_000_000n).padStart(6, '0')}`;
};
const xorValue = (kusdCodec, mark) => (kusdCodec * mark.base) / mark.target;
const iso = (seconds) => new Date(seconds * 1000).toISOString();

/**
 * Let an oracle buy at any later completed close, then hold to the fixed endpoint.
 * Its one fee is the dated actual queryInfo estimate registered before the read;
 * historical fee equivalence and historical route execution are not claimed.
 */
export function optimisticOneBuyEpisode(marks, amountInCodec, feeCodec) {
  assert(marks.length === EPISODE_HOURS + 1, 'episode-length');
  const amount = BigInt(amountInCodec), fee = BigInt(feeCodec);
  const allocation = 10n * UNIT;
  assert(amount > 0n && amount < allocation && fee > 0n && fee <= UNIT, 'amount-or-fee');
  const opening = UNIT + xorValue(allocation, marks[0]);
  const idleFinal = UNIT + xorValue(allocation, marks.at(-1));
  let best = null, bestWithinDrawdown = null, satisfying = 0;
  for (let buyIndex = 1; buyIndex < marks.length; buyIndex++) {
    const bought = xorValue(amount, marks[buyIndex]);
    const xorHeld = UNIT - fee + bought;
    let peak = 0n, worstNumerator = 0n, worstDenominator = 1n, targetHit = false;
    for (let index = 0; index < marks.length; index++) {
      const value = index < buyIndex
        ? UNIT + xorValue(allocation, marks[index])
        : xorHeld + xorValue(allocation - amount, marks[index]);
      if (value > peak) peak = value;
      const decline = peak - value;
      if (decline * worstDenominator > worstNumerator * peak) {
        worstNumerator = decline;
        worstDenominator = peak;
      }
      if (value * 100n >= opening * 105n) targetHit = true;
    }
    const final = xorHeld + xorValue(allocation - amount, marks.at(-1));
    const withinDrawdown = worstNumerator * 10n <= worstDenominator;
    const result = {
      buyAt: iso(marks[buyIndex].completedAt),
      openingXorCodec: opening.toString(), idleFinalXorCodec: idleFinal.toString(),
      finalXorCodec: final.toString(),
      returnPercent: percent(final - opening >= 0n ? final - opening : opening - final, opening),
      returnSign: final > opening ? '+' : final < opening ? '-' : '0',
      idleAdvantageXorCodec: (final - idleFinal).toString(),
      worstDrawdownPercent: percent(worstNumerator, worstDenominator),
      withinDrawdown, targetHit,
      meetsGainAndAdvantage: final * 100n >= opening * 105n && final > idleFinal && withinDrawdown,
    };
    if (!best || final > BigInt(best.finalXorCodec)) best = result;
    if (withinDrawdown && (!bestWithinDrawdown || final > BigInt(bestWithinDrawdown.finalXorCodec))) bestWithinDrawdown = result;
    if (result.meetsGainAndAdvantage) satisfying++;
  }
  return { episodeStart: iso(marks[0].completedAt), episodeEnd: iso(marks.at(-1).completedAt),
    amountInCodec, feeCodec, assessedBuyCloses: EPISODE_HOURS,
    best, bestWithinDrawdown, satisfyingBuyCloses: satisfying,
    idleOpeningXorCodec: opening.toString(), idleFinalXorCodec: idleFinal.toString() };
}

/** Run only four fixed calibration episodes; adjacent episodes share a mark, never inventory. */
export function assessCalibration(marks, feeCodec) {
  assert(marks.length === EPISODE_COUNT * EPISODE_HOURS + 1, 'calibration-length');
  const sizes = [
    { label: 'dated-impact-passing-3.90-kusd', codec: '3900000000000000000' },
    { label: 'below-budget-supremum-no-impact-claim', codec: '9999999999999999999' },
  ];
  return sizes.map(({ label, codec }) => ({ label, episodes: Array.from({ length: EPISODE_COUNT }, (_, index) =>
    optimisticOneBuyEpisode(marks.slice(index * EPISODE_HOURS, (index + 1) * EPISODE_HOURS + 1), codec, feeCodec)) }));
}

/** Read and verify an existing registration without making a network request. */
export function readRegisteredStudy(path, analyzerPath) {
  const registration = JSON.parse(readFileSync(path, 'utf8'));
  verifyRegistration(registration, readFileSync(analyzerPath));
  return registration;
}
