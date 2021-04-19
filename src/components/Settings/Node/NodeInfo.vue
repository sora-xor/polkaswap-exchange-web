<template>
  <div class="node-info s-flex">
    <generic-page-header has-button-back :title="title" @back="handleBack">
      <s-button
        v-if="isExistingNode && removable"
        type="action"
        icon="basic-trash-24"
        tooltip-placement="bottom-end"
        @click="removeNode(nodeModel)"
      />
    </generic-page-header>
    <s-input class="node-info-input" :placeholder="t('nameText')" v-model="nodeModel.name" :disabled="isExistingNode" />
    <s-input class="node-info-input" :placeholder="t('addressText')" v-model="nodeModel.address" :disabled="isExistingNode" />
    <s-button type="primary" class="node-info-button" :disabled="connected" @click="handleNode(nodeModel)" >{{ buttonText }}</s-button>
    <external-link v-if="!isExistingNode" :title="t('selectNodeDialog.howToSetupOwnNode')" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ExternalLink: lazyComponent(Components.ExternalLink)
  }
})
export default class NodeInfo extends Mixins(TranslationMixin) {
  @Prop({ default: () => {}, type: Function }) handleBack!: () => void
  @Prop({ default: () => {}, type: Function }) handleNode!: (node) => void
  @Prop({ default: () => {}, type: Function }) removeNode!: (node) => void
  @Prop({ default: () => ({}), type: Object }) node!: any
  @Prop({ default: false, type: Boolean }) connected!: boolean
  @Prop({ default: false, type: Boolean }) removable!: boolean

  nodeModel = {
    name: '',
    address: ''
  }

  created (): void {
    this.nodeModel = {
      ...this.nodeModel,
      ...this.node
    }
  }

  get isExistingNode (): boolean {
    return !!this.node?.address
  }

  get buttonText (): string {
    return this.isExistingNode ? this.t('selectNodeDialog.select') : this.t('selectNodeDialog.addNode')
  }

  get title (): string {
    return this.isExistingNode ? this.node.title : this.t('selectNodeDialog.customNode')
  }
}
</script>

<style lang="scss" scoped>
.node-info {
  flex-direction: column;
  align-items: center;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
    width: 100%;
  }

  &-button {
    width: 100%;
  }
}
</style>
