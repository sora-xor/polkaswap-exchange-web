<template>
  <dialog-base
    :visible.sync="visible"
    :title="t('selectNodeDialog.title')"
    :class="['select-node-dialog', dialogCustomClass]"
  >
    <select-node
      v-if="isNodeListView"
      v-model="connectedNodeAddress"
      :nodes="formattedNodeList"
      :handle-node="navigateToNodeInfo"
      :environment="soraNetwork"
      :disable-select="!connectionAllowance"
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
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import pick from 'lodash/fp/pick';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state } from '@/store/decorators';
import { Node, NodeItem, ConnectToNodeOptions } from '@/types/nodes';
import { AppHandledError } from '@/utils/error';

import { NodeModel } from './Node/consts';

const NodeListView = 'NodeListView';
const NodeInfoView = 'NodeInfoView';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SelectNode: lazyComponent(Components.SelectNode),
    NodeInfo: lazyComponent(Components.NodeInfo),
  },
})
export default class SelectNodeDialog extends Mixins(NodeErrorMixin, mixins.LoadingMixin) {
  @Prop({ default: () => null, type: Object }) private readonly node!: Partial<Node>;
  @Prop({ default: () => [], type: Array }) private readonly defaultNodes!: Array<Node>;
  @Prop({ default: () => [], type: Array }) private readonly nodeList!: Array<Node>;
  @Prop({ default: '', type: String }) private readonly nodeAddressConnecting!: string;
  @Prop({ default: false, type: Boolean }) private readonly connectionAllowance!: boolean;

  @Prop({ default: false, type: Boolean }) private readonly visibility!: boolean;
  @Prop({ default: () => {}, type: Function }) private readonly setVisibility!: (flag: boolean) => void;

  @Prop({ default: () => {}, type: Function }) private readonly connectToNode!: (
    args: ConnectToNodeOptions
  ) => Promise<void>;

  @Prop({ default: () => {}, type: Function }) private readonly addCustomNode!: (node: Node) => Promise<void>;
  @Prop({ default: () => {}, type: Function }) private readonly updateCustomNode!: (args: {
    address: string;
    node: Node;
  }) => Promise<void>;

  @Prop({ default: () => {}, type: Function }) private readonly removeCustomNode!: (node: Node) => Promise<void>;

  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;

  currentView = NodeListView;
  selectedNode: Partial<NodeItem> = {};

  get visible(): boolean {
    return this.visibility;
  }

  set visible(flag: boolean) {
    this.setVisibility(flag);

    if (!flag) {
      this.handleBack();
    }
  }

  get connectedNodeAddress(): string {
    return this.node?.address ?? '';
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
    return !this.connectionAllowance || this.isConnectingNode(this.selectedNode);
  }

  get isSelectedNodeConnected(): boolean {
    return this.isConnectedNodeAddress(this.selectedNode?.address);
  }

  get existingNodeIsSelected(): boolean {
    return !!this.findNodeInListByAddress(this.selectedNode?.address ?? '');
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

  navigateToNodeInfo(node?: NodeItem): void {
    this.selectedNode = node || {};
    this.changeView(NodeInfoView);
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

        return this.handleNodeError(error, defaultNode);
      }
    }

    if (nodeCopy.address !== this.connectedNodeAddress) {
      await this.connectToNode({
        node: nodeCopy,
        onError: this.handleNodeError,
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

  private findInList(list: NodeItem[], address: string): any {
    return list.find((item) => item.address === address);
  }

  private findNodeInListByAddress(address: string): any {
    return this.findInList(this.formattedNodeList, address);
  }

  private isConnectedNodeAddress(nodeAddress?: string): boolean {
    return !!this.connectedNodeAddress && !!nodeAddress && this.connectedNodeAddress === nodeAddress;
  }

  private isConnectingNode(node?: Partial<Node>): boolean {
    return this.nodeAddressConnecting === node?.address;
  }
}
</script>

<style lang="scss">
.dialog-wrapper.select-node-dialog {
  &--add-node {
    .el-dialog {
      .el-dialog__header {
        padding: 0;
        display: none;
      }
    }
  }
}
</style>
