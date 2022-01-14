import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import concat from 'lodash/fp/concat';
import flatten from 'lodash/fp/flatten';
import {
  FPNumber,
  BridgeApprovedRequest,
  BridgeCurrencyType,
  BridgeNetworks,
  BridgeTxStatus,
  BridgeRequest,
  BridgeDirection,
  Operation,
  BridgeHistory,
  TransactionStatus,
  CodecString,
} from '@sora-substrate/util';
import { api } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';

import { bridgeApi, handleBridgeTransaction, STATES } from '@/utils/bridge';
import ethersUtil, { ABI, KnownBridgeAsset, OtherContractType } from '@/utils/ethers-util';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
import { delay, isEthereumAddress } from '@/utils';
import { MaxUint256, ZeroStringValue } from '@/consts';

const SORA_REQUESTS_TIMEOUT = 5 * 1000;

const balanceSubscriptions = new TokenBalanceSubscriptions();

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_SORA_TO_EVM',
    'SET_ASSET_ADDRESS',
    'SET_ASSET_BALANCE',
    'SET_EVM_WAITING_APPROVE_STATE',
    'SET_AMOUNT',
    'SET_HISTORY_ITEM',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['GET_HISTORY', 'GET_RESTORED_FLAG', 'GET_EVM_NETWORK_FEE']);

async function waitForApprovedRequest(hash: string): Promise<BridgeApprovedRequest> {
  const approvedRequest = await bridgeApi.getApprovedRequest(hash);
  if (approvedRequest) {
    return approvedRequest;
  }
  const request = await bridgeApi.getRequest(hash);

  if (request && [BridgeTxStatus.Failed, BridgeTxStatus.Frozen].includes(request.status)) {
    // Set SORA_REJECTED
    throw new Error('Transaction was failed or canceled');
  }

  await delay(SORA_REQUESTS_TIMEOUT);
  return await waitForApprovedRequest(hash);
  // Sora Pending
}

async function waitForEvmTransactionStatus(
  hash: string,
  replaceCallback: (hash: string) => any,
  cancelCallback: (hash: string) => any
) {
  const ethersInstance = await ethersUtil.getEthersInstance();
  try {
    const confirmations = 5;
    const timeout = 0;
    const currentBlock = await ethersInstance.getBlockNumber();
    const blockOffset = currentBlock - 20;
    const { data, from, nonce, to, value } = await ethersInstance.getTransaction(hash);
    await ethersInstance._waitForTransaction(hash, confirmations, timeout, {
      data,
      from,
      nonce,
      to: to ?? '',
      value,
      startBlock: blockOffset,
    });
  } catch (error: any) {
    if (error.code === ethers.errors.TRANSACTION_REPLACED) {
      if (error.reason === 'repriced' || error.reason === 'replaced') {
        replaceCallback(error.replacement.hash);
      } else if (error.reason === 'canceled') {
        cancelCallback(error.replacement.hash);
      }
    }
  }
}

function checkEvmNetwork(rootGetters): void {
  if (!rootGetters['web3/isValidNetworkType']) {
    throw new Error('Change evm network in Metamask');
  }
}

interface EthLogData {
  soraHash: string;
  ethHash: string;
}
const topic = '0x0ce781a18c10c8289803c7c4cfd532d797113c4b41c9701ffad7d0a632ac555b';

async function getEthUserTXs(contracts: Array<string>): Promise<Array<EthLogData>> {
  const ethersInstance = await ethersUtil.getEthersInstance();
  const getLogs = (address: string) =>
    ethersInstance.getLogs({
      topics: [topic],
      fromBlock: 8371261,
      address,
    });
  const logs = flatten(await Promise.all(contracts.map((contract) => getLogs(contract))));
  return logs.map<EthLogData>((log) => ({ ethHash: log.transactionHash, soraHash: log.data }));
}

async function waitForRequest(hash: string): Promise<BridgeRequest> {
  await delay(SORA_REQUESTS_TIMEOUT);
  const request = await bridgeApi.getRequest(hash);
  if (!request) {
    return await waitForRequest(hash);
  }
  switch (request.status) {
    case BridgeTxStatus.Failed:
    case BridgeTxStatus.Frozen:
      throw new Error('Transaction was failed or canceled');
    case BridgeTxStatus.Done:
      return request;
  }
  return await waitForRequest(hash);
}

