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
            <s-icon v-if="node.connecting" name="el-icon-loading"/>
          </div>
          <s-button class="details select-node-details" type="link" @click="handleNode(node)">
            <s-icon name="arrows-chevron-right-rounded-24" />
          </s-button>
        </div>
      </s-radio>
    </s-radio-group>
    <s-button
      class="select-node-button s-typography-button--big"
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
  readonly currentAddressValue!: boolean
}
</script>

<style lang="scss">
// button:not(.s-action).s-i-position-left.select-node-details > span > i[class^=s-icon-] {
//   margin-right: 0;
// }
// .select-node-list__item.el-radio {
//   & > .el-radio__input > .el-radio__inner {
//     // temporary, because primary border color is not contrast with background
//     border-color: var(--s-color-base-on-disabled);
//   }

//   & > .el-radio__label {
//     display: flex;
//     align-items: center;
//     flex: 1;
//     padding-left: $inner-spacing-small
//   }
// }
</style>

<style lang="scss" scoped>
$list-item-height: 71px;
$list-item-padding: 11px 0;
$badge-container-width: 60px;

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
      padding: $list-item-padding;
      min-height: $list-item-height;
      white-space: normal;
      height: initial;
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
      font-size: var(--s-font-size-big);
      font-weight: 800;
      line-height: var(--s-line-height-small);
    }

    &__address {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-heading8-font-size);
      font-size: var(--s-font-size-mini);
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
    width: $badge-container-width;
    display: flex;
    flex-flow: row nowrap;
    justify-content: center;
  }
}
</style>
