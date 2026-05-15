<template>
  <div class="address-input">
    <wallet-account v-if="record" :polkadot-account="record" with-identity>
      <s-icon
        v-button
        class="book-icon-unlink"
        :class="{ disabled }"
        name="el-icon-close"
        size="20"
        @click="resetAddress"
      ></s-icon>
      <s-tooltip :content="t('addressBook.selectContact')" border-radius="mini" placement="top" tabindex="-1">
        <s-icon
          v-button
          class="book-icon-open"
          :class="{ disabled }"
          name="basic-user-24"
          size="18"
          @click="openAddressBook"
        ></s-icon>
      </s-tooltip>
    </wallet-account>

    <s-input
      v-else
      v-model="address"
      class="address-input__field"
      v-bind="{
        maxlength: 128,
        disabled,
        placeholder: propPlaceholder || t('addressBook.input'),
        borderRadius: 'medium',
        ...$attrs,
      }"
    >
      <template #left>
        <s-icon
          v-if="canRemove"
          v-button
          class="book-icon-unlink"
          :class="{ disabled }"
          name="el-icon-close"
          size="20"
          @click="removeInput"
        ></s-icon>
      </template>
      <template #right>
        <s-icon v-if="address" class="book-icon-unlink" name="el-icon-close" size="20" @click="resetAddress"></s-icon>
        <s-tooltip :content="t('addressBook.selectContact')" border-radius="mini" placement="top" tabindex="-1">
          <s-icon
            v-button
            class="book-icon-open"
            :class="{ disabled }"
            name="basic-user-24"
            size="18"
            @click="openAddressBook"
          ></s-icon>
        </s-tooltip>
      </template>
    </s-input>

    <div v-if="isNewAddress" class="new-address">
      <span class="new-address-msg">{{ t('addressBook.detected') }}</span>
      <span class="new-address-save" @click="openContact(address)">{{ t('addressBook.save') }}</span>
    </div>

    <address-book-list
      v-model:visible="showAddressBookDialog"
      :accounts="accountsRecords"
      :records="bookRecords"
      :excluded-address="excludedAddress"
      @open="openContact"
      @select="chooseRecord"
      @remove="removeAddressFromBook"
    ></address-book-list>
    <address-book-contact
      v-model:visible="showSetContactDialog"
      :accounts="accountsRecords"
      :book="addressBook"
      :prefilled-address="prefilledAddress"
      :is-edit-mode="isEditMode"
      @add="setAddressToBook"
    ></address-book-contact>
  </div>
</template>

<script lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';

import { useWalletTranslation } from '../../composables/useWalletTranslation';
import { useWalletStore } from '@/stores/wallet';

import { api } from '../../api';
import { formatAccountAddress } from '../../util';
import { subscribeToWalletAccounts } from '../../util/account';
import WalletAccount from '../Account/WalletAccount.vue';

import AddressBookContact from './Contact.vue';
import AddressBookList from './List.vue';

import type { AppWallet } from '../../consts';
import type { Book, PolkadotJsAccount } from '../../types/common';

