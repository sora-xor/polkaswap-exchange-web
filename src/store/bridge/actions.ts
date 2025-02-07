import { FPNumber } from '@sora-substrate/sdk';
import { getAssetBalance, formatBalance } from '@sora-substrate/sdk/build/assets';
import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { api, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';

import { MaxUint256, ZeroStringValue } from '@/consts';
import { SUB_TRANSFER_FEES } from '@/consts/sub';
import { bridgeActionContext } from '@/store/bridge';
import { FocusedField } from '@/store/bridge/types';
import { waitForEvmTransactionMined } from '@/utils/bridge/common/utils';
import ethBridge from '@/utils/bridge/eth';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { getEthBridgeHistoryInstance, updateEthBridgeHistory } from '@/utils/bridge/eth/classes/history';
import type { EthBridgeHistory } from '@/utils/bridge/eth/classes/history';
import {
  getEthNetworkFee,
  getOutgoingEvmTransactionData,
  getIncomingEvmTransactionData,
  waitForApprovedRequest,
} from '@/utils/bridge/eth/utils';
import evmBridge from '@/utils/bridge/evm';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import subBridge from '@/utils/bridge/sub';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import { updateSubBridgeHistory } from '@/utils/bridge/sub/classes/history';
import ethersUtil from '@/utils/ethers-util';

import type { SwapQuote } from '@sora-substrate/liquidity-proxy/build/types';
import type { IBridgeTransaction, CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { ActionContext } from 'vuex';

// [ANALOG] Only native token
const getSoraBalance = async (accountAddress: string, asset: RegisteredAccountAsset): Promise<CodecString> => {
  const accountInfo = await api.api.query.system.account(accountAddress);
  const balance = formatBalance((accountInfo as any).data, api.chainDecimals);

  return balance.transferable;

  // const accountBalance = await getAssetBalance(api.api, accountAddress, asset.address, asset.decimals);
  // return accountBalance.transferable;
};

const getExternalBalance = async (
  accountAddress: string,
  asset: RegisteredAccountAsset,
  isSub: boolean,
  subConnector: SubNetworksConnector
): Promise<CodecString> => {
  return isSub
    ? await subConnector.network.getTokenBalance(accountAddress, asset)
    : await ethersUtil.getAccountAssetBalance(accountAddress, asset?.externalAddress);
};

const getAccountBridgeBalance = async (
  accountAddress: string,
  asset: Nullable<RegisteredAccountAsset>,
  isSora: boolean,
  isSub: boolean,
  subConnector: SubNetworksConnector
): Promise<CodecString> => {
  if (!(asset?.address && accountAddress)) return ZeroStringValue;

  try {
    return isSora
      ? await getSoraBalance(accountAddress, asset)
      : await getExternalBalance(accountAddress, asset, isSub, subConnector);
  } catch {
    return ZeroStringValue;
  }
};

function getBridgeApi(context: ActionContext<any, any>) {
  const { getters } = bridgeActionContext(context);

  if (getters.isSubBridge) return subBridgeApi;
  if (getters.isEvmBridge) return evmBridgeApi;

  return ethBridgeApi;
}

async function switchAmounts(context: ActionContext<any, any>): Promise<void> {
  const { state, dispatch } = bridgeActionContext(context);

  if (state.focusedField === FocusedField.Received) {
    await dispatch.setSendedAmount(state.amountReceived);
  } else {
    await dispatch.setReceivedAmount(state.amountSend);
  }
}

async function updateAmounts(context: ActionContext<any, any>): Promise<void> {
  const { state, dispatch } = bridgeActionContext(context);

  if (state.focusedField === FocusedField.Received) {
    await dispatch.setReceivedAmount(state.amountReceived);
  } else {
    await dispatch.setSendedAmount(state.amountSend);
  }
}

function checkEvmNetwork(context: ActionContext<any, any>): void {
  const { rootGetters } = bridgeActionContext(context);
  if (!rootGetters.web3.isValidNetwork) {
    throw new Error('Change evm network in wallet');
  }
}

function bridgeDataToHistoryItem(
  context: ActionContext<any, any>,
  { date = Date.now(), payload = {}, ...params } = {}
): IBridgeTransaction {
  const { getters, state, rootState } = bridgeActionContext(context);
  const { isEthBridge, isEvmBridge, isSubBridge } = getters;
  const transactionState = isEthBridge ? WALLET_CONSTS.ETH_BRIDGE_STATES.INITIAL : BridgeTxStatus.Pending;
  const externalNetwork = rootState.web3.networkSelected as BridgeNetworkId as any;
  const externalNetworkType = isEthBridge
    ? BridgeNetworkType.Eth
    : isEvmBridge
      ? BridgeNetworkType.Evm
      : BridgeNetworkType.Sub;

  const [from, to] = isSubBridge
    ? state.isSoraToEvm
      ? [getters.sender, getters.recipient]
      : [getters.recipient, getters.sender]
    : [rootState.wallet.account.address, getters.externalAccount];

  const data = {
    type: (params as any).type ?? getters.operation,
    amount: (params as any).amount ?? state.amountSend,
    amount2: (params as any).amount2 ?? state.amountReceived,
    symbol: (params as any).symbol ?? getters.asset?.symbol,
    assetAddress: (params as any).assetAddress ?? getters.asset?.address,
    startTime: date,
    endTime: date,
    transactionState,
    soraNetworkFee: (params as any).soraNetworkFee ?? state.soraNetworkFee,
    externalTransferFee: (params as any).externalTransferFee ?? state.externalTransferFee,
    externalNetworkFee: (params as any).externalNetworkFee,
    externalNetwork,
    externalNetworkType,
    from: (params as any).from ?? from,
    to: (params as any).to ?? to,
    payload,
  };

  return data;
}

async function getEvmNetworkFee(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state, rootState, rootGetters } = bridgeActionContext(context);
  const { asset, isRegisteredAsset } = getters;
  const { isValidNetwork } = rootGetters.web3;
  const contractAddress = rootState.web3.ethBridgeContractAddress;
  const evmAccount = rootState.web3.evmAddress;
  const soraAccount = rootState.wallet.account.address;

  let fee = ZeroStringValue;

  if (asset && isRegisteredAsset && isValidNetwork && evmAccount && soraAccount) {
    const decimals = state.isSoraToEvm ? asset.decimals : asset.externalDecimals;
    // using max balance to not overflow contract calculation
    const maxAmount = FPNumber.fromCodecValue(state.assetSenderBalance ?? 0, decimals);
    const amount = new FPNumber(state.amountSend ?? 0, decimals);
    const value = maxAmount.min(amount).toString();

    fee = await getEthNetworkFee(asset, contractAddress, value, state.isSoraToEvm, soraAccount, evmAccount);
  }

  commit.setExternalNetworkFee(fee);
}

async function getSubNetworkFee(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state } = bridgeActionContext(context);
  let fee = ZeroStringValue;

  if (getters.asset && getters.isRegisteredAsset && getters.sender && getters.recipient) {
    fee = await state.subBridgeConnector.network.getNetworkFee(getters.asset, getters.sender, getters.recipient);
  }

  commit.setExternalNetworkFee(fee);
}

