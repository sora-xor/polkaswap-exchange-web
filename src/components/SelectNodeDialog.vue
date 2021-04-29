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
    />
    <node-info
      v-else
      :node="selectedNode"
      :existing="existingNodeIsSelected"
      :disabled="isSelectedNodeDisabled"
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
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import pick from 'lodash/fp/pick'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { NodeModel } from '@/components/Settings/Node/consts'
import { Node, NodeItem, NodeItemNetworkStatus } from '@/types/nodes'

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
  @Getter soraNetwork!: string
  @Action getNodeChainGenesisHash!: (nodeAddress: string) => Promise<string>
  @Action getNodeNetworkStatus!: (nodeAddress: string) => Promise<any>
  @Action setNode!: (node: Node) => void
  @Action addCustomNode!: (node: Node) => void
  @Action removeCustomNode!: (node: any) => void

  @Watch('visible')
  private handleVisibleChangeToUpdateNodeStatuses (newValue: boolean, oldValue: boolean): void {
    if (!oldValue && newValue) {
      this.updateNodesNetworkStatus()
    }
  }

  currentView = NodeListView

  selectedNode: any = {}
  networkStatuses: any = {}

  get connectedNodeAddress (): string {
    return this.node.address
  }

  set connectedNodeAddress (address: string) {
    if (address === this.node.address) return

    const node = this.findNodeInListByAddress(address)

    this.handleNode(node)
  }

  get isSelectedNodeDisabled (): boolean {
    if (this.isSelectedNodeConnected) return true

    return this.existingNodeIsSelected && !this.selectedNode.networkStatus?.online
  }

  get isSelectedNodeRemovable (): boolean {
    return !this.defaultNodes.find(node => node.address === this.selectedNode?.address)
  }

  get isSelectedNodeConnecting (): boolean {
    return this.isConnectingNode(this.selectedNode)
  }

  get isSelectedNodeConnected (): boolean {
    return this.isConnectedNode(this.selectedNode)
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
      networkStatus: {
        checked: node.address in this.networkStatuses,
        online: !!this.networkStatuses[node.address],
        connecting: this.isConnectingNode(node)
      } as NodeItemNetworkStatus
    }))
  }

  get dialogCustomClass (): string {
    return this.isNodeListView ? '' : 'select-node-dialog--add-node'
  }

  async handleNode (node: NodeItem): Promise<void> {
    if (this.isConnectedNode(node)) return

    try {
      await this.setCurrentNode(node)
    } catch (error) {
      this.$alert(
        this.t('selectNodeDialog.messages.nodeConnectionError'),
        { title: this.t('errorText') }
      )
    }
  }

  async removeNode (node: NodeItem): Promise<void> {
    if (this.isConnectedNode(node)) {
      await this.setCurrentNode(this.defaultNodes[0])
    }
    this.removeCustomNode(node)
    this.handleBack()
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

  private async setCurrentNode (node: NodeItem): Promise<void> {
    const existingNode = this.findNodeInListByAddress(node.address)
    const nodeCopy = this.getNodePermittedData(node)

    this.selectedNode = existingNode ?? nodeCopy

    await this.setNode(nodeCopy)

    if (!existingNode) {
      this.addCustomNode(nodeCopy)
      await this.updateNodeNetworkStatus(nodeCopy)
    }
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

  private isConnectingNode (node: any): boolean {
    return this.nodeAddressConnecting === node?.address
  }

  private async updateNodesNetworkStatus (): Promise<void> {
    this.networkStatuses = {}

    await Promise.all(this.nodeList.map(node => this.updateNodeNetworkStatus(node)))
  }

  private async updateNodeNetworkStatus (node: NodeItem): Promise<void> {
    const address = node.address
    const status = Boolean(await this.getNodeNetworkStatus(address))

    this.networkStatuses = { ...this.networkStatuses, [address]: status }
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
