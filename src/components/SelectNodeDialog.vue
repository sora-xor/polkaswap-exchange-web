<template>
  <dialog-base
    :visible.sync="isVisible"
    :before-close="beforeClose"
    v-bind="dialogProps"
    class="select-node-dialog"
  >
    <select-node v-if="isNodeListView" v-model="connectedNodeAddress" :nodes="nodeList" :view-node="viewNodeInfo" :add-node="addCustomNode" />
    <node-info v-else :node="selectedNode" :handle-back="handleBack" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from './DialogBase.vue'

const NodeListView = 'NodeListView'
const CreateNodeView = 'CreateNodeView'

@Component({
  components: {
    DialogBase,
    ExternalLink: lazyComponent(Components.ExternalLink),
    SelectNode: lazyComponent(Components.SelectNode),
    NodeInfo: lazyComponent(Components.NodeInfo)
  }
})
export default class SelectNodeDialog extends Mixins(TranslationMixin, DialogMixin) {
  @Getter node!: any
  @Getter defaultNodes!: Array<any>
  @Action setNode!: (node: any) => void

  currentView = NodeListView

  customNodes = [
    // {
    //   name: 'Node',
    //   host: 'Lupa',
    //   address: 'wss://s3.kusama-rpc.polkadot.io'
    // },
    // {
    //   name: 'Node',
    //   host: 'Pupa',
    //   address: 'wss://s4.kusama-rpc.polkadot.io'
    // }
  ]

  get connectedNodeAddress (): string {
    return this.node.address
  }

  set connectedNodeAddress (address: string) {
    if (address === this.node.address) return

    const node = this.nodeList.find(item => item.address === address)
    this.setNode(node)
  }

  selectedNode = null

  get isNodeListView (): boolean {
    return this.currentView === NodeListView
  }

  get nodeList (): Array<any> {
    return [...this.defaultNodes, ...this.customNodes]
  }

  get dialogProps (): object {
    const customClass = this.isNodeListView ? '' : 'select-node-dialog--add-node'

    return {
      title: this.isNodeListView ? this.t('selectNodeDialog.title') : undefined,
      showClose: this.isNodeListView,
      customClass
    }
  }

  viewNodeInfo (node): void {
    this.selectedNode = node
    this.changeView(CreateNodeView)
  }

  addCustomNode (): void {
    this.selectedNode = null
    this.changeView(CreateNodeView)
  }

  beforeClose (closeFn: Function): void {
    closeFn()
    this.changeView(NodeListView)
  }

  handleBack (): void {
    this.changeView(NodeListView)
  }

  private changeView (view: string): void {
    this.currentView = view
  }
}
</script>

<style lang="scss">
.dialog-wrapper.select-node-dialog {
  .el-dialog .el-dialog__body {
    padding: $inner-spacing-big $inner-spacing-big $inner-spacing-mini * 4;
  }

  &--add-node {
    .el-dialog .el-dialog__header {
      padding: 0;
      display: none;
    }
  }
}

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