async function updateExternalNetworkFee(context: ActionContext<any, any>): Promise<void> {
  const { getters } = bridgeActionContext(context);

  if (getters.isSubBridge) {
    await getSubNetworkFee(context);
  } else {
    await getEvmNetworkFee(context);
  }
}

async function updateExternalLockedBalance(context: ActionContext<any, any>): Promise<void> {
  const { getters } = bridgeActionContext(context);

  if (getters.isEthBridge) {
    await updateEthLockedBalance(context);
  } else {
    await updateBridgeProxyLockedBalance(context);
  }
}

async function updateEvmBalances(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state } = bridgeActionContext(context);
  const { sender, recipient, asset, nativeToken } = getters;
  const { isSoraToEvm, subBridgeConnector: subConnector } = state;
  const spender = isSoraToEvm ? recipient : sender;

  const [senderBalance, recipientBalance, nativeBalance] = await Promise.all([
    getAccountBridgeBalance(sender, asset, isSoraToEvm, false, subConnector),
    getAccountBridgeBalance(recipient, asset, !isSoraToEvm, false, subConnector),
    getAccountBridgeBalance(spender, nativeToken, false, false, subConnector),
  ]);

  commit.setAssetSenderBalance(senderBalance);
  commit.setAssetRecipientBalance(recipientBalance);
  commit.setExternalNativeBalance(nativeBalance);
}

