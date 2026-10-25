import type { BreakpointKey } from '@/consts/layout';
import type { Layout, LayoutWidget, ResponsiveLayouts } from '@/types/layout';

import { DEFAULT_SWAP_LAYOUTS, SwapWidgets } from './layout';

const LEGACY_SWAP_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { x: 4, y: 0, w: 7, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 4, y: 20, w: 7, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 4, y: 24, w: 7, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 4, y: 24, w: 7, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 4, y: 24, w: 7, h: 16, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
    { x: 11, y: 0, w: 9, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 11, y: 20, w: 9, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 11, y: 20, w: 9, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
  ],
  md: [
    { x: 2, y: 0, w: 5, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 2, y: 20, w: 5, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 2, y: 24, w: 5, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 2, y: 24, w: 5, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 2, y: 24, w: 5, h: 12, minW: 4, minH: 12, i: SwapWidgets.SupplyChart },
    { x: 7, y: 0, w: 7, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 7, y: 20, w: 7, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 7, y: 20, w: 7, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
  ],
  sm: [
    { x: 0, y: 0, w: 5, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 0, y: 20, w: 5, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 0, y: 24, w: 5, h: 9, minW: 4, minH: 9, i: SwapWidgets.Distribution },
    { x: 0, y: 24, w: 5, h: 9, minW: 4, minH: 9, i: SwapWidgets.TransactionDetails },
    { x: 0, y: 24, w: 5, h: 20, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
    { x: 5, y: 0, w: 7, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
    { x: 5, y: 20, w: 7, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 5, y: 40, w: 7, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
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

/**
 * Moves legacy Swap layouts past the removed Customize row once. Presence of
 * that row is the migration marker; hidden widgets and desktop edits survive.
 */
export function migrateSwapLayouts(stored: ResponsiveLayouts): ResponsiveLayouts {
  const migrated: ResponsiveLayouts = {};

  for (const point of Object.keys(DEFAULT_SWAP_LAYOUTS) as BreakpointKey[]) {
    const source = stored[point];
    if (!Array.isArray(source)) continue;

    const widgets = source.filter((widget): widget is LayoutWidget => Boolean(widget && typeof widget.i === 'string'));
    if (!widgets.some((widget) => widget.i === SwapWidgets.Customise)) {
      migrated[point] = widgets;
      continue;
    }

    const defaults = DEFAULT_SWAP_LAYOUTS[point] ?? [];
    const defaultById = new Map(defaults.map((widget) => [widget.i, widget]));
    const retained = widgets.filter((widget) => widget.i !== SwapWidgets.Customise && defaultById.has(widget.i));

    if (point === 'xs' || point === 'xss') {
      const rank = (widget: LayoutWidget): number =>
        widget.i === SwapWidgets.Form ? 0 : widget.i === SwapWidgets.Chart ? 1 : 2;
      const ordered = [...retained].sort((a, b) => rank(a) - rank(b) || a.y - b.y || a.x - b.x);
      let y = 0;
      migrated[point] = ordered.map((widget) => {
        const fallback = defaultById.get(widget.i)!;
        const h = Number.isFinite(widget.h) ? Math.max(fallback.minH ?? 1, widget.h) : fallback.h;
        const result = { ...widget, x: 0, y, w: fallback.w, h };
        y += h;
        return result;
      });
      continue;
    }

    const legacyById = new Map((LEGACY_SWAP_LAYOUTS[point] ?? []).map((widget) => [widget.i, widget]));
    migrated[point] = retained.map((widget) => {
      const legacy = legacyById.get(widget.i);
      const isDefaultPosition = legacy && (['x', 'y', 'w', 'h'] as const).every((key) => widget[key] === legacy[key]);
      return isDefaultPosition ? { ...widget, ...defaultById.get(widget.i) } : { ...widget };
    }) as Layout;
  }

  return migrated;
}
