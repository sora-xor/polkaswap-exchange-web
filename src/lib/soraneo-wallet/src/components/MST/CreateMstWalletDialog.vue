<template>
  <dialog-base
    v-model:visible="isVisible"
    show-back
    :title="t('mst.multisigAccount')"
    :show-header="showHeader"
    append-to-body
    @back="handleBack"
    @close="handleClose"
  >
    <div class="multisig-wallet">
      <s-input v-model="multisigName" :placeholder="t('mst.enterName')" :minlength="1"></s-input>
      <p class="multisig-title-data address">{{ t('mst.addMST').toUpperCase() }}</p>
      <account-card class="multisig-user-address">
        <div class="address-card">
          <p>{{ t('mst.addMST') }}</p>
          <formatted-address :value="accountAddress" :symbols="24" :offset="10"></formatted-address>
        </div>
      </account-card>
      <s-scrollbar class="multisig-scrollbar">
        <div class="multisig-addresses-input">
          <div v-for="(address, index) in multisigAddresses" :key="index + 1">
            <address-book-input
              v-model="multisigAddresses[index]"
              exclude-connected
              :is-valid="validAddress(address)"
              :prop-placeholder="t('mst.enterAddress')"
              :on-remove="() => removeAddress(index)"
              :can-remove="multisigAddresses.length > 1"
            />

            <p v-if="isDuplicateAddress(index)" class="error-message">{{ t('mst.addressEntered') }}</p>
            <p v-if="!validAddress(multisigAddresses[index]) && multisigAddresses[index] != ''" class="error-message">
              {{ t('mst.incorrectFormatAddress') }}
            </p>
          </div>
        </div>
      </s-scrollbar>
      <div class="add-multisig-address">
        <s-button type="secondary" :tooltip="t('mst.addAddr')" @click="addAddress">
          <s-icon name="plus-16" size="14"></s-icon>
        </s-button>
        <p>{{ t('mst.addAddress') }}</p>
      </div>
      <p class="multisig-title-data">{{ t('mst.thresholdNumber').toUpperCase() }}</p>
      <s-input v-model="amountOfThreshold" placeholder="1" type="number" class="threshold-amount">
        <template #suffix> /{{ totalNumberOfAddresses }} </template>
      </s-input>
      <s-tabs v-model="mstDurationTrxModel" type="rounded" class="multisig-duration-trx">
        <s-tab v-for="duration in durations" :key="duration" :label="duration" :name="duration"></s-tab>
      </s-tabs>
      <s-button :type="isButtonEnabled() ? 'primary' : 'tertiary'" :disabled="!isButtonEnabled()" @click="handleClick">
        {{ t('mst.setupDetails').toUpperCase() }}
      </s-button>
    </div>
    <multisig-create-dialog
      v-model:visible="mstDialogVisibility"
      :mst-data="mstData"
      :threshold="amountOfThreshold ?? undefined"
      @back="handleBackFromMSTDialog"
      @close="handleClose"
    ></multisig-create-dialog>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, toRef, watch } from 'vue';

import { useDialogVisibility } from '@/composables/useDialog';
import { useTranslation } from '@/composables/useTranslation';
import { mstTrxDeadline } from '@/consts/mst';
import { requireLegacyStore } from '@/utils/legacy-store';
import type { MSTData } from '@/types/mst';
import { validateAddress } from '@/util';

import AccountCard from '../Account/AccountCard.vue';
import AddressBookInput from '../AddressBook/Input.vue';
import DialogBase from '../DialogBase.vue';
import FormattedAddress from '../shared/FormattedAddress.vue';

import MultisigCreateDialog from './MultisigCreateDialog.vue';

defineOptions({ name: 'CreateMstWalletDialog' });

const props = withDefaults(
  defineProps<{
    visible?: boolean;
  }>(),
  {
    visible: false,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'close'): void;
  (event: 'closeMstCreate'): void;
}>();

const { t } = useTranslation();
const store = requireLegacyStore();
const { isVisible, setVisible, closeDialog } = useDialogVisibility(toRef(props, 'visible'), {
  emit: (value) => emit('update:visible', value),
  onClose: () => emit('close'),
});

const durations = Object.keys(mstTrxDeadline);
const mstDurationTrxModel = ref<string>('7D');
const showHeader = ref(true);
const multisigName = ref('');
const multisigAddresses = ref<string[]>(['']);
const amountOfThreshold = ref<number | null>(null);
const mstDialogVisibility = ref(false);
const mstData = ref<MSTData>({
  addresses: [],
  multisigName: '',
  threshold: 0,
  duration: 0,
});

const account = computed(() => store.getters.wallet.account.account);
const accountAddress = computed(() => account.value.address);

const totalNumberOfAddresses = computed(() => multisigAddresses.value.length + 1);

const normalizeThreshold = (value: unknown) => {
  if (value === null || value === '') {
    return;
  }

  const numValue = Number(value);
  if (Number.isNaN(numValue)) {
    amountOfThreshold.value = null;
    return;
  }

  if (numValue > totalNumberOfAddresses.value) {
    amountOfThreshold.value = totalNumberOfAddresses.value;
  } else if (numValue < 1) {
    amountOfThreshold.value = 1;
  } else {
    amountOfThreshold.value = numValue;
  }
};

watch(amountOfThreshold, (value) => {
  normalizeThreshold(value);
});