async function updateSubBalances(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state } = bridgeActionContext(context);
  const { sender, recipient, asset, nativeToken } = getters;
  const { isSoraToEvm, subBridgeConnector: subConnector } = state;
  const spender = sender;

  const [senderBalance, recipientBalance, nativeBalance] = await Promise.all([
    getAccountBridgeBalance(sender, asset, isSoraToEvm, true, subConnector),
    getAccountBridgeBalance(recipient, asset, !isSoraToEvm, true, subConnector),
    getAccountBridgeBalance(spender, nativeToken, false, true, subConnector),
  ]);

  commit.setAssetSenderBalance(senderBalance);
  commit.setAssetRecipientBalance(recipientBalance);
  commit.setExternalNativeBalance(nativeBalance);
}

async function updateSubHistory(context: ActionContext<any, any>, clearHistory = false): Promise<void> {
  const { dispatch } = bridgeActionContext(context);
  const updateHistoryFn = updateSubBridgeHistory(context);

  await updateHistoryFn(clearHistory, dispatch.updateInternalHistory);
}

async function updateEthHistory(context: ActionContext<any, any>, clearHistory = false): Promise<void> {
  const { dispatch } = bridgeActionContext(context);
  const updateHistoryFn = updateEthBridgeHistory(context);

  await updateHistoryFn(clearHistory, dispatch.updateInternalHistory);
}

async function updateEthLockedBalance(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, rootGetters, rootState } = bridgeActionContext(context);
  const { isRegisteredAsset, isSidechainAsset, asset } = getters;
  const { address, externalAddress, externalDecimals } = asset ?? {};
  const { networkSelected, ethBridgeContractAddress } = rootState.web3;
  const { isValidNetwork } = rootGetters.web3;

  const hasNetworkData = !!networkSelected && isValidNetwork && !!ethBridgeContractAddress;
  const hasAssetData = !!address && !!externalAddress && isRegisteredAsset;

  if (
    hasNetworkData &&
    hasAssetData
    // && isSidechainAsset
  ) {
    const bridgeValue = await ethersUtil.getAccountAssetBalance(ethBridgeContractAddress, externalAddress);
    const balance = FPNumber.fromCodecValue(bridgeValue, externalDecimals);
    commit.setAssetLockedBalance(balance);
  } else {
    commit.setAssetLockedBalance();
  }
}

async function updateBridgeProxyLockedBalance(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, rootState } = bridgeActionContext(context);
  const { address, decimals } = getters.asset ?? {};
  const { networkSelected } = rootState.web3;

  if (address && networkSelected) {
    const bridgeApi = getBridgeApi(context);
    const value = await bridgeApi.getLockedAssets(networkSelected as never, address);
    const balance = FPNumber.fromCodecValue(value, decimals);
    commit.setAssetLockedBalance(balance);
    return;
  }

  commit.setAssetLockedBalance();
}

async function updateExternalTransferFee(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state, rootState } = bridgeActionContext(context);

  let fee = ZeroStringValue;

  if (getters.isSubBridge && getters.asset && getters.isRegisteredAsset) {
    const externalNetwork = rootState.web3.networkSelected as SubNetwork;
    const direction = state.isSoraToEvm ? BridgeTxDirection.Outgoing : BridgeTxDirection.Incoming;
    const symbol = getters.asset.symbol;

    fee = SUB_TRANSFER_FEES[externalNetwork]?.[symbol]?.[direction] ?? ZeroStringValue;
  }

  commit.setExternalTransferFee(fee);
}

async function updateExternalMinBalance(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state } = bridgeActionContext(context);

  let minBalance = ZeroStringValue;

  if (getters.isSubBridge && getters.asset && !state.isSoraToEvm) {
    minBalance = await state.subBridgeConnector.network.getAssetMinDeposit(getters.asset);
  }

  commit.setExternalMinBalance(minBalance);
}

async function updateInternalMinBalance(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state } = bridgeActionContext(context);

  let minBalance = ZeroStringValue;

  if (getters.isEthBridge && getters.asset && state.isSoraToEvm) {
    // [HARDCODE]
    minBalance = ethBridgeApi.api.consts.balances.existentialDeposit.toString();
  }

  commit.setInternalMinBalance(minBalance);
}

