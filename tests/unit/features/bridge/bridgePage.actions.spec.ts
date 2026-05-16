import { describe, expect, it } from 'vitest';

import {
  BridgeNextAction,
  isBridgeNextButtonDisabled,
  resolveBridgeNextAction,
} from '@/features/bridge/pages/bridgePage.actions';

describe('bridge page primary CTA actions', () => {
  it('enables choose-token state and resolves it to token selection when selector is available', () => {
    const state = {
      areAccountsConnected: true,
      isValidNetwork: true,
      isAssetSelected: false,
      isAssetSelectionAvailable: true,
      isTxConfirmDisabled: true,
    };

    expect(resolveBridgeNextAction(state)).toBe(BridgeNextAction.SelectAsset);
    expect(isBridgeNextButtonDisabled(state)).toBe(false);
  });

  it('keeps choose-token state disabled when token selection is not available', () => {
    const state = {
      areAccountsConnected: true,
      isValidNetwork: true,
      isAssetSelected: false,
      isAssetSelectionAvailable: false,
      isTxConfirmDisabled: true,
    };

    expect(resolveBridgeNextAction(state)).toBe(BridgeNextAction.Ignore);
    expect(isBridgeNextButtonDisabled(state)).toBe(true);
  });

  it('allows invalid-network CTA to request a network change', () => {
    const state = {
      areAccountsConnected: true,
      isValidNetwork: false,
      isAssetSelected: false,
      isAssetSelectionAvailable: true,
      isTxConfirmDisabled: true,
    };

    expect(resolveBridgeNextAction(state)).toBe(BridgeNextAction.ChangeNetwork);
    expect(isBridgeNextButtonDisabled(state)).toBe(false);
  });

  it('uses transaction validation only after an asset is selected', () => {
    const state = {
      areAccountsConnected: true,
      isValidNetwork: true,
      isAssetSelected: true,
      isAssetSelectionAvailable: true,
      isTxConfirmDisabled: false,
    };

    expect(resolveBridgeNextAction(state)).toBe(BridgeNextAction.Confirm);
    expect(isBridgeNextButtonDisabled({ ...state, isTxConfirmDisabled: true })).toBe(true);
    expect(isBridgeNextButtonDisabled({ ...state, isTxConfirmDisabled: false })).toBe(false);
  });

  it('ignores selected-asset states that are still blocked by transaction validation', () => {
    const state = {
      areAccountsConnected: true,
      isValidNetwork: true,
      isAssetSelected: true,
      isAssetSelectionAvailable: true,
      isTxConfirmDisabled: true,
    };

    expect(resolveBridgeNextAction(state)).toBe(BridgeNextAction.Ignore);
  });
});
