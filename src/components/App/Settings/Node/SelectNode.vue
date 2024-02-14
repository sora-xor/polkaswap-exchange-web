<template>
  <div class="select-node s-flex">
    <div v-if="environment" class="select-node-description">
      {{ t('selectNodeDialog.selectNodeForEnvironment', { environment }) }}
    </div>
    <s-scrollbar class="select-node-scrollbar">
      <s-radio-group v-model="currentAddressValue" class="select-node-list s-flex">
        <s-radio
          v-for="node in nodes"
          :key="node.address"
          :label="node.address"
          :value="node.address"
          :disabled="node.address === nodeAddressConnecting"
          size="medium"
          class="select-node-list__item s-flex"
        >
          <div class="select-node-item s-flex">
            <div class="select-node-info s-flex">
              <div class="select-node-info__label">
                {{ node.title }}
              </div>
              <div class="select-node-info__desc s-flex">
                <div>{{ node.address }}</div>
                <div v-if="node.location" v-html="formatNodeLocation(node.location)" />
              </div>
            </div>
            <div class="select-node-badge">
              <s-icon v-if="node.connecting" name="el-icon-loading" />
            </div>
            <s-button
              class="select-node-details"
              type="action"
              alternative
              icon="arrows-chevron-right-rounded-24"
              @click.stop="handleNode(node)"
            />
          </div>
        </s-radio>
      </s-radio-group>
    </s-scrollbar>
    <s-button class="select-node-button s-typography-button--large" @click.stop="handleNode()">
      {{ t('selectNodeDialog.addNode') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, ModelSync } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import type { NodeItem } from '@/types/nodes';

import { formatLocation } from './utils';

@Component
export default class SelectNode extends Mixins(TranslationMixin) {
  @Prop({ default: () => [], type: Array }) readonly nodes!: Array<NodeItem>;
  @Prop({ default: () => {}, type: Function }) readonly handleNode!: (node?: NodeItem) => void;
  @Prop({ default: () => '', type: String }) readonly environment!: string;
  @Prop({ default: '', type: String }) readonly nodeAddressConnecting!: string;

  @ModelSync('value', 'input', { type: String })
  readonly currentAddressValue!: string;

  formatNodeLocation(code: string): string {
    const location = formatLocation(code);
    if (!location) return '';
    const flag = `<span class="flag-emodji">${location.flag}</span>`;
    if (!location.name) return flag;
    return `${location.name} ${flag}`;
  }

  async mounted(): Promise<void> {
    // Re-center dialog programmatically (need to simplify it). Components lazy loading might break it
    await this.$nextTick();
    const sDialog: any = this.$parent?.$parent;
    sDialog?.computeTop?.();
  }
}
</script>

<style lang="scss">
.select-node-list__item.el-radio {
  &.s-medium {
    height: initial;
  }

  .el-radio__label {
    flex: 1;
  }
}
.select-node-scrollbar {
  @include scrollbar(-$inner-spacing-big);
}
</style>

<style lang="scss" scoped>
$node-list-item-height: 66px;
$node-list-items: 5;
$node-desc-spacing: 6px;
$node-desc-border-radius: 8px;

.select-node {
  flex-direction: column;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
  }

  &-list {
    max-height: calc(#{$node-list-item-height} * #{$node-list-items});
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
        padding: $node-desc-spacing;
        margin-top: $node-desc-spacing;
        margin-right: $inner-spacing-mini;
        border-radius: $node-desc-border-radius;
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
