<template>
  <s-dropdown
    type="ellipsis"
    border-radius="mini"
    icon="basic-more-vertical-24"
    class="account-actions"
    popper-class="account-actions-menu"
  >
    <template #menu>
      <s-dropdown-item
        v-for="{ value, name, icon, status } in items"
        :key="value"
        :value="value"
        :class="['account-actions__item', status]"
        :icon="icon"
      >
        {{ name }}
      </s-dropdown-item>
    </template>
  </s-dropdown>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { AccountActionTypes } from '@/consts';

interface ActionEntry {
  name: string;
  icon: string;
  status: string;
}

const actionsMetadata: Record<AccountActionTypes, ActionEntry> = {
  [AccountActionTypes.Rename]: {
    name: 'account.rename',
    icon: 'basic-options-24',
    status: '',
  },
  [AccountActionTypes.Export]: {
    name: 'account.export',
    icon: 'basic-pulse-24',
    status: '',
  },
  [AccountActionTypes.Logout]: {
    name: 'logoutText',
    icon: 'security-logout-24',
    status: '',
  },
  [AccountActionTypes.Delete]: {
    name: 'account.delete',
    icon: 'paperclip-16',
    status: 'error',
  },
  [AccountActionTypes.BookSend]: {
    name: 'addressBook.options.send',
    icon: 'finance-send-24',
    status: '',
  },
  [AccountActionTypes.BookEdit]: {
    name: 'addressBook.options.edit',
    icon: 'el-icon-edit',
    status: '',
  },
  [AccountActionTypes.BookDelete]: {
    name: 'addressBook.options.delete',
    icon: 'el-icon-delete',
    status: '',
  },
};

const props = withDefaults(
  defineProps<{
    actions?: AccountActionTypes[];
  }>(),
  {
    actions: () => [],
  }
);

const { t } = useTranslation();

const items = computed(() =>
  props.actions.map((value) => {
    const { name, icon, status } = actionsMetadata[value];
    return {
      value,
      name: t(name),
      icon,
      status,
    };
  })
);

defineExpose({ items });
</script>

<style lang="scss">
.account-actions {
  &.el-dropdown {
    color: inherit;
    line-height: 0;
    width: 24px;
    height: 24px;

    .s-icon-basic-more-vertical-24 {
      width: 24px;
      height: 24px;
      font-size: 24px !important;
      line-height: 24px !important;
    }
  }

  &__item.el-dropdown-menu__item {
    & > i {
      color: var(--s-color-base-content-tertiary);
    }

    &.error {
      &,
      &:hover,
      &:focus,
      &:active {
        color: var(--s-color-status-error);
        & > i {
          color: inherit;
        }
      }
    }
  }
}
</style>
