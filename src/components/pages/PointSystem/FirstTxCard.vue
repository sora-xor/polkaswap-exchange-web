<template>
  <div class="task-card">
    <p class="task-card__first-trx">{{ t('points.firstSoraNetworkTransaction') }}</p>
    <s-divider direction="vertical" />

    <div class="task-card__date">
      <p>{{ t('points.dated') }}</p>
      <p>{{ formattedDate }}</p>
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
    max-width: calc($inner-spacing-large * 4.5);
  }
  &__date {
    margin-left: $inner-spacing-big;
    display: flex;
    flex-direction: column;
    color: var(--s-color-base-content-secondary);
    font-weight: 800;
    font-size: 11px;
    gap: $inner-spacing-tiny;
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
    &__first-trx {
      margin-right: 16px;
    }
  }
}
</style>
