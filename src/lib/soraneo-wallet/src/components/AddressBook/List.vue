<template>
  <dialog-base v-model:visible="isVisible" :title="t('addressBook.dialogTitle')" append-to-body>
    <template v-if="userHasContacts">
      <search-input
        v-model="search"
        autofocus
        :placeholder="t('addressBook.searchPlaceholder')"
        :maxlength="100"
        class="address-book__search"
        @clear="resetSearch"
      ></search-input>
      <s-scrollbar class="address-book-scrollbar">
        <div v-if="accountBookFiltered.length" class="address-book__list">
          <span class="address-book__sections">
            {{ t('addressBook.myAccounts') }}
          </span>
          <wallet-account
            v-for="(record, index) in accountBookFiltered"
            :key="index"
            v-button
            class="address-book__list-item"
            with-identity
            :polkadot-account="record"
            @click="selectRecord(record)"
            @identity="updateIdentity($event, record.address)"
          >
            <account-actions-menu
              :actions="accountActions"
              @select="handleContactAction($event, record)"
            ></account-actions-menu>
          </wallet-account>
        </div>
        <div v-if="addressBookFiltered.length" class="address-book__list">
          <span class="address-book__sections">{{ t('addressBook.myBook') }}</span>
          <wallet-account
            v-for="(record, index) in addressBookFiltered"
            :key="index"
            v-button
            class="address-book__list-item"
            with-identity
            :polkadot-account="record"
            @click="selectRecord(record)"
          >
            <account-actions-menu
              :actions="contactActions"
              @select="handleContactAction($event, record)"
            ></account-actions-menu>
          </wallet-account>
        </div>
        <div v-if="showNoRecordsFound" class="address-book__no-found-records">
          {{ t('addressBook.noFoundRecords') }}
        </div>
      </s-scrollbar>
    </template>
    <div v-else class="address-book__no-contacts">{{ t('addressBook.noContacts') }}</div>
    <s-button class="address-book__btn s-typography-button--large" @click="setContact(null)">
      {{ t('addressBook.addContact') }}
    </s-button>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';

import { useDialogVisibility } from '@/composables/useDialog';
import { useTranslation } from '@/composables/useTranslation';
import { AccountActionTypes } from '@/consts';
import type { AccountIdentity, PolkadotJsAccount } from '@/types/common';
import { formatAccountAddress } from '@/util';

import AccountActionsMenu from '../Account/ActionsMenu.vue';
import WalletAccount from '../Account/WalletAccount.vue';
import DialogBase from '../DialogBase.vue';
import SearchInput from '../Input/SearchInput.vue';

defineOptions({ name: 'AddressBookListDialog' });

const props = withDefaults(
  defineProps<{
    accounts?: PolkadotJsAccount[];
    records?: PolkadotJsAccount[];
    excludedAddress?: string;
  }>(),
  {
    accounts: () => [] as PolkadotJsAccount[],
    records: () => [] as PolkadotJsAccount[],
    excludedAddress: '',
  }
);

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'select', value: PolkadotJsAccount): void;
  (event: 'open', address: Nullable<string>, isEditMode?: boolean): void;
  (event: 'remove', address: string): void;
}>();

const { t } = useTranslation();
const visibleModel = defineModel<boolean>('visible', { default: false });
const { isVisible, closeDialog } = useDialogVisibility(visibleModel, {
  onClose: () => emit('close'),
});

const accountActions = [AccountActionTypes.BookSend];
const contactActions = [AccountActionTypes.BookSend, AccountActionTypes.BookEdit, AccountActionTypes.BookDelete];

const search = ref('');
const identities = reactive<Record<string, AccountIdentity>>({});

const searchValue = computed(() => (search.value ? search.value.trim().toLowerCase() : ''));

const baseRecords = computed(() => props.records ?? []);
const baseAccounts = computed(() => props.accounts ?? []);

const formatAccount = (account: PolkadotJsAccount) => {
  const address = formatAccountAddress(account.address);
  const identity = identities[address];

  return {
    address,
    name: account.name,
    source: account.source,
    identity,
  } as PolkadotJsAccount;
};

const prepareRecords = (source: PolkadotJsAccount[]) => {
  const mapped = source.map(formatAccount);
  const filtered = mapped.filter((record) => record.address !== (props.excludedAddress ?? ''));
  return [...filtered].sort((a, b) => (a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1));
};

const addressBook = computed(() => prepareRecords(baseRecords.value));
const accountBook = computed(() => prepareRecords(baseAccounts.value));

const foundRecords = (records: PolkadotJsAccount[]) => {
  if (!searchValue.value) return records;

  return records.filter(({ address = '', name = '', identity }) => {
    const normalizedAddress = address.toLowerCase();
    const normalizedName = name.toLowerCase();
    const identityName = identity?.name?.toLowerCase() ?? '';

    return (
      normalizedAddress === searchValue.value ||
      normalizedName.includes(searchValue.value) ||
      identityName.includes(searchValue.value)
    );
  });
};

const addressBookFiltered = computed(() => foundRecords(addressBook.value));
const accountBookFiltered = computed(() => foundRecords(accountBook.value));

const userHasContacts = computed(() => Boolean(addressBook.value.length || accountBook.value.length));
const showNoRecordsFound = computed(() => !(addressBookFiltered.value.length || accountBookFiltered.value.length));

const resetSearch = () => {
  search.value = '';
};

const selectRecord = (record: PolkadotJsAccount) => {
  emit('select', record);
  closeDialog();
};

const setContact = (address: Nullable<string>, isEditMode = false) => {
  emit('open', address, isEditMode);
};

const removeAddressFromBook = (address: string) => {
  emit('remove', address);
};

const updateIdentity = (identity: Nullable<AccountIdentity>, address: string) => {
  if (identity) {
    identities[address] = identity;
  } else {
    delete identities[address];
  }
};

const handleContactAction = (actionType: string, { address, name, source }: PolkadotJsAccount) => {
  switch (actionType) {
    case AccountActionTypes.BookSend:
      selectRecord({ address, name, source } as PolkadotJsAccount);
      break;
    case AccountActionTypes.BookEdit:
      setContact(address, true);
      break;
    case AccountActionTypes.BookDelete:
      removeAddressFromBook(address);
      break;
  }
};
</script>

<style lang="scss">
.address-book-scrollbar {
  @include scrollbar($basic-spacing-big);
}
</style>

<style lang="scss" scoped>
.address-book {
  &__btn {
    width: 100%;
    margin-top: calc($basic-spacing * 2);
    .el-button {
      width: 100%;
    }
  }

  &__sections {
    display: block;
    font-size: var(--s-font-size-small);
    text-transform: uppercase;
    margin: $basic-spacing 0;
    font-weight: 500;
    color: var(--s-color-base-content-secondary);
  }

  &__search {
    margin-bottom: calc($basic-spacing * 2);
  }

  &__no-contacts {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-medium);
    text-align: center;
    height: 150px;
    line-height: 120px;
  }

  &__no-found-records {
    text-align: center;
    color: var(--s-color-base-content-secondary);
    margin-top: $basic-spacing;
    font-size: var(--s-font-size-medium);
  }

  &-scrollbar {
    height: 400px;
  }

  &__list {
    &-item {
      &.account-card.s-card.neumorphic {
        border-width: 1px;

        &:hover {
          cursor: pointer;
          border-color: var(--s-color-base-content-secondary);
        }
      }

      & + & {
        margin-top: $basic-spacing;
      }
    }
  }
}
</style>
