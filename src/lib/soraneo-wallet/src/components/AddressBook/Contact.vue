<template>
  <dialog-base v-model:visible="isVisible" :title="title" :tooltip="tooltip" append-to-body>
    <div class="set-address">
      <s-input
        ref="addressInput"
        v-model="name"
        class="set-address__input"
        :placeholder="t('nameText')"
        :disabled="loading"
        :maxlength="30"
      ></s-input>
      <s-input
        v-model="address"
        class="set-address__input"
        :placeholder="t('addressText')"
        :disabled="inputDisabled"
        @update:model-value="defineIdentity"
      ></s-input>
      <template v-if="validAddress && isNotSoraAddress">
        <p class="wallet-send-address-warning">{{ t('addressBook.notSoraAddress') }}</p>
        <s-tooltip :content="copyValueAssetId" placement="top">
          <p class="wallet-send-address-formatted" @click="handleCopyAddress(formattedSoraAddress, $event)">
            {{ formattedSoraAddress }}
          </p>
        </s-tooltip>
      </template>
      <s-input
        v-model="onChainIdentity"
        class="set-address__input"
        :placeholder="t('addressBook.identity')"
        disabled
      ></s-input>
      <div class="set-address__btn">
        <s-button type="primary" class="s-typography-button--large" :disabled="btnDisabled" @click="setContact">
          {{ btnText }}
        </s-button>
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import debounce from 'lodash/fp/debounce';
import { computed, nextTick, ref, watch } from 'vue';

import { useCopyAddress } from '@/composables/useCopyAddress';
import { useDialogVisibility } from '@/composables/useDialog';
import { useTranslation } from '@/composables/useTranslation';
import type { Book, PolkadotJsAccount } from '@/types/common';
import { formatAccountAddress, getAccountIdentity, validateAddress } from '@/util';

import DialogBase from '../DialogBase.vue';

defineOptions({ name: 'AddressBookContactDialog' });

const props = withDefaults(
  defineProps<{
    book?: Book;
    accounts?: PolkadotJsAccount[];
    prefilledAddress?: string;
    isEditMode?: boolean;
  }>(),
  {
    book: () => ({}) as Book,
    accounts: () => [] as PolkadotJsAccount[],
    prefilledAddress: '',
    isEditMode: false,
  }
);

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'add', value: { address: string; name: string }): void;
}>();

const { t } = useTranslation();
const { handleCopyAddress, copyTooltip } = useCopyAddress();

const visibleModel = defineModel<boolean>('visible', { default: false });
const { isVisible, closeDialog } = useDialogVisibility(visibleModel, {
  onClose: () => emit('close'),
});

const addressInput = ref<any>(null);

const address = ref('');
const name = ref('');
const onChainIdentity = ref(t('addressBook.none'));
const loading = ref(false);

const book = computed(() => props.book ?? {});
const accounts = computed(() => props.accounts ?? []);

const formattedName = computed(() => name.value.trim());
const formattedSoraAddress = computed(() => formatAccountAddress(address.value));

const emptyAddress = computed(() => !address.value.trim());
const inputDisabled = computed(() => props.isEditMode);

const validAddress = computed(() => validateAddress(address.value));
const isNotSoraAddress = computed(() => !!formattedSoraAddress.value && address.value.slice(0, 2) !== 'cn');

const isAddressAdded = computed(() => {
  const matchedAccount = accounts.value.find(
    (account) => formatAccountAddress(account.address) === formattedSoraAddress.value
  );
  return Boolean(book.value[address.value]) || Boolean(matchedAccount);
});

const isAddressPresented = computed(() => isAddressAdded.value && !props.isEditMode);

const btnDisabled = computed(() => !validAddress.value || !formattedName.value || isAddressPresented.value);

const btnText = computed(() => {
  if (!formattedName.value) return t('addressBook.btn.enterName');
  if (!validAddress.value) {
    return t(`walletSend.${emptyAddress.value ? 'enterAddress' : 'badAddress'}`);
  }
  if (isAddressPresented.value) return t('addressBook.btn.present');
  return props.isEditMode ? t('addressBook.btn.saveChanges') : t('saveText');
});

const title = computed(() => (props.isEditMode ? t('addressBook.options.edit') : t('addressBook.addContact')));
const tooltip = computed(() => t('addressBook.tooltip'));

const copyValueAssetId = computed(() => copyTooltip(t('assets.assetId')));

const defineIdentity = debounce(500)(async (value: string) => {
  if (!value) {
    onChainIdentity.value = t('addressBook.none');
    return;
  }
  const identity = await getAccountIdentity(value);
  onChainIdentity.value = identity?.name ?? t('addressBook.none');
});

const setContact = () => {
  const record = { address: formattedSoraAddress.value, name: formattedName.value };
  emit('add', record);
  closeDialog();
};

const resetState = () => {
  address.value = '';
  name.value = '';
  onChainIdentity.value = t('addressBook.none');
};

watch(isVisible, async (visible) => {
  if (!visible) {
    resetState();
    return;
  }

  if (props.prefilledAddress) {
    address.value = props.prefilledAddress;
    name.value = book.value[props.prefilledAddress] ?? '';
  }

  await nextTick();
  addressInput.value?.focus?.();
});
</script>

<style lang="scss" scoped>
.wallet-send {
  &-address-warning {
    color: var(--s-color-status-warning);
    margin-bottom: var(--s-basic-spacing);
    font-weight: 400;
    font-size: var(--s-font-size-extra-small);
    line-height: var(--s-line-height-base);
    padding-right: calc(var(--s-basic-spacing) * 2);
    padding-left: calc(var(--s-basic-spacing) * 2);
  }

  &-address-formatted {
    margin: 0 auto;
    margin-bottom: calc(var(--s-basic-spacing));
    font-weight: 200;
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-base);
    letter-spacing: var(--s-letter-spacing-small);
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>

<style lang="scss">
.set-address {
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &__input {
    margin-bottom: $basic-spacing;

    .s-input__input .el-input.is-disabled .el-input__inner {
      cursor: default;
      color: var(--s-color-base-content-primary);
    }
  }

  &__btn {
    width: 100%;
    .el-button {
      width: 100%;
    }
  }

  &-error {
    color: var(--s-color-status-error);
    margin-bottom: var(--s-basic-spacing);
    font-size: var(--s-font-size-extra-small);
    line-height: var(--s-line-height-base);
    font-weight: 400;
  }
}
</style>
