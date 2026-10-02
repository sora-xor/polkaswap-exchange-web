import { Breakpoint, BreakpointKey } from '@/consts/layout';
import type { LayoutConfig, ResponsiveLayouts, WidgetsVisibilityModel } from '@/types/layout';

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

export const SWAP_GRID_ID = 'swapGrid:v3';

/**
 * Chooses at least the saved small-desktop layout above the viewport cutoff,
 * even when the sidebar makes the grid narrower than 1024px. Larger saved
 * desktop breakpoints and all narrow viewport breakpoints stay unchanged.
 */
export function buildSwapGridBreakpoints(viewportWidth: number): LayoutConfig {
  const desktop = viewportWidth > Breakpoint.Desktop;
  return {
    [BreakpointKey.lg]: Breakpoint.HugeDesktop,
    [BreakpointKey.md]: Breakpoint.LargeDesktop,
    [BreakpointKey.sm]: desktop ? 1 : Breakpoint.Desktop,
    [BreakpointKey.xs]: desktop ? 0 : Breakpoint.Tablet,
    [BreakpointKey.xss]: 0,
  };
}

/** Default optional widgets; the swap form is always present. */
export const buildDefaultSwapWidgetsVisibility = (): WidgetsVisibilityModel => ({
  [SwapWidgets.Chart]: true,
  [SwapWidgets.Distribution]: true,
  [SwapWidgets.TransactionDetails]: false,
  [SwapWidgets.Transactions]: false,
  [SwapWidgets.TokenPriceChart]: false,
  [SwapWidgets.SupplyChart]: false,
});

/** Equal desktop columns and a form-first stack for narrower grid breakpoints. */
export const DEFAULT_SWAP_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { x: 4, y: 0, w: 8, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 12, y: 0, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 4, y: 20, w: 8, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 4, y: 20, w: 8, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 12, y: 20, w: 8, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 12, y: 40, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
    { x: 4, y: 28, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
  ],
  md: [
    { x: 2, y: 0, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 8, y: 0, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 2, y: 20, w: 6, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 2, y: 20, w: 6, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 8, y: 20, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 8, y: 40, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
    { x: 2, y: 28, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
  ],
  sm: [
    { x: 0, y: 0, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 6, y: 0, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 0, y: 20, w: 6, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 0, y: 20, w: 6, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 6, y: 20, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 6, y: 40, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
    { x: 0, y: 28, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
  ],
  xs: [
    { x: 0, y: 0, w: 8, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 0, y: 20, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 0, y: 40, w: 8, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 0, y: 40, w: 8, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 0, y: 48, w: 8, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 0, y: 68, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
    { x: 0, y: 88, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
  ],
  xss: [
    { x: 0, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 0, y: 20, w: 4, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 0, y: 40, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 0, y: 40, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 0, y: 48, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 0, y: 68, w: 4, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
    { x: 0, y: 88, w: 4, h: 20, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
  ],
};
