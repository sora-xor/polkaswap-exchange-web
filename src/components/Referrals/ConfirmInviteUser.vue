<template>
  <dialog-base :visible.sync="isVisible" :show-close-button="false" custom-class="dialog--confirm-invite-user">
    <div class="invite-user-icon"><s-icon name="lock-16" size="24px" /></div>
    <p class="invite-user-ititle">{{ t('referralProgram.confirm.inviteTitle') }}</p>
    <p class="invite-user-description">{{ t('referralProgram.confirm.inviteDescription') }}</p>
    <template #footer>
      <s-button type="primary" class="s-typography-button--large" :disabled="loading" @click="handleConfirmBonding">
        {{ t('referralProgram.confirm.signInvitation') }}
      </s-button>
      <div class="invite-user-free-charge">
        <div class="invite-user-lock"><s-icon name="lock-16" size="12px" /></div>
        <span>{{ t('referralProgram.confirm.freeOfCharge') }}</span>
      </div>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

@Component({
  components: { DialogBase },
})
export default class ConfirmInviteUser extends Mixins(mixins.TransactionMixin, DialogMixin) {
  async handleConfirmBonding(): Promise<void> {
    try {
      await this.withNotifications(
        async () => await api.setInvitedUser('cnUoizELoPeeUwosXuYFUW2jJCnbrrfMUtdNtyAsa48FHQxPA')
      );
      this.$emit('confirm', true);
    } catch (error) {
      this.$emit('confirm');
    }
    this.isVisible = false;
  }
}
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
    background-color: var(--s-color-status-error);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  &-icon,
  &-lock {
    border-radius: 50%;
    .s-icon-lock-16 {
      color: var(--s-color-base-on-accent);
    }
  }
  &-ititle,
  &-description,
  &-free-charge {
    text-align: center;
    font-weight: 300;
  }
  &-ititle {
    margin-bottom: $inner-spacing-medium;
    font-size: var(--s-heading3-font-size);
    line-height: var(--s-line-height-small);
    letter-spacing: var(--s-letter-spacing-mini);
    padding-right: var(--s-size-big);
    padding-left: var(--s-size-big);
  }
  &-description,
  &-free-charge {
    font-size: var(--s-font-size-small);
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
    padding-right: $inner-spacing-medium;
    padding-left: $inner-spacing-medium;
  }
  &-free-charge {
    margin-top: $inner-spacing-small;
    display: flex;
    justify-content: center;
  }
  &-lock {
    height: var(--s-icon-font-size-medium);
    width: var(--s-icon-font-size-medium);
    margin-right: calc(#{$inner-spacing-small} / 2);
    background-color: var(--s-color-theme-accent);
  }
}
</style>
