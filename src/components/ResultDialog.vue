<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('resultDialog.title')"
  >
    <s-icon name="arrow-top-right-rounded" />
    <s-divider />
    <div class="transaction">
      <div v-if="type" class="transaction-type">{{ type }}</div>
      <div v-if="message" class="transaction-info">{{ message }}</div>
      <!-- TODO: Add correct icons and add functionality -->
      <!-- <s-icon name="external-link" @click="handleTransactionInfo" /> -->
      <!-- <s-icon name="arrow-bottom-rounded" /> -->
    </div>
    <s-divider />
    <template #footer>
      <s-button type="primary" @click="handleSubmitTransaction">{{ t('resultDialog.ok') }}</s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from './DialogBase.vue'

@Component({
  components: {
    DialogBase
  }
})
export default class ResultDialog extends Mixins(TranslationMixin, DialogMixin) {
  @Prop({ default: '', type: String }) readonly type!: string
  @Prop({ default: '', type: String }) readonly message!: string

  handleSubmitTransaction (): void {
    this.$emit('close')
    this.isVisible = false
  }

  handleTransactionInfo (): void {
    // TODO: Go to Transaction Info
  }
}
</script>

<style lang="scss" scoped>
$transactionIconSize: 68px;

.s-icon-arrow-top-right-rounded {
  font-size: $transactionIconSize;
  color: var(--s-color-theme-accent);
}
.transaction {
  display: flex;
  align-items: center;
  width: 100%;
  &-type,
  .s-icon-external-link {
    color: var(--s-color-base-content-secondary);
  }
  &-type {
    display: block;
    padding: $inner-spacing-mini / 2 $inner-spacing-mini;
    margin-right: $inner-spacing-mini / 2;
    text-transform: uppercase;
    font-size: $s-font-size-settings;
    font-weight: $s-font-weight-big;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-mini);
  }
  &-info {
    margin-right: $inner-spacing-mini;
    font-weight: $s-font-weight-medium;
  }
  .s-icon-external-link {
    cursor: pointer;
  }
}
.el-divider {
  margin-top: $inner-spacing-small;
  margin-bottom: $inner-spacing-small;
}
</style>
