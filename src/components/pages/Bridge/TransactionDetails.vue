<template>
  <transaction-details>
    <info-line
      :label="t('bridge.soraNetworkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formatStringValue(soraNetworkFee, XOR.decimals)"
      :asset-symbol="XOR.symbol"
      :fiat-value="getFiatAmountByString(soraNetworkFee, XOR)"
      is-formatted
    ></info-line>
    <info-line
      :label="formattedNetworkFeeLabel"
      :label-tooltip="t('ethNetworkFeeTooltipText', { network: networkName })"
      :value="formatStringValue(externalNetworkFee, nativeToken.externalDecimals)"
      :asset-symbol="nativeTokenSymbol"
      :fiat-value="getFiatAmountByString(externalNetworkFee, nativeToken)"
      is-formatted
    ></info-line>
    <info-line
      v-if="isNotZero(externalTransferFee)"
      :label="t('bridge.externalTransferFee', { network: networkName })"
      :label-tooltip="t('bridge.externalTransferFeeTooltip', { network: networkName })"
      :value="formatStringValue(externalTransferFee, asset.externalDecimals)"
      :asset-symbol="assetSymbol"
      :fiat-value="getFiatAmountByString(externalTransferFee, asset)"
      is-formatted
    ></info-line>
    <info-line
      v-if="isNotZero(externalMinBalance)"
      :label="t('bridge.externalMinDeposit', { network: networkName })"
      :label-tooltip="t('bridge.externalMinDepositTooltip', { network: networkName, symbol: assetSymbol })"
      :value="formatStringValue(externalMinBalance, asset.externalDecimals)"
      :asset-symbol="assetSymbol"
      :fiat-value="getFiatAmountByString(externalMinBalance, asset)"
      is-formatted
    ></info-line>
  </transaction-details>
</template>

<script lang="ts" setup>
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@wallet';
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  components: {
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    InfoLine: components.InfoLine,
  },
});

const props = withDefaults(
  defineProps<{
    asset?: Nullable<RegisteredAccountAsset>;
    nativeToken?: Nullable<RegisteredAccountAsset>;
    externalTransferFee?: CodecString;
    externalNetworkFee?: CodecString;
    externalMinBalance?: CodecString;
    soraNetworkFee?: CodecString;
    networkName?: string;
  }>(),
  {
    asset: null,
    nativeToken: null,
    externalTransferFee: ZeroStringValue,
    externalNetworkFee: ZeroStringValue,
    externalMinBalance: ZeroStringValue,
    soraNetworkFee: ZeroStringValue,
    networkName: '',
  }
);

const { t, TranslationConsts } = useTranslation();
const { formatStringValue, getFiatAmountByString } = useFormattedAmount();

const assetSymbol = computed(() => props.asset?.symbol ?? '');
const nativeTokenSymbol = computed(() => props.nativeToken?.symbol ?? '');

const formattedNetworkFeeLabel = computed(() => `${TranslationConsts.Max} ${props.networkName} ${t('networkFeeText')}`);

const isNotZero = (value: CodecString): boolean => value !== ZeroStringValue;
</script>
