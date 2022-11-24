<template>
  <dialog-base :visible.sync="isVisible" :show-close-button="false" custom-class="dialog--confirm-invite-user">
    <div :class="computedIconClasses">
      <s-icon v-if="!hasReferrer" name="file-file-text-24" size="40px" />
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
        <s-icon class="invite-user-info" name="basic-check-mark-24" size="10px" />
        <span>{{ t('referralProgram.confirm.freeOfCharge') }}</span>
      </div>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';

import { state, mutation } from '@/store/decorators';

@Component({
  components: { DialogBase: components.DialogBase },
})
export default class ConfirmInviteUser extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  @state.referrals.referrer private referrer!: string;
  @state.referrals.storageReferrer private storageReferrer!: string;

  @mutation.referrals.resetStorageReferrer private resetStorageReferrer!: VoidFunction;

  get hasReferrer(): boolean {
    return !!this.referrer;
  }

  get computedIconClasses(): Array<string> {
    const cssClasses: Array<string> = ['invite-user-icon'];
    if (this.hasReferrer) {
      cssClasses.push('invite-user-icon--error');
    }
    return cssClasses;
  }

  async handleConfirmInviteUser(): Promise<void> {
    if (!this.hasReferrer) {
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
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--s-color-status-error);
    border-radius: 50%;
    .s-icon-file-file-text-24 {
      color: var(--s-color-base-on-accent);
    }
    &--error {
      background: url('~@/assets/img/referrer-error.svg') no-repeat;
      border-radius: 0;
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
    letter-spacing: var(--s-letter-spacing-small);
  }
  &-free-charge {
    margin-top: $inner-spacing-small;
    display: flex;
    justify-content: center;
  }
  &-info.s-icon-basic-check-mark-24 {
    margin-right: calc(#{$inner-spacing-small} / 2);
    line-height: var(--s-line-height-big);
    color: var(--s-color-status-warning);
  }
}
</style>
