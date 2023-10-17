<template>
  <div class="statistics-dialog">
    <s-scrollbar class="statistics-dialog__scrollbar">
      <div class="statistics-dialog__group">
        <span class="statistics-dialog__group-title">{{ t('footer.statistics.dialog.indexer') }}</span>
        <s-radio-group v-model="indexerType" class="statistics-dialog__block s-flex">
          <s-radio
            v-for="indexer in indexers"
            :key="indexer.type"
            :label="indexer.type"
            :value="indexer.type"
            :disabled="!indexer.endpoint"
            size="medium"
            class="statistics-dialog__item s-flex"
          >
            <div class="service-item s-flex">
              <div class="service-item__label s-flex">
                <div class="service-item__name">{{ indexer.name }}</div>
                <div v-if="indexer.endpoint" class="service-item__endpoint">{{ indexer.endpoint }}</div>
              </div>
              <div class="service-item__status" :class="indexer.online ? 'success' : 'error'">
                {{ indexer.online ? TranslationConsts.online : TranslationConsts.offline }}
              </div>
            </div>
          </s-radio>
        </s-radio-group>
        <s-divider />
        <div class="statistics-dialog__group">
          <div class="statistics-dialog__item">
            <div class="switcher">
              <s-switch disabled :value="false" />
              <span>{{ t('footer.statistics.dialog.useCeres') }}</span>
            </div>
          </div>
        </div>
      </div>
    </s-scrollbar>
  </div>
</template>

<script lang="ts">
import { IndexerType } from '@soramitsu/soraneo-wallet-web/lib/consts';
import { Component, Mixins, Prop, ModelSync } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import type { Indexer } from '@/types/indexers';

@Component
export default class SelectIndexer extends Mixins(TranslationMixin) {
  @Prop({ default: () => [], type: Array }) indexers!: Array<Indexer>;

  @ModelSync('value', 'input', { type: String }) readonly indexerType!: IndexerType;
}
</script>

<style lang="scss">
.statistics-dialog__item {
  &.el-radio {
    &.s-medium {
      height: initial;
    }
    .el-radio__label {
      flex: 1;
    }
  }
}
</style>

<style lang="scss" scoped>
$statistics-border-radius: 8px;

.statistics-dialog {
  &__group {
    &-title {
      font-weight: 600;
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-small);
      font-size: var(--s-font-size-small);
    }
  }

  &__block {
    flex-direction: column;
    margin-top: $inner-spacing-small;
  }

  &__item {
    margin-right: 0;
    align-items: center;
    padding: $inner-spacing-small $inner-spacing-big;
    white-space: normal;
  }
}
.service-item {
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  letter-spacing: var(--s-letter-spacing-small);
  line-height: var(--s-line-height-medium);

  &__label {
    flex-direction: column;
    flex: 1;
    margin-right: $inner-spacing-mini;
  }

  &__name {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-medium);
    font-weight: 600;
  }

  &__endpoint {
    background: var(--s-color-base-background);
    padding: 6px;
    margin-top: 6px;
    border-radius: $statistics-border-radius;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    font-weight: 300;
  }

  &__status {
    $status-classes: 'error', 'success';

    padding: 2px 6px;
    border-radius: $statistics-border-radius;
    font-weight: 400;
    font-size: var(--s-font-size-mini);
    letter-spacing: var(--s-letter-spacing-small);

    @each $status in $status-classes {
      &.#{$status} {
        color: var(--s-color-status-#{$status});
        background-color: var(--s-color-status-#{$status}-background);
        [design-system-theme='dark'] & {
          --s-color-status-#{$status}: var(--s-color-base-on-accent);
        }
      }
    }
  }
}

.switcher {
  display: flex;
  align-items: center;

  & > span {
    margin-left: $inner-spacing-small;
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-medium);
    font-weight: 600;
  }
}
</style>
