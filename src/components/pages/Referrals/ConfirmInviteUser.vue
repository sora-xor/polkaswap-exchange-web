<template>
  <dialog-base :visible.sync="isVisible" :show-close-button="false" custom-class="dialog--confirm-invite-user">
    <div class="invite-user-icon" :class="{ 'invite-user-icon--error': hasReferrer }">
      <s-icon :name="iconName" :size="iconSize" />
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
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { state, mutation } from '@/store/decorators';

// TODO: [Rustem] remove hasReferrer logic (localise)
@Component({
  components: { DialogBase: components.DialogBase },
})
export default class ReferralsConfirmInviteUser extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  @state.referrals.referrer private referrer!: string;
  @state.referrals.storageReferrer private storageReferrer!: string;

  @mutation.referrals.resetStorageReferrer private resetStorageReferrer!: FnWithoutArgs;
  @mutation.referrals.approveReferrer private approveReferrer!: (value: boolean) => void;

  get hasReferrer(): boolean {
    return !!this.referrer;
  }

  get iconName(): string {
    return this.hasReferrer ? 'notifications-alert-triangle-24' : 'finance-PSWAP-24';
  }

  get iconSize(): number {
    return this.hasReferrer ? 64 : 40;
  }

  async handleConfirmInviteUser(): Promise<void> {
    if (!this.hasReferrer) {
      this.approveReferrer(true);
      try {
        await this.withNotifications(async () => await api.referralSystem.setInvitedUser(this.storageReferrer));
        this.$emit('confirm', true);
      } catch (error) {
        this.approveReferrer(false);
        this.$emit('confirm');
      }
    }
    this.isVisible = false;
  }

  @Watch('isVisible')
  private isDialogVisible(isVisible: boolean): void {
    if (!isVisible && this.storageReferrer) {
      this.resetStorageReferrer();
    }
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
