import type { PolkamarktMarket } from '../types';

export interface PricingCurvePosition {
  yesDemand?: number;
  noDemand?: number;
  yesQuote?: number;
  noQuote?: number;
  collateral?: number;
}

export interface PricingCurvePoint {
  percent: number;
  yesQuote: number;
  noQuote: number;
}

const CURVE_POINT_COUNT = 99;
const DPM_MECHANISM = 'dynamicparimutuel';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const finiteNumber = (value: number | undefined): number | undefined =>
  Number.isFinite(value) ? Number(value) : undefined;

const bpsToRatio = (value: number | undefined): number | undefined => {
  const number = finiteNumber(value);
  return number === undefined ? undefined : number / 10_000;
};

const bpsToPercent = (value: number | undefined): number | undefined => {
  const number = finiteNumber(value);
  return number === undefined ? undefined : number / 100;
};

const normalizedMechanism = (value?: string): string => value?.replace(/[_\s-]/g, '').toLowerCase() ?? '';

/**
 * Detects markets that should use the Dynamic Pari-Mutuel explanatory UI.
 */
export function isDpmMarket(market?: PolkamarktMarket): boolean {
  if (!market) return false;
  if (normalizedMechanism(market.mechanism) === DPM_MECHANISM) return true;
  if (market.mechanism && normalizedMechanism(market.mechanism) !== DPM_MECHANISM) return false;

  return [
    market.virtualDepth,
    market.dpmCollateral,
    market.realYesShares,
    market.realNoShares,
    market.marginalYesPriceBps,
    market.marginalNoPriceBps,
    market.impliedYesProbabilityBps,
    market.impliedNoProbabilityBps,
  ].some((value) => finiteNumber(value) !== undefined);
}

/**
 * Computes the DPM marginal price for a demand share on the YES side.
 */
export function pricingCurveSharePrice(yesShare: number): number {
  const yes = clamp(yesShare, 0.01, 0.99);
  const no = 1 - yes;
  return yes / Math.sqrt(yes ** 2 + no ** 2);
}

/**
 * Precomputes the YES and NO DPM curve paths as percentage/price points.
 */
export function pricingCurvePoints(): PricingCurvePoint[] {
  return Array.from({ length: CURVE_POINT_COUNT }, (_, index) => {
    const percent = index + 1;
    const yesShare = percent / 100;

    return {
      percent,
      yesQuote: pricingCurveSharePrice(yesShare),
      noQuote: pricingCurveSharePrice(1 - yesShare),
    };
  });
}

/**
 * Derives the current chart marker and quote labels from indexed/runtime DPM fields.
 */
export function getPricingCurvePosition(market?: PolkamarktMarket): PricingCurvePosition {
  const virtualDepth = finiteNumber(market?.virtualDepth);
  const realYesShares = finiteNumber(market?.realYesShares);
  const realNoShares = finiteNumber(market?.realNoShares);
  const qYes =
    virtualDepth !== undefined && realYesShares !== undefined ? virtualDepth + realYesShares : undefined;
  const qNo = virtualDepth !== undefined && realNoShares !== undefined ? virtualDepth + realNoShares : undefined;
  const totalQ = qYes !== undefined && qNo !== undefined && qYes + qNo > 0 ? qYes + qNo : undefined;
  const derivedDemand =
    totalQ === undefined
      ? bpsToPercent(market?.impliedYesProbabilityBps) ?? finiteNumber(market?.probability)
      : (qYes / totalQ) * 100;
  const yesDemand = derivedDemand === undefined ? undefined : clamp(derivedDemand, 1, 99);
  const derivedYesQuote = yesDemand === undefined ? undefined : pricingCurveSharePrice(yesDemand / 100);
  const derivedNoQuote = yesDemand === undefined ? undefined : pricingCurveSharePrice(1 - yesDemand / 100);

  return {
    yesDemand,
    noDemand: yesDemand === undefined ? undefined : 100 - yesDemand,
    yesQuote: bpsToRatio(market?.marginalYesPriceBps) ?? derivedYesQuote,
    noQuote: bpsToRatio(market?.marginalNoPriceBps) ?? derivedNoQuote,
    collateral: finiteNumber(market?.dpmCollateral) ?? finiteNumber(market?.liquidity),
  };
}
