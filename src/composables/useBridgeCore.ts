import { FPNumber, type CodecString } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { PageNames } from '@/consts';
import router from '@/router';
import store from '@/store';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeFormStore } from '@/stores/bridge/form';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';

/**
 * Provides bridge-specific helpers that historically lived inside `BridgeMixin`.
 */
export function useBridgeCore() {
  const assetsStore = useAssetsStore();
  const bridgeFormStore = useBridgeFormStore();
  const {
    externalNativeBalance,
    assetLockedBalance,
    assetExternalMinBalance,
    outgoingMinLimit,
    outgoingMaxLimit,
    incomingMinLimit,
    soraNetworkFee,
    externalTransferFee,
  } = storeToRefs(bridgeFormStore);
  const isSoraToEvm = computed(() => store.state.bridge.isSoraToEvm);
  const asset = computed(() => store.getters.bridge.asset as Nullable<RegisteredAccountAsset>);
  const nativeToken = computed(() => store.getters.bridge.nativeToken as Nullable<RegisteredAccountAsset>);
  const sender = computed(() => store.getters.bridge.sender as string);
  const recipient = computed(() => store.getters.bridge.recipient as string);
  const isValidNetwork = computed(() => Boolean(store.getters.web3.isValidNetwork));
  const externalNetworkFee = computed(() => store.getters.bridge.externalNetworkFee as CodecString);
  const isNativeTokenSelected = computed(() => Boolean(store.getters.bridge.isNativeTokenSelected));
  const isSidechainAsset = computed(() => Boolean(store.getters.bridge.isSidechainAsset));
  const xor = computed(() => assetsStore.assetDataByAddress(XOR.address) as RegisteredAccountAsset);

  const externalTransferFeeFP = computed(() =>
    FPNumber.fromCodecValue(externalTransferFee.value, asset.value?.externalDecimals)
  );

  const nativeTokenSymbol = computed(() => nativeToken.value?.symbol ?? '');
  const nativeTokenDecimals = computed(() => nativeToken.value?.externalDecimals);

  const outgoingMaxAmount = computed<Nullable<FPNumber>>(() => {
    const limits: FPNumber[] = [];

    if (outgoingMaxLimit.value) limits.push(outgoingMaxLimit.value);
    if (isSidechainAsset.value && assetLockedBalance.value) limits.push(assetLockedBalance.value);

    if (!limits.length) return null;
    return FPNumber.min(...limits);
  });

  const outgoingMinAmount = computed<Nullable<FPNumber>>(() => {
    if (!outgoingMinLimit.value) return null;
    return outgoingMinLimit.value.add(externalTransferFeeFP.value);
  });

  const incomingMaxAmount = computed<Nullable<FPNumber>>(() => {
    if (isSidechainAsset.value) return null;
    return assetLockedBalance.value ?? null;
  });

  const getTransferMaxAmount = (isOutgoing: boolean): Nullable<FPNumber> =>
    isOutgoing ? outgoingMaxAmount.value : incomingMaxAmount.value;

  const getTransferMinAmount = (isOutgoing: boolean): Nullable<FPNumber> =>
    isOutgoing ? outgoingMinAmount.value : incomingMinLimit.value;

  const isGreaterThanTransferMaxAmount = (
    amount: string,
    currentAsset: Nullable<RegisteredAccountAsset>,
    isOutgoing: boolean,
    isRegisteredAsset = true
  ): boolean => {
    const maxAmount = getTransferMaxAmount(isOutgoing);
    if (!(currentAsset && isRegisteredAsset && maxAmount)) return false;

    const fpAmount = new FPNumber(amount);
    return FPNumber.gt(fpAmount, maxAmount);
  };

  const isLowerThanTransferMinAmount = (
    amount: string,
    currentAsset: Nullable<RegisteredAccountAsset>,
    isOutgoing: boolean,
    isRegisteredAsset = true
  ): boolean => {
    const minAmount = getTransferMinAmount(isOutgoing);
    if (!(currentAsset && isRegisteredAsset && minAmount)) return false;

    const fpAmount = new FPNumber(amount);
    return FPNumber.lt(fpAmount, minAmount);
  };

  const handleViewTransactionsHistory = () => {
    router.push({ name: PageNames.BridgeTransactionsHistory });
  };

  const navigateToBridge = () => {
    router.push({ name: PageNames.Bridge });
  };

  return {
    asset,
    nativeToken,
    sender,
    recipient,
    xor,
    isSoraToEvm,
    isValidNetwork,
    externalNetworkFee,
    externalNativeBalance,
    assetLockedBalance,
    assetExternalMinBalance,
    incomingMinLimit,
    outgoingMinLimit,
    outgoingMaxLimit,
    soraNetworkFee,
    externalTransferFee,
    externalTransferFeeFP,
    nativeTokenSymbol,
    nativeTokenDecimals,
    isNativeTokenSelected,
    isSidechainAsset,
    outgoingMaxAmount,
    outgoingMinAmount,
    incomingMaxAmount,
    getTransferMaxAmount,
    getTransferMinAmount,
    isGreaterThanTransferMaxAmount,
    isLowerThanTransferMinAmount,
    handleViewTransactionsHistory,
    navigateToBridge,
  };
}

export type BridgeCoreComposable = ReturnType<typeof useBridgeCore>;
