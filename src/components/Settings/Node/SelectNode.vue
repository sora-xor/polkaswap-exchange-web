<template>
  <div class="select-node s-flex">
    <div class="select-node-description p4">
      {{ t('selectNodeDialog.selectNodeForEnvironment', { environment }) }}
    </div>
    <s-radio-group v-model="currentAddressValue" class="select-node-list s-flex">
      <s-radio
        v-for="node in nodes"
        :key="node.address"
        :label="node.address"
        :value="node.address"
        :disabled="disableSelect"
        size="medium"
        class="select-node-list__item s-flex"
      >
        <div class="select-node-item s-flex">
          <div class="select-node-info s-flex">
            <div class="select-node-info__label">
              {{ node.title }}
            </div>
            <div class="select-node-info__address">
              {{ node.address }}
            </div>
          </div>
          <div class="select-node-badge">
            <s-icon v-if="node.connecting" name="el-icon-loading" />
          </div>
          <s-button class="select-node-details" type="action" alternative icon="arrows-chevron-right-rounded-24" @click="handleNode(node)" />
        </div>
      </s-radio>
    </s-radio-group>
    <s-button
      class="select-node-button s-typography-button--large"
      @click="handleNode()"
    >
      {{ t('selectNodeDialog.addNode') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, ModelSync } from 'vue-property-decorator'

import { NodeItem } from '@/types/nodes'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class SelectNode extends Mixins(TranslationMixin) {
  @Prop({ default: () => [], type: Array }) nodes!: Array<NodeItem>
  @Prop({ default: () => {}, type: Function }) handleNode!: (node: NodeItem) => void
  @Prop({ default: '', type: String }) environment!: string
  @Prop({ default: false, type: Boolean }) disableSelect!: boolean

  @ModelSync('value', 'input', { type: String })
  readonly currentAddressValue!: string
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
</style>

<style lang="scss" scoped>
.select-node {
  flex-direction: column;
  align-items: center;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
    width: 100%;
  }

  &-list {
    flex-direction: column;

    &__item {
      margin-right: 0;
      align-items: center;
      padding: $inner-spacing-small 0;
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
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-small);
      @include radio-title;
    }

    &__address {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      font-weight: 300;
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-medium);
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
  }
}
</style>
