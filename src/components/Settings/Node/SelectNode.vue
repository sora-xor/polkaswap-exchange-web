<template>
  <div class="select-node s-flex">
    <div class="select-node-description p4">
      {{ t('selectNodeDialog.selectNodeForEnvironment', { environment }) }}
    </div>
    <el-radio-group v-model="currentAddressValue" class="select-node-list s-flex">
      <el-radio
        v-for="node in nodes"
        :key="node.address"
        :label="node.address"
        :value="node.address"
        :disabled="!node.networkStatus.online"
        class="select-node-list__item s-flex"
      >
        <div class="select-node-item s-flex">
          <div class="select-node-info s-flex">
            <div class="select-node-info__label h4">
              {{ node.title }}
            </div>
            <div class="select-node-info__address">
              {{ node.address }}
            </div>
          </div>
          <network-badge v-bind="node.networkStatus" />
          <s-button class="details select-node-details" type="link" @click="handleNode(node)">
            <s-icon name="arrows-chevron-right-rounded-24" />
          </s-button>
        </div>
      </el-radio>
    </el-radio-group>
    <s-button
      class="select-node-button"
      icon="circle-plus-16"
      icon-position="right"
      @click="handleNode()"
    >
      {{ t('selectNodeDialog.addNode') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, ModelSync } from 'vue-property-decorator'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component({
  components: {
    NetworkBadge: lazyComponent(Components.NetworkBadge)
  }
})
export default class SelectNode extends Mixins(TranslationMixin) {
  @Prop({ default: () => [], type: Array }) nodes!: Array<any>
  @Prop({ default: () => {}, type: Function }) handleNode!: (node: any) => void
  @Prop({ default: '', type: String }) environment!: string

  @ModelSync('value', 'input', { type: String })
  readonly currentAddressValue!: boolean
}
</script>

<style lang="scss">
button:not(.s-action).s-i-position-left.select-node-details > span > i[class^=s-icon-] {
  margin-right: 0;
}
.select-node-list__item.el-radio {
  & > .el-radio__input > .el-radio__inner {
    // temporary, because primary border color is not contrast with background
    border-color: var(--s-color-base-on-disabled);
  }

  & > .el-radio__label {
    display: flex;
    align-items: center;
    flex: 1;
    padding-left: $inner-spacing-small
  }
}
</style>

<style lang="scss" scoped>
$list-item-height: 71px;
$list-item-padding: 11px 0;

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
    }

    &__address {
      color: var(--s-color-base-content-tertiary);
      font-size: var(--s-heading8-font-size);
    }
  }

  &-details {
    padding: 0;
  }

  &-button {
    width: 100%;
  }
}
</style>
