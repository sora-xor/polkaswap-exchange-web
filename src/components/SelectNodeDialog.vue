<template>
  <dialog-base
    :visible.sync="isVisible"
    :before-close="beforeClose"
    :title="t('selectNodeDialog.title')"
    :class="['select-node-dialog', dialogCustomClass]"
  >
    <select-node
      v-if="isNodeListView"
      v-model="connectedNodeAddress"
      :nodes="nodeList"
      :handle-node="navigateToNodeInfo"
      :environment="soraNetwork"
      :disable-select="!nodeConnectionAllowance"
    />
    <node-info
      v-else
      :node="selectedNode"
      :existing="existingNodeIsSelected"
      :disabled="!nodeConnectionAllowance"
      :loading="isSelectedNodeConnecting"
      :removable="isSelectedNodeRemovable"
      :connected="isSelectedNodeConnected"
      :handle-back="handleBack"
      :handle-node="handleNode"
      :remove-node="removeNode"
    />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import pick from 'lodash/fp/pick'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { NodeModel } from '@/components/Settings/Node/consts'
import { Node, NodeItem } from '@/types/nodes'
import { AppHandledError } from '@/utils/error'

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
  @Getter node!: Node
  @Getter defaultNodes!: Array<Node>
  @Getter customNodes!: Array<Node>
  @Getter chainGenesisHash!: string
  @Getter nodeAddressConnecting!: string
  @Getter nodeConnectionAllowance!: boolean
  @Getter soraNetwork!: string
  @Action setNode!: (node: Node) => void
  @Action addCustomNode!: (node: Node) => void
  @Action removeCustomNode!: (node: any) => void

  currentView = NodeListView
  selectedNode: any = {}

  get connectedNodeAddress (): string {
    return this.node.address
  }

  set connectedNodeAddress (address: string) {
    if (address === this.node.address) return

    const node = this.findNodeInListByAddress(address)

    this.handleNode(node)
  }

  get isSelectedNodeRemovable (): boolean {
    return !this.defaultNodes.find(node => node.address === this.selectedNode?.address)
  }

  get isSelectedNodeConnecting (): boolean {
    return this.isConnectingNode(this.selectedNode)
  }

  get isSelectedNodeConnected (): boolean {
    return this.isConnectedNodeAddress(this.selectedNode?.address)
  }

  get existingNodeIsSelected (): boolean {
    return !!this.findNodeInListByAddress(this.selectedNode?.address)
  }

  get isNodeListView (): boolean {
    return this.currentView === NodeListView
  }

  get nodeList (): Array<NodeItem> {
    return [...this.defaultNodes, ...this.customNodes].map(node => ({
      ...node,
      title: !!node.name && !!node.chain
        ? this.t('selectNodeDialog.nodeTitle', { chain: node.chain, name: node.name })
        : (node.name || node.chain),
      connecting: this.isConnectingNode(node)
    }))
  }

  get dialogCustomClass (): string {
    return this.isNodeListView ? '' : 'select-node-dialog--add-node'
  }

  async handleNode (node: NodeItem, isNewNode = false): Promise<void> {
    try {
      await this.setCurrentNode(node, isNewNode)

      if (this.selectedNode.address === node.address && this.currentView === NodeInfoView) {
        this.handleBack()
      }
    } catch (error) {
      const key = error instanceof AppHandledError ? error.translationKey : 'node.errors.connection'
      const payload = error instanceof AppHandledError ? error.translationPayload : {}

      this.$alert(
        this.t(key, payload),
        { title: this.t('errorText') }
      )
    }
  }

  async removeNode (node: NodeItem): Promise<void> {
    this.removeCustomNode(node)
    this.handleBack()
    if (this.isConnectedNodeAddress(node.address)) {
      await this.setCurrentNode(this.defaultNodes[0])
    }
  }

  navigateToNodeInfo (node: NodeItem | undefined): void {
    this.selectedNode = node || {}
    this.changeView(NodeInfoView)
  }

  beforeClose (closeFn: Function): void {
    closeFn()
    this.handleBack()
  }

  handleBack (): void {
    this.changeView(NodeListView)
  }

  private getNodePermittedData (node: NodeItem): Node {
    return pick(Object.keys(NodeModel))(node) as Node
  }

  private async setCurrentNode (node: NodeItem, isNewNode = false): Promise<void> {
    const existingNode = this.findNodeInListByAddress(node.address)

    if (isNewNode && existingNode) {
      throw new AppHandledError({
        key: 'node.errors.existing',
        payload: {
          title: existingNode.title
        }
      })
    }

    const nodeCopy = this.getNodePermittedData(node)

    this.selectedNode = existingNode ?? nodeCopy

    await this.setNode(nodeCopy)

    if (isNewNode) {
      this.addCustomNode(nodeCopy)
      this.selectedNode = this.findNodeInListByAddress(node.address)
    }
  }

  private changeView (view: string): void {
    this.currentView = view
  }

  private findNodeInListByAddress (address: string): any {
    return this.nodeList.find(item => item.address === address)
  }

  private isConnectedNodeAddress (nodeAddress: any): boolean {
    return this.connectedNodeAddress === nodeAddress
  }

  private isConnectingNode (node: any): boolean {
    return this.nodeAddressConnecting === node?.address
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
}
</style>
