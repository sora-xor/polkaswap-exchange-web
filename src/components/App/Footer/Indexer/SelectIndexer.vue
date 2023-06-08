<template>
  <div class="select-indexer s-flex">
    <div class="select-indexer-description">
      {{ t('selectIndexerDialog.selectIndexerForEnvironment', { environment }) }}
    </div>
    <s-scrollbar class="select-indexer-scrollbar">
      <s-radio-group v-model="currentAddressValue" class="select-indexer-list s-flex">
        <s-radio
          v-for="indexer in indexers"
          :key="indexer.address"
          :label="indexer.address"
          :value="indexer.address"
          :disabled="disableSelect"
          size="medium"
          class="select-indexer-list__item s-flex"
        >
          <div class="select-indexer-item s-flex">
            <div class="select-indexer-info s-flex">
              <div class="select-indexer-info__label">
                {{ indexer.name }}
              </div>
              <div class="select-indexer-info__desc s-flex">
                <div>{{ indexer.type }}</div>
                <div>{{ indexer.address }}</div>
              </div>
            </div>
          </div>
        </s-radio>
      </s-radio-group>
    </s-scrollbar>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, ModelSync } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import type { Indexer } from '@/types/indexers';

@Component
export default class SelectIndexer extends Mixins(TranslationMixin) {
  @Prop({ default: () => [], type: Array }) indexers!: Array<Indexer>;
  @Prop({ default: '', type: String }) environment!: string;
  @Prop({ default: false, type: Boolean }) disableSelect!: boolean;

  @ModelSync('value', 'input', { type: String })
  readonly currentAddressValue!: string;
}
</script>

<style lang="scss">
.select-indexer-list__item.el-radio {
  &.s-medium {
    height: initial;
  }

  .el-radio__label {
    flex: 1;
  }
}
.select-indexer-scrollbar {
  @include scrollbar(-$inner-spacing-big);
}
</style>

<style lang="scss" scoped>
$indexer-list-item-height: 66px;
$indexer-list-items: 5;
$indexer-desc-spacing: 6px;
$indexer-desc-border-radius: 8px;

.select-indexer {
  flex-direction: column;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
  }

  &-list {
    max-height: calc(#{$indexer-list-item-height} * #{$indexer-list-items});
    flex-direction: column;

    &__item {
      margin-right: 0;
      align-items: center;
      padding: $inner-spacing-small $inner-spacing-big;
      white-space: normal;
    }
  }

  &-item {
    flex: 1;
    align-items: center;
  }

  &-info {
    flex-direction: column;
    flex: 1;
    margin-right: $inner-spacing-small;

    &__label {
      color: var(--s-color-base-content-primary);
      line-height: var(--s-line-height-medium);
      @include radio-title;
    }

    &__desc {
      flex-wrap: wrap;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      font-weight: 300;
      line-height: var(--s-line-height-medium);
      > div {
        background: var(--s-color-base-background);
        padding: $indexer-desc-spacing;
        margin-top: $indexer-desc-spacing;
        margin-right: $inner-spacing-mini;
        border-radius: $indexer-desc-border-radius;
      }
    }
  }

  &-details {
    padding: 0;
  }

  &-button {
    width: 100%;
  }

  &-badge {
    width: var(--s-size-mini);
    display: flex;
    flex-flow: row nowrap;
    justify-content: center;
    .el-icon-loading {
      color: var(--s-color-base-content-tertiary);
    }
  }

  &-description {
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: 0 $inner-spacing-small;
  }
}
</style>
