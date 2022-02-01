<template>
  <dialog-base :visible.sync="isVisible" :show-close-button="false" custom-class="dialog--confirm-invite-user">
    <div class="invite-user-icon">
      <s-icon name="file-file-text-24" size="40px" />
    </div>
    <p class="invite-user-ititle">{{ t('referralProgram.confirm.inviteTitle') }}</p>
    <p class="invite-user-description">{{ t('referralProgram.confirm.inviteDescription') }}</p>
    <template #footer>
      <s-button type="primary" class="s-typography-button--large" :disabled="loading" @click="handleConfirmInviteUser">
        {{ t('referralProgram.confirm.signInvitation') }}
      </s-button>
      <div class="invite-user-free-charge">
        <s-icon class="invite-user-info" name="chevron-down-rounded-16" size="14px" />
        <span>{{ t('referralProgram.confirm.freeOfCharge') }}</span>
      </div>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Getter, Action } from 'vuex-class';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

@Component({
  components: { DialogBase },
})
export default class ConfirmInviteUser extends Mixins(mixins.TransactionMixin, DialogMixin) {
  @Getter storageReferral!: string;

  @Action setReferral!: (value: string) => Promise<void>;

  async handleConfirmInviteUser(): Promise<void> {
    try {
      await this.withNotifications(async () => await api.referralSystem.setInvitedUser(this.storageReferral));
      this.$emit('confirm', true);
    } catch (error) {
      this.$emit('confirm');
    }
    this.setReferral('');
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
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--s-color-status-error);
    border-radius: 50%;
    .s-icon-file-file-text-24 {
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
    margin-bottom: $inner-spacing-small;
    font-size: var(--s-heading3-font-size);
    line-height: var(--s-line-height-small);
    letter-spacing: var(--s-letter-spacing-mini);
  }
  &-description,
  &-free-charge {
    font-size: var(--s-font-size-small);
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
  }
  &-free-charge {
    margin-top: $inner-spacing-small;
    display: flex;
    justify-content: center;
  }
  &-info.s-icon-chevron-down-rounded-16 {
    margin-right: calc(#{$inner-spacing-small} / 2);
    line-height: var(--s-line-height-medium);
    color: var(--s-color-status-warning);
  }
}
</style>
