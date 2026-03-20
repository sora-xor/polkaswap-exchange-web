import { h as computed, j as BridgeNetworkType, y as soraExplorerLinks } from "./index-73GArslZ.js";
import { u as useNetworkFormatter } from "./useNetworkFormatter-Cuwa7_ot.js";
function useBridgeTransaction(tx) {
  const formatter = useNetworkFormatter();
  const { soraNetwork, getNetworkExplorerLinks, getNetworkName, isOutgoingTx, TranslationConsts, EvmLinkType } = formatter;
  const isOutgoing = computed(() => isOutgoingTx(tx.value));
  const externalNetworkType = computed(() => tx.value?.externalNetworkType ?? null);
  const externalNetworkId = computed(() => tx.value?.externalNetwork ?? null);
  const isEvmTxType = computed(
    () => !!externalNetworkType.value && [BridgeNetworkType.Eth, BridgeNetworkType.Evm].includes(externalNetworkType.value)
  );
  const txInternalAccount = computed(() => tx.value?.from ?? "");
  const txExternalAccount = computed(() => tx.value?.to ?? "");
  const txSoraId = computed(() => tx.value?.txId ?? "");
  const txSoraHash = computed(() => tx.value?.hash ?? "");
  const txInternalBlockNumber = computed(() => tx.value?.blockHeight);
  const txInternalBlockId = computed(() => tx.value?.blockId ?? "");
  const txInternalEventIndex = computed(() => tx.value?.payload?.eventIndex);
  const txExternalHash = computed(() => tx.value?.externalHash);
  const txExternalBlockNumber = computed(() => tx.value?.externalBlockHeight);
  const txExternalBlockId = computed(() => tx.value?.externalBlockId ?? "");
  const txExternalEventIndex = computed(
    () => tx.value && "externalEventIndex" in tx.value ? tx.value.externalEventIndex : void 0
  );
  const internalExplorerLinks = computed(
    () => soraExplorerLinks(
      soraNetwork.value,
      txSoraId.value,
      txInternalBlockNumber.value ?? txInternalBlockId.value,
      txInternalEventIndex.value
    )
  );
  const internalAccountLinks = computed(
    () => soraExplorerLinks(soraNetwork.value, txInternalAccount.value, void 0, void 0, true)
  );
  const externalExplorerLinks = computed(() => {
    if (!(externalNetworkType.value && externalNetworkId.value)) return [];
    return getNetworkExplorerLinks(
      externalNetworkType.value,
      externalNetworkId.value,
      txExternalHash.value,
      txExternalBlockNumber.value ?? txExternalBlockId.value,
      txExternalEventIndex.value
    );
  });
  const externalAccountLinks = computed(() => {
    if (!(externalNetworkType.value && externalNetworkId.value)) return [];
    return getNetworkExplorerLinks(
      externalNetworkType.value,
      externalNetworkId.value,
      txExternalAccount.value,
      void 0,
      void 0,
      EvmLinkType.Account
    );
  });
  const getNetworkText = (text, networkId, options = {}) => {
    const network = networkId ? getNetworkName(externalNetworkType.value, networkId) : TranslationConsts.Sora;
    const approx = options.approximate ? TranslationConsts.Max : "";
    return [approx, network, text].filter(Boolean).join(" ");
  };
  return {
    tx,
    formatter,
    isOutgoing,
    isEvmTxType,
    externalNetworkType,
    externalNetworkId,
    txInternalAccount,
    txExternalAccount,
    txSoraId,
    txSoraHash,
    txInternalBlockNumber,
    txInternalBlockId,
    txInternalEventIndex,
    txExternalHash,
    txExternalBlockNumber,
    txExternalBlockId,
    txExternalEventIndex,
    internalExplorerLinks,
    externalExplorerLinks,
    internalAccountLinks,
    externalAccountLinks,
    getNetworkText,
    TranslationConsts,
    EvmLinkType
  };
}
export {
  useBridgeTransaction as u
};
