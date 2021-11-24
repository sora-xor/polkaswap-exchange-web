<template>
  <dialog-base
    :visible.sync="visibility"
    :before-close="beforeClose"
    :title="t('selectNodeDialog.title')"
    :class="['select-node-dialog', dialogCustomClass]"
  >
    <select-node
      v-if="isNodeListView"
      v-model="connectedNodeAddress"
      :nodes="formattedNodeList"
      :handle-node="navigateToNodeInfo"
      :environment="soraNetwork"
      :disable-select="!nodeConnectionAllowance"
    />
    <node-info
      v-else
      :node="selectedNode"
      :existing="existingNodeIsSelected"
      :loading="isSelectedNodeLoading"
      :removable="isSelectedNodeRemovable"
      :connected="isSelectedNodeConnected"
      :handle-back="handleBack"
      :handle-node="handleNode"
      :remove-node="removeNode"
    />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Action, Getter, State } from 'vuex-class';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import pick from 'lodash/fp/pick';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { NodeModel } from '@/components/Settings/Node/consts';
import { Node, NodeItem, ConnectToNodeOptions } from '@/types/nodes';
import { AppHandledError } from '@/utils/error';

import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import DialogBase from './DialogBase.vue';

const NodeListView = 'NodeListView';
const NodeInfoView = 'NodeInfoView';

@Component({
  components: {
    DialogBase,
    ExternalLink: lazyComponent(Components.ExternalLink),
    SelectNode: lazyComponent(Components.SelectNode),
    NodeInfo: lazyComponent(Components.NodeInfo),
  },
})
export default class SelectNodeDialog extends Mixins(NodeErrorMixin, mixins.LoadingMixin) {
  @Getter nodeList!: Array<Node>;
  @Getter soraNetwork!: string; // wallet
  @State((state) => state.settings.defaultNodes) defaultNodes!: Array<Node>;
  @State((state) => state.settings.nodeAddressConnecting) nodeAddressConnecting!: string;
  @State((state) => state.settings.nodeConnectionAllowance) nodeConnectionAllowance!: boolean;
  @State((state) => state.settings.selectNodeDialogVisibility) selectNodeDialogVisibility!: boolean;
  @Action connectToNode!: (options: ConnectToNodeOptions) => Promise<void>;
  @Action addCustomNode!: (node: Node) => Promise<void>;
  @Action updateCustomNode!: (options: any) => Promise<void>;
  @Action removeCustomNode!: (node: any) => Promise<void>;

  currentView = NodeListView;
  selectedNode: any = {};

  get visibility(): boolean {
    return this.selectNodeDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectNodeDialogVisibility(flag);
  }

  get connectedNodeAddress(): string {
    return this.node.address;
  }

  set connectedNodeAddress(address: string) {
    if (address === this.node.address) return;

    const node = this.findNodeInListByAddress(address);

    this.handleNode(node);
  }

  get isSelectedNodeRemovable(): boolean {
    return !this.defaultNodes.find((node) => node.address === this.selectedNode?.address);
  }

  get isSelectedNodeLoading(): boolean {
    return !this.nodeConnectionAllowance || this.isConnectingNode(this.selectedNode);
  }

  get isSelectedNodeConnected(): boolean {
    return this.isConnectedNodeAddress(this.selectedNode?.address);
  }

  get existingNodeIsSelected(): boolean {
    return !!this.findNodeInListByAddress(this.selectedNode?.address);
  }

  get isNodeListView(): boolean {
    return this.currentView === NodeListView;
  }

  get formattedNodeList(): Array<NodeItem> {
    return this.nodeList.map((node) => this.formatNode(node));
  }

  get dialogCustomClass(): string {
    return this.isNodeListView ? '' : 'select-node-dialog--add-node';
  }

  async handleNode(node: NodeItem, isNewOrUpdatedNode = false): Promise<void> {
    try {
      await this.setCurrentNode(node, isNewOrUpdatedNode);

      if (this.selectedNode.address === node.address && this.currentView === NodeInfoView) {
        this.handleBack();
      }
    } catch (error) {
      // we handled error using callback, do nothing
    }
  }

  async removeNode(node: NodeItem): Promise<void> {
    this.removeCustomNode(node);
    this.handleBack();
    if (this.isConnectedNodeAddress(node.address)) {
      await this.setCurrentNode(this.defaultNodes[0]);
    }
  }

  navigateToNodeInfo(node: NodeItem | undefined): void {
    this.selectedNode = node || {};
    this.changeView(NodeInfoView);
  }

  beforeClose(closeFn: VoidFunction): void {
    closeFn();
    this.handleBack();
  }

  handleBack(): void {
    this.changeView(NodeListView);
  }

  private getNodePermittedData(node: NodeItem): Node {
    return pick(Object.keys(NodeModel))(node) as Node;
  }

  private async setCurrentNode(node: NodeItem, isNewOrUpdatedNode = false): Promise<void> {
    const nodeCopy = this.getNodePermittedData(node);

    if (isNewOrUpdatedNode) {
      const defaultNode = this.findInList(this.defaultNodes, nodeCopy.address);

      if (defaultNode) {
        const formatted = this.formatNode(defaultNode);
        const error = new AppHandledError({
          key: 'node.errors.existing',
          payload: {
            title: formatted.title,
          },
        });

        return this.handleNodeError(error);
      }
    }

    if (nodeCopy.address !== this.connectedNodeAddress) {
      await this.connectToNode({
        node: nodeCopy,
        onError: (error) => this.handleNodeError(error, !isNewOrUpdatedNode),
        onDisconnect: this.handleNodeDisconnect,
        onReconnect: this.handleNodeReconnect,
      });
    }

    if (isNewOrUpdatedNode) {
      const existingNode = this.findNodeInListByAddress(nodeCopy.address);
      const address = this.selectedNode.address || existingNode?.address;

      if (address) {
        this.updateCustomNode({ address, node: nodeCopy });
      } else {
        this.addCustomNode(nodeCopy);
      }
    }

    this.selectedNode = this.findNodeInListByAddress(nodeCopy.address);
  }

  private formatNode(node: Node): NodeItem {
    return {
      ...node,
      title:
        !!node.name && !!node.chain
          ? this.t('selectNodeDialog.nodeTitle', { chain: node.chain, name: node.name })
          : node.name || node.chain,
      connecting: this.isConnectingNode(node),
    };
  }

  private changeView(view: string): void {
    this.currentView = view;
  }

  private findInList(list, address: string): any {
    return list.find((item) => item.address === address);
  }

  private findNodeInListByAddress(address: string): any {
    return this.findInList(this.formattedNodeList, address);
  }

  private isConnectedNodeAddress(nodeAddress: any): boolean {
    return !!this.connectedNodeAddress && this.connectedNodeAddress === nodeAddress;
  }

  private isConnectingNode(node: any): boolean {
    return this.nodeAddressConnecting === node?.address;
  }
}
</script>
