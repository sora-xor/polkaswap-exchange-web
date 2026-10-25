/** Invented native mark receipts only. No RPC provider or operational observation is used. */
import { createHash } from 'node:crypto';
import { createAccumulationEvidenceFixture } from './accumulation-evidence-fixture';
import { hex, le } from './historical-goal-bound-fee-fixture';
import { createHistoricalExecutionPoolCodec } from '../../../../../scripts/bots/historical-execution-pool-codec';
import { HISTORICAL_EXECUTION_GENESIS as GENESIS } from '../../../../../scripts/bots/historical-execution-codec';
import {
  accumulationNativeMarkDigest,
  type AccumulationNativeMarkEvidence,
  type AccumulationNativeMarkTrustedSource,
  type AccumulationNativeMarkSlot,
} from '../../../../../scripts/bots/accumulation-native-mark';
import type { AccumulationRpcReceipt } from '../../../../../scripts/bots/accumulation-evidence-bridge';

export const NATIVE_MARK_H = 3_600_000_000;
export const nativeMarkHash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
export const nativeMarkSha = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
/** Repinning represents an independently authorized fixture change, never a production trust operation. */
export function repinNativeMarkFixture(f: {
  raw: AccumulationNativeMarkEvidence;
  trusted: AccumulationNativeMarkTrustedSource;
  slot: AccumulationNativeMarkSlot;
}) {
  f.trusted.rawSha256 = accumulationNativeMarkDigest(f.raw);
  f.slot.timing.receiptBindingSha256 = accumulationNativeMarkDigest({
    contextRpc: f.raw.contextRpc,
    boundaryRpc: f.raw.boundaryRpc,
  });
  return f;
}
/** Build one opening, risk or terminal mark with real synthetic metadata/SCALE codecs. */
export function createAccumulationNativeMarkFixture(
  role: AccumulationNativeMarkSlot['role'] = 'opening',
  mode: AccumulationNativeMarkSlot['timing']['mode'] = 'observed-receipts',
  options: { openingAtMs?: number; controlAtMs?: number; targetHeight?: number; nativeAtMs?: number } = {}
) {
  const H = options.controlAtMs ?? NATIVE_MARK_H;
  const n = options.targetHeight ?? 100;
  const synthetic = createAccumulationEvidenceFixture(options.nativeAtMs ?? H - 1000);
  synthetic.proof.reserves = hex(Buffer.concat([le(3000n * 10n ** 18n), le(2000n * 10n ** 18n)]));
  const identity = { ...synthetic.identity, blockHash: nativeMarkHash(n) };
  const keys = createHistoricalExecutionPoolCodec(identity).storageKeys();
  const endpoint = 'https://ws.mof.sora.org/' as const;
  let id = 0,
    clock = role === 'terminal' ? H + 10 : H - 800;
  const rpc = (method: string, params: unknown[], result: unknown): AccumulationRpcReceipt => {
    const n = ++id,
      responseBody = JSON.stringify({ jsonrpc: '2.0', id: n, result });
    const start = clock;
    clock += 10;
    return {
      endpoint,
      requestBody: JSON.stringify({ jsonrpc: '2.0', id: n, method, params }),
      responseBody,
      responseSha256: nativeMarkSha(responseBody),
      requestedAtMs: start,
      completedAtMs: clock,
      httpStatus: 200,
      failure: null,
    };
  };
  const header = (n: number) => ({
    number: `0x${n.toString(16)}`,
    parentHash: nativeMarkHash(n - 1),
    stateRoot: nativeMarkHash(900),
    extrinsicsRoot: nativeMarkHash(901),
    digest: { logs: [] },
  });
  const anchor = (height: number) => [
    rpc('chain_getBlockHash', [0], GENESIS),
    rpc('chain_getBlockHash', [height], nativeMarkHash(height)),
    rpc('chain_getFinalizedHead', [], nativeMarkHash(height)),
    rpc('chain_getHeader', [nativeMarkHash(height)], header(height)),
    rpc('chain_getHeader', [nativeMarkHash(height)], header(height)),
  ];
  const profile = (n: number) => [
    rpc('state_getRuntimeVersion', [nativeMarkHash(n)], { specName: 'sora-substrate', ...identity.runtimeVersion }),
    rpc('state_getMetadata', [nativeMarkHash(n)], identity.metadataHex),
    rpc('state_getStorageHash', ['0x3a636f6465', nativeMarkHash(n)], nativeMarkHash(902)),
  ];
  const contextRpc = [
    ...anchor(n),
    rpc('chain_getBlockHash', [n], nativeMarkHash(n)),
    rpc('chain_getHeader', [nativeMarkHash(n)], header(n)),
    rpc('chain_getBlockHash', [n - 1], nativeMarkHash(n - 1)),
    rpc('chain_getHeader', [nativeMarkHash(n - 1)], header(n - 1)),
    ...profile(n),
    ...profile(n - 1),
    rpc(
      'state_queryStorageAt',
      [Object.values(keys), nativeMarkHash(n)],
      [
        {
          block: nativeMarkHash(n),
          changes: Object.entries(keys).map(([name, key]) => [
            key,
            synthetic.proof[name as keyof typeof synthetic.proof],
          ]),
        },
      ]
    ),
  ];
  const received = clock;
  clock = H + 500;
  const boundaryRpc =
    role === 'risk'
      ? null
      : [
          ...anchor(n + 1),
          rpc('chain_getBlockHash', [n + 1], nativeMarkHash(n + 1)),
          rpc('chain_getHeader', [nativeMarkHash(n + 1)], header(n + 1)),
          ...profile(n + 1),
          rpc(
            'state_queryStorageAt',
            [[keys.timestamp], nativeMarkHash(n + 1)],
            [{ block: nativeMarkHash(n + 1), changes: [[keys.timestamp, hex(le(H, 8))]] }]
          ),
        ];
  const raw: AccumulationNativeMarkEvidence = {
    kind: 'accumulation-native-mark-evidence-v1',
    target: { hash: nativeMarkHash(n), height: n },
    contextRpc,
    boundaryRpc,
  };
  const trusted: AccumulationNativeMarkTrustedSource = {
    rawSha256: '',
    sourceRegistrationSha256: 'a'.repeat(64),
    endpoint,
    finalizedSource: { hash: nativeMarkHash(n), height: n },
    boundaryFinalizedSource: role === 'risk' ? null : { hash: nativeMarkHash(n + 1), height: n + 1 },
    runtime: {
      ...identity.runtimeVersion,
      metadataSha256: nativeMarkSha(Buffer.from(identity.metadataHex.slice(2), 'hex')),
      codeHash: nativeMarkHash(902),
    },
    denominator: '1',
  };
  const slot: AccumulationNativeMarkSlot = {
    episodeId: 'invented-episode',
    slotId: `invented-${role}`,
    role,
    openingAtMs: options.openingAtMs ?? (role === 'terminal' ? H - 86400000 : role === 'risk' ? H - 3600000 : H),
    deadlineMs:
      (options.openingAtMs ?? (role === 'terminal' ? H - 86400000 : role === 'risk' ? H - 3600000 : H)) + 86400000,
    controlAtMs: H,
    timing: {
      mode,
      registrationSha256: 'b'.repeat(64),
      scenarioId: mode === 'historical-modeled' ? 'synthetic-arrival-scenario' : null,
      contextReceivedAtMs: received,
      boundaryConfirmedAtMs: boundaryRpc ? clock : null,
      receiptBindingSha256: '',
    },
  };
  if (mode === 'historical-modeled') {
    for (const receipt of [...contextRpc, ...(boundaryRpc ?? [])]) {
      receipt.requestedAtMs += 86400000 * 40;
      receipt.completedAtMs += 86400000 * 40;
    }
  }
  repinNativeMarkFixture({ raw, trusted, slot });
  return { raw, trusted, slot, synthetic, keys };
}