async function waitForExtrinsicFinalization(id?: string): Promise<BridgeHistory> {
  if (!id) {
    console.error("Can't find history id");
    throw new Error('History id error');
  }
  const tx = bridgeApi.getHistory(id);
  if (
    tx &&
    [TransactionStatus.Error, TransactionStatus.Invalid, TransactionStatus.Usurped].includes(
      tx.status as TransactionStatus
    )
  ) {
    // TODO: maybe it's better to display a message about this errors from tx.errorMessage
    throw new Error(tx.errorMessage);
  }
  if (!tx || tx.status !== TransactionStatus.Finalized) {
    await delay(250);
    return await waitForExtrinsicFinalization(id);
  }
  return tx;
}

function initialState() {
  return {
    isSoraToEvm: true,
    assetAddress: '',
    assetBalance: null,
    amount: '',
    evmNetworkFee: ZeroStringValue,
    evmNetworkFeeFetching: false,
    history: [],
    historyId: '',
    restored: true,
    waitingForApprove: false,
  };
}

const state = initialState();

const getters = {
  asset(state, getters, rootState, rootGetters) {
    const token = rootGetters['assets/getAssetDataByAddress'](state.assetAddress);
    const balance = state.assetBalance;

    return balance ? { ...token, balance } : token;
  },
  isRegisteredAsset(state, getters) {
    return !!getters.asset?.externalAddress;
  },
  amount(state) {
    return state.amount;
  },
  evmNetworkFee(state) {
    return state.evmNetworkFee;
  },
  soraNetworkFee(state, getters, rootState, rootGetters) {
    // In direction EVM -> SORA sora network fee is 0, because related extrinsic calls by system automaically
    return state.isSoraToEvm ? rootGetters.networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
  },
  history(state) {
    return state.history;
  },
  historyItem(state) {
    if (!state.historyId) return null;

    return state.history.find((item) => item.id === state.historyId) ?? null;
  },
  isTxEvmAccount(state, getters, rootState, rootGetters) {
    const historyAddress = getters.historyItem?.to;
    const currentAddress = rootGetters['web3/evmAddress'];

    return !historyAddress || ethersUtil.addressesAreEqual(historyAddress, currentAddress);
  },
};

const mutations = {
  [types.SET_SORA_TO_EVM](state, isSoraToEvm: boolean) {
    state.isSoraToEvm = isSoraToEvm;
  },
  [types.SET_ASSET_ADDRESS](state, address: string) {
    state.assetAddress = address;
  },
  [types.SET_ASSET_BALANCE](state, balance = null) {
    state.assetBalance = balance;
  },
  [types.SET_AMOUNT](state, amount: string) {
    state.amount = amount;
  },
  [types.SET_EVM_WAITING_APPROVE_STATE](state, flag = false) {
    state.waitingForApprove = flag;
  },
  [types.GET_EVM_NETWORK_FEE_REQUEST](state) {
    state.evmNetworkFeeFetching = true;
  },
  [types.GET_EVM_NETWORK_FEE_SUCCESS](state, fee: CodecString) {
    state.evmNetworkFee = fee;
    state.evmNetworkFeeFetching = false;
  },
  [types.GET_EVM_NETWORK_FEE_FAILURE](state) {
    state.evmNetworkFee = ZeroStringValue;
    state.evmNetworkFeeFetching = false;
  },
  [types.GET_HISTORY_REQUEST](state) {
    state.history = null;
  },
  [types.GET_HISTORY_SUCCESS](state, history: Array<BridgeHistory>) {
    state.history = history;
  },
  [types.GET_HISTORY_FAILURE](state) {
    state.history = null;
  },
  [types.GET_RESTORED_FLAG_REQUEST](state) {
    state.restored = false;
  },
  [types.GET_RESTORED_FLAG_SUCCESS](state, restored: boolean) {
    state.restored = restored;
  },
  [types.GET_RESTORED_FLAG_FAILURE](state) {
    state.restored = false;
  },
  [types.SET_HISTORY_ITEM](state, historyId = '') {
    state.historyId = historyId;
  },
};

