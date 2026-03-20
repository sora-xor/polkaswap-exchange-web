import { z as defineComponent, S as SubNetworkId, aZ as components, u as useTranslation, cr as useNodeNotifications, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, h as computed, a9 as ref, aj as unref, cs as AppHandledError } from "./index-73GArslZ.js";
import { p as pick } from "./pick-DD6Hsmr0.js";
import { N as NodeInfo, a as NodeModel } from "./NodeInfo-BNPHvTm4.js";
import SelectNode from "./SelectNode-BNqlBcNz.js";
import "./GenericPageHeader-CbYst_Y9.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SelectNodeDialog",
    components: {
      DialogBase: components.DialogBase
    }
  },
  __name: "SelectNodeDialog",
  props: {
    connection: {},
    visibility: { type: Boolean },
    setVisibility: {},
    network: { default: SubNetworkId.Mainnet }
  },
  setup(__props) {
    const props = __props;
    const { t } = useTranslation();
    const { handleNodeError, handleNodeConnect, handleNodeDisconnect } = useNodeNotifications();
    const currentView = ref("NodeListView");
    const selectedNode = ref({ ...NodeModel });
    const visibilityModel = computed({
      get: () => props.visibility,
      set: (flag) => {
        props.setVisibility(flag);
        if (!flag) handleBack();
      }
    });
    const isMainnet = computed(() => props.network === SubNetworkId.Mainnet);
    const nodeAddressConnecting = computed(() => props.connection.nodeAddressConnecting);
    const connectionAllowance = computed(() => props.connection.connectionAllowance);
    const connectedNodeAddress = computed(() => {
      if (nodeAddressConnecting.value) return "";
      return props.connection.node?.address ?? "";
    });
    const isSelectedNodeRemovable = computed(
      () => Boolean(props.connection.customNodes.find((node) => node.address === selectedNode.value.address))
    );
    const isSelectedNodeConnected = computed(
      () => Boolean(connectedNodeAddress.value && connectedNodeAddress.value === selectedNode.value.address)
    );
    const existingNodeIsSelected = computed(() => Boolean(findNodeInListByAddress(selectedNode.value.address ?? "")));
    const isNodeListView = computed(() => currentView.value === "NodeListView");
    const dialogCustomClass = computed(() => isNodeListView.value ? "" : "select-node-dialog--add-node");
    const dialogCardClassName = computed(() => ["select-node-dialog", dialogCustomClass.value].filter(Boolean).join(" "));
    const getNodePermittedData = (node) => pick(Object.keys(NodeModel))(node);
    const findInList = (list, address) => list.find((item) => item.address === address);
    const findNodeInListByAddress = (address) => findInList(props.connection.nodeList, address);
    const changeView = (view) => {
      currentView.value = view;
    };
    const navigateToNodeInfo = (node) => {
      selectedNode.value = node ? { ...node } : { ...NodeModel };
      changeView("NodeInfoView");
    };
    const handleBack = () => {
      changeView("NodeListView");
    };
    const setCurrentNode = async (node, isNewOrUpdatedNode = false) => {
      const nodeCopy = getNodePermittedData(node);
      if (isNewOrUpdatedNode) {
        const defaultNode = findInList(props.connection.defaultNodes, nodeCopy.address);
        if (defaultNode) {
          const error = new AppHandledError({
            key: "node.errors.existing",
            payload: {
              title: defaultNode.chain
            }
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
        onConnect: handleNodeConnect
      });
      if (isNewOrUpdatedNode) {
        props.connection.updateCustomNode(nodeCopy);
      }
      const resolvedNode = findNodeInListByAddress(nodeCopy.address);
      selectedNode.value = resolvedNode ?? nodeCopy;
    };
    const handleNode = async (node, isNewOrUpdatedNode = false) => {
      try {
        await setCurrentNode(node, isNewOrUpdatedNode);
        if (selectedNode.value.address === node.address && currentView.value === "NodeInfoView") {
          handleBack();
        }
      } catch {
      }
    };
    const removeNode = async (node) => {
      props.connection.removeCustomNode(node);
      handleBack();
      if (connectedNodeAddress.value === node.address) {
        await setCurrentNode(props.connection.defaultNodes[0]);
      }
    };
    const connectedNodeAddressModel = computed({
      get: () => connectedNodeAddress.value,
      set: (address) => {
        if (address === connectedNodeAddress.value) return;
        const node = findNodeInListByAddress(address);
        if (node) {
          void handleNode(node);
        }
      }
    });
    return (_ctx, _cache) => {
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visibilityModel.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => visibilityModel.value = $event),
        title: unref(t)("selectNodeDialog.title"),
        "custom-class": dialogCardClassName.value
      }, {
        default: withCtx(() => [
          isNodeListView.value ? (openBlock(), createBlock(SelectNode, {
            key: 0,
            value: connectedNodeAddressModel.value,
            "onUpdate:value": _cache[0] || (_cache[0] = ($event) => connectedNodeAddressModel.value = $event),
            "node-address-connecting": nodeAddressConnecting.value,
            nodes: __props.connection.nodeList,
            "handle-node": handleNode,
            "view-node": navigateToNodeInfo,
            disabled: !connectionAllowance.value
          }, null, 8, ["value", "node-address-connecting", "nodes", "disabled"])) : (openBlock(), createBlock(NodeInfo, {
            key: 1,
            node: selectedNode.value,
            existing: existingNodeIsSelected.value,
            "node-address-connecting": nodeAddressConnecting.value,
            removable: isSelectedNodeRemovable.value,
            connected: isSelectedNodeConnected.value,
            "handle-back": handleBack,
            "handle-node": handleNode,
            "remove-node": removeNode,
            "show-tutorial": isMainnet.value,
            disabled: !connectionAllowance.value
          }, null, 8, ["node", "existing", "node-address-connecting", "removable", "connected", "show-tutorial", "disabled"]))
        ]),
        _: 1
      }, 8, ["visible", "title", "custom-class"]);
    };
  }
});
export {
  _sfc_main as default
};
