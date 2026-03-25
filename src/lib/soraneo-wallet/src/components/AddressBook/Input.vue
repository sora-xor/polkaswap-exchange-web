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
import { defineComponent, type PropType } from 'vue';

import { useWalletStore } from '@/stores/wallet';

import { api } from '../../api';
import { formatAccountAddress } from '../../util';
import { subscribeToWalletAccounts } from '../../util/account';
import WalletAccount from '../Account/WalletAccount.vue';
import TranslationMixin from '../mixins/TranslationMixin';

import AddressBookContact from './Contact.vue';
import AddressBookList from './List.vue';

import type { AppWallet } from '../../consts';
import type { Book, PolkadotJsAccount } from '../../types/common';

export default defineComponent({
  inheritAttrs: false,
  components: {
    WalletAccount,
    AddressBookList,
    AddressBookContact,
  },
  mixins: [TranslationMixin],
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
  data() {
    return {
      name: '',
      prefilledAddress: '',
      showAddressBookDialog: false,
      showSetContactDialog: false,
      isEditMode: false,
      accountsSubscription: null as Nullable<(() => void) | null>,
      accountsRecords: [] as PolkadotJsAccount[],
    };
  },
  computed: {
    connected(this: any) {
      return useWalletStore(this.$pinia).address;
    },
    source(this: any) {
      return useWalletStore(this.$pinia).source;
    },
    addressBook(this: any) {
      return useWalletStore(this.$pinia).book;
    },
    address: {
      get(this: any): string {
        return this.modelValue ?? this.value;
      },
      set(this: any, value: string): void {
        this.$emit('update:modelValue', value.trim());
      },
    },
    accountBook(this: any): Book {
      return this.accountsRecords.reduce((book: Book, { address, name }: PolkadotJsAccount) => {
        const key = formatAccountAddress(address);

        return {
          ...book,
          [key]: name,
        };
      }, {});
    },
    books(this: any): Book {
      return { ...this.accountBook, ...this.addressBook };
    },
    bookRecords(this: any): PolkadotJsAccount[] {
      return Object.entries((this.addressBook ?? {}) as Book).map(([address, name]) => ({
        address,
        name,
        source: this.source as AppWallet,
      }));
    },
    isNewAddress(this: any): boolean {
      if (!this.address) return false;

      const formattedAddress = formatAccountAddress(this.address);

      if (!formattedAddress) return false;

      const found = this.accountsRecords.find(
        (account: PolkadotJsAccount) => formatAccountAddress(account.address) === formattedAddress
      );

      return !this.addressBook?.[formattedAddress] && !found;
    },
    excludedAddress(this: any): string {
      return this.excludeConnected ? this.connected : '';
    },
    record(this: any): Nullable<PolkadotJsAccount> {
      const { address, name, source, isValid } = this;

      return isValid && name ? { address, name, source } : null;
    },
  },
  watch: {
    books(this: any): void {
      this.updateContactName();
    },
    isValid(this: any): void {
      this.updateContactName();
    },
  },
  async mounted(this: any): Promise<void> {
    this.accountsSubscription = await subscribeToWalletAccounts(api, this.source, (accounts) => {
      this.accountsRecords = accounts;
    });
  },
  beforeUnmount(this: any): void {
    if (this.accountsSubscription) {
      this.accountsSubscription();
      this.accountsSubscription = null;
    }
  },
  methods: {
    setAddressToBook(this: any, payload: { address: string; name: string }) {
      return useWalletStore(this.$pinia).setAddressToBook(payload);
    },
    removeAddressFromBook(this: any, address: string) {
      return useWalletStore(this.$pinia).removeAddressFromBook(address);
    },
    updateContactName(this: any): void {
      if (!this.isValid) {
        this.name = '';
      } else if (!this.name) {
        const key = formatAccountAddress(this.address);
        this.name = this.books[key] || '';
      }

      this.updateName();
    },
    openAddressBook(this: any): void {
      this.showAddressBookDialog = true;
    },
    chooseRecord(this: any, { name, address }: PolkadotJsAccount): void {
      this.address = address;
      this.name = name;
      this.updateName();
    },
    openContact(this: any, address: Nullable<string>, isEditMode = false): void {
      this.isEditMode = isEditMode;
      this.prefilledAddress = address ? formatAccountAddress(address) : '';
      this.showSetContactDialog = true;
    },
    resetAddress(this: any): void {
      this.address = '';
    },
    updateName(this: any): void {
      this.$emit('update:name', this.name);
    },
    removeInput(this: any): void {
      this.onRemove?.();
    },
  },
});
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
