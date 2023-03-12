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
      <span class="no-internet__title">Connect to internet source</span>
      <span class="no-internet__desc">Polkaswap requires internet connection for stable experience</span>
    </div>
    <s-button slot="footer" class="no-internet__action" @click="refreshPage">REFRESH PAGE</s-button>
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
.no-internet {
  &__content {
    flex-direction: column;
    align-items: center;
  }
  &__icon {
    height: 72px;
    width: 72px;
    background-color: var(--s-color-status-error);
    border-radius: 24px;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    > i {
      color: var(--s-color-base-on-accent);
    }
  }
  &__title {
    margin-bottom: 16px;
    font-weight: 300;
    font-size: 24px;
  }
  &__desc {
    font-weight: 300;
    font-size: 14px;
    letter-spacing: var(--s-letter-spacing-small);
  }
  &__action {
    width: 100%;
  }
}
</style>
