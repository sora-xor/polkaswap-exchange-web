import { BridgeCurrencyType, BridgeRequestAssetKind, BridgeHistory, FPNumber, Operation } from '@sora-substrate/util';
import { getAssetBalance } from '@sora-substrate/util/build/assets';
import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { api, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';

import { MaxUint256, ZeroStringValue } from '@/consts';
import { SmartContractType, KnownEthBridgeAsset, SmartContracts } from '@/consts/evm';
import { SUB_TRANSFER_FEES } from '@/consts/sub';
import { bridgeActionContext } from '@/store/bridge';
import { FocusedField } from '@/store/bridge/types';
import { waitForEvmTransactionMined } from '@/utils/bridge/common/utils';
import ethBridge from '@/utils/bridge/eth';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { EthBridgeHistory, updateEthBridgeHistory } from '@/utils/bridge/eth/classes/history';
import { waitForApprovedRequest } from '@/utils/bridge/eth/utils';
import evmBridge from '@/utils/bridge/evm';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import subBridge from '@/utils/bridge/sub';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { subConnector } from '@/utils/bridge/sub/classes/adapter';
import { updateSubBridgeHistory } from '@/utils/bridge/sub/classes/history';
import ethersUtil from '@/utils/ethers-util';

import type { SignTxResult } from './types';
import type { IBridgeTransaction } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { EvmHistory, EvmNetwork } from '@sora-substrate/util/build/bridgeProxy/evm/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import type { BridgeTransactionData, BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';
import type { ActionContext } from 'vuex';

function checkEvmNetwork(context: ActionContext<any, any>): void {
  const { rootGetters } = bridgeActionContext(context);
  if (!rootGetters.web3.isValidNetwork) {
    throw new Error('Change evm network in Metamask');
  }
}

async function evmTxDataToHistory(
  assetDataByAddress: (address: string) => Nullable<RegisteredAccountAsset>,
  tx: BridgeTransactionData
): Promise<EvmHistory> {
  const id = tx.soraHash;
  const asset = assetDataByAddress(tx.soraAssetAddress);
  const transactionState = tx.status;
  const isOutgoing = tx.direction === BridgeTxDirection.Outgoing;
  const blockHeight = isOutgoing ? tx.startBlock : tx.endBlock;
  const externalBlockHeight = isOutgoing ? tx.endBlock : tx.startBlock;
  const blockId = await api.system.getBlockHash(blockHeight);
  const startTime = await api.system.getBlockTimestamp(blockId);

  return {
    id,
    txId: id,
    blockId,
    blockHeight,
    type: isOutgoing ? Operation.EvmOutgoing : Operation.EvmIncoming,
    hash: tx.soraHash,
    transactionState,
    externalBlockHeight,
    externalNetwork: tx.externalNetwork as EvmNetwork,
    externalNetworkType: BridgeNetworkType.Evm,
    // for now we don't know it
    externalHash: '',
    amount: FPNumber.fromCodecValue(tx.amount, asset?.decimals).toString(),
    assetAddress: asset?.address,
    symbol: asset?.symbol,
    from: tx.soraAccount,
    to: tx.externalAccount,
    // for now we only know sora block, assume what this is start & end times
    startTime: startTime,
    endTime: startTime,
  };
}

function bridgeDataToHistoryItem(
  context: ActionContext<any, any>,
  { date = Date.now(), payload = {}, ...params } = {}
): IBridgeTransaction {
  const { getters, state, rootState, rootGetters } = bridgeActionContext(context);
  const { isEthBridge, isEvmBridge } = getters;
  const transactionState = isEthBridge ? WALLET_CONSTS.ETH_BRIDGE_STATES.INITIAL : BridgeTxStatus.Pending;
  const externalNetwork = rootState.web3.networkSelected as BridgeNetworkId as any;
  const externalNetworkType = isEthBridge
    ? BridgeNetworkType.EvmLegacy
    : isEvmBridge
    ? BridgeNetworkType.Evm
    : BridgeNetworkType.Sub;

  return {
    type: (params as any).type ?? getters.operation,
    amount: (params as any).amount ?? state.amountSend,
    amount2: (params as any).amount2 ?? state.amountReceived,
    symbol: (params as any).symbol ?? getters.asset?.symbol,
    assetAddress: (params as any).assetAddress ?? getters.asset?.address,
    startTime: date,
    endTime: date,
    status: '',
    hash: '',
    transactionState,
    soraNetworkFee: (params as any).soraNetworkFee ?? getters.soraNetworkFee,
    externalNetworkFee: (params as any).externalNetworkFee ?? getters.externalNetworkFee,
    externalNetwork,
    externalNetworkType,
    to: (params as any).to ?? rootGetters.web3.externalAccount,
    payload,
  };
}

async function getEvmNetworkFee(context: ActionContext<any, any>): Promise<void> {
  const { commit, state, rootState } = bridgeActionContext(context);

  let fee = ZeroStringValue;

  const address = state.assetAddress;
  const registeredAsset = address ? rootState.assets.registeredAssets[address] : null;

  if (registeredAsset) {
    fee = await ethersUtil.getEvmNetworkFee(registeredAsset.address, registeredAsset.kind, state.isSoraToEvm);
  }

  commit.setExternalNetworkFee(fee);
}

async function getSubNetworkFee(context: ActionContext<any, any>): Promise<void> {
  const { commit } = bridgeActionContext(context);

  let fee = ZeroStringValue;

  if (subConnector.networkAdapter) {
    fee = await subConnector.networkAdapter.getNetworkFee();
  }

  commit.setExternalNetworkFee(fee);
}

async function getExternalNetworkFee(context: ActionContext<any, any>): Promise<void> {
  const { getters } = bridgeActionContext(context);

  if (getters.isSubBridge) {
    await getSubNetworkFee(context);
  } else {
    await getEvmNetworkFee(context);
  }
}

async function updateEvmBalances(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state } = bridgeActionContext(context);
  const { sender, recipient, asset } = getters;
  const { isSoraToEvm } = state;

  const spender = isSoraToEvm ? recipient : sender;

  const getSenderBalance = async () => {
    if (!(asset?.address && sender)) return ZeroStringValue;

    return isSoraToEvm
      ? (await getAssetBalance(api.api, sender, asset.address, asset.decimals)).transferable
      : (await ethersUtil.getAccountAssetBalance(sender, asset?.externalAddress)).value;
  };

  const getRecipientBalance = async () => {
    if (!(asset?.address && recipient)) return ZeroStringValue;

    return isSoraToEvm
      ? (await ethersUtil.getAccountAssetBalance(recipient, asset?.externalAddress)).value
      : (await getAssetBalance(api.api, recipient, asset.address, asset.decimals)).transferable;
  };

  const getSpenderBalance = async () => {
    if (!(asset?.address && spender)) return ZeroStringValue;

    return await ethersUtil.getAccountBalance(spender);
  };

  const [senderBalance, recipientBalance, nativeBalance] = await Promise.all([
    getSenderBalance(),
    getRecipientBalance(),
    getSpenderBalance(),
  ]);

  commit.setAssetSenderBalance(senderBalance);
  commit.setAssetRecipientBalance(recipientBalance);
  commit.setExternalBalance(nativeBalance);
}

