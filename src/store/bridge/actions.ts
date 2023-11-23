import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber } from '@sora-substrate/util';
import { getAssetBalance } from '@sora-substrate/util/build/assets';
import { DAI } from '@sora-substrate/util/build/assets/consts';
import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { EthCurrencyType, EthAssetKind } from '@sora-substrate/util/build/bridgeProxy/eth/consts';
import { DexId } from '@sora-substrate/util/build/dex/consts';
import { api, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';
import { combineLatest } from 'rxjs';

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
import { subBridgeConnector } from '@/utils/bridge/sub/classes/adapter';
import { updateSubBridgeHistory } from '@/utils/bridge/sub/classes/history';
import ethersUtil from '@/utils/ethers-util';

import type { SignTxResult } from './types';
import type { SwapQuote } from '@sora-substrate/liquidity-proxy/build/types';
import type { IBridgeTransaction, CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { EthHistory } from '@sora-substrate/util/build/bridgeProxy/eth/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';
import type { Subscription } from 'rxjs';
import type { ActionContext } from 'vuex';

const getSoraBalance = async (accountAddress: string, asset: RegisteredAccountAsset): Promise<CodecString> => {
  const accountBalance = await getAssetBalance(api.api, accountAddress, asset.address, asset.decimals);
  return accountBalance.transferable;
};

const getExternalBalance = async (
  accountAddress: string,
  asset: RegisteredAccountAsset,
  isSub: boolean
): Promise<CodecString> => {
  return isSub
    ? await subBridgeConnector.network.adapter.getTokenBalance(accountAddress, asset?.symbol)
    : await ethersUtil.getAccountAssetBalance(accountAddress, asset?.externalAddress);
};

const getAccountBridgeBalance = async (
  accountAddress: string,
  asset: Nullable<RegisteredAccountAsset>,
  isSora: boolean,
  isSub: boolean
): Promise<CodecString> => {
  if (!(asset?.address && accountAddress)) return ZeroStringValue;

  try {
    return isSora
      ? await getSoraBalance(accountAddress, asset)
      : await getExternalBalance(accountAddress, asset, isSub);
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
  const { isEthBridge, isEvmBridge } = getters;
  const transactionState = isEthBridge ? WALLET_CONSTS.ETH_BRIDGE_STATES.INITIAL : BridgeTxStatus.Pending;
  const externalNetwork = rootState.web3.networkSelected as BridgeNetworkId as any;
  const externalNetworkType = isEthBridge
    ? BridgeNetworkType.Eth
    : isEvmBridge
    ? BridgeNetworkType.Evm
    : BridgeNetworkType.Sub;

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
    to: (params as any).to ?? getters.externalAccountFormatted,
    payload,
  };

  return data;
}

async function getEvmNetworkFee(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state, rootState, rootGetters } = bridgeActionContext(context);
  const { asset, isRegisteredAsset } = getters;
  const { isValidNetwork } = rootGetters.web3;

  let fee = ZeroStringValue;

  if (asset && isRegisteredAsset && isValidNetwork) {
    const bridgeRegisteredAsset = rootState.assets.registeredAssets[asset.address];

    fee = await ethersUtil.getEvmNetworkFee(
      bridgeRegisteredAsset.address,
      bridgeRegisteredAsset.kind,
      state.isSoraToEvm
    );
  }

  commit.setExternalNetworkFee(fee);
}

async function getSubNetworkFee(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters } = bridgeActionContext(context);
  let fee = ZeroStringValue;

  if (getters.asset && getters.isRegisteredAsset && getters.sender && getters.recipient) {
    fee = await subBridgeConnector.network.adapter.getNetworkFee(getters.asset, getters.sender, getters.recipient);
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
  const { isSoraToEvm } = state;
  const spender = isSoraToEvm ? recipient : sender;

  const [senderBalance, recipientBalance, nativeBalance] = await Promise.all([
    getAccountBridgeBalance(sender, asset, isSoraToEvm, false),
    getAccountBridgeBalance(recipient, asset, !isSoraToEvm, false),
    getAccountBridgeBalance(spender, nativeToken, false, false),
  ]);

  commit.setAssetSenderBalance(senderBalance);
  commit.setAssetRecipientBalance(recipientBalance);
  commit.setExternalBalance(nativeBalance);
}

async function updateSubBalances(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state } = bridgeActionContext(context);
  const { sender, recipient, asset, nativeToken } = getters;
  const { isSoraToEvm } = state;
  const spender = sender;

  const [senderBalance, recipientBalance, nativeBalance] = await Promise.all([
    getAccountBridgeBalance(sender, asset, isSoraToEvm, true),
    getAccountBridgeBalance(recipient, asset, !isSoraToEvm, true),
    getAccountBridgeBalance(spender, nativeToken, false, true),
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

async function updateEthLockedBalance(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, rootGetters, rootState } = bridgeActionContext(context);
  const { address, decimals, externalAddress } = getters.asset ?? {};
  const { networkSelected } = rootState.web3;
  const { isValidNetwork, contractAddress } = rootGetters.web3;
  const bridgeContractAddress = contractAddress(KnownEthBridgeAsset.Other);

  if (address && networkSelected && isValidNetwork && externalAddress && bridgeContractAddress) {
    const registeredAsset = rootState.assets.registeredAssets[address];

    if (registeredAsset) {
      const { kind, decimals: externalDecimals } = registeredAsset;

      if (kind === EthAssetKind.Sidechain) {
        const [lockedValue, bridgeValue] = await Promise.all([
          ethBridgeApi.getLockedAssets(networkSelected as number, address),
          ethersUtil.getAccountAssetBalance(bridgeContractAddress, externalAddress),
        ]);
        const balance = FPNumber.min(
          FPNumber.fromCodecValue(lockedValue, decimals),
          FPNumber.fromCodecValue(bridgeValue, externalDecimals)
        );
        commit.setAssetLockedBalance(balance);
        return;
      }
    }
  }

  commit.setAssetLockedBalance();
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

function calculateMaxLimit(
  limitAsset: string,
  referenceAsset: string,
  usdLimit: CodecString,
  quote: SwapQuote
): FPNumber {
  const outgoingLimitUSD = FPNumber.fromCodecValue(usdLimit);

  if (outgoingLimitUSD.isZero() || limitAsset === referenceAsset) return outgoingLimitUSD;

  try {
    const {
      result: { amount },
    } = quote(limitAsset, referenceAsset, 1, false, [], false);

    const assetPriceUSD = FPNumber.fromCodecValue(amount);

    if (!assetPriceUSD.isFinity() || assetPriceUSD.isZero()) return FPNumber.ZERO;

    return outgoingLimitUSD.div(assetPriceUSD);
  } catch (error) {
    console.error(error);
    return FPNumber.ZERO;
  }
}

async function updateExternalBlockNumber(context: ActionContext<any, any>): Promise<void> {
  const { getters, commit } = bridgeActionContext(context);
  try {
    const blockNumber = getters.isSubBridge
      ? await subBridgeConnector.network.adapter.getBlockNumber()
      : await ethersUtil.getBlockNumber();

    commit.setExternalBlockNumber(blockNumber);
  } catch (error) {
    console.error(error);
    commit.setExternalBlockNumber(0);
  }
}

async function updateFeesAndLockedFunds(context: ActionContext<any, any>, withSora = false): Promise<void> {
  const { commit } = bridgeActionContext(context);

  commit.setFeesAndLockedFundsFetching(true);

  const promises = [
    updateExternalLockedBalance(context),
    updateExternalNetworkFee(context),
    updateExternalTransferFee(context),
  ];

  if (withSora) {
    promises.push(updateSoraNetworkFee(context));
  }

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
      fee = networkFees[operation];
    } else {
      const bridgeApi = getBridgeApi(context) as typeof subBridgeApi | typeof evmBridgeApi;
      fee = await bridgeApi.getNetworkFee(asset, networkSelected as never);
    }
  }

  commit.setSoraNetworkFee(fee);
}

async function updateBalancesAndFees(context: ActionContext<any, any>, withSora = false): Promise<void> {
  const { dispatch } = bridgeActionContext(context);

  await Promise.allSettled([dispatch.updateExternalBalance(), updateFeesAndLockedFunds(context, withSora)]);
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
    const { commit, dispatch, state } = bridgeActionContext(context);

    commit.setSoraToEvm(!state.isSoraToEvm);
    commit.setAssetSenderBalance();
    commit.setAssetRecipientBalance();

    await updateBalancesAndFees(context, true);

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

    await Promise.allSettled([
      dispatch.updateOutgoingMaxLimit(),
      dispatch.updateIncomingMinLimit(),
      updateBalancesAndFees(context, true),
    ]);
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
    const { commit, getters } = bridgeActionContext(context);

    let minLimit = FPNumber.ZERO;

    if (getters.isSubBridge && getters.asset && getters.isRegisteredAsset) {
      try {
        const value = await subBridgeConnector.soraParachain.adapter.getAssetMinimumAmount(getters.asset.address);
        minLimit = FPNumber.fromCodecValue(value, getters.asset.externalDecimals);
      } catch (error) {
        console.error(error);
      }
    }

    commit.setIncomingMinLimit(minLimit);
  },

  async updateOutgoingMaxLimit(context): Promise<void> {
    const { state, commit } = bridgeActionContext(context);

    const limitAsset = state.assetAddress;

    commit.resetOutgoingMaxLimitSubscription();

    if (!limitAsset) return;

    const hasOutgoingLimit = await api.bridgeProxy.isAssetTransferLimited(limitAsset);

    if (!hasOutgoingLimit) return;

    const referenceAsset = DAI.address;
    const sources = [LiquiditySourceTypes.XYKPool, LiquiditySourceTypes.XSTPool];
    const limitObservable = api.bridgeProxy.getCurrentTransferLimitObservable();
    const quoteObservable = api.swap.getSwapQuoteObservable(referenceAsset, limitAsset, sources, DexId.XOR);

    if (!quoteObservable) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = combineLatest([limitObservable, quoteObservable]).subscribe(([usdLimit, { quote }]) => {
        const outgoingMaxLimit = calculateMaxLimit(limitAsset, referenceAsset, usdLimit, quote);
        commit.setOutgoingMaxLimit(outgoingMaxLimit);
        resolve();
      });
    });

    commit.setOutgoingMaxLimitSubscription(subscription);
  },

  async subscribeOnBlockUpdates(context): Promise<void> {
    const { commit } = bridgeActionContext(context);

    commit.resetBlockUpdatesSubscription();

    const subscription = api.system.updated.subscribe(() => {
      updateExternalBlockNumber(context);
      updateBalancesAndFees(context);
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

  updateInternalHistory(context): void {
    const { commit } = bridgeActionContext(context);
    const bridgeApi = getBridgeApi(context);
    const history = bridgeApi.history;
    commit.setInternalHistory(history as Record<string, IBridgeTransaction>);
  },

  async updateExternalHistory(context, clearHistory = false): Promise<void> {
    const { commit, getters, state } = bridgeActionContext(context);

    if (state.historyLoading) return;

    commit.setHistoryLoading(true);

    if (getters.isEthBridge) {
      await updateEthHistory(context, clearHistory);
    }
    if (getters.isSubBridge) {
      await updateSubHistory(context, clearHistory);
    }
    if (getters.isEvmBridge) {
      console.info('Evm history not implemented');
    }

    commit.setHistoryLoading(false);
  },

  removeHistory(context, { tx, force = false }: { tx: Partial<IBridgeTransaction>; force: boolean }): void {
    const { commit, dispatch, state, rootState } = bridgeActionContext(context);

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
    // update moonpay records if needed
    if (item.payload?.moonpayId) {
      rootState.moonpay.api.accountRecords = {
        ...rootState.moonpay.api.accountRecords,
        [item.payload.moonpayId]: item.externalHash,
      };
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
    const { rootState } = bridgeActionContext(context);
    const etherscanApiKey = rootState.wallet.settings.apiKeys?.etherscan;
    const bridgeHistory = new EthBridgeHistory(etherscanApiKey);

    await bridgeHistory.init(rootState.web3.ethBridgeContractAddress);

    return bridgeHistory;
  },

  async signEthBridgeOutgoingEvm(context, id: string): Promise<SignTxResult> {
    const { rootState, rootGetters } = bridgeActionContext(context);
    const tx = ethBridgeApi.getHistory(id) as Nullable<EthHistory>;

    if (!tx?.hash) throw new Error('TX ID cannot be empty!');
    if (!tx.amount) throw new Error('TX amount cannot be empty!');
    if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');

    const asset = rootGetters.assets.assetDataByAddress(tx.assetAddress);

    if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    const request = await waitForApprovedRequest(tx); // If it causes an error, then -> catch -> SORA_REJECTED
    const evmAccount = rootState.web3.evmAddress;

    if (!ethersUtil.addressesAreEqual(evmAccount, request.to)) {
      throw new Error(`Change account in ethereum wallet to ${request.to}`);
    }

    const signer = await ethersUtil.getSigner();

    const symbol = asset.symbol as KnownEthBridgeAsset;
    const isValOrXor = [KnownEthBridgeAsset.XOR, KnownEthBridgeAsset.VAL].includes(symbol);
    const bridgeAsset: KnownEthBridgeAsset = isValOrXor ? symbol : KnownEthBridgeAsset.Other;
    const contract = SmartContracts[SmartContractType.EthBridge][bridgeAsset];
    const contractAddress = rootGetters.web3.contractAddress(bridgeAsset) as string;
    const contractInstance = new ethers.Contract(contractAddress, contract.abi, signer);
    const method = isValOrXor
      ? 'mintTokensByPeers'
      : request.currencyType === EthCurrencyType.TokenAddress
      ? 'receiveByEthereumAssetAddress'
      : 'receiveBySidechainAssetId';
    const methodArgs: Array<any> = [
      isValOrXor || request.currencyType === EthCurrencyType.TokenAddress
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
    const transaction: ethers.TransactionResponse = await contractInstance[method](...methodArgs);

    const fee = transaction.gasPrice ? ethersUtil.calcEvmFee(transaction.gasPrice, transaction.gasLimit) : undefined;

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
    if (!isEvmAccountConnected) throw new Error('Connect account in ethereum wallet');
    const contractAddress = rootGetters.web3.contractAddress(KnownEthBridgeAsset.Other) as string;
    const isNativeEvmToken = ethersUtil.isNativeEvmTokenAddress(asset.externalAddress);
    // don't check allowance for native EVM token
    if (!isNativeEvmToken) {
      const allowance = await ethersUtil.getAllowance(evmAccount, contractAddress, asset.externalAddress);
      if (FPNumber.isLessThan(new FPNumber(allowance), new FPNumber(tx.amount))) {
        commit.addTxIdInApprove(tx.id);
        const tokenInstance = await ethersUtil.getTokenContract(asset.externalAddress);
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
    const signer = await ethersUtil.getSigner();
    const contractInstance = new ethers.Contract(
      contractAddress,
      SmartContracts[SmartContractType.EthBridge][KnownEthBridgeAsset.Other].abi,
      signer
    );
    const decimals = await ethersUtil.getTokenDecimals(asset.externalAddress);
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
    const transaction: ethers.TransactionResponse = await contractInstance[method](...methodArgs, overrides);
    const fee = transaction.gasPrice ? ethersUtil.calcEvmFee(transaction.gasPrice, transaction.gasLimit) : undefined;
    return {
      hash: transaction.hash,
      fee,
    };
  },
});

export default actions;
