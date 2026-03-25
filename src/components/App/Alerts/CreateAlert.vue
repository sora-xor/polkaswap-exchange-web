<template>
  <div class="setup-price-alert">
    <span class="setup-price-alert__title">{{ t('alerts.alertTypeTitle') }}</span>
    <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.typeTooltip')" placement="top" tabindex="-1">
      <s-icon name="info-16" size="14px"></s-icon>
    </s-tooltip>
    <s-tabs class="setup-price-alert__tab" v-model="currentTypeTab" type="rounded" @click="handleTabClick">
      <s-tab v-for="tab in AlertTypeTabs" :key="tab" :label="t(`alerts.${tab}`)" :name="tab"></s-tab>
    </s-tabs>
    <s-float-input
      ref="floatInput"
      v-model="amount"
      class="price-input"
      size="medium"
      has-locale-string
      :delimiters="delimiters"
      :decimals="asset.decimals"
      :placeholder="`$${placeholder}`"
      :maxlength="9"
    >
      <div v-if="amount" slot="left" class="price-input__prefix">$</div>
      <div class="price-input-inner" slot="top">
        <div>{{ `${asset.symbol} ${t('priceText')}` }}</div>
        <div class="price-input-inner-ratio">
          <span class="price-input-current-title">{{ t('alerts.currentPrice') }}</span>
          <formatted-amount-with-fiat-value
            value-can-be-hidden
            value-class="input-value--primary"
            value="1"
            :asset-symbol="asset.symbol"
            :fiat-value="fiatAmountValue"
          ></formatted-amount-with-fiat-value>
        </div>
      </div>
      <token-select-button
        slot="right"
        icon="chevron-down-rounded-16"
        :token="asset"
        @click.stop="openSelectAssetDialog"
      ></token-select-button>
      <div class="info" slot="bottom">
        <span class="delta-percent">
          <span :class="activeSignClass('+')"> + </span>
          <span class="slash">/</span>
          <span :class="activeSignClass('-')"> - </span> {{ deltaPercentage }}%
        </span>
        <token-address v-bind="asset"></token-address>
      </div>
    </s-float-input>
    <span class="setup-price-alert__title">{{ t('alerts.alertFrequencyTitle') }}</span>
    <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.frequencyTooltip')" placement="top" tabindex="-1">
      <s-icon name="info-16" size="14px"></s-icon>
    </s-tooltip>
    <s-tabs class="setup-price-alert__tab" v-model="currentFrequencyTab" type="rounded">
      <s-tab v-for="tab in AlertFrequencyTabs" :key="tab" :label="t(`alerts.${tab}`)" :name="tab"></s-tab>
    </s-tabs>
    <s-button
      type="primary"
      class="setup-price-alert__btn s-typography-button--large"
      :loading="loading"
      :disabled="btnDisabled"
      @click="handleAlertCreation"
    >
      {{ t('alerts.finishBtn') }}
    </s-button>
  </div>
</template>
<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/math';
import { components } from '@/shims/wallet-components';
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useNotification } from '@/composables/useNotification';
import { useTranslation } from '@/composables/useTranslation';
import { MAX_ALERTS_NUMBER, ZeroStringValue } from '@/consts';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import type { EditableAlertObject, NumberedAlert } from '@/consts';
import { AlertFrequencyTabs, AlertTypeTabs } from '@/types/tabs';
import { calcPriceChange, showMostFittingValue } from '@/utils';

import type { AccountAsset, WhitelistIdsBySymbol } from '@sora-substrate/sdk/build/assets/types';
import type { Alert } from '@/shims/wallet-common-types';

defineOptions({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    TokenAddress: components.TokenAddress,
    TokenSelectButton: components.TokenSelectButton,
  },
});

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'open-select-token'): void;
  (e: 'select-asset', asset: AccountAsset): void;
}>();

const props = defineProps<{ alertToEdit: NumberedAlert | null }>();

const { t } = useTranslation();
const { showAppNotification } = useNotification();
const assetsStore = useAssetsStore();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const alerts = computed(() => settingsStore.alerts as Alert[]);
const whitelistIdsBySymbol = computed(() => walletStore.whitelistIdsBySymbol as WhitelistIdsBySymbol);
const getAsset = assetsStore.assetDataByAddress as (addr?: string) => AccountAsset;
const xor = computed(() => assetsStore.xor as AccountAsset);

const floatInput = ref<any>();
const amount = ref('');
const asset = reactive<AccountAsset>({} as AccountAsset);
const autoChoice = ref(true);
const currentTypeTab = ref<AlertTypeTabs>(AlertTypeTabs.Drop);
const currentFrequencyTab = ref<AlertFrequencyTabs>(AlertFrequencyTabs.Once);
const loading = ref(false);

const delimiters = FPNumber.DELIMITERS_CONFIG;

const assetPrice = computed(() => FPNumber.fromCodecValue(getAssetFiatPrice(asset) ?? ZeroStringValue));

const priceChange = computed(() => {
  const price = FPNumber.fromNatural(amount.value || '0');
  const desired = price.isZero() ? assetPrice.value : price;
  return calcPriceChange(desired, assetPrice.value);
});

const negativeDelta = computed(() => FPNumber.lt(priceChange.value, FPNumber.ZERO));

const deltaPercentage = computed(() => {
  const value = negativeDelta.value ? priceChange.value.negative() : priceChange.value;
  return showMostFittingValue(value);
});