async function updateSubBalances(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state } = bridgeActionContext(context);
  const { sender, recipient, asset } = getters;
  const { isSoraToEvm } = state;

  const getSenderBalance = async () => {
    if (!(asset?.address && sender)) return ZeroStringValue;

    return isSoraToEvm
      ? (await getAssetBalance(api.api, sender, asset.address, asset.decimals)).transferable
      : await subConnector.networkAdapter.getTokenBalance(sender, asset?.externalAddress);
  };

  const getRecipientBalance = async () => {
    if (!(asset?.address && recipient)) return ZeroStringValue;

    return isSoraToEvm
      ? await subConnector.networkAdapter.getTokenBalance(recipient, asset?.externalAddress)
      : (await getAssetBalance(api.api, recipient, asset.address, asset.decimals)).transferable;
  };

  const getSpenderBalance = async () => {
    if (!(asset?.address && sender)) return ZeroStringValue;

    return await subConnector.networkAdapter.getTokenBalance(sender);
  };

  const [senderBalance, recipientBalance, nativeBalance] = await Promise.all([
    getSenderBalance(),
    getRecipientBalance(),
    getSpenderBalance(),
  ]);

  commit.setAssetSenderBalance(senderBalance);
  commit.setAssetRecipientBalance(recipientBalance);
  commit.setExternalBalance(nativeBalance);
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

