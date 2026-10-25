import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber } from '@sora-substrate/sdk';

import { agentError } from './errors';
import type { AgentDexId, AgentSwapSide } from './types';

const DECIMAL_INPUT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SLIPPAGE_MIN = '0.01';
const SLIPPAGE_MAX = '10';
const PERCENT_MAX = '100';
const DEFAULT_READY_TIMEOUT_MS = 30_000;
const DEFAULT_QUOTE_TIMEOUT_MS = 15_000;

const isBlank = (value: unknown): boolean => value === undefined || value === null || `${value}`.trim() === '';

export function normalizeSwapSide(side: unknown): AgentSwapSide {
  if (isBlank(side)) return 'input';
  if (side === 'input' || side === 'output') return side;

  throw agentError('INVALID_SWAP_SIDE', 'Swap side must be "input" or "output".', { side });
}

/**
 * Normalizes a human-readable token amount while rejecting empty, negative,
 * exponent, and non-decimal inputs before they reach token math.
 */
export function normalizeNaturalAmount(value: unknown): string {
  const amount = `${value ?? ''}`.trim();

  if (!DECIMAL_INPUT_PATTERN.test(amount)) {
    throw agentError('INVALID_AMOUNT', 'Amount must be a positive decimal string.', { amount });
  }

  const fpAmount = new FPNumber(amount);
  if (FPNumber.lte(fpAmount, FPNumber.ZERO)) {
    throw agentError('INVALID_AMOUNT', 'Amount must be greater than zero.', { amount });
  }

  return amount;
}

export function normalizeOptionalNaturalAmount(value: unknown): string | undefined {
  if (isBlank(value)) return undefined;
  return normalizeNaturalAmount(value);
}

export function normalizePercent(value: unknown): string {
  const percent = `${value ?? ''}`.trim();

  if (!DECIMAL_INPUT_PATTERN.test(percent)) {
    throw agentError('INVALID_PERCENT', 'Percent must be a positive decimal string.', { percent });
  }

  const fpPercent = new FPNumber(percent);
  if (FPNumber.lte(fpPercent, FPNumber.ZERO) || FPNumber.gt(fpPercent, new FPNumber(PERCENT_MAX))) {
    throw agentError('INVALID_PERCENT', 'Percent must be greater than 0 and less than or equal to 100.', {
      percent,
      max: PERCENT_MAX,
    });
  }

  return percent;
}

export function normalizeSlippageTolerance(value: unknown, defaultValue: string): string {
  const slippage = isBlank(value) ? `${defaultValue}`.trim() : `${value}`.trim();

  if (!DECIMAL_INPUT_PATTERN.test(slippage)) {
    throw agentError('INVALID_SLIPPAGE', 'Slippage tolerance must be a decimal percent.', { slippage });
  }

  const fpSlippage = new FPNumber(slippage);
  const fpMin = new FPNumber(SLIPPAGE_MIN);
  const fpMax = new FPNumber(SLIPPAGE_MAX);

  if (FPNumber.lt(fpSlippage, fpMin) || FPNumber.gt(fpSlippage, fpMax)) {
    throw agentError('INVALID_SLIPPAGE', 'Slippage tolerance must be between 0.01 and 10 percent.', {
      slippage,
      min: SLIPPAGE_MIN,
      max: SLIPPAGE_MAX,
    });
  }

  return slippage;
}

export function normalizeLiquiditySource(value: unknown): LiquiditySourceTypes | undefined {
  if (isBlank(value)) return undefined;

  const source = `${value}` as LiquiditySourceTypes;
  const allowed = Object.values(LiquiditySourceTypes) as string[];

  if (!allowed.includes(source)) {
    throw agentError('INVALID_LIQUIDITY_SOURCE', 'Liquidity source is not supported.', { source, allowed });
  }

  return source;
}

export function normalizeDexId(value: unknown): AgentDexId {
  if (isBlank(value) || value === 'best') return 'best';

  const id = typeof value === 'number' ? value : Number(`${value}`.trim());
  if (!Number.isSafeInteger(id) || id < 0) {
    throw agentError('INVALID_DEX_ID', 'DEX id must be "best" or a non-negative integer.', { dexId: value });
  }

  return id;
}

export function normalizeTimeoutMs(value: unknown, defaultValue = DEFAULT_QUOTE_TIMEOUT_MS): number {
  if (isBlank(value)) return defaultValue;

  const timeoutMs = Number(value);
  return Number.isFinite(timeoutMs) && timeoutMs >= 100 ? timeoutMs : defaultValue;
}

export function normalizeReadyTimeoutMs(value: unknown): number {
  return normalizeTimeoutMs(value, DEFAULT_READY_TIMEOUT_MS);
}

export const agentTradingValidationLimits = Object.freeze({
  percentMax: PERCENT_MAX,
  slippageMin: SLIPPAGE_MIN,
  slippageMax: SLIPPAGE_MAX,
  defaultQuoteTimeoutMs: DEFAULT_QUOTE_TIMEOUT_MS,
  defaultReadyTimeoutMs: DEFAULT_READY_TIMEOUT_MS,
});
