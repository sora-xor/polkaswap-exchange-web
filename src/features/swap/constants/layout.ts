import type { ResponsiveLayouts, WidgetsVisibilityModel } from '@/types/layout';

export enum SwapWidgets {
  Customise = 'customise',
  Form = 'swapForm',
  Chart = 'swapChart',
  Distribution = 'swapDistribution',
  TransactionDetails = 'swapTransactionDetails',
  Transactions = 'swapTransactions',
  TokenPriceChart = 'swapTokenPriceChart',
  SupplyChart = 'swapSupplyChart',
}

export const SWAP_GRID_ID = 'swapGrid:v2';

export const buildDefaultSwapWidgetsVisibility = (): WidgetsVisibilityModel => ({
  [SwapWidgets.Chart]: true,
  [SwapWidgets.Distribution]: true,
  [SwapWidgets.TransactionDetails]: false,
  [SwapWidgets.Transactions]: false,
  [SwapWidgets.TokenPriceChart]: false,
  [SwapWidgets.SupplyChart]: false,
});

export const DEFAULT_SWAP_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { x: 5, y: 0, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 5, y: 20, w: 6, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 5, y: 24, w: 6, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 5, y: 24, w: 6, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 5, y: 24, w: 6, h: 16, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
    { x: 11, y: 0, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 11, y: 20, w: 8, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 11, y: 20, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
  ],
  md: [
    { x: 3, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 3, y: 20, w: 4, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 3, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 3, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 3, y: 24, w: 4, h: 12, minW: 4, minH: 12, i: SwapWidgets.SupplyChart },
    { x: 7, y: 0, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 7, y: 20, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 7, y: 20, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
  ],
  sm: [
    { x: 1, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 1, y: 20, w: 4, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 1, y: 24, w: 4, h: 9, minW: 4, minH: 9, i: SwapWidgets.Distribution },
    { x: 1, y: 24, w: 4, h: 9, minW: 4, minH: 9, i: SwapWidgets.TransactionDetails },
    { x: 1, y: 24, w: 4, h: 20, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
    { x: 5, y: 0, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
    { x: 5, y: 20, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 5, y: 40, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
  ],
  xs: [
    { x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 0, y: 4, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 4, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
    { x: 0, y: 32, w: 4, h: 16, minW: 4, minH: 16, i: SwapWidgets.Transactions },
    { x: 4, y: 20, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.TokenPriceChart },
    { x: 4, y: 20, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.SupplyChart },
  ],
  xss: [
    { x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 0, y: 4, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 0, y: 36, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
    { x: 0, y: 56, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.TokenPriceChart },
    { x: 0, y: 56, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 0, y: 56, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.SupplyChart },
  ],
};