async function updateEvmHistory(context: ActionContext<any, any>): Promise<void> {
  const { commit, dispatch, state, rootState, rootGetters } = bridgeActionContext(context);
  const externalNetwork = rootState.web3.networkSelected;

  if (!externalNetwork) return;

  const accountAddress = rootState.wallet.account.address;
  const transactions = await evmBridgeApi.getUserTransactions(accountAddress, externalNetwork as EvmNetwork);
  const externalHistory = {};

  // [TODO]: update later
  for (const txData of transactions) {
    const tx = await evmTxDataToHistory(rootGetters.assets.assetDataByAddress, txData);

    if (tx.id) {
      const inProgress = state.inProgressIds[tx.id];

      if (!inProgress) {
        externalHistory[tx.id] = tx;

        await dispatch.removeHistory({ tx, force: false });
      }
    }
  }

  commit.setExternalHistory(externalHistory);
}

async function updateEthLockedBalance(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, rootGetters, rootState } = bridgeActionContext(context);
  const { address, externalAddress } = getters.asset || {};
  const bridgeContractAddress = rootGetters.web3.contractAddress(KnownEthBridgeAsset.Other);

  if (address && externalAddress && bridgeContractAddress) {
    const assetKind = rootState.assets.registeredAssets[address]?.kind;

    if (assetKind === BridgeRequestAssetKind.Sidechain) {
      const { value } = await ethersUtil.getAccountAssetBalance(bridgeContractAddress, externalAddress);
      commit.setAssetLockedBalance(value);
      return;
    }
  }

  commit.setAssetLockedBalance();
}

async function updateBridgeProxyLockedBalance(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, rootState } = bridgeActionContext(context);
  const { address } = getters.asset || {};
  const { networkSelected, networkType } = rootState.web3;

  if (address && networkSelected && networkType) {
    const bridgeApi = getters.bridgeApi as typeof evmBridgeApi | typeof subBridgeApi;
    const data = await bridgeApi.getLockedAssets(networkSelected as never, address);
    const balance = data.toString();
    commit.setAssetLockedBalance(balance);
  }

  commit.setAssetLockedBalance();
}

