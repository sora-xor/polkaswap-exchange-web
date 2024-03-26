<template>
  <dialog-base
    :visible.sync="visible"
    :title="t('selectNodeDialog.title')"
    :class="['select-node-dialog', dialogCustomClass]"
  >
    <select-node
      v-if="isNodeListView"
      v-model="connectedNodeAddress"
      :node-address-connecting="nodeAddressConnecting"
      :nodes="connection.nodeList"
      :handle-node="handleNode"
      :view-node="navigateToNodeInfo"
    />
    <node-info
      v-else
      :node="selectedNode"
      :existing="existingNodeIsSelected"
      :node-address-connecting="nodeAddressConnecting"
      :removable="isSelectedNodeRemovable"
      :connected="isSelectedNodeConnected"
      :handle-back="handleBack"
      :handle-node="handleNode"
      :remove-node="removeNode"
      :show-tutorial="isSoraNetwork"
    />
  </dialog-base>
</template>

<script lang="ts">
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import pick from 'lodash/fp/pick';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { Node } from '@/types/nodes';
import type { NodesConnection } from '@/utils/connection';
import { AppHandledError } from '@/utils/error';

import { NodeModel } from './consts';

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
  @Prop({ required: true, type: Object }) readonly connection!: NodesConnection;
  @Prop({ required: true, type: Boolean }) readonly visibility!: boolean;
  @Prop({ required: true, type: Function }) readonly setVisibility!: (flag: boolean) => void;
  @Prop({ default: () => SubNetworkId.Mainnet, type: String }) readonly network!: SubNetworkId;

  currentView = NodeListView;
  selectedNode: Partial<Node> = {};

  get visible(): boolean {
    return this.visibility;
  }

  set visible(flag: boolean) {
    this.setVisibility(flag);

    if (!flag) {
      this.handleBack();
    }
  }

  get isSoraNetwork(): boolean {
    return this.network === SubNetworkId.Mainnet;
  }

  get nodeAddressConnecting(): string {
    return this.connection.nodeAddressConnecting;
  }

  get connectedNodeAddress(): string {
    if (this.nodeAddressConnecting) return '';

    return this.connection.node?.address ?? '';
  }

  set connectedNodeAddress(address: string) {
    if (address === this.connectedNodeAddress) return;

    const node = this.findNodeInListByAddress(address);

    this.handleNode(node);
  }

  get isSelectedNodeRemovable(): boolean {
    return !!this.connection.customNodes.find((node) => node.address === this.selectedNode?.address);
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

  get dialogCustomClass(): string {
    return this.isNodeListView ? '' : 'select-node-dialog--add-node';
  }

  async handleNode(node: Node, isNewOrUpdatedNode = false): Promise<void> {
    try {
      await this.setCurrentNode(node, isNewOrUpdatedNode);

      if (this.selectedNode.address === node.address && this.currentView === NodeInfoView) {
        this.handleBack();
      }
    } catch (error) {
      // we handled error using callback, do nothing
    }
  }

  async removeNode(node: Node): Promise<void> {
    this.connection.removeCustomNode(node);
    this.handleBack();
    if (this.isConnectedNodeAddress(node.address)) {
      await this.setCurrentNode(this.connection.defaultNodes[0]);
    }
  }

  navigateToNodeInfo(node?: Node): void {
    this.selectedNode = node ?? {};
    this.changeView(NodeInfoView);
  }

  handleBack(): void {
    this.changeView(NodeListView);
  }

  private getNodePermittedData(node: Node): Node {
    return pick(Object.keys(NodeModel))(node) as Node;
  }

  private async setCurrentNode(node: Node, isNewOrUpdatedNode = false): Promise<void> {
    const nodeCopy = this.getNodePermittedData(node);

    if (isNewOrUpdatedNode) {
      const defaultNode = this.findInList(this.connection.defaultNodes, nodeCopy.address);

      if (defaultNode) {
        const error = new AppHandledError({
          key: 'node.errors.existing',
          payload: {
            title: defaultNode.chain,
          },
        });

        return this.handleNodeError(error, defaultNode);
      }
    }

    await this.connection.connect({
      node: nodeCopy,
      onError: this.handleNodeError,
      onDisconnect: this.handleNodeDisconnect,
      onReconnect: this.handleNodeConnect,
      onConnect: this.handleNodeConnect,
    });

    if (isNewOrUpdatedNode) {
      this.connection.updateCustomNode(nodeCopy);
    }

    this.selectedNode = this.findNodeInListByAddress(nodeCopy.address);
  }

  private changeView(view: string): void {
    this.currentView = view;
  }

  private findInList(list: readonly Node[], address: string): any {
    return list.find((item) => item.address === address);
  }

  private findNodeInListByAddress(address: string): any {
    return this.findInList(this.connection.nodeList, address);
  }

  private isConnectedNodeAddress(nodeAddress?: string): boolean {
    return !!this.connectedNodeAddress && !!nodeAddress && this.connectedNodeAddress === nodeAddress;
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
