<template>
  <dialog-base
    :visible.sync="isVisible"
    :before-close="beforeClose"
    v-bind="dialogProps"
    class="select-node-dialog"
  >
    <div v-loading="nodeIsConnecting">
      <select-node
        v-if="isNodeListView"
        v-model="connectedNodeAddress"
        :loading="nodeIsConnecting"
        :nodes="nodeList"
        :handle-node="navigateToNodeInfo"
      />
      <node-info
        v-else
        :node="selectedNode"
        :existing="existingNodeIsSelected"
        :connected="isSelectedNodeConnected"
        :removable="isSelectedNodeRemovable"
        :handle-back="handleBack"
        :handle-node="handleNode"
        :remove-node="removeNode"
      />
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from './DialogBase.vue'

const NodeListView = 'NodeListView'
const NodeInfoView = 'NodeInfoView'

@Component({
  components: {
    DialogBase,
    ExternalLink: lazyComponent(Components.ExternalLink),
    SelectNode: lazyComponent(Components.SelectNode),
    NodeInfo: lazyComponent(Components.NodeInfo)
  }
})
export default class SelectNodeDialog extends Mixins(TranslationMixin, LoadingMixin, DialogMixin) {
  @Getter node!: any
  @Getter defaultNodes!: Array<any>
  @Getter customNodes!: Array<any>
  @Getter chainGenesisHash!: string
  @Getter nodeIsConnecting!: boolean
  @Action getChainGenesisHash!: (nodeAddress: string) => Promise<string>
  @Action setNode!: (node: any) => void
  @Action addCustomNode!: (node: any) => void
  @Action removeCustomNode!: (node: any) => void

  currentView = NodeListView

  selectedNode: any = {}

  get connectedNodeAddress (): string {
    return this.node.address
  }

  set connectedNodeAddress (address: string) {
    if (address === this.node.address) return

    const node = this.findNodeInListByAddress(address)
    this.setNode(node)
  }

  get isSelectedNodeConnected (): boolean {
    return this.isConnectedNode(this.selectedNode)
  }

  get isSelectedNodeRemovable (): boolean {
    return !this.defaultNodes.find(node => node.address === this.selectedNode?.address)
  }

  get existingNodeIsSelected (): boolean {
    return !!this.findNodeInListByAddress(this.selectedNode?.address)
  }

  get isNodeListView (): boolean {
    return this.currentView === NodeListView
  }

  get nodeList (): Array<any> {
    return [...this.defaultNodes, ...this.customNodes].map(node => ({
      ...node,
      title: !!node.name && !!node.chain
        ? this.t('selectNodeDialog.nodeTitle', { chain: node.chain, name: node.name })
        : (node.chain || node.name)
    }))
  }

  get dialogProps (): any {
    const customClass = this.isNodeListView ? '' : 'select-node-dialog--add-node'

    return {
      title: this.isNodeListView ? this.t('selectNodeDialog.title') : undefined,
      showClose: this.isNodeListView,
      customClass
    }
  }

  async handleNode (node: any): Promise<void> {
    const isExistingNode = !!this.findNodeInListByAddress(node.address)

    if (!isExistingNode) {
      const nodeChainGenesisHash = await this.getChainGenesisHash(node.address)

      if (nodeChainGenesisHash !== this.chainGenesisHash) {
        // show error?
        return
      }

      this.addCustomNode(node)
    }

    await this.switchToNode(node)
  }

  async switchToNode (node): Promise<void> {
    if (!this.isConnectedNode(node)) {
      await this.setNode(node)
      this.handleBack()
    }
  }

  async removeNode (node): Promise<void> {
    if (this.isConnectedNode(node)) {
      await this.setNode(this.defaultNodes[0])
    }
    this.removeCustomNode(node)
    this.handleBack()
  }

  navigateToNodeInfo (node: any): void {
    this.selectedNode = node
    this.changeView(NodeInfoView)
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

  private findNodeInListByAddress (address: string): any {
    return this.nodeList.find(item => item.address === address)
  }

  private isConnectedNode (node: any): boolean {
    return this.connectedNodeAddress === node?.address
  }
}
</script>

<style lang="scss">
.dialog-wrapper.select-node-dialog {
  .el-dialog .el-dialog__body {
    padding: $inner-spacing-mini $inner-spacing-big $inner-spacing-mini * 4;
  }

  &--add-node {
    .el-dialog {
      .el-dialog__header {
        padding: 0;
        display: none;
      }

      .el-dialog__body {
        padding: $inner-spacing-big $inner-spacing-big $inner-spacing-mini * 4;
      }
    }
  }

  .el-loading-mask {
    background: var(--s-color-utility-surface);
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