const actions = {
  setSoraToEvm({ commit }, isSoraToEvm: boolean) {
    commit(types.SET_SORA_TO_EVM, isSoraToEvm);
  },
  setAssetAddress({ commit, dispatch }, address?: string) {
    commit(types.SET_ASSET_ADDRESS, address);
    dispatch('updateBalanceSubscription');
  },
  setAmount({ commit }, amount: string) {
    commit(types.SET_AMOUNT, amount);
  },
  setEvmNetworkFee({ commit }, evmNetworkFee: CodecString) {
    commit(types.GET_EVM_NETWORK_FEE_SUCCESS, evmNetworkFee);
  },
  resetBridgeForm({ dispatch }, withAddress = false) {
    dispatch('resetBalanceSubscription');
    if (!withAddress) {
      dispatch('setAssetAddress', '');
    }
    dispatch('setAmount', '');
    dispatch('setSoraToEvm', true);
  },
  resetBalanceSubscription({ commit }) {
    balanceSubscriptions.remove('asset', { updateBalance: (balance) => commit(types.SET_ASSET_BALANCE, balance) });
  },
  updateBalanceSubscription({ commit, getters, rootGetters }) {
    const updateBalance = (balance) => commit(types.SET_ASSET_BALANCE, balance);

    balanceSubscriptions.remove('asset', { updateBalance });

    if (
      rootGetters.isLoggedIn &&
      getters.asset?.address &&
      !(getters.asset.address in rootGetters.accountAssetsAddressTable)
    ) {
      balanceSubscriptions.add('asset', { updateBalance, token: getters.asset });
    }
  },
  async getHistory({ commit }) {
    commit(types.GET_HISTORY_REQUEST);
    try {
      commit(types.GET_HISTORY_SUCCESS, bridgeApi.accountHistory);
    } catch (error) {
      commit(types.GET_HISTORY_FAILURE);
      throw error;
    }
  },
  async getRestoredFlag({ commit }) {
    commit(types.GET_RESTORED_FLAG_REQUEST);
    try {
      commit(types.GET_RESTORED_FLAG_SUCCESS, api.restored);
    } catch (error) {
      commit(types.GET_RESTORED_FLAG_FAILURE);
      throw error;
    }
  },
  // TODO: Need to restore transactions for all networks
  async getRestoredHistory({ commit, getters, rootGetters }) {
    api.restored = true;
    const hashes = await bridgeApi.getAccountRequests();
    if (!hashes?.length) {
      return;
    }
    const transactions = await bridgeApi.getRequests(hashes);
    if (!transactions?.length) {
      return;
    }
    const contracts = Object.values(KnownBridgeAsset).map<string>((key) => rootGetters['web3/contractAddress'](key));
    const ethLogs = await getEthUserTXs(contracts);
    transactions.forEach((transaction) => {
      const history = getters.history;
      if (!history.length || !history.find((item) => item.hash === transaction.hash)) {
        const direction =
          transaction.direction === BridgeDirection.Outgoing
            ? Operation.EthBridgeOutgoing
            : Operation.EthBridgeIncoming;
        const ethLogData = ethLogs.find((logData) => logData.soraHash === transaction.hash);
        const time = Date.now();
        bridgeApi.generateHistoryItem({
          type: direction,
          from: transaction.from,
          amount: transaction.amount,
          symbol: rootGetters['assets/registeredAssets'].find((item) => item.address === transaction.soraAssetAddress)
            ?.symbol,
          assetAddress: transaction.soraAssetAddress,
          startTime: time,
          endTime: ethLogData ? time : undefined,
          signed: !!ethLogData,
          status: ethLogData ? BridgeTxStatus.Done : BridgeTxStatus.Failed,
          transactionStep: 2,
          hash: transaction.hash,
          ethereumHash: ethLogData ? ethLogData.ethHash : '',
          transactionState: ethLogData ? STATES.EVM_COMMITED : STATES.EVM_REJECTED,
          externalNetwork: BridgeNetworks.ETH_NETWORK_ID,
          to: transaction.to,
        });
      }
    });
  },

  setHistoryItem({ commit }, historyId = '') {
    commit(types.SET_HISTORY_ITEM, historyId);
  },

  removeHistoryById({ commit }, id: string) {
    if (!id.length) return;
    bridgeApi.removeHistory(id);
  },

  clearHistory({ commit }) {
    bridgeApi.clearHistory();
    commit(types.GET_HISTORY_SUCCESS, []);
  },
  /**
   * Fetch EVM Network fee for selected bridge asset
   */
  async getEvmNetworkFee({ commit, getters, state }) {
    if (!getters.asset || !getters.asset.address) {
      return;
    }
    commit(types.GET_EVM_NETWORK_FEE_REQUEST);
    try {
      const fee = await ethersUtil.fetchEvmNetworkFee(getters.asset.address, state.isSoraToEvm);
      commit(types.GET_EVM_NETWORK_FEE_SUCCESS, fee);
    } catch (error) {
      commit(types.GET_EVM_NETWORK_FEE_FAILURE);
    }
  },

  bridgeDataToHistoryItem(
    { getters, rootGetters, state },
    { date = Date.now(), step = 1, payload = {}, ...params } = {}
  ) {
    return {
      type: (params as any).type ?? (state.isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming),
      amount: (params as any).amount ?? getters.amount,
      symbol: (params as any).symbol ?? getters.asset.symbol,
      assetAddress: (params as any).assetAddress ?? getters.asset.address,
      startTime: date,
      endTime: date,
      signed: false,
      status: '',
      transactionStep: step,
      hash: '',
      ethereumHash: '',
      transactionState: STATES.INITIAL,
      soraNetworkFee: (params as any).soraNetworkFee ?? getters.soraNetworkFee,
      ethereumNetworkFee: (params as any).ethereumNetworkFee ?? getters.evmNetworkFee,
      externalNetwork: rootGetters['web3/evmNetwork'],
      to: (params as any).to ?? rootGetters['web3/evmAddress'],
      payload,
    };
  },

  async generateHistoryItem({ dispatch }, playground) {
    const historyData = await dispatch('bridgeDataToHistoryItem', playground);
    const historyItem = bridgeApi.generateHistoryItem(historyData);

    if (!historyItem) {
      throw new Error('[Bridge]: "generateHistoryItem" failed');
    }

    await dispatch('getHistory');

    return historyItem;
  },

  async updateHistoryParams({ dispatch }, params: BridgeHistory) {
    bridgeApi.saveHistory(params);

    await dispatch('getHistory');
  },

  async signSoraTransactionSoraToEvm({ getters, rootGetters }, { txId }) {
    if (!txId) throw new Error('TX ID cannot be empty!');
    if (!getters.asset || !getters.asset.address || !getters.isRegisteredAsset || !getters.amount) {
      return;
    }

    const evmAccount = rootGetters['web3/evmAddress'];

    await bridgeApi.transferToEth(getters.asset, evmAccount, getters.amount, txId);
  },

  async sendSoraTransactionSoraToEvm({ commit }, { txId }) {
    if (!txId) throw new Error('TX ID cannot be empty!');

    const tx = await waitForExtrinsicFinalization(txId);

    if (tx.hash) {
      await waitForApprovedRequest(tx.hash);
    }

    return tx;
  },

  async signEvmTransactionSoraToEvm({ getters, rootGetters, dispatch }, { hash }) {
    if (!hash) throw new Error('TX ID cannot be empty!');
    checkEvmNetwork(rootGetters);
    // TODO: Check the status of TX if it was already sent
    // if (!!getters.ethereumTransactionHash) {
    //   const ethersInstance = await ethersUtil.getEthersInstance()
    //   const currentTx = await web3.eth.getTransaction(hash)
    //   if (currentTx.blockNumber) {
    //     commit(types.SEND_ETH_TRANSACTION_SORA_ETH_SUCCESS)
    //   }
    // }
    if (!getters.asset || !getters.asset.address || !getters.isRegisteredAsset || !getters.amount) {
      return;
    }

    if (getters.transactionToHash) {
      return getters.transactionToHash;
    }

    const request = await waitForApprovedRequest(hash); // If it causes an error, then -> catch -> SORA_REJECTED

    // update history item, if it hasn't 'to' field
    if (!getters.historyItem.to) {
      dispatch('updateHistoryParams', { ...getters.historyItem, to: request.to });
    }

    if (!getters.isTxEvmAccount) {
      throw new Error(`Change account in MetaMask to ${request.to}`);
    }

    const ethersInstance = await ethersUtil.getEthersInstance();

    const symbol = getters.asset.symbol;
    const evmAccount = rootGetters['web3/evmAddress'];
    const isValOrXor = [KnownBridgeAsset.XOR, KnownBridgeAsset.VAL].includes(symbol);
    const isEthereumChain = isValOrXor && rootGetters['web3/evmNetwork'] === BridgeNetworks.ETH_NETWORK_ID;
    const bridgeAsset: KnownBridgeAsset = isEthereumChain ? symbol : KnownBridgeAsset.Other;
    const contractMap = {
      [KnownBridgeAsset.XOR]: rootGetters['web3/contractAbi'](KnownBridgeAsset.XOR),
      [KnownBridgeAsset.VAL]: rootGetters['web3/contractAbi'](KnownBridgeAsset.VAL),
      [KnownBridgeAsset.Other]: rootGetters['web3/contractAbi'](KnownBridgeAsset.Other),
    };
    const contract = contractMap[bridgeAsset];
    const jsonInterface = contract[OtherContractType.Bridge]?.abi ?? contract.abi;
    const contractAddress = rootGetters['web3/contractAddress'](bridgeAsset);
    const contractInstance = new ethers.Contract(contractAddress, jsonInterface, ethersInstance.getSigner());
    const method = isEthereumChain
      ? 'mintTokensByPeers'
      : request.currencyType === BridgeCurrencyType.TokenAddress
      ? 'receiveByEthereumAssetAddress'
      : 'receiveBySidechainAssetId';
    const methodArgs = [
      isEthereumChain || request.currencyType === BridgeCurrencyType.TokenAddress
        ? getters.asset.externalAddress // address tokenAddress OR
        : getters.asset.address, // bytes32 assetId
      new FPNumber(getters.amount, getters.asset.externalDecimals).toCodecString(), // uint256 amount
      evmAccount, // address beneficiary
    ];
    methodArgs.push(
      ...(isEthereumChain
        ? [
            hash, // bytes32 txHash
            request.v, // uint8[] memory v
            request.r, // bytes32[] memory r
            request.s, // bytes32[] memory s
            request.from, // address from
          ]
        : [
            request.from, // address from
            hash, // bytes32 txHash
            request.v, // uint8[] memory v
            request.r, // bytes32[] memory r
            request.s, // bytes32[] memory s
          ])
    );
    checkEvmNetwork(rootGetters);
    const tx: ethers.providers.TransactionResponse = await contractInstance[method](...methodArgs);

    return tx.hash;
  },

  async sendEvmTransactionSoraToEvm({ dispatch }, transaction: BridgeHistory) {
    // TODO: Change args to tx due to new data flow
    if (!transaction.ethereumHash) throw new Error('Hash cannot be empty!');

    await waitForEvmTransactionStatus(
      transaction.ethereumHash,
      (ethereumHash: string) => {
        const tx = { ...transaction, ethereumHash };
        dispatch('updateHistoryParams', tx);
        dispatch('sendEvmTransactionSoraToEvm', tx);
      },
      () => {
        throw new Error('The transaction was canceled by the user');
      }
    );
  },

  async signEvmTransactionEvmToSora({ commit, getters, rootGetters, dispatch }) {
    if (!getters.asset || !getters.asset.address || !getters.isRegisteredAsset || !getters.amount) {
      return;
    }
    checkEvmNetwork(rootGetters);
    // TODO: Check the status of TX if it was already sent
    // if (!!getters.ethereumTransactionHash) {
    //   const ethersInstance = await ethersUtil.getEthersInstance()
    //   const currentTx = await web3.eth.getTransaction(hash)
    //   if (currentTx.blockNumber) {
    //     commit(types.SEND_ETH_TRANSACTION_ETH_SORA_SUCCESS)
    //   }
    // }

    try {
      const contract = rootGetters['web3/contractAbi'](KnownBridgeAsset.Other);
      const evmAccount = rootGetters['web3/evmAddress'];
      const isExternalAccountConnected = await ethersUtil.checkAccountIsConnected(evmAccount);
      if (!isExternalAccountConnected) {
        await dispatch('web3/disconnectExternalAccount', {}, { root: true });
        throw new Error('Connect account in Metamask');
      }
      const ethersInstance = await ethersUtil.getEthersInstance();
      const contractAddress = rootGetters['web3/contractAddress'](KnownBridgeAsset.Other);
      const isNativeEvmToken = isEthereumAddress(getters.asset.externalAddress);

      // don't check allowance for native EVM token
      if (!isNativeEvmToken) {
        const allowance = await dispatch(
          'web3/getAllowanceByEvmAddress',
          { address: getters.asset.externalAddress },
          { root: true }
        );
        if (FPNumber.lte(new FPNumber(allowance), new FPNumber(getters.amount))) {
          commit(types.SET_EVM_WAITING_APPROVE_STATE, true);
          const tokenInstance = new ethers.Contract(
            getters.asset.externalAddress,
            contract[OtherContractType.ERC20].abi,
            ethersInstance.getSigner()
          );
          const methodArgs = [
            contractAddress, // address spender
            MaxUint256, // uint256 amount
          ];
          checkEvmNetwork(rootGetters);
          const tx = await tokenInstance.approve(...methodArgs);
          await tx.wait(2);
          commit(types.SET_EVM_WAITING_APPROVE_STATE, false);
        }
      }

      const soraAccountAddress = rootGetters.account.address;
      const accountId = await ethersUtil.accountAddressToHex(soraAccountAddress);
      const contractInstance = new ethers.Contract(
        contractAddress,
        contract[OtherContractType.Bridge].abi,
        ethersInstance.getSigner()
      );

      const decimals = isNativeEvmToken
        ? undefined
        : await (async () => {
            const tokenInstance = new ethers.Contract(
              getters.asset.externalAddress,
              ABI.balance,
              ethersInstance.getSigner()
            );
            const decimals = await tokenInstance.decimals();

            return +decimals;
          })();

      const amount = new FPNumber(getters.amount, decimals).toCodecString();

      const method = isNativeEvmToken ? 'sendEthToSidechain' : 'sendERC20ToSidechain';
      const methodArgs = isNativeEvmToken
        ? [
            accountId, // bytes32 to
          ]
        : [
            accountId, // bytes32 to
            amount, // uint256 amount
            getters.asset.externalAddress, // address tokenAddress
          ];

      const overrides = isNativeEvmToken ? { value: amount } : {};
      checkEvmNetwork(rootGetters);
      const tx: ethers.providers.TransactionResponse = await contractInstance[method](...methodArgs, overrides);
      return tx.hash;
    } catch (error) {
      commit(types.SET_EVM_WAITING_APPROVE_STATE, false);
      console.error(error);
      throw error;
    }
  },

  async sendEvmTransactionEvmToSora({ dispatch }, transaction: BridgeHistory) {
    console.log(transaction);
    if (!transaction.ethereumHash) throw new Error('Hash cannot be empty!');

    await waitForEvmTransactionStatus(
      transaction.ethereumHash,
      (ethereumHash: string) => {
        const tx = { ...transaction, ethereumHash };
        dispatch('updateHistoryParams', tx);
        dispatch('sendEvmTransactionEvmToSora', tx);
      },
      () => {
        throw new Error('The transaction was canceled by the user');
      }
    );
  },

  async signSoraTransactionEvmToSora(_, transaction: BridgeHistory) {
    if (!transaction.ethereumHash) throw new Error('Hash cannot be empty!');

    try {
      // TODO: check it for other types of bridge
      // const transferType = isXorAccountAsset(getters.asset) ? RequestType.TransferXOR : RequestType.Transfer
      // await bridgeApi.requestFromEth(ethereumHash, transferType)
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  async sendSoraTransactionEvmToSora(_, transaction: BridgeHistory) {
    if (!transaction.ethereumHash) throw new Error('Hash cannot be empty!');

    await waitForRequest(transaction.ethereumHash);
  },

  async handleEthereumTransaction(context) {
    await handleBridgeTransaction(context);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