const placeholder = computed(() => showMostFittingValue(assetPrice.value));

const fiatAmountValue = computed(() => assetPrice.value.toLocaleString());

const btnDisabled = computed(() => !amount.value);

const isEditMode = computed(() => props.alertToEdit !== null);

watch(
  negativeDelta,
  (value) => {
    if (autoChoice.value) {
      currentTypeTab.value = value ? AlertTypeTabs.Drop : AlertTypeTabs.Raise;
    }
    autoChoice.value = true;
  },
  { immediate: false }
);

function activeSignClass(sign: string): string {
  if (sign === '+' && negativeDelta.value) return 'delta-percent--not-active';
  if (sign === '-' && !negativeDelta.value) return 'delta-percent--not-active';
  return '';
}

function handleTabClick(): void {
  autoChoice.value = false;
}

function handleAlertCreation(): void {
  if (!amount.value) {
    showAppNotification(t('alerts.noAmount'), 'error');
    return;
  }

  loading.value = true;
  try {
    const desiredPrice = FPNumber.fromNatural(amount.value);
    const currentPrice = FPNumber.fromNatural(fiatAmountValue.value);
    let wasNotified = false;

    if (currentTypeTab.value === AlertTypeTabs.Drop && FPNumber.lt(currentPrice, desiredPrice)) {
      wasNotified = true;
    }

    if (currentTypeTab.value === AlertTypeTabs.Raise && FPNumber.gt(currentPrice, desiredPrice)) {
      wasNotified = true;
    }

    if (isEditMode.value && props.alertToEdit) {
      settingsStore.editPriceAlert({
        alert: {
          token: asset.symbol,
          price: amount.value,
          type: currentTypeTab.value,
          once: currentFrequencyTab.value === AlertFrequencyTabs.Once,
          wasNotified,
        },
        position: props.alertToEdit.position,
      } as EditableAlertObject);
      emit('back');
      return;
    }

    if (alerts.value.length >= MAX_ALERTS_NUMBER) {
      showAppNotification(t('alerts.limitReached'), 'error');
      return;
    }

    settingsStore.addPriceAlert({
      token: asset.symbol,
      price: amount.value,
      type: currentTypeTab.value,
      once: currentFrequencyTab.value === AlertFrequencyTabs.Once,
      wasNotified,
    });
    emit('back');
  } finally {
    loading.value = false;
  }
}

function openSelectAssetDialog(): void {
  emit('open-select-token');
}

function setAsset(selectedAsset: AccountAsset | undefined): void {
  if (!selectedAsset) return;
  Object.assign(asset, selectedAsset);
  emit('select-asset', selectedAsset);
}

function getAssetFiatPrice(currentAsset: AccountAsset | undefined): Nullable<string> {
  if (!currentAsset) return null;
  return (walletStore.fiatPriceObject as Record<string, string> | undefined)?.[currentAsset.address] ?? null;
}

onMounted(() => {
  if (isEditMode.value && props.alertToEdit) {
    amount.value = props.alertToEdit.price;
    currentTypeTab.value = props.alertToEdit.type === 'drop' ? AlertTypeTabs.Drop : AlertTypeTabs.Raise;
    currentFrequencyTab.value = props.alertToEdit.once ? AlertFrequencyTabs.Once : AlertFrequencyTabs.Always;
    setAsset(getAsset(whitelistIdsBySymbol.value[props.alertToEdit.token]));
  } else {
    amount.value = '';
    currentTypeTab.value = AlertTypeTabs.Drop;
    currentFrequencyTab.value = AlertFrequencyTabs.Once;
    setAsset(xor.value);
  }

  floatInput.value?.$children?.[0]?.focus?.();
});
</script>

<style lang="scss">
.price-input {
  margin-bottom: $basic-spacing;

  &__prefix {
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-small);
    font-weight: 700;
  }

  &-inner {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: $inner-spacing-mini;
    font-size: var(--s-font-size-mini);
    font-weight: 300;
    line-height: var(--s-line-height-medium);
    text-transform: uppercase;

    &-ratio {
      display: flex;
      .formatted-amount--fiat-value {
        text-align: right;
        margin-left: calc(var(--s-basic-spacing) / 2);
      }
    }
  }

  &-current {
    &-title {
      color: var(--s-color-base-content-secondary);
      margin-right: calc(var(--s-basic-spacing) / 2);
      display: inline-flex;
      align-items: baseline;
    }
  }

  .el-input__inner {
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-small);
    font-weight: 700;
  }

  i.s-icon-info-16 {
    color: var(--s-color-base-content-tertiary);
    &:hover {
      cursor: pointer;
    }
  }

  .asset-id:hover {
    cursor: pointer;
    text-decoration: underline;
  }
}
</style>

<style lang="scss">
.setup-price-alert {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }

  &__title {
    font-weight: 600;
    margin-bottom: $inner-spacing-mini;
    margin-right: 6px;
    display: inline-block;
    font-size: var(--s-font-size-small);
    line-height: 18px;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    color: var(--s-color-base-content-secondary);
  }

  &__btn {
    width: 100%;
    margin-bottom: $basic-spacing;
  }
}

.info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;

  .delta-percent {
    margin-right: calc(var(--s-basic-spacing) / 2);
    font-weight: 600;
    color: var(--s-color-fiat-value);
    font-family: var(--s-font-family-default);
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
    .slash {
      opacity: 40%;
    }

    &--not-active {
      opacity: 40%;
    }
  }
}
</style>
