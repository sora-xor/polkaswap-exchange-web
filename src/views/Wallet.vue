<template>
  <div>
    <sora-wallet v-loading="parentLoading" class="container container--wallet" @close="handleClose" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import router, { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component
export default class Wallet extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;

  handleClose(): void {
    router.back();
  }
}
</script>

<style lang="scss">
.container--wallet {
  > .el-card {
    &__header {
      padding-top: 0;
      padding-right: 0;
      padding-left: 0;
    }
    &__body {
      padding: $inner-spacing-medium 0 0;
    }
  }
  .history .history-items {
    padding: 0 $inner-spacing-mini;
  }
  .s-icon-basic-check-mark-24 {
    @include icon-styles;
  }
}
</style>
