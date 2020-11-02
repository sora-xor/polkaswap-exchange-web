<template>
  <s-dialog
    :visible.sync="visible"
    :title="t('exchange.transactionSubmitted')"
    width="496px"
  >
    <i class="transaction-icon" />
    <p>Test message</p>
    <template #footer>
      <s-button type="primary" size="medium" @click="visible = false">{{ t('exchange.ok') }}</s-button>
    </template>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class TransactionSubmit extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false }) visible!: boolean
}
</script>

<style lang="scss" scoped>
$transactionIconSize: 54px;

.transaction-icon {
  display: block;
  width: $transactionIconSize;
  height: $transactionIconSize;
  background-image: url('~@/assets/img/transaction-icon.svg');
  background-repeat: no-repeat;
}

</style>
