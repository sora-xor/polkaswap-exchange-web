import { DefaultMarketAlgorithm, DefaultSlippageTolerance, MarketAlgorithms } from '@/consts';
import { getLocale } from '@/lang';
import storage, { settingsStorage } from '@/utils/storage';
import type { SettingsState } from './types';

function initialState(): SettingsState {
  const node = settingsStorage.get('node');
  const customNodes = settingsStorage.get('customNodes');
  return {
    featureFlags: {},
    slippageTolerance: storage.get('slippageTolerance') || DefaultSlippageTolerance,
    marketAlgorithm: (storage.get('marketAlgorithm') || DefaultMarketAlgorithm) as MarketAlgorithms,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    node: node ? JSON.parse(node) : {},
    language: getLocale(),
    defaultNodes: [],
    customNodes: customNodes ? JSON.parse(customNodes) : [],
    nodeAddressConnecting: '',
    nodeConnectionAllowance: true,
    chainGenesisHash: '',
    faucetUrl: '',
    selectNodeDialogVisibility: false,
    selectLanguageDialogVisibility: false,
    blockNumber: 0,
    blockNumberUpdates: null,
  };
}

const state = initialState();

export default state;
