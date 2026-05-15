import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { computed, type ComputedRef } from 'vue';

import { soraExplorerLinks } from '@/utils';
import { useNetworkFormatter } from '@/composables/useNetworkFormatter';
import { EvmLinkType } from '@/consts/evm';

import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { Nullable } from '@/types/common';

type NetworkTextOptions = {
  approximate?: boolean;
};

/**
 * Replaces `BridgeTransactionMixin` by exposing explorer links and network helpers
 * for a given transaction reference.
 */
export function useBridgeTransaction(tx: ComputedRef<Nullable<IBridgeTransaction>>) {
  const formatter = useNetworkFormatter();
  const { soraNetwork, getNetworkExplorerLinks, getNetworkName, isOutgoingTx, TranslationConsts } = formatter;

  const isOutgoing = computed(() => isOutgoingTx(tx.value));

  const externalNetworkType = computed(() => tx.value?.externalNetworkType ?? null);
  const externalNetworkId = computed(() => tx.value?.externalNetwork ?? null);

  const isEvmTxType = computed(
    () =>
      !!externalNetworkType.value && [BridgeNetworkType.Eth, BridgeNetworkType.Evm].includes(externalNetworkType.value)
  );

  const txInternalAccount = computed(() => tx.value?.from ?? '');
  const txExternalAccount = computed(() => tx.value?.to ?? '');

  const txSoraId = computed(() => tx.value?.txId ?? '');
  const txSoraHash = computed(() => tx.value?.hash ?? '');
  const txInternalBlockNumber = computed(() => tx.value?.blockHeight);
  const txInternalBlockId = computed(() => tx.value?.blockId ?? '');
  const txInternalEventIndex = computed(() => tx.value?.payload?.eventIndex);

  const txExternalHash = computed(() => tx.value?.externalHash);
  const txExternalBlockNumber = computed(() => tx.value?.externalBlockHeight);
  const txExternalBlockId = computed(() => tx.value?.externalBlockId ?? '');
  const txExternalEventIndex = computed(() =>
    tx.value && 'externalEventIndex' in tx.value ? tx.value.externalEventIndex : undefined
  );

  const internalExplorerLinks = computed(() =>
    soraExplorerLinks(
      soraNetwork.value,
      txSoraId.value,
      txInternalBlockNumber.value ?? txInternalBlockId.value,
      txInternalEventIndex.value
    )
  );

  const internalAccountLinks = computed(() =>
    soraExplorerLinks(soraNetwork.value, txInternalAccount.value, undefined, undefined, true)
  );

  const externalExplorerLinks = computed(() => {
    if (!(externalNetworkType.value && externalNetworkId.value)) return [];

    return getNetworkExplorerLinks({
      networkType: externalNetworkType.value,
      networkId: externalNetworkId.value,
      value: txExternalHash.value,
      blockId: txExternalBlockNumber.value ?? txExternalBlockId.value,
      eventIndex: txExternalEventIndex.value,
    });
  });

  const externalAccountLinks = computed(() => {
    if (!(externalNetworkType.value && externalNetworkId.value)) return [];

    return getNetworkExplorerLinks({
      networkType: externalNetworkType.value,
      networkId: externalNetworkId.value,
      value: txExternalAccount.value,
      type: EvmLinkType.Account,
    });
  });

  const getNetworkText = (
    text: string,
    networkId?: Nullable<BridgeNetworkId>,
    options: NetworkTextOptions = {}
  ): string => {
    const network = networkId ? getNetworkName(externalNetworkType.value, networkId) : TranslationConsts.Sora;
    const approx = options.approximate ? TranslationConsts.Max : '';

    return [approx, network, text].filter(Boolean).join(' ');
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
    EvmLinkType,
  };
}

export type BridgeTransactionComposable = ReturnType<typeof useBridgeTransaction>;
