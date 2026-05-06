import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { resolveAppMainRouteClass } from '@/app/shell/policies/resolveAppMainRouteClass';
import { resolveDialogVisibilityOnRouteChange } from '@/app/shell/policies/resolveDialogVisibilityOnRouteChange';
import { resolveDisclaimerVisibilityOnRouteChange } from '@/app/shell/policies/resolveDisclaimerVisibilityOnRouteChange';
import { resolveMenuVisibilityOnBreakpointChange } from '@/app/shell/policies/resolveMenuVisibilityOnBreakpointChange';
import { resolveMenuVisibilityOnRouteChange } from '@/app/shell/policies/resolveMenuVisibilityOnRouteChange';
import { resolveParentLoadingByConnection } from '@/app/shell/policies/resolveParentLoadingByConnection';
import { resolveProductPopupKey } from '@/app/shell/policies/resolveProductPopupKey';
import { resolveWalletOverlayVisibility } from '@/app/shell/policies/resolveWalletOverlayVisibility';

describe('app shell policies', () => {
  it('normalizes app-main route classes and aliases', () => {
    expect(resolveAppMainRouteClass(undefined)).toBeNull();
    expect(resolveAppMainRouteClass('')).toBeNull();
    expect(resolveAppMainRouteClass('Swap')).toBe('swap');
    expect(resolveAppMainRouteClass('ValidatorsType')).toBe('selectvalidators');
    expect(resolveAppMainRouteClass('ValidatorsSelect')).toBe('selectvalidators');
  });

  it('resolves parent loading from connection bootstrap and transaction state', () => {
    expect(
      resolveParentLoadingByConnection({
        transactionLoading: false,
        nodeConnected: false,
        nodeGateExpired: false,
        hasNodeConfiguration: true,
      })
    ).toBe(true);

    expect(
      resolveParentLoadingByConnection({
        transactionLoading: true,
        nodeConnected: true,
        nodeGateExpired: false,
        hasNodeConfiguration: true,
      })
    ).toBe(true);

    expect(
      resolveParentLoadingByConnection({
        transactionLoading: true,
        nodeConnected: false,
        nodeGateExpired: true,
        hasNodeConfiguration: true,
      })
    ).toBe(false);

    expect(
      resolveParentLoadingByConnection({
        transactionLoading: false,
        nodeConnected: true,
        nodeGateExpired: false,
        hasNodeConfiguration: true,
      })
    ).toBe(false);
  });

  it('keeps dialogs and menus open only when the route is effectively unchanged', () => {
    expect(resolveDialogVisibilityOnRouteChange(false, '/swap', '/assets')).toBe(false);
    expect(resolveDialogVisibilityOnRouteChange(true, '/swap', undefined)).toBe(true);
    expect(resolveDialogVisibilityOnRouteChange(true, '/swap', '/swap')).toBe(true);
    expect(resolveDialogVisibilityOnRouteChange(true, '/swap', '/assets')).toBe(false);

    expect(resolveMenuVisibilityOnRouteChange(false, '/swap', '/assets')).toBe(false);
    expect(resolveMenuVisibilityOnRouteChange(true, '/swap', undefined)).toBe(true);
    expect(resolveMenuVisibilityOnRouteChange(true, '/swap', '/swap')).toBe(true);
    expect(resolveMenuVisibilityOnRouteChange(true, '/swap', '/assets')).toBe(false);
  });

  it('closes menus across breakpoint changes but preserves them on stable breakpoints', () => {
    expect(resolveMenuVisibilityOnBreakpointChange(false, 'desktop', 'mobile')).toBe(false);
    expect(resolveMenuVisibilityOnBreakpointChange(true, 'desktop', undefined)).toBe(true);
    expect(resolveMenuVisibilityOnBreakpointChange(true, 'desktop', 'desktop')).toBe(true);
    expect(resolveMenuVisibilityOnBreakpointChange(true, 'desktop', 'mobile')).toBe(false);
  });

  it('keeps the disclaimer locked to swap until the user approves it', () => {
    expect(resolveDisclaimerVisibilityOnRouteChange(false, false, PageNames.Swap)).toBe(true);
    expect(resolveDisclaimerVisibilityOnRouteChange(true, false, PageNames.Farm)).toBe(false);
    expect(resolveDisclaimerVisibilityOnRouteChange(false, true, PageNames.Farm)).toBe(false);
    expect(resolveDisclaimerVisibilityOnRouteChange(true, true, PageNames.Farm)).toBe(true);
  });

  it('derives popup keys and wallet overlay visibility', () => {
    expect(resolveProductPopupKey()).toBe('showSoraMobilePopup');
    expect(resolveProductPopupKey('   ')).toBe('showSoraMobilePopup');
    expect(resolveProductPopupKey('example')).toBe('showExamplePopup');

    expect(resolveWalletOverlayVisibility(true, false)).toBe(true);
    expect(resolveWalletOverlayVisibility(false, false)).toBe(false);
    expect(resolveWalletOverlayVisibility(true, true)).toBe(false);
  });
});
