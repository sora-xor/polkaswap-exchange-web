<template>
  <dialog-base
    v-model:visible="visibilityModel"
    :title="t('selectNodeDialog.title')"
    :class="['select-node-dialog', dialogCustomClass]"
  >
    <select-node
      v-if="isNodeListView"
      v-model:value="connectedNodeAddressModel"
      :node-address-connecting="nodeAddressConnecting"
      :nodes="connection.nodeList"
      :handle-node="handleNode"
      :view-node="navigateToNodeInfo"
      :disabled="!connectionAllowance"
    ></select-node>
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
      :show-tutorial="isMainnet"
      :disabled="!connectionAllowance"
    ></node-info>
  </dialog-base>
</template>

<script setup lang="ts">
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { components, WALLET_CONSTS, WALLET_TYPES } from '@wallet';
import pick from 'lodash/fp/pick';
import { computed, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useNodeNotifications } from '@/composables/useNodeNotifications';
import NodeInfo from '@/components/App/Settings/Node/NodeInfo.vue';
import SelectNode from '@/components/App/Settings/Node/SelectNode.vue';
import type { Node } from '@/types/nodes';
import type { NodesConnection } from '@/utils/connection';
import { AppHandledError } from '@/utils/error';

import { NodeModel } from './consts';

const props = withDefaults(
  defineProps<{
    connection: NodesConnection;
    visibility: boolean;
    setVisibility: (flag: boolean) => void;
    network?: SubNetworkId;
  }>(),
  {
    network: SubNetworkId.Mainnet,
  }
);

defineOptions({
  name: 'SelectNodeDialog',
  components: {
    DialogBase: components.DialogBase,
  },
});

const { t } = useTranslation();
const { handleNodeError, handleNodeConnect, handleNodeDisconnect } = useNodeNotifications();

const currentView = ref<'NodeListView' | 'NodeInfoView'>('NodeListView');
const selectedNode = ref<Node>({ ...(NodeModel as Node) });

const visibilityModel = computed({
  get: () => props.visibility,
  set: (flag: boolean) => {
    props.setVisibility(flag);
    if (!flag) handleBack();
  },
});

const isMainnet = computed(() => props.network === SubNetworkId.Mainnet);
const nodeAddressConnecting = computed(() => props.connection.nodeAddressConnecting);
const connectionAllowance = computed(() => props.connection.connectionAllowance);

const connectedNodeAddress = computed<string>(() => {
  if (nodeAddressConnecting.value) return '';
  return props.connection.node?.address ?? '';
});

const isSelectedNodeRemovable = computed(() =>
  Boolean(props.connection.customNodes.find((node) => node.address === selectedNode.value.address))
);

const isSelectedNodeConnected = computed(() =>
  Boolean(connectedNodeAddress.value && connectedNodeAddress.value === selectedNode.value.address)
);

const existingNodeIsSelected = computed(() => Boolean(findNodeInListByAddress(selectedNode.value.address ?? '')));
const isNodeListView = computed(() => currentView.value === 'NodeListView');
const dialogCustomClass = computed(() => (isNodeListView.value ? '' : 'select-node-dialog--add-node'));

const getNodePermittedData = (node: Node): Node => pick(Object.keys(NodeModel))(node) as Node;

const findInList = (list: readonly Node[], address: string): Node | undefined =>
  list.find((item) => item.address === address);

const findNodeInListByAddress = (address: string): Node | undefined => findInList(props.connection.nodeList, address);

const changeView = (view: 'NodeListView' | 'NodeInfoView') => {
  currentView.value = view;
};

const navigateToNodeInfo = (node?: Node) => {
  selectedNode.value = node ? { ...node } : { ...NodeModel };
  changeView('NodeInfoView');
};

const handleBack = () => {
  changeView('NodeListView');
};

const setCurrentNode = async (node: Node, isNewOrUpdatedNode = false) => {
  const nodeCopy = getNodePermittedData(node);

  if (isNewOrUpdatedNode) {
    const defaultNode = findInList(props.connection.defaultNodes, nodeCopy.address);

    if (defaultNode) {
      const error = new AppHandledError({
        key: 'node.errors.existing',
        payload: {
          title: defaultNode.chain,
        },
      });

      handleNodeError(error, defaultNode);
      return;
    }
  }

  await props.connection.connect({
    node: nodeCopy,
    onError: handleNodeError,
    onDisconnect: handleNodeDisconnect,
    onReconnect: handleNodeConnect,
    onConnect: handleNodeConnect,
  });

  if (isNewOrUpdatedNode) {
    props.connection.updateCustomNode(nodeCopy);
  }

  const resolvedNode = findNodeInListByAddress(nodeCopy.address);
  selectedNode.value = resolvedNode ?? nodeCopy;
};

const handleNode = async (node: Node, isNewOrUpdatedNode = false) => {
  try {
    await setCurrentNode(node, isNewOrUpdatedNode);

    if (selectedNode.value.address === node.address && currentView.value === 'NodeInfoView') {
      handleBack();
    }
  } catch {
    // errors handled via callbacks
  }
};

const removeNode = async (node: Node) => {
  props.connection.removeCustomNode(node);
  handleBack();

  if (connectedNodeAddress.value === node.address) {
    await setCurrentNode(props.connection.defaultNodes[0]);
  }
};

const connectedNodeAddressModel = computed({
  get: () => connectedNodeAddress.value,
  set: (address: string) => {
    if (address === connectedNodeAddress.value) return;
    const node = findNodeInListByAddress(address);
    if (node) {
      void handleNode(node);
    }
  },
});
</script>
