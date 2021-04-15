<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('selectNodeDialog.title')"
  >
    <div class="select-node s-flex">
      <div class="select-node-list s-flex">
        <s-radio
          v-for="item in nodes"
          :key="item.address"
          :label="item.address"
          v-model="model"
          class="select-node-list__item s-flex"
        >
          <div class="select-node-item s-flex">
            <div class="select-node-info s-flex">
              <div class="select-node-info__label h4">
                {{ item.name }} hosted by {{ item.host }}
              </div>
              <div class="select-node-info__address p4">
                {{ item.address }}
              </div>
            </div>
            <s-button class="details select-node-details" type="link">
              <s-icon name="arrows-chevron-right-rounded-24" />
            </s-button>
          </div>
        </s-radio>
      </div>
      <s-button
        class="select-node-add"
        icon="circle-plus-16"
        icon-position="right"
      >
        {{ t('selectNodeDialog.addNode') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from './DialogBase.vue'

@Component({
  components: {
    DialogBase
  }
})
export default class SelectNodeDialog extends Mixins(TranslationMixin, DialogMixin) {
  nodes = [
    {
      name: 'Node',
      host: 'Soramitsu',
      address: 'wss://s1.kusama-rpc.polkadot.io'
    },
    {
      name: 'Node',
      host: 'Soramitsu',
      address: 'wss://s2.kusama-rpc.polkadot.io'
    }
  ]

  model = 'wss://s1.kusama-rpc.polkadot.io'
}
</script>

<style lang="scss">
.select-node-list__item.el-radio {
  & > .el-radio__input > .el-radio__inner {
    width: var(--s-size-mini);
    height: var(--s-size-mini);
    border-width: 1px;
    border-color: var(--s-color-base-border-primary);

    &::after {
      font-family: "soramitsu-icons";
      content: "\ea1c";
      background: none;
      width: 100%;
      height: 100%;
      font-size: 20px;
      line-height: var(--s-size-mini);
      color: var(--s-color-theme-accent);
      text-align: center;
    }
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
.select-node {
  flex-direction: column;
  padding-bottom: $inner-spacing-big;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium
  }

  &-list {
    flex-direction: column;

    &__item {
      margin-right: 0;
      align-items: center;
      min-height: 71px;
    }
  }

  &-item {
    flex: 1;
    align-items: center;
  }

  &-info {
    flex-direction: column;
    flex: 1;

    &__label {
      color: var(--s-color-base-content-primary)
    }

    &__address {
      color: var(--s-color-base-content-tertiary)
    }
  }

  &-details {
    padding: 0;
  }
}
</style>
