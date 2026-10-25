import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { codec, percent, toCodec } from './amounts';
import { QUANT_CAPITAL_XOR, QUANT_FEE_BUDGET_XOR, QUANT_FOLDS, QUANT_TRAIN_PERCENT } from './quant-loop';
import { studioCandidate, type StudioArchiveInfo, type StudioState } from './quant-studio';
import { parseStrategyRules, type StrategyRules } from './strategy-rules';
import type { BotAsset } from './types';
import type { ResearchSettings } from './research';

const HOUR = 3_600_000;
const MAX_LINK = 8192;
type StudySettings = Pick<
  ResearchSettings,
  | 'capital'
  | 'tradePercent'
  | 'feeBudgetXor'
  | 'slippagePercent'
  | 'intervalBlocks'
  | 'validation'
  | 'trainPercent'
  | 'folds'
  | 'historyStartAt'
  | 'historyEndAt'
>;

/** Public, unexecuted research controls; no observed costs, portfolio, wallet or session state. */
export interface LabStudyHandoff {
  version: 1;
  source: 'quant-studio';
  createdAt: number;
  rules: StrategyRules;
  input: BotAsset;
  output: BotAsset;
  amount: string;
  identity: { genesisHash: string; denominator: string };
  settings: Required<StudySettings>;
}

/** Reject unsupported fields rather than silently accepting a partly understood draft. */
function exactObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('bots.errors.config');
  const fields = Object.keys(value);
  if (fields.length !== keys.length || fields.some((key) => !keys.includes(key))) throw new Error('bots.errors.config');
  return value as Record<string, unknown>;
}

/** Project only the public metadata needed to resolve an exact token pair. */
function asset(value: unknown): BotAsset {
  const data = exactObject(value, ['address', 'symbol', 'decimals']);
  if (
    typeof data.address !== 'string' ||
    !/^0x[\da-f]{64}$/i.test(data.address) ||
    typeof data.symbol !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/.test(data.symbol) ||
    !Number.isInteger(data.decimals) ||
    (data.decimals as number) < 0 ||
    (data.decimals as number) > 18
  )
    throw new Error('bots.errors.config');
  return { address: data.address, symbol: data.symbol, decimals: data.decimals as number };
}

/** Validate every supported control, including exact order sizing and the dated source identity. */
function parse(value: unknown, now: number): LabStudyHandoff {
  const data = exactObject(value, [
    'version',
    'source',
    'createdAt',
    'rules',
    'input',
    'output',
    'amount',
    'identity',
    'settings',
  ]);
  if (
    data.version !== 1 ||
    data.source !== 'quant-studio' ||
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(data.createdAt) ||
    (data.createdAt as number) < 0 ||
    (data.createdAt as number) > now
  )
    throw new Error('bots.errors.stale');
  const input = asset(data.input),
    output = asset(data.output);
  if (
    input.address !== XOR.address ||
    input.symbol !== XOR.symbol ||
    input.decimals !== XOR.decimals ||
    input.address === output.address
  )
    throw new Error('bots.errors.config');
  const identity = exactObject(data.identity, ['genesisHash', 'denominator']);
  if (
    typeof identity.genesisHash !== 'string' ||
    !/^0x[\da-f]{64}$/i.test(identity.genesisHash) ||
    typeof identity.denominator !== 'string' ||
    !/^[1-9][0-9]{0,119}$/.test(identity.denominator)
  )
    throw new Error('bots.errors.config');
  const values = exactObject(data.settings, [
    'capital',
    'tradePercent',
    'feeBudgetXor',
    'slippagePercent',
    'intervalBlocks',
    'validation',
    'trainPercent',
    'folds',
    'historyStartAt',
    'historyEndAt',
  ]);
  const settings = values as unknown as Required<StudySettings>;
  if (
    typeof settings.capital !== 'string' ||
    settings.capital.length > 60 ||
    typeof settings.feeBudgetXor !== 'string' ||
    settings.feeBudgetXor.length > 60 ||
    typeof data.amount !== 'string' ||
    data.amount.length > 60 ||
    typeof settings.slippagePercent !== 'string' ||
    settings.slippagePercent.length > 60 ||
    !Number.isInteger(settings.tradePercent) ||
    settings.tradePercent < 1 ||
    settings.tradePercent > 50 ||
    !Number.isSafeInteger(settings.intervalBlocks) ||
    settings.intervalBlocks < 600 ||
    settings.intervalBlocks > 432000 ||
    !['none', 'holdout', 'walk-forward'].includes(settings.validation) ||
    !Number.isInteger(settings.trainPercent) ||
    settings.trainPercent < 50 ||
    settings.trainPercent > 80 ||
    !Number.isInteger(settings.folds) ||
    settings.folds < 2 ||
    settings.folds > 5 ||
    !Number.isSafeInteger(settings.historyStartAt) ||
    !Number.isSafeInteger(settings.historyEndAt) ||
    settings.historyStartAt < 0 ||
    settings.historyEndAt <= settings.historyStartAt ||
    settings.historyStartAt % HOUR !== 0 ||
    settings.historyEndAt % HOUR !== 0 ||
    settings.historyEndAt > now ||
    settings.historyEndAt - settings.historyStartAt > 10000 * HOUR
  )
    throw new Error('bots.errors.config');
  const capital = codec(toCodec(settings.capital, input.decimals));
  const reserve = codec(toCodec(settings.feeBudgetXor, XOR.decimals));
  const amount = codec(toCodec(data.amount, input.decimals));
  if (
    !capital ||
    capital > codec(toCodec('1000000000', input.decimals)) ||
    !reserve ||
    reserve >= capital ||
    !amount ||
    (capital * BigInt(settings.tradePercent)) % 100n !== 0n ||
    amount !== (capital * BigInt(settings.tradePercent)) / 100n ||
    percent(settings.slippagePercent, '10').lt(percent('0.01', '10'))
  )
    throw new Error('bots.errors.amount');
  return {
    version: 1,
    source: 'quant-studio',
    createdAt: data.createdAt as number,
    rules: parseStrategyRules(data.rules),
    input,
    output,
    amount: data.amount,
    identity: { genesisHash: identity.genesisHash, denominator: identity.denominator },
    settings: { ...settings },
  };
}

