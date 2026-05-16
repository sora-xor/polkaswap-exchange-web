export enum BridgeNextAction {
  Ignore = 'ignore',
  ChangeNetwork = 'changeNetwork',
  SelectAsset = 'selectAsset',
  Confirm = 'confirm',
}

interface BridgeNextActionState {
  areAccountsConnected: boolean;
  isValidNetwork: boolean;
  isAssetSelected: boolean;
  isAssetSelectionAvailable: boolean;
  isTxConfirmDisabled: boolean;
}

type BridgeNextButtonDisabledState = BridgeNextActionState;

/**
 * Resolves the action behind the bridge primary CTA so every button-styled state
 * either performs a user-visible action or is rendered disabled.
 */
export const resolveBridgeNextAction = (state: BridgeNextActionState): BridgeNextAction => {
  if (!state.areAccountsConnected) return BridgeNextAction.Ignore;
  if (!state.isValidNetwork) return BridgeNextAction.ChangeNetwork;
  if (!state.isAssetSelected && state.isAssetSelectionAvailable) return BridgeNextAction.SelectAsset;
  if (!state.isAssetSelected) return BridgeNextAction.Ignore;
  if (state.isTxConfirmDisabled) return BridgeNextAction.Ignore;
  return BridgeNextAction.Confirm;
};

/**
 * Keeps the choose-token CTA enabled only when clicking it can open token
 * selection; all validation-only messages stay non-clickable.
 */
export const isBridgeNextButtonDisabled = (state: BridgeNextButtonDisabledState): boolean => {
  if (!state.areAccountsConnected) return true;
  if (!state.isValidNetwork) return false;
  if (!state.isAssetSelected) return !state.isAssetSelectionAvailable;
  return state.isTxConfirmDisabled;
};