export default {
  inheritAttrs: false,
  components: {
    WalletAccount,
    AddressBookList,
    AddressBookContact,
  },
  props: {
    excludeConnected: {
      default: false,
      type: Boolean,
    },
    modelValue: {
      default: undefined,
      type: String,
    },
    value: {
      default: '',
      type: String,
    },
    propPlaceholder: {
      default: '',
      type: String,
    },
    isValid: {
      default: false,
      type: Boolean,
    },
    disabled: {
      default: false,
      type: Boolean,
    },
    onRemove: {
      required: false,
      type: Function as PropType<() => void>,
    },
    canRemove: {
      default: false,
      type: Boolean,
    },
  },
  emits: ['update:modelValue', 'update:name'],
  setup(props, { emit }) {
    const { t } = useWalletTranslation();
    const walletStore = useWalletStore();

    const name = ref('');
    const prefilledAddress = ref('');
    const showAddressBookDialog = ref(false);
    const showSetContactDialog = ref(false);
    const isEditMode = ref(false);
    const accountsSubscription = ref<Nullable<(() => void) | null>>(null);
    const accountsRecords = ref<PolkadotJsAccount[]>([]);

    const connected = computed(() => walletStore.address);
    const source = computed(() => walletStore.source);
    const addressBook = computed(() => walletStore.book);
    const address = computed({
      get: (): string => props.modelValue ?? props.value,
      set: (value: string): void => {
        emit('update:modelValue', value.trim());
      },
    });
    const accountBook = computed<Book>(() => {
      return accountsRecords.value.reduce((book: Book, { address, name }: PolkadotJsAccount) => {
        const key = formatAccountAddress(address);

        return {
          ...book,
          [key]: name,
        };
      }, {});
    });
    const books = computed<Book>(() => ({ ...accountBook.value, ...addressBook.value }));
    const bookRecords = computed<PolkadotJsAccount[]>(() => {
      return Object.entries((addressBook.value ?? {}) as Book).map(([address, name]) => ({
        address,
        name,
        source: source.value as AppWallet,
      }));
    });
    const isNewAddress = computed((): boolean => {
      if (!address.value) return false;

      const formattedAddress = formatAccountAddress(address.value);

      if (!formattedAddress) return false;

      const found = accountsRecords.value.find(
        (account: PolkadotJsAccount) => formatAccountAddress(account.address) === formattedAddress
      );

      return !addressBook.value?.[formattedAddress] && !found;
    });
    const excludedAddress = computed(() => (props.excludeConnected ? connected.value : ''));
    const record = computed<Nullable<PolkadotJsAccount>>(() => {
      return props.isValid && name.value ? { address: address.value, name: name.value, source: source.value } : null;
    });

    const setAddressToBook = (payload: { address: string; name: string }) => walletStore.setAddressToBook(payload);
    const removeAddressFromBook = (address: string) => walletStore.removeAddressFromBook(address);

    const updateName = (): void => {
      emit('update:name', name.value);
    };

    const updateContactName = (): void => {
      if (!props.isValid) {
        name.value = '';
      } else if (!name.value) {
        const key = formatAccountAddress(address.value);
        name.value = books.value[key] || '';
      }

      updateName();
    };

    const openAddressBook = (): void => {
      showAddressBookDialog.value = true;
    };

    const chooseRecord = ({ name: accountName, address: accountAddress }: PolkadotJsAccount): void => {
      address.value = accountAddress;
      name.value = accountName;
      updateName();
    };

    const openContact = (addressValue: Nullable<string>, editMode = false): void => {
      isEditMode.value = editMode;
      prefilledAddress.value = addressValue ? formatAccountAddress(addressValue) : '';
      showSetContactDialog.value = true;
    };

    const resetAddress = (): void => {
      address.value = '';
    };

    const removeInput = (): void => {
      props.onRemove?.();
    };

    watch(books, () => {
      updateContactName();
    });

    watch(
      () => props.isValid,
      () => {
        updateContactName();
      }
    );

    onMounted(() => {
      void (async () => {
        accountsSubscription.value = await subscribeToWalletAccounts(api, source.value, (accounts) => {
          accountsRecords.value = accounts;
        });
      })();
    });

    onBeforeUnmount(() => {
      if (accountsSubscription.value) {
        accountsSubscription.value();
        accountsSubscription.value = null;
      }
    });

    return {
      t,
      name,
      prefilledAddress,
      showAddressBookDialog,
      showSetContactDialog,
      isEditMode,
      accountsRecords,
      connected,
      source,
      addressBook,
      address,
      accountBook,
      books,
      bookRecords,
      isNewAddress,
      excludedAddress,
      record,
      setAddressToBook,
      removeAddressFromBook,
      updateContactName,
      openAddressBook,
      chooseRecord,
      openContact,
      resetAddress,
      updateName,
      removeInput,
    };
  },
};
</script>

<style lang="scss" scoped>
.new-address {
  background: rgba(248, 8, 123, 0.09);
  height: 50px;
  width: 100%;
  border-radius: 16px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--s-color-base-content-primary);
  padding: 0 10px;

  &-msg {
    font-weight: 330;
  }

  &-save {
    color: var(--s-color-theme-accent);
    &:hover {
      cursor: pointer;
    }
  }
}

.address-input {
  .new-address {
    margin-top: $basic-spacing;
  }

  :deep(.address-input__field.s-input) {
    display: flex;
    position: relative;
    min-height: var(--s-size-big);
    padding: 8px 16px;
    border: 0 solid var(--s-color-base-border-primary);
    border-radius: var(--s-border-radius-small);
    background-color: var(--s-color-base-background);
    box-shadow: var(--s-shadow-element);

    @include focus-outline($focusWithin: true, $withOffset: true);
  }

  :deep(.address-input__field .s-input__content) {
    width: 100%;
    min-height: calc(var(--s-size-big) - 16px);
    padding: 0;
    gap: var(--s-basic-spacing);
  }

  :deep(.address-input__field .s-input__input) {
    flex: 1 1 auto;
    min-width: 0;
  }

  :deep(.address-input__field .el-input__inner) {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-small);
    line-height: var(--s-line-height-base);
  }

  :deep(.address-input__field .el-input__inner::placeholder) {
    color: var(--s-color-base-content-tertiary);
  }
}

.book-icon-open {
  background: var(--s-color-base-content-tertiary);
  color: var(--s-color-base-background);
  padding: 2px;
  margin-left: 4px;
  border-radius: 4px;

  &:hover {
    cursor: pointer;
    color: var(--s-color-base-background);
    background: var(--s-color-base-content-secondary);
  }

  &.disabled {
    cursor: not-allowed;
    pointer-events: none;
  }
}

.book-icon-unlink {
  color: var(--s-color-base-content-tertiary);
  margin-right: 6px;
  &:hover {
    cursor: pointer;
    color: var(--s-color-base-content-secondary);
  }
  &.disabled {
    cursor: not-allowed;
    pointer-events: none;
  }
}
</style>
