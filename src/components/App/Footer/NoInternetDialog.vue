<template>
  <s-dialog
    class="no-internet"
    width="466px"
    :visible="!isInternetConnectionEnabled"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-esc="false"
  >
    <div class="no-internet__content s-flex">
      <div class="no-internet__icon s-flex"><s-icon name="wi-fi-16" size="32" /></div>
      <span class="no-internet__title">{{ t('footer.internet.dialogTitle') }}</span>
      <span class="no-internet__desc">{{ t('footer.internet.dialogDesc') }}</span>
    </div>
    <s-button slot="footer" class="no-internet__action" @click="refreshPage">{{
      t('footer.internet.action')
    }}</s-button>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter } from '@/store/decorators';

@Component
export default class NoInternetDialog extends Mixins(TranslationMixin) {
  @getter.settings.isInternetConnectionEnabled isInternetConnectionEnabled!: boolean;

  refreshPage(): void {
    window.location.reload();
  }
}
</script>

<style lang="scss">
$no-internet-dialog-width-limit: 465px;

.no-internet .el-dialog {
  @media screen and (max-width: $no-internet-dialog-width-limit) {
    width: auto !important; // to ignore style width
  }
}
</style>

<style lang="scss" scoped>
$no-internet-icon-size: 72px;
$no-internet-font-weight: 300;

.no-internet {
  &__content {
    flex-direction: column;
    align-items: center;
  }
  &__icon {
    height: $no-internet-icon-size;
    width: $no-internet-icon-size;
    background-color: var(--s-color-status-error);
    border-radius: var(--s-border-radius-small);
    align-items: center;
    justify-content: center;
    margin-bottom: $inner-spacing-medium;
    > i {
      color: var(--s-color-base-on-accent);
    }
  }
  &__title {
    margin-bottom: $inner-spacing-medium;
    font-weight: $no-internet-font-weight;
    font-size: var(--s-font-size-large);
  }
  &__desc {
    font-weight: $no-internet-font-weight;
    font-size: var(--s-font-size-small);
    letter-spacing: var(--s-letter-spacing-small);
  }
  &__action {
    width: 100%;
  }
}
</style>