async function updateExternalBlockNumber(context: ActionContext<any, any>): Promise<void> {
  const { getters, commit, state } = bridgeActionContext(context);
  try {
    const blockNumber = getters.isSubBridge
      ? await state.subBridgeConnector.network.getBlockNumber()
      : await ethersUtil.getBlockNumber();

    commit.setExternalBlockNumber(blockNumber);
  } catch (error) {
    console.error(error);
    commit.setExternalBlockNumber(0);
  }
}

async function updateFeesAndLockedFunds(context: ActionContext<any, any>): Promise<void> {
  const { commit } = bridgeActionContext(context);

  commit.setFeesAndLockedFundsFetching(true);

  const promises = [
    updateExternalLockedBalance(context),
    updateExternalNetworkFee(context),
    updateExternalTransferFee(context),
    updateSoraNetworkFee(context),
  ];

  await Promise.allSettled(promises);

  commit.setFeesAndLockedFundsFetching(false);
}

async function updateSoraNetworkFee(context: ActionContext<any, any>): Promise<void> {
  const { commit, state, getters, rootState } = bridgeActionContext(context);
  const { asset, operation } = getters;
  const {
    web3: { networkSelected },
    wallet: {
      settings: { networkFees },
    },
  } = rootState;

  let fee = ZeroStringValue;

  if (networkSelected && asset && state.isSoraToEvm) {
    if (getters.isEthBridge) {
      // [HARDCODE] hardcoded timechain network fee
      fee = '29000000000';
    } else {
      const bridgeApi = getBridgeApi(context) as typeof subBridgeApi | typeof evmBridgeApi;
      fee = await bridgeApi.getNetworkFee(asset, networkSelected as never);
    }
  }

  commit.setSoraNetworkFee(fee);
}

async function updateBalancesFeesAndAmounts(context: ActionContext<any, any>): Promise<void> {
  const { dispatch } = bridgeActionContext(context);

  await Promise.allSettled([
    dispatch.updateExternalBalance(),
    updateExternalMinBalance(context),
    updateInternalMinBalance(context),
    updateFeesAndLockedFunds(context),
  ]);
}

