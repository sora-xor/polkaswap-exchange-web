import { defineGetters } from 'direct-vuex';
import { connection } from '@soramitsu/soraneo-wallet-web';
import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';

import { settingsGetterContext } from '@/store/settings';
import { LiquiditySourceForMarketAlgorithm } from '@/consts';
import type { NodesHashTable, SettingsState } from './types';
import type { Node } from '@/types/nodes';

const getters = defineGetters<SettingsState>()({
  defaultNodesHashTable(...args): NodesHashTable {
    const { state } = settingsGetterContext(args);
    return state.defaultNodes.reduce<NodesHashTable>((result, node: Node) => ({ ...result, [node.address]: node }), {});
  },
  customNodes(...args): Array<Node> {
    const { state, getters } = settingsGetterContext(args);
    return state.customNodes.filter((node) => !(node.address in getters.defaultNodesHashTable));
  },
  nodeList(...args): Array<Node> {
    const { state, getters } = settingsGetterContext(args);
    return [...state.defaultNodes, ...getters.customNodes];
  },
  nodeIsConnected(...args): boolean {
    const { state } = settingsGetterContext(args);
    return !!state.node?.address && !state.nodeAddressConnecting && connection.opened;
  },
  liquiditySource(...args): LiquiditySourceTypes {
    const { state } = settingsGetterContext(args);
    return LiquiditySourceForMarketAlgorithm[state.marketAlgorithm];
  },
  moonpayApiKey(...args): string {
    const { rootState } = settingsGetterContext(args);
    return rootState.wallet.settings.apiKeys.moonpay;
  },
  moonpayEnabled(...args): boolean {
    const { state, getters } = settingsGetterContext(args);
    return !!getters.moonpayApiKey && !!state.featureFlags.moonpay;
  },
  chartsFlagEnabled(...args): boolean {
    const { state } = settingsGetterContext(args);
    return !!state.featureFlags.charts;
  },
  chartsEnabled(...args): boolean {
    const { state } = settingsGetterContext(args);
    return !!state.featureFlags.charts && state.сhartsEnabled;
  },
  notificationActivated(...args): boolean {
    const { state } = settingsGetterContext(args);
    return state.browserNotifsPermission === 'granted';
  },
});

export default getters;
