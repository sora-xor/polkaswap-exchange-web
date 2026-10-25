import { LiquiditySourceTypes, Errors } from '../../consts';

import * as XYK from '../poolXyk';
import * as TBC from '../multicollateralBoundingCurvePool';
import * as XST from '../xst';
import * as OrderBook from '../orderBook';

export class LiquidityRegistry {
  public static canExchange(source: LiquiditySourceTypes) {
    switch (source) {
      case LiquiditySourceTypes.XYKPool:
        return XYK.canExchange;
      case LiquiditySourceTypes.MulticollateralBondingCurvePool:
        return TBC.canExchange;
      case LiquiditySourceTypes.XSTPool:
        return XST.canExchange;
      case LiquiditySourceTypes.OrderBook:
        return OrderBook.canExchange;
      default:
        throw new Error(Errors.UnsupportedLiquiditySource);
    }
  }

  public static quote(source: LiquiditySourceTypes) {
    switch (source) {
      case LiquiditySourceTypes.XYKPool:
        return XYK.quote;
      case LiquiditySourceTypes.MulticollateralBondingCurvePool:
        return TBC.quote;
      case LiquiditySourceTypes.XSTPool:
        return XST.quote;
      case LiquiditySourceTypes.OrderBook:
        return OrderBook.quote;
      default:
        throw new Error(Errors.UnsupportedLiquiditySource);
    }
  }

  public static quoteWithoutImpact(source: LiquiditySourceTypes) {
    switch (source) {
      case LiquiditySourceTypes.XYKPool:
        return XYK.quoteWithoutImpact;
      case LiquiditySourceTypes.MulticollateralBondingCurvePool:
        return TBC.quoteWithoutImpact;
      case LiquiditySourceTypes.XSTPool:
        return XST.quoteWithoutImpact;
      case LiquiditySourceTypes.OrderBook:
        return OrderBook.quoteWithoutImpact;
      default:
        throw new Error(Errors.UnsupportedLiquiditySource);
    }
  }

  public static stepQuote(source: LiquiditySourceTypes) {
    switch (source) {
      case LiquiditySourceTypes.XYKPool:
        return XYK.stepQuote;
      case LiquiditySourceTypes.MulticollateralBondingCurvePool:
        return TBC.stepQuote;
      case LiquiditySourceTypes.XSTPool:
        return XST.stepQuote;
      case LiquiditySourceTypes.OrderBook:
        return OrderBook.stepQuote;
      default:
        throw new Error(Errors.UnsupportedLiquiditySource);
    }
  }

  public static checkRewards(source: LiquiditySourceTypes) {
    switch (source) {
      case LiquiditySourceTypes.XYKPool:
        return XYK.checkRewards;
      case LiquiditySourceTypes.MulticollateralBondingCurvePool:
        return TBC.checkRewards;
      case LiquiditySourceTypes.XSTPool:
        return XST.checkRewards;
      case LiquiditySourceTypes.OrderBook:
        return OrderBook.checkRewards;
      default:
        throw new Error(Errors.UnsupportedLiquiditySource);
    }
  }
}