const actions = defineActions({
  setSendedAmount(context, value?: string) {
    const { commit, state, getters } = bridgeActionContext(context);

    commit.setFocusedField(FocusedField.Sended);
    commit.setAmountSend(value);

    if (value) {
      const sended = new FPNumber(value);
      const fee = FPNumber.fromCodecValue(state.externalTransferFee, getters.asset?.externalDecimals);
      const expected = sended.sub(fee);
      const received = FPNumber.isGreaterThan(expected, FPNumber.ZERO) ? expected : FPNumber.ZERO;

      commit.setAmountReceived(received.toString());
    } else {
      commit.setAmountReceived();
    }
  },

  setReceivedAmount(context, value?: string) {
    const { commit, state, getters } = bridgeActionContext(context);

    commit.setFocusedField(FocusedField.Received);
    commit.setAmountReceived(value);

    if (value) {
      const received = new FPNumber(value);
      const fee = FPNumber.fromCodecValue(state.externalTransferFee, getters.asset?.externalDecimals);
      const expected = received.add(fee);
      const sended = FPNumber.isGreaterThan(expected, FPNumber.ZERO) ? expected : FPNumber.ZERO;

      commit.setAmountSend(sended.toString());
    } else {
      commit.setAmountSend();
    }
  },

  async resetBridgeForm(context): Promise<void> {
    const { dispatch } = bridgeActionContext(context);

    await Promise.allSettled([dispatch.setAssetAddress(), dispatch.setSendedAmount()]);
  },

  async switchDirection(context): Promise<void> {
    const { commit, state } = bridgeActionContext(context);

    commit.setSoraToEvm(!state.isSoraToEvm);
    commit.setAssetSenderBalance();
    commit.setAssetRecipientBalance();

    await updateBalancesFeesAndAmounts(context);
    await switchAmounts(context);
  },

  async setAssetAddress(context, address?: string): Promise<void> {
    const { commit, dispatch } = bridgeActionContext(context);

    commit.setAssetAddress(address);
    commit.setAssetSenderBalance();
    commit.setAssetRecipientBalance();

    await Promise.allSettled([
      dispatch.updateOutgoingMinLimit(),
      dispatch.updateIncomingMinLimit(),
      updateBalancesFeesAndAmounts(context),
    ]);
    await updateAmounts(context);
  },

  async updateExternalBalance(context): Promise<void> {
    const { commit, getters } = bridgeActionContext(context);

    commit.setBalancesFetching(true);

    if (getters.isSubBridge) {
      await updateSubBalances(context);
    } else {
      await updateEvmBalances(context);
    }

    commit.setBalancesFetching(false);
  },

  async updateIncomingMinLimit(context): Promise<void> {
    const { commit, getters, state } = bridgeActionContext(context);
    // [HARDCODE]
    let minLimit = FPNumber.ONE;

    if (getters.isSubBridge && getters.asset && getters.isRegisteredAsset && state.subBridgeConnector.soraParachain) {
      try {
        const value = await state.subBridgeConnector.soraParachain.getAssetMinimumAmount(getters.asset.address);
        minLimit = FPNumber.fromCodecValue(value, getters.asset.externalDecimals);
      } catch (error) {
        console.error(error);
      }
    }

    commit.setIncomingMinLimit(minLimit);
  },

  async updateOutgoingMinLimit(context): Promise<void> {
    const { commit, getters, state } = bridgeActionContext(context);

    let minLimit = FPNumber.ZERO;

    if (getters.isSubBridge && getters.asset && getters.isRegisteredAsset) {
      try {
        // [TODO: Bridge] should be a backend call in future. Now it is existential deposit
        const value = await state.subBridgeConnector.network.getAssetMinDeposit(getters.asset);
        minLimit = FPNumber.fromCodecValue(value, getters.asset.externalDecimals);
      } catch (error) {
        console.error(error);
      }
    }

    commit.setOutgoingMinLimit(minLimit);
  },

  async subscribeOnBlockUpdates(context): Promise<void> {
    const { commit } = bridgeActionContext(context);

    commit.resetBlockUpdatesSubscription();

    const subscription = api.system.updated.subscribe(() => {
      updateExternalBlockNumber(context);
      updateBalancesFeesAndAmounts(context);
    });

    commit.setBlockUpdatesSubscription(subscription);
  },

  async generateHistoryItem(context, playground): Promise<IBridgeTransaction> {
    const { dispatch } = bridgeActionContext(context);
    const historyData = bridgeDataToHistoryItem(context, playground);
    const bridgeApi = getBridgeApi(context);
    const historyItem = bridgeApi.generateHistoryItem(historyData as never);

    if (!historyItem) {
      throw new Error('[Bridge]: "generateHistoryItem" failed');
    }

    dispatch.updateInternalHistory();

    return historyItem;
  },

  updateBridgeHistory(context): void {
    const { dispatch } = bridgeActionContext(context);

    dispatch.updateInternalHistory();
    dispatch.updateExternalHistory(false);
  },

  updateInternalHistory(context): void {
    const { commit, rootState } = bridgeActionContext(context);
    const { networkSelected } = rootState.web3;
    const bridgeApi = getBridgeApi(context);
    const history = bridgeApi.history;
    const historyNetwork = Object.entries(history).reduce((acc, [id, item]) => {
      const { externalNetwork } = item as IBridgeTransaction;
      if (externalNetwork === networkSelected) {
        acc[id] = item;
      }
      return acc;
    }, {});
    commit.setInternalHistory(historyNetwork as Record<string, IBridgeTransaction>);
  },

  async updateExternalHistory(context, clearHistory = false): Promise<void> {
    const { commit, getters } = bridgeActionContext(context);
    const { networkHistoryId } = getters;

    if (!networkHistoryId || getters.networkHistoryLoading) return;

    commit.setNetworkHistoryLoading(networkHistoryId);

    if (getters.isEthBridge) {
      await updateEthHistory(context, clearHistory);
    }
    if (getters.isSubBridge) {
      await updateSubHistory(context, clearHistory);
    }
    if (getters.isEvmBridge) {
      console.info('Evm history not implemented');
    }

    commit.resetNetworkHistoryLoading(networkHistoryId);
  },

  removeHistory(context, { tx, force = false }: { tx: Partial<IBridgeTransaction>; force: boolean }): void {
    const { commit, dispatch, state } = bridgeActionContext(context);

    const { id, hash } = tx;

    if (!id) return;

    const bridgeApi = getBridgeApi(context);
    const item = bridgeApi.history[id] as IBridgeTransaction;

    if (!item) return;

    const inProgress = state.inProgressIds[id];
    // in not force mode, do not remove tx in progress
    if (!force && inProgress) return;
    // update in progress id if needed
    if (hash && inProgress) {
      commit.addTxIdInProgress(hash);
      commit.removeTxIdFromProgress(id);
    }
    // update active view if needed
    if (hash && state.historyId === id) {
      commit.setHistoryId(hash);
    }
    // remove tx from history
    bridgeApi.removeHistory(id);

    dispatch.updateInternalHistory();
  },

  async handleBridgeTransaction(context, id: string): Promise<void> {
    const { getters } = bridgeActionContext(context);

    if (getters.isEthBridge) {
      return await ethBridge.handleTransaction(id);
    }
    if (getters.isEvmBridge) {
      return await evmBridge.handleTransaction(id);
    }
    if (getters.isSubBridge) {
      return await subBridge.handleTransaction(id);
    }
  },

  // ETH BRIDGE
  async getEthBridgeHistoryInstance(context): Promise<EthBridgeHistory> {
    const bridgeHistoryInstance = await getEthBridgeHistoryInstance(context);

    return bridgeHistoryInstance;
  },

  async signEthBridgeOutgoingEvm(context, id: string): Promise<ethers.TransactionResponse> {
    const { rootState, rootGetters } = bridgeActionContext(context);
    const tx = ethBridgeApi.getHistory(id) as Nullable<EthHistory>;

    if (!tx) throw new Error('TX cannot be empty!');
    if (!tx.id) throw new Error('TX id cannot be empty!');
    if (!tx.amount) throw new Error('TX amount cannot be empty!');
    if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');
    if (!tx.to) throw new Error('TX to cannot be empty!');

    const asset = rootGetters.assets.assetDataByAddress(tx.assetAddress);

    if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    const request = await waitForApprovedRequest(tx);

    if (!ethersUtil.addressesAreEqual(rootState.web3.evmAddress, request.to)) {
      throw new Error(`Change account in ethereum wallet to ${request.to}`);
    }

    checkEvmNetwork(context);

    const { contract, method, args } = await getOutgoingEvmTransactionData({
      asset,
      value: tx.amount,
      recipient: tx.to,
      contractAddress: rootState.web3.ethBridgeContractAddress,
      request,
    });

    const transaction: ethers.TransactionResponse = await contract[method](...args);

    return transaction;
  },

  async signEthBridgeIncomingEvm(context, id: string): Promise<ethers.TransactionResponse> {
    const { commit, rootState, rootGetters } = bridgeActionContext(context);
    const tx = ethBridgeApi.getHistory(id);

    if (!tx) throw new Error('TX cannot be empty!');
    if (!tx.id) throw new Error('TX id cannot be empty!');
    if (!tx.amount) throw new Error('TX amount cannot be empty!');
    if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');
    if (!tx.to) throw new Error('TX to cannot be empty!');

    const asset = rootGetters.assets.assetDataByAddress(tx.assetAddress);

    if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    const evmAccount = rootState.web3.evmAddress;
    const isEvmAccountConnected = await ethersUtil.checkAccountIsConnected(evmAccount);

    if (!isEvmAccountConnected) throw new Error('Connect account in ethereum wallet');

    const contractAddress = rootState.web3.ethBridgeContractAddress;

    const allowance = await ethersUtil.getAllowance(evmAccount, contractAddress, asset.externalAddress);

    if (!!allowance && FPNumber.isLessThan(new FPNumber(allowance), new FPNumber(tx.amount))) {
      commit.addTxIdInApprove(tx.id);
      const tokenInstance = await ethersUtil.getTokenContract(asset.externalAddress);
      const methodArgs = [
        contractAddress, // address spender
        MaxUint256, // uint256 amount
      ];

      let transaction: ethers.TransactionResponse;
      try {
        checkEvmNetwork(context);
        transaction = await tokenInstance.approve(...methodArgs);
      } finally {
        commit.removeTxIdFromApprove(tx.id); // change ui state after approve in client
      }
      await waitForEvmTransactionMined(transaction); // wait for 1 confirm block
    }

    const { contract, method, args } = await getIncomingEvmTransactionData({
      asset,
      value: tx.amount,
      recipient: rootState.wallet.account.address,
      contractAddress,
    });

    checkEvmNetwork(context);

    const transaction: ethers.TransactionResponse = await contract[method](...args);

    return transaction;
  },
});

export default actions;