const initializeMultisigAddresses = () => {
  multisigAddresses.value = [''];
};

onMounted(() => {
  initializeMultisigAddresses();
});

const validAddress = (address: string) => validateAddress(address);

const hasDuplicateAddresses = () => {
  const addresses = multisigAddresses.value.map((addr) => addr.trim()).filter((addr) => addr !== '');
  if (addresses.includes(accountAddress.value.trim())) {
    return true;
  }
  return new Set(addresses).size !== addresses.length;
};

const isDuplicateAddress = (index: number) => {
  const address = multisigAddresses.value[index].trim();
  if (!address) return false;
  if (address === accountAddress.value.trim()) {
    return true;
  }
  const occurrences = multisigAddresses.value.filter((addr, i) => addr.trim() === address && i !== index).length;
  return occurrences > 0;
};

const isButtonEnabled = () => {
  const isMultisigNameFilled = multisigName.value.trim() !== '';
  const areAllAddressesFilled = multisigAddresses.value.every((addr) => addr.trim() !== '');
  const isThresholdSet = amountOfThreshold.value !== null && amountOfThreshold.value > 0;
  const areAllAddressesValid = multisigAddresses.value.every((addr) => validAddress(addr));
  const noDuplicateAddresses = !hasDuplicateAddresses();

  return (
    isMultisigNameFilled && areAllAddressesFilled && isThresholdSet && noDuplicateAddresses && areAllAddressesValid
  );
};

const removeAddress = (index: number) => {
  if (multisigAddresses.value.length <= 1) return;
  multisigAddresses.value.splice(index, 1);
};

const handleClose = () => {
  emit('closeMstCreate');
};

const handleBack = () => {
  closeDialog();
};

const handleBackFromMSTDialog = () => {
  setVisible(true);
  mstDialogVisibility.value = false;
};

const handleClick = () => {
  const selectedDuration = mstTrxDeadline[mstDurationTrxModel.value] || 0;

  mstData.value = {
    addresses: [accountAddress.value, ...multisigAddresses.value],
    multisigName: multisigName.value,
    threshold: amountOfThreshold.value ?? 0,
    duration: selectedDuration,
  };

  closeDialog();
  mstDialogVisibility.value = true;
};

const addAddress = () => {
  multisigAddresses.value.push('');
};
</script>

<style lang="scss">
.threshold-amount {
  .s-input__content {
    width: 100%;
    .el-input__suffix {
      margin-right: 90%;
      color: var(--s-color-base-content-tertiary);
    }
    input::placeholder {
      color: var(--s-color-base-content-secondary) !important;
    }
  }
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
}
.transaction-lifetime {
  .s-tabs {
    width: auto;
  }
  .el-tabs__item {
    padding: 0 calc($basic-spacing-mini * 2.5) !important;
  }
  .el-tabs__item:not(:hover):not(.is-active) {
    color: var(--s-color-base-content-secondary) !important;
  }
}

.multisig-scrollbar {
  height: 150px;
  @include scrollbar($basic-spacing-big);
  .el-scrollbar__wrap {
    overflow-x: unset;
  }
}
.multisig-user-address {
  .account-avatar,
  .account-credentials {
    display: none !important;
  }
}

.multisig-duration-trx {
  width: 100%;
  .el-tabs__header,
  .el-tabs__nav,
  .el-tabs__item {
    width: 100% !important;
  }
  .el-tabs__item {
    text-align: center;
  }
}
</style>

<style lang="scss" scoped>
.multisig-wallet {
  display: flex;
  flex-direction: column;
  align-items: left;
  .multisig-title-data {
    font-weight: 800;
    color: var(--s-color-base-content-secondary);
    margin-bottom: 8px;
  }
  .multisig-tooltip {
    &__icon {
      color: var(--s-color-base-content-tertiary);
      &:hover {
        cursor: pointer;
        color: var(--s-color-base-content-secondary);
      }
    }
  }
  .requirement {
    text-align: center;
    margin-bottom: calc($basic-spacing * 2.5);
  }

  .address {
    margin-top: $basic-spacing-big;
  }
  .add-multisig-address {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .address-card {
    display: flex;
    flex-direction: column;
    margin-bottom: $basic-spacing-tiny;
    p:first-of-type {
      font-size: 12px;
      color: var(--s-color-base-content-secondary);
    }
    .formatted-address {
      font-size: 16px !important;
    }
  }

  .multisig-addresses-input {
    display: flex;
    flex-direction: column;
    gap: $inner-spacing-small;
    margin-top: calc($basic-spacing-mini * 1.5);
    margin-bottom: $basic-spacing-extra-mini;
  }
  .add-multisig-address {
    gap: calc($basic-spacing-mini * 1.5);
    margin-top: $basic-spacing-medium;
    margin-bottom: $basic-spacing-big;
    font-size: 16px;
    button {
      width: calc($basic-spacing-medium * 2) !important;
      height: calc($basic-spacing-medium * 2) !important;
      padding: $basic-spacing !important;
    }
  }
  .threshold-amount {
    margin-top: $basic-spacing-medium;
    margin-bottom: $basic-spacing-big;
  }
  .error-message {
    color: var(--s-color-status-error);
  }
}
</style>

<style lang="scss">
$telegram-web-app-width: 500px;
</style>
