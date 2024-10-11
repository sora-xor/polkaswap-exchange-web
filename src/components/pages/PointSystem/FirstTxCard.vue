<template>
  <div class="task-card">
    <p class="task-card__first-trx">Your first SORA Network Transaction</p>
    <s-divider direction="vertical" />

    <div class="task-card__date">
      <p>Dated</p>
      <p>{{ this.formattedDate }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
  },
})
export default class FirstTxCard extends Mixins(mixins.TranslationMixin) {
  @Prop({ required: true, type: Number })
  readonly date!: number;

  get formattedDate(): string {
    return this.formatDate(this.date, 'L');
  }
}
</script>

<style lang="scss" scoped>
.task-card {
  .el-divider {
    height: 100%;
    background-color: var(--s-color-base-content-tertiary);
  }
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  &__first-trx {
    font-size: 15px;
    font-weight: 300;
    max-width: 182px;
  }
  &__date {
    margin-left: 24px;
    display: flex;
    flex-direction: column;
    color: var(--s-color-base-content-secondary);
    font-weight: 800;
    font-size: 11px;
    gap: 6px;
    p:last-of-type {
      color: var(--s-color-status-info);
    }
  }
  @include mobile(true) {
    .el-divider {
      display: none;
    }
    &__date {
      gap: unset;
      margin-left: unset;
    }
  }
}
</style>