/** Carry the Studio's exact nominal sizing into an hourly, untuned Lab holdout draft. */
export function createStudioLabHandoff(
  input: BotAsset,
  output: BotAsset,
  archive: Pick<StudioArchiveInfo, 'genesisHash' | 'denominator' | 'startAt' | 'endAt'>,
  state: StudioState,
  now: number
): LabStudyHandoff {
  const candidate = studioCandidate(state);
  const capital = codec(toCodec(QUANT_CAPITAL_XOR, input.decimals));
  const amount = codec(toCodec(candidate.amount, input.decimals));
  if ((amount * 100n) % capital !== 0n) throw new Error('bots.errors.amount');
  return parse(
    {
      version: 1,
      source: 'quant-studio',
      createdAt: now,
      rules: candidate.rules,
      input: { address: input.address, symbol: input.symbol, decimals: input.decimals },
      output: { address: output.address, symbol: output.symbol, decimals: output.decimals },
      amount: candidate.amount,
      identity: { genesisHash: archive.genesisHash, denominator: archive.denominator },
      settings: {
        capital: QUANT_CAPITAL_XOR,
        tradePercent: Number((amount * 100n) / capital),
        feeBudgetXor: QUANT_FEE_BUDGET_XOR,
        slippagePercent: '0.5',
        intervalBlocks: 600,
        validation: 'holdout',
        trainPercent: QUANT_TRAIN_PERCENT,
        folds: QUANT_FOLDS,
        historyStartAt: archive.startAt,
        historyEndAt: archive.endAt,
      },
    },
    now
  );
}

/** A bounded versioned handoff contains public historical configuration only. */
export function encodeLabStudyHandoff(value: LabStudyHandoff, now = Date.now()): string {
  const encoded = btoa(JSON.stringify(parse(value, now)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  if (encoded.length > MAX_LINK) throw new Error('bots.errors.config');
  return encoded;
}

/** Reject repeated query values, unsupported drafts and malformed controls before applying any field. */
export function decodeLabStudyHandoff(value: unknown, now = Date.now()): LabStudyHandoff | null {
  if (typeof value !== 'string' || !value.length || value.length > MAX_LINK || !/^[A-Za-z0-9_-]+$/.test(value))
    return null;
  try {
    return parse(JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/'))), now);
  } catch {
    return null;
  }
}

/** Resolve metadata without substituting another market or trusting URL-provided precision. */
export function labHandoffAssetsMatch(value: LabStudyHandoff, assets: BotAsset[]): boolean {
  return [value.input, value.output].every((expected) =>
    assets.some(
      (entry) =>
        entry.address === expected.address && entry.symbol === expected.symbol && entry.decimals === expected.decimals
    )
  );
}
