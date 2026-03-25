<template>
  <dialog-base v-model:visible="isVisible" :show-close-button="false" custom-class="dialog--confirm-invite-user">
    <div class="invite-user-icon" :class="{ 'invite-user-icon--error': hasReferrer }">
      <s-icon :name="iconName" :size="iconSize"></s-icon>
    </div>
    <p class="invite-user-title">
      {{ t(`referralProgram.confirm.${hasReferrer ? 'hasReferrer' : 'invite'}Title`) }}
    </p>
    <p class="invite-user-description">
      {{ t(`referralProgram.confirm.${hasReferrer ? 'hasReferrer' : 'invite'}Description`) }}
    </p>
    <template #footer>
      <s-button
        class="s-typography-button--large"
        :type="hasReferrer ? 'secondary' : 'primary'"
        :disabled="loading"
        @click="handleConfirmInviteUser"
      >
        {{ t(`referralProgram.confirm.${hasReferrer ? 'ok' : 'signInvitation'}`) }}
      </s-button>
      <div v-if="!hasReferrer" class="invite-user-free-charge">
        <s-icon class="invite-user-info" name="basic-check-mark-24" size="10px"></s-icon>
        <span>{{ t('referralProgram.confirm.freeOfCharge') }}</span>
      </div>
    </template>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@/shims/wallet-components';
import { api } from '@/shims/wallet-api';
import { computed, watchEffect } from 'vue';

import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { useReferralsStore } from '@/stores/referrals';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
  },
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm', value?: boolean): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { loading, withNotifications } = useTransaction();
const { t } = useTranslation();
const referralsStore = useReferralsStore();

const referrer = computed(() => referralsStore.referrer);
const storageReferrer = computed(() => referralsStore.storageReferrer);

const hasReferrer = computed(() => Boolean(referrer.value));
const iconName = computed(() => (hasReferrer.value ? 'notifications-alert-triangle-24' : 'finance-PSWAP-24'));
const iconSize = computed(() => (hasReferrer.value ? 64 : 40));

const handleConfirmInviteUser = async () => {
  if (!hasReferrer.value) {
    referralsStore.approveReferrer(true);
    try {
      await withNotifications(async () => {
        await api.referralSystem.setInvitedUser(storageReferrer.value);
      });
      emit('confirm', true);
    } catch (error) {
      referralsStore.approveReferrer(false);
      emit('confirm');
    }
  } else {
    emit('confirm');
  }

  isVisible.value = false;
  if (storageReferrer.value) {
    referralsStore.resetStorageReferrer();
  }
};

watchEffect(() => {
  if (!isVisible.value && storageReferrer.value) {
    referralsStore.resetStorageReferrer();
  }
});

defineExpose({
  handleConfirmInviteUser,
  isVisible,
});
</script>

<style lang="scss" scoped>
$invite-user-icon-size: 64px;

.invite-user {
  &-icon {
    margin-right: auto;
    margin-left: auto;
    margin-bottom: $inner-spacing-medium;
    height: #{$invite-user-icon-size};
    width: #{$invite-user-icon-size};
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--s-color-status-error);
    border-radius: 50%;
    > i {
      color: var(--s-color-base-on-accent);
    }
    &--error {
      background-color: transparent;
      > i {
        color: var(--s-color-status-error);
      }
    }
  }
  &-title,
  &-description,
  &-free-charge {
    text-align: center;
    font-weight: 300;
  }
  &-title {
    margin-bottom: $inner-spacing-small;
    font-size: var(--s-heading3-font-size);
    line-height: var(--s-line-height-small);
    letter-spacing: var(--s-letter-spacing-mini);
  }
  &-description,
  &-free-charge {
    font-size: var(--s-font-size-small);
    line-height: var(--s-line-height-medium);
  }
  &-free-charge {
    margin-top: $inner-spacing-small;
    display: flex;
    justify-content: center;
  }
  &-info.s-icon-basic-check-mark-24 {
    margin-right: calc(#{$inner-spacing-small} / 2);
    line-height: var(--s-line-height-big);
    color: var(--s-color-status-info);
  }
}
</style>