async function getExternalTransferFee(context: ActionContext<any, any>): Promise<void> {
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

  async updateBalancesAndFees(context): Promise<void> {
    const { dispatch } = bridgeActionContext(context);

    await Promise.all([
      dispatch.updateExternalBalance(),
      dispatch.updateExternalLockedBalance(),
      dispatch.updateExternalFees(),
    ]);
  },

  async switchDirection(context): Promise<void> {
    const { commit, dispatch, state } = bridgeActionContext(context);

    commit.setSoraToEvm(!state.isSoraToEvm);
    commit.setAssetSenderBalance();
    commit.setAssetRecipientBalance();

    await dispatch.updateBalancesAndFees();

    if (state.focusedField === FocusedField.Received) {
      await dispatch.setSendedAmount(state.amountReceived);
    } else {
      await dispatch.setReceivedAmount(state.amountSend);
    }
  },

  async setAssetAddress(context, address?: string): Promise<void> {
    const { commit, dispatch } = bridgeActionContext(context);

    commit.setAssetAddress(address);
    commit.setAssetSenderBalance();
    commit.setAssetRecipientBalance();

    await dispatch.updateBalancesAndFees();
  },

  async updateExternalFees(context): Promise<void> {
    const { commit } = bridgeActionContext(context);

    commit.setExternalNetworkFeeFetching(true);

    await Promise.all([getExternalNetworkFee(context), getExternalTransferFee(context)]);

    commit.setExternalNetworkFeeFetching(false);
  },

  async updateExternalBalance(context): Promise<void> {
    const { commit, getters } = bridgeActionContext(context);

    commit.setExternalBalancesFetching(true);

    if (getters.isSubBridge) {
      await updateSubBalances(context);
    } else {
      await updateEvmBalances(context);
    }

    commit.setExternalBalancesFetching(false);
  },

  async updateExternalLockedBalance(context): Promise<void> {
    const { commit, getters } = bridgeActionContext(context);

    commit.setAssetLockedBalanceFetching(true);

    if (getters.isEthBridge) {
      await updateEthLockedBalance(context);
    } else {
      await updateBridgeProxyLockedBalance(context);
    }

    commit.setAssetLockedBalanceFetching(false);
  },

  async updateExternalBlockNumber(context): Promise<void> {
    const { getters, commit } = bridgeActionContext(context);

    try {
      const blockNumber = getters.isSubBridge
        ? await subConnector.networkAdapter.getBlockNumber()
        : await (await ethersUtil.getEthersInstance()).getBlockNumber();

      commit.setExternalBlockNumber(blockNumber);
    } catch {
      commit.setExternalBlockNumber(0);
    }
  },

  async generateHistoryItem(context, playground): Promise<IBridgeTransaction> {
    const { dispatch, getters } = bridgeActionContext(context);
    const historyData = bridgeDataToHistoryItem(context, playground);
    const historyItem = getters.bridgeApi.generateHistoryItem(historyData as any);

    if (!historyItem) {
      throw new Error('[Bridge]: "generateHistoryItem" failed');
    }

    dispatch.updateInternalHistory();

    return historyItem;
  },

  updateInternalHistory(context): void {
    const { getters, commit } = bridgeActionContext(context);
    const history = getters.bridgeApi.history;
    commit.setInternalHistory(history as Record<string, IBridgeTransaction>);
  },

  async updateExternalHistory(context, clearHistory = false): Promise<void> {
    const { commit, getters, state } = bridgeActionContext(context);

    if (state.historyLoading) return;

    commit.setHistoryLoading(true);

    if (getters.isEthBridge) {
      await updateEthHistory(context, clearHistory);
    }
    if (getters.isEvmBridge) {
      await updateEvmHistory(context);
    }
    if (getters.isSubBridge) {
      await updateSubHistory(context, clearHistory);
    }

    commit.setHistoryLoading(false);
  },

  removeHistory(context, { tx, force = false }: { tx: Partial<IBridgeTransaction>; force: boolean }): void {
    const { commit, dispatch, getters, state, rootState } = bridgeActionContext(context);

    const { id, hash } = tx;

    if (!id) return;

    const item = getters.bridgeApi.history[id] as IBridgeTransaction;

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
    // update moonpay records if needed
    if (item.payload?.moonpayId) {
      rootState.moonpay.api.accountRecords = {
        ...rootState.moonpay.api.accountRecords,
        [item.payload.moonpayId]: item.externalHash,
      };
    }
    // remove tx from history
    getters.bridgeApi.removeHistory(id);

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
    const { rootState } = bridgeActionContext(context);
    const etherscanApiKey = rootState.wallet.settings.apiKeys?.etherscan;
    const bridgeHistory = new EthBridgeHistory(etherscanApiKey);

    await bridgeHistory.init(rootState.web3.ethBridgeContractAddress);

    return bridgeHistory;
  },

  async signEthBridgeOutgoingEvm(context, id: string): Promise<SignTxResult> {
    const { rootState, rootGetters } = bridgeActionContext(context);
    const tx = ethBridgeApi.getHistory(id) as Nullable<BridgeHistory>;

    if (!tx?.hash) throw new Error('TX ID cannot be empty!');
    if (!tx.amount) throw new Error('TX amount cannot be empty!');
    if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');

    const asset = rootGetters.assets.assetDataByAddress(tx.assetAddress);

    if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    const request = await waitForApprovedRequest(tx); // If it causes an error, then -> catch -> SORA_REJECTED
    const evmAccount = rootState.web3.evmAddress;

    if (!ethersUtil.addressesAreEqual(evmAccount, request.to)) {
      throw new Error(`Change account in MetaMask to ${request.to}`);
    }

    const ethersInstance = await ethersUtil.getEthersInstance();

    const symbol = asset.symbol as KnownEthBridgeAsset;
    const isValOrXor = [KnownEthBridgeAsset.XOR, KnownEthBridgeAsset.VAL].includes(symbol);
    const bridgeAsset: KnownEthBridgeAsset = isValOrXor ? symbol : KnownEthBridgeAsset.Other;
    const contract = SmartContracts[SmartContractType.EthBridge][bridgeAsset];
    const jsonInterface = contract.abi;
    const contractAddress = rootGetters.web3.contractAddress(bridgeAsset) as string;
    const contractInstance = new ethers.Contract(contractAddress, jsonInterface, ethersInstance.getSigner());
    const method = isValOrXor
      ? 'mintTokensByPeers'
      : request.currencyType === BridgeCurrencyType.TokenAddress
      ? 'receiveByEthereumAssetAddress'
      : 'receiveBySidechainAssetId';
    const methodArgs: Array<any> = [
      isValOrXor || request.currencyType === BridgeCurrencyType.TokenAddress
        ? asset.externalAddress // address tokenAddress OR
        : asset.address, // bytes32 assetId
      new FPNumber(tx.amount, asset.externalDecimals).toCodecString(), // uint256 amount
      evmAccount, // address beneficiary
    ];
    methodArgs.push(
      ...(isValOrXor
        ? [
            tx.hash, // bytes32 txHash
            request.v, // uint8[] memory v
            request.r, // bytes32[] memory r
            request.s, // bytes32[] memory s
            request.from, // address from
          ]
        : [
            request.from, // address from
            tx.hash, // bytes32 txHash
            request.v, // uint8[] memory v
            request.r, // bytes32[] memory r
            request.s, // bytes32[] memory s
          ])
    );

    checkEvmNetwork(context);
    const transaction: ethers.providers.TransactionResponse = await contractInstance[method](...methodArgs);

    const fee = transaction.gasPrice
      ? ethersUtil.calcEvmFee(transaction.gasPrice.toNumber(), transaction.gasLimit.toNumber())
      : undefined;

    return {
      hash: transaction.hash,
      fee,
    };
  },

  async signEthBridgeIncomingEvm(context, id: string): Promise<SignTxResult> {
    const { commit, rootState, rootGetters } = bridgeActionContext(context);
    const tx = ethBridgeApi.getHistory(id);
    if (!tx?.id) throw new Error('TX cannot be empty!');
    if (!tx.amount) throw new Error('TX amount cannot be empty!');
    if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');
    const asset = rootGetters.assets.assetDataByAddress(tx.assetAddress);
    if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    const evmAccount = rootState.web3.evmAddress;
    const isEvmAccountConnected = await ethersUtil.checkAccountIsConnected(evmAccount);
    if (!isEvmAccountConnected) throw new Error('Connect account in Metamask');
    const ethersInstance = await ethersUtil.getEthersInstance();
    const contractAddress = rootGetters.web3.contractAddress(KnownEthBridgeAsset.Other) as string;
    const isNativeEvmToken = ethersUtil.isNativeEvmTokenAddress(asset.externalAddress);
    // don't check allowance for native EVM token
    if (!isNativeEvmToken) {
      const allowance = await ethersUtil.getAllowance(evmAccount, contractAddress, asset.externalAddress);
      if (FPNumber.isLessThan(new FPNumber(allowance), new FPNumber(tx.amount))) {
        commit.addTxIdInApprove(tx.id);
        const tokenInstance = new ethers.Contract(
          asset.externalAddress,
          SmartContracts[SmartContractType.ERC20].abi,
          ethersInstance.getSigner()
        );
        const methodArgs = [
          contractAddress, // address spender
          MaxUint256, // uint256 amount
        ];

        let transaction: any;
        try {
          checkEvmNetwork(context);
          transaction = await tokenInstance.approve(...methodArgs);
        } finally {
          commit.removeTxIdFromApprove(tx.id); // change ui state after approve in client
        }
        await waitForEvmTransactionMined(transaction.hash); // wait for 1 confirm block
      }
    }
    const soraAccountAddress = rootState.wallet.account.address;
    const accountId = await ethersUtil.accountAddressToHex(soraAccountAddress);
    const contractInstance = new ethers.Contract(
      contractAddress,
      SmartContracts[SmartContractType.EthBridge][KnownEthBridgeAsset.Other].abi,
      ethersInstance.getSigner()
    );
    const decimals = isNativeEvmToken
      ? undefined
      : await (async () => {
          const tokenInstance = new ethers.Contract(
            asset.externalAddress,
            SmartContracts[SmartContractType.ERC20].abi,
            ethersInstance.getSigner()
          );
          const decimals = await tokenInstance.decimals();
          return +decimals;
        })();
    const amount = new FPNumber(tx.amount, decimals).toCodecString();
    const method = isNativeEvmToken ? 'sendEthToSidechain' : 'sendERC20ToSidechain';
    const methodArgs = isNativeEvmToken
      ? [
          accountId, // bytes32 to
        ]
      : [
          accountId, // bytes32 to
          amount, // uint256 amount
          asset.externalAddress, // address tokenAddress
        ];
    const overrides = isNativeEvmToken ? { value: amount } : {};

    checkEvmNetwork(context);
    const transaction: ethers.providers.TransactionResponse = await contractInstance[method](...methodArgs, overrides);
    const fee = transaction.gasPrice
      ? ethersUtil.calcEvmFee(transaction.gasPrice.toNumber(), transaction.gasLimit.toNumber())
      : undefined;
    return {
      hash: transaction.hash,
      fee,
    };
  },
});

export default actions;
