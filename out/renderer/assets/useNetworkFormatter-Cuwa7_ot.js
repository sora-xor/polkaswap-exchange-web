import { u as useTranslation, e as useSettingsStore, i as isWaitingForAction, f as isOutgoingTransaction, h as computed, l as loadWalletCore, B as BridgeTxStatus, j as BridgeNetworkType, E as EvmLinkType, S as SubNetworkId, k as EvmNetworkId, m as SUB_NETWORKS, n as EVM_NETWORKS, t as toSafeExternalLink, o as getSubstrateExplorerLinks, s as store } from "./index-73GArslZ.js";
const { WALLET_CONSTS } = await loadWalletCore();
function buildSubNetworkLinks(networkData, type, value, blockId, eventIndex) {
  const baseLinks = [];
  const polkadotUrl = networkData.nodes?.[0].address;
  const polkadotLink = polkadotUrl ? toSafeExternalLink(`https://polkadot.js.org/apps/?rpc=${encodeURIComponent(polkadotUrl)}#/explorer/query`) : "";
  if (polkadotLink) {
    baseLinks.push({ type: WALLET_CONSTS.ExplorerType.Polkadot, value: polkadotLink });
  }
  return getSubstrateExplorerLinks(baseLinks, type === EvmLinkType.Account, value, blockId, eventIndex);
}
function buildEvmNetworkLinks(networkData, type, value) {
  const explorerUrl = toSafeExternalLink(networkData.blockExplorerUrls[0]);
  if (!explorerUrl || !value) {
    return [];
  }
  const path = type === EvmLinkType.Transaction ? "tx" : "address";
  return [
    {
      type: "etherscan",
      value: `${explorerUrl}/${path}/${value}`
    }
  ];
}
function useNetworkFormatter() {
  const { t, TranslationConsts, formatDate } = useTranslation();
  const settingsStore = useSettingsStore();
  const soraNetwork = computed(() => settingsStore.soraNetwork);
  const networkType = computed(
    () => store.getters.web3.networkType ?? store.state.web3?.networkType
  );
  const networkSelected = computed(
    () => store.getters.web3.networkSelected ?? store.state.web3?.networkSelected
  );
  const selectedNetwork = computed(() => store.getters.web3.selectedNetwork);
  const selectedNetworkFallbackData = computed(() => {
    if (selectedNetwork.value) return selectedNetwork.value;
    if (!networkType.value || networkSelected.value === null || networkSelected.value === void 0) return null;
    const networks = networkType.value === BridgeNetworkType.Sub ? SUB_NETWORKS : EVM_NETWORKS;
    return networks[networkSelected.value] ?? null;
  });
  const availableNetworks = computed(
    () => store.getters.web3.availableNetworks
  );
  const networkFees = computed(() => settingsStore.networkFees);
  const selectedNetworkName = computed(() => selectedNetworkFallbackData.value?.name ?? "");
  const selectedNetworkShortName = computed(() => selectedNetworkFallbackData.value?.shortName ?? "");
  const formatSelectedNetwork = (isSora) => {
    if (isSora && soraNetwork.value) {
      return TranslationConsts.soraNetwork[soraNetwork.value];
    }
    return selectedNetworkName.value;
  };
  const formatNetworkShortName = (isSora) => isSora ? TranslationConsts.Sora : selectedNetworkShortName.value;
  const getNetworkName = (networkType2, networkId) => {
    if (!networkType2 || !networkId) return "";
    const networks = networkType2 === BridgeNetworkType.Sub ? SUB_NETWORKS : EVM_NETWORKS;
    return networks[networkId]?.shortName ?? "";
  };
  const getNetworkIcon = (network) => {
    switch (network) {
      case 0:
        return "sora";
      case EvmNetworkId.BinanceSmartChainMainnet:
      case EvmNetworkId.BinanceSmartChainTestnet:
        return "binance-smart-chain";
      case EvmNetworkId.PolygonMainnet:
      case EvmNetworkId.PolygonTestnetMumbai:
        return "polygon";
      case EvmNetworkId.KlaytnMainnet:
      case EvmNetworkId.KlaytnTestnetBaobab:
        return "klaytn";
      case EvmNetworkId.AvalancheMainnet:
      case EvmNetworkId.AvalancheTestnetFuji:
        return "avalanche";
      case EvmNetworkId.EthereumClassicMainnet:
      case EvmNetworkId.EthereumClassicTestnetMordor:
        return "ethereum-classic";
      case SubNetworkId.Polkadot:
        return "polkadot";
      case SubNetworkId.PolkadotSora:
        return "sora-polkadot";
      case SubNetworkId.PolkadotAcala:
        return "acala";
      case SubNetworkId.PolkadotAstar:
        return "astar";
      case SubNetworkId.PolkadotMoonbeam:
        return "moonbeam";
      case SubNetworkId.Kusama:
        return "kusama";
      case SubNetworkId.KusamaCurio:
        return "curio";
      case SubNetworkId.KusamaShiden:
        return "shiden";
      case SubNetworkId.Rococo:
        return "rococo";
      case SubNetworkId.RococoSora:
        return "sora-rococo";
      case SubNetworkId.KusamaSora:
        return "sora-kusama";
      case SubNetworkId.Liberland:
        return "liberland";
      case SubNetworkId.Alphanet:
        return "alphanet";
      case SubNetworkId.AlphanetSora:
        return "sora-alphanet";
      case SubNetworkId.AlphanetMoonbase:
        return "moonbase";
      default:
        return "ethereum";
    }
  };
  const getNetworkExplorerLinks = ({
    networkType: networkType2,
    networkId,
    value,
    blockId,
    eventIndex,
    type = EvmLinkType.Transaction
  }) => {
    const networkMeta = availableNetworks.value[networkType2]?.[networkId];
    const networkData = networkMeta?.data;
    if (!networkData) {
      console.error(`Network data for "${networkId}" is not defined`);
      return [];
    }
    return networkType2 === BridgeNetworkType.Sub ? buildSubNetworkLinks(networkData, type, value, blockId, eventIndex) : buildEvmNetworkLinks(networkData, type, value);
  };
  const isOutgoingTx = (item) => isOutgoingTransaction(item);
  const isFailedState = (item) => {
    if (!item?.transactionState) return false;
    if ([WALLET_CONSTS.ETH_BRIDGE_STATES.EVM_REJECTED, WALLET_CONSTS.ETH_BRIDGE_STATES.SORA_REJECTED].includes(
      item.transactionState
    )) {
      return true;
    }
    if (item.transactionState === BridgeTxStatus.Failed) return true;
    return false;
  };
  const isSuccessState = (item) => {
    if (!item) return false;
    if (item.transactionState === (isOutgoingTx(item) ? WALLET_CONSTS.ETH_BRIDGE_STATES.EVM_COMMITED : WALLET_CONSTS.ETH_BRIDGE_STATES.SORA_COMMITED)) {
      return true;
    }
    if (item.transactionState === BridgeTxStatus.Done) return true;
    return false;
  };
  const isWaitingForActionState = (item) => isWaitingForAction(item);
  const formatDatetime = (item) => formatDate(item?.startTime ?? Date.now());
  return {
    t,
    TranslationConsts,
    networkFees,
    selectedNetwork,
    soraNetwork,
    selectedNetworkName,
    selectedNetworkShortName,
    formatSelectedNetwork,
    formatNetworkShortName,
    getNetworkName,
    getNetworkIcon,
    getNetworkExplorerLinks,
    isOutgoingTx,
    isFailedState,
    isSuccessState,
    isWaitingForActionState,
    formatDatetime
  };
}
export {
  useNetworkFormatter as u
};
