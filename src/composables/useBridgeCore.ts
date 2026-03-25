import { FPNumber, type CodecString } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed } from 'vue';

import { PageNames } from '@/consts';
import router from '@/router';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeStore } from '@/stores/bridge';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';

/**
 * Provides bridge-specific helpers that historically lived inside `BridgeMixin`.
 */
export function useBridgeCore() {
  const assetsStore = useAssetsStore();
  const bridgeStore = useBridgeStore();
  const isSoraToEvm = computed(() => bridgeStore.isSoraToEvm);
  const asset = computed(() => bridgeStore.asset as Nullable<RegisteredAccountAsset>);
  const externalNativeBalance = computed(() => bridgeStore.fees.externalNativeBalance);
  const assetLockedBalance = computed(() => bridgeStore.balances.assetLockedBalance);
  const assetExternalMinBalance = computed(() => bridgeStore.balances.assetExternalMinBalance);
  const outgoingMinLimit = computed(() => bridgeStore.balances.outgoingMinLimit);
  const outgoingMaxLimit = computed(() => bridgeStore.balances.outgoingMaxLimit);
  const incomingMinLimit = computed(() => bridgeStore.balances.incomingMinLimit);
  const soraNetworkFee = computed(() => bridgeStore.fees.soraNetworkFee);
  const externalTransferFee = computed(() => bridgeStore.fees.externalTransferFee);
  const externalNetworkFee = computed(() => bridgeStore.fees.externalNetworkFee);
  const nativeToken = computed(() => bridgeStore.nativeToken as Nullable<RegisteredAccountAsset>);
  const sender = computed(() => bridgeStore.sender);
  const recipient = computed(() => bridgeStore.recipient);
  const isValidNetwork = computed(() => bridgeStore.isValidNetwork);
  const isNativeTokenSelected = computed(() => bridgeStore.isNativeTokenSelected);
  const isSidechainAsset = computed(() => bridgeStore.isSidechainAsset);
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
    if (bridgeStore.isSidechainAsset) return null;
    return bridgeStore.balances.assetLockedBalance ?? null;
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
