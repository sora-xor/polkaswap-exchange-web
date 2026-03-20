import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber } from '@sora-substrate/sdk';
import { getAssetBalance } from '@sora-substrate/sdk/build/assets';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { DexId } from '@sora-substrate/sdk/build/dex/consts';
import { api, WALLET_CONSTS } from '@wallet';
import { defineActions } from '@/store/module-helpers';
import { ethers } from 'ethers';
import { combineLatest } from 'rxjs';

import { MaxUint256, ZeroStringValue } from '@/consts';
import { KnownEthBridgeAsset } from '@/consts/evm';
import { SUB_TRANSFER_FEES } from '@/consts/sub';
import { getDataPlaneClient, normalizeRealtimeProfile, parseSubstrateHeaderNumber } from '@/services/realtime';
import { bridgeActionContext } from '@/store/bridge';
import { resolveAssetLookup, resolveRegisteredAssets } from '@/store/bridge/utils';
import { FocusedField } from '@/store/bridge/types';
import { isDenominatedAsset, waitForEvmTransactionMined } from '@/utils/bridge/common/utils';
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
import type { Subscription } from 'rxjs';
import type { ActionContext } from 'vuex';
import type { RealtimeProfile } from '@/services/realtime';

const Direction =
  BridgeTxDirection ??
  ({
    Outgoing: 'Outgoing',
    Incoming: 'Incoming',
  } as Record<'Outgoing' | 'Incoming', string>);

const PROFILE_RECONCILE_INTERVAL_MS: Record<RealtimeProfile, { visible: number; hidden: number }> = {
  balanced: { visible: 1000, hidden: 5000 },
  ultra: { visible: 250, hidden: 1000 },
  load_first: { visible: 2000, hidden: 7000 },
};

const dataPlaneClient = getDataPlaneClient();

type BridgeRealtimeRuntimeState = {
  reconcileTimer: ReturnType<typeof setTimeout> | null;
  reconcileInFlight: boolean;
  reconcileLastRunTs: number;
  reconcilePending: boolean;
  workerLifecycle: Promise<void>;
};

const bridgeRealtimeState = new WeakMap<object, BridgeRealtimeRuntimeState>();

function getBridgeRealtimeState(context: ActionContext<any, any>): BridgeRealtimeRuntimeState {
  const key = bridgeActionContext(context).state as object;
  const existing = bridgeRealtimeState.get(key);
  if (existing) return existing;

  const created: BridgeRealtimeRuntimeState = {
    reconcileTimer: null,
    reconcileInFlight: false,
    reconcileLastRunTs: 0,
    reconcilePending: false,
    workerLifecycle: Promise.resolve(),
  };

  bridgeRealtimeState.set(key, created);
  return created;
}

function enqueueWorkerLifecycle(context: ActionContext<any, any>, task: () => Promise<void>): Promise<void> {
  const state = getBridgeRealtimeState(context);
  state.workerLifecycle = state.workerLifecycle.then(task, task).catch(() => undefined);
  return state.workerLifecycle;
}

async function flushWorkerLifecycle(context: ActionContext<any, any>): Promise<void> {
  await getBridgeRealtimeState(context).workerLifecycle;
}

function resolveConnectionCap(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (value === true) {
    return 4;
  }

  return Number.MAX_SAFE_INTEGER;
}

function resolveRealtimeProfile(context: ActionContext<any, any>): RealtimeProfile {
  const { rootState } = bridgeActionContext(context);
  const profile = rootState.settings?.featureFlags?.wsProfile;

  return normalizeRealtimeProfile(profile) as RealtimeProfile;
}

function resolveReconcileInterval(context: ActionContext<any, any>): number {
  const profile = resolveRealtimeProfile(context);
  const visible = typeof document === 'undefined' ? true : document.visibilityState === 'visible';
  const schedule = PROFILE_RECONCILE_INTERVAL_MS[profile];

  return visible ? schedule.visible : schedule.hidden;
}

function clearReconcileTimer(context: ActionContext<any, any>): void {
  const state = getBridgeRealtimeState(context);
  if (state.reconcileTimer) {
    clearTimeout(state.reconcileTimer);
  }
  state.reconcileTimer = null;
  state.reconcilePending = false;
}

async function runScheduledReconcile(context: ActionContext<any, any>): Promise<void> {
  const state = getBridgeRealtimeState(context);

  if (state.reconcileInFlight) {
    state.reconcilePending = true;
    return;
  }

  state.reconcileInFlight = true;
  state.reconcilePending = false;
  state.reconcileLastRunTs = Date.now();
  try {
    await updateBalancesFeesAndAmounts(context);
  } finally {
    state.reconcileInFlight = false;
    if (state.reconcilePending) {
      state.reconcilePending = false;
      scheduleReconcile(context);
    }
  }
}

function scheduleReconcile(context: ActionContext<any, any>): void {
  const state = getBridgeRealtimeState(context);

  if (state.reconcileInFlight) {
    state.reconcilePending = true;
    return;
  }

  if (state.reconcileTimer) {
    return;
  }

  const interval = resolveReconcileInterval(context);
  const now = Date.now();
  const delay = Math.max(0, interval - (now - state.reconcileLastRunTs));

  state.reconcileTimer = setTimeout(() => {
    state.reconcileTimer = null;
    void runScheduledReconcile(context);
  }, delay);
}

function resolveBridgeSubscriptionEndpoint(context: ActionContext<any, any>): string | null {
  const { getters, state, rootState } = bridgeActionContext(context);

  if (getters.isSubBridge) {
    return (
      state.subBridgeConnector.network?.subNetworkConnection.connection.endpoint ??
      state.subBridgeConnector.network?.subNetworkConnection.node?.address ??
      null
    );
  }

  return (
    rootState.settings?.appConnection?.connection?.endpoint ?? rootState.settings?.appConnection?.node?.address ?? null
  );
}

function shouldUseWorkerDataPlane(context: ActionContext<any, any>): boolean {
  const { rootState } = bridgeActionContext(context);
  return Boolean(rootState.settings?.featureFlags?.wsWorkerDataPlane);
}

const getSoraBalance = async (accountAddress: string, asset: RegisteredAccountAsset): Promise<CodecString> => {
  const accountBalance = await getAssetBalance(api.api, accountAddress, asset.address, asset.decimals);
  return accountBalance.transferable;
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
  const { isValidNetwork, contractAddress } = rootGetters.web3;
  const evmAccount = rootState.web3.evmAddress;
  const soraAccount = rootState.wallet.account.address;

  let fee = ZeroStringValue;

  if (asset && isRegisteredAsset && isValidNetwork && evmAccount && soraAccount) {
    const registeredAssets = resolveRegisteredAssets(rootState.assets);
    const bridgeRegisteredAsset = registeredAssets[asset.address];
    const decimals = state.isSoraToEvm ? asset.decimals : asset.externalDecimals;
    // using max balance to not overflow contract calculation
    const maxAmount = FPNumber.fromCodecValue(state.assetSenderBalance ?? 0, decimals);
    const amount = new FPNumber(state.amountSend ?? 0, decimals);
    const value = maxAmount.min(amount).toString();

    fee = await getEthNetworkFee(
      asset,
      bridgeRegisteredAsset.kind,
      contractAddress,
      value,
      state.isSoraToEvm,
      soraAccount,
      evmAccount
    );
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

  let senderBalance = ZeroStringValue;
  let recipientBalance = ZeroStringValue;
  // Batch ERC20 balances if token is non-native
  const tokenAddr = asset?.externalAddress;
  if (tokenAddr && !ethersUtil.isNativeEvmTokenAddress(tokenAddr)) {
    try {
      const res = await (ethersUtil as any).getErc20BalancesBatch([
        { token: tokenAddr, account: sender },
        { token: tokenAddr, account: recipient },
      ]);
      senderBalance = res[0]?.balance ?? ZeroStringValue;
      recipientBalance = res[1]?.balance ?? ZeroStringValue;
    } catch {
      // Fallback sequentially
      senderBalance = await getAccountBridgeBalance(sender, asset, isSoraToEvm, false, subConnector);
      recipientBalance = await getAccountBridgeBalance(recipient, asset, !isSoraToEvm, false, subConnector);
    }
  } else {
    // Native token or missing address
    senderBalance = await getAccountBridgeBalance(sender, asset, isSoraToEvm, false, subConnector);
    recipientBalance = await getAccountBridgeBalance(recipient, asset, !isSoraToEvm, false, subConnector);
  }
  const nativeBalance = await getAccountBridgeBalance(spender, nativeToken, false, false, subConnector);

  commit.setBalancesBatch({ sender: senderBalance, recipient: recipientBalance, native: nativeBalance });
}

async function updateSubBalances(context: ActionContext<any, any>): Promise<void> {
  const { commit, getters, state } = bridgeActionContext(context);
  const { sender, recipient, asset, nativeToken } = getters;
  const { isSoraToEvm, subBridgeConnector: subConnector } = state;
  const spender = sender;

  try {
    const res = await subConnector.network.getTokenBalancesBatch([
      { accountAddress: sender, asset },
      { accountAddress: recipient, asset },
      { accountAddress: spender, asset: nativeToken },
    ]);
    commit.setBalancesBatch({ sender: res[0], recipient: res[1], native: res[2] });
  } catch {
    const [senderBalance, recipientBalance, nativeBalance] = await Promise.all([
      getAccountBridgeBalance(sender, asset, isSoraToEvm, true, subConnector),
      getAccountBridgeBalance(recipient, asset, !isSoraToEvm, true, subConnector),
      getAccountBridgeBalance(spender, nativeToken, false, true, subConnector),
    ]);
    commit.setBalancesBatch({ sender: senderBalance, recipient: recipientBalance, native: nativeBalance });
  }
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
  const { address, decimals, externalAddress, externalDecimals } = asset ?? {};
  const { networkSelected } = rootState.web3;
  const { isValidNetwork, contractAddress } = rootGetters.web3;
  const bridgeContractAddress = contractAddress(KnownEthBridgeAsset.Other);

  const hasNetworkData = !!networkSelected && isValidNetwork && !!bridgeContractAddress;
  const hasAssetData = !!address && !!externalAddress && isRegisteredAsset;

  if (hasNetworkData && hasAssetData && isSidechainAsset) {
    const [lockedValue, bridgeValue] = await Promise.all([
      ethBridgeApi.getLockedAssets(networkSelected as number, address),
      ethersUtil.getAccountAssetBalance(bridgeContractAddress, externalAddress),
    ]);
    const balance = FPNumber.min(
      FPNumber.fromCodecValue(lockedValue, decimals),
      FPNumber.fromCodecValue(bridgeValue, externalDecimals)
    );
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
    const direction = state.isSoraToEvm ? Direction.Outgoing : Direction.Incoming;
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

function calculateMaxLimit(
  limitAsset: string,
  referenceAsset: string,
  usdLimit: CodecString,
  quote: SwapQuote
): FPNumber | null {
  const outgoingLimitUSD = FPNumber.fromCodecValue(usdLimit);

  if (outgoingLimitUSD.isZero() || limitAsset === referenceAsset) return outgoingLimitUSD;

  try {
    const quoteAmount = FPNumber.ONE;

    const {
      result: { amount },
    } = quote(limitAsset, referenceAsset, quoteAmount.toString(), false, [], false);
    // result amount multiplied by a multiplier to get asset price

    const assetPriceUSD = FPNumber.fromCodecValue(amount);

    // zero price means liquidity problem - disable limit
    if (!assetPriceUSD.isFinity() || assetPriceUSD.isZero()) return null;

    return outgoingLimitUSD.div(assetPriceUSD);
  } catch (error) {
    console.error(error);
    // disable limit on calculation error
    return null;
  }
}

let lastEvmBlockPollTs = 0;
async function updateExternalBlockNumber(
  context: ActionContext<any, any>,
  knownSubBlockNumber?: number
): Promise<void> {
  const { getters, commit, state } = bridgeActionContext(context);
  try {
    if (getters.isSubBridge) {
      if (Number.isFinite(knownSubBlockNumber)) {
        commit.setExternalBlockNumber(knownSubBlockNumber as number);
        return;
      }

      const subNetwork = state.subBridgeConnector?.network;
      if (!subNetwork?.getBlockNumber) {
        commit.setExternalBlockNumber(0);
        return;
      }

      const blockNumber = await subNetwork.getBlockNumber();
      commit.setExternalBlockNumber(blockNumber);
      return;
    }
    // Throttle EVM block number polling to reduce RPC load
    const now = Date.now();
    if (now - lastEvmBlockPollTs < 3000) return;
    lastEvmBlockPollTs = now;
    const blockNumber = await ethersUtil.getBlockNumber();
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
      fee = networkFees[operation];
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
    updateFeesAndLockedFunds(context),
  ]);
}

const actions = defineActions({
  setSendedAmount(context, value?: string) {
    const { commit, state, getters, rootState } = bridgeActionContext(context);

    commit.setFocusedField(FocusedField.Sended);
    commit.setAmountSend(value);

    if (value) {
      const sended = new FPNumber(value);
      const fee = FPNumber.fromCodecValue(state.externalTransferFee, getters.asset?.externalDecimals);
      const expected = sended.sub(fee);
      let received = FPNumber.isGreaterThan(expected, FPNumber.ZERO) ? expected : FPNumber.ZERO;

      if (getters.isEthBridge && isDenominatedAsset(state.assetAddress)) {
        const denominator = rootState.web3.denominator;
        if (state.isSoraToEvm) {
          received = received.mul(denominator);
        } else {
          received = received.div(denominator);
        }
      }

      commit.setAmountReceived(received.toString());
    } else {
      commit.setAmountReceived();
    }
  },

  setReceivedAmount(context, value?: string) {
    const { commit, state, getters, rootState } = bridgeActionContext(context);

    commit.setFocusedField(FocusedField.Received);
    commit.setAmountReceived(value);

    if (value) {
      const received = new FPNumber(value);
      const fee = FPNumber.fromCodecValue(state.externalTransferFee, getters.asset?.externalDecimals);
      const expected = received.add(fee);
      let sended = FPNumber.isGreaterThan(expected, FPNumber.ZERO) ? expected : FPNumber.ZERO;

      if (getters.isEthBridge && isDenominatedAsset(state.assetAddress)) {
        const denominator = rootState.web3.denominator;
        if (state.isSoraToEvm) {
          sended = sended.div(denominator);
        } else {
          sended = sended.mul(denominator);
        }
      }

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
      dispatch.updateOutgoingMaxLimit(),
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

    let minLimit = FPNumber.ZERO;

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

  async updateOutgoingMaxLimit(context): Promise<void> {
    const { state, commit } = bridgeActionContext(context);

    const limitAsset = state.assetAddress;

    commit.resetOutgoingMaxLimitSubscription();

    if (!limitAsset) return;

    const hasOutgoingLimit = await api.bridgeProxy.isAssetTransferLimited(limitAsset);

    if (!hasOutgoingLimit) return;

    const referenceAsset = DAI.address;
    const sources = [LiquiditySourceTypes.XYKPool, LiquiditySourceTypes.XSTPool, LiquiditySourceTypes.OrderBook];
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
    const { commit, rootState } = bridgeActionContext(context);
    const runtime = getBridgeRealtimeState(context);

    commit.resetBlockUpdatesSubscription();
    clearReconcileTimer(context);
    runtime.reconcileInFlight = false;
    runtime.reconcilePending = false;
    await flushWorkerLifecycle(context);

    if (shouldUseWorkerDataPlane(context)) {
      const endpoint = resolveBridgeSubscriptionEndpoint(context);
      if (endpoint) {
        try {
          await dataPlaneClient.start({
            preferSharedWorker: Boolean(rootState.settings?.featureFlags?.wsSharedWorker),
            profile: resolveRealtimeProfile(context),
            maxConnections: resolveConnectionCap(rootState.settings?.featureFlags?.wsConnectionCaps),
          });

          const connectionId = `bridge-substrate:${endpoint}`;
          const subscriptionKey = `bridge:block-updates:${connectionId}`;
          const unsubscribe = await dataPlaneClient.subscribeSubstrateFinalizedHeads(
            {
              connectionId,
              endpoint,
              subscriptionKey,
              priority: 'standard',
            },
            (payload) => {
              void updateExternalBlockNumber(context, parseSubstrateHeaderNumber(payload) ?? undefined);
              scheduleReconcile(context);
            }
          );

          const subscription = {
            unsubscribe: () => {
              clearReconcileTimer(context);
              void enqueueWorkerLifecycle(context, async () => {
                try {
                  await unsubscribe();
                } finally {
                  await dataPlaneClient.disconnect(connectionId).catch(() => undefined);
                }
              });
            },
          } as unknown as Subscription;

          commit.setBlockUpdatesSubscription(subscription);
          return;
        } catch (error) {
          console.warn('[bridge] worker data-plane block subscription fallback', error);
        }
      }
    }

    const baseSubscription = api.system.updated.subscribe(() => {
      void updateExternalBlockNumber(context);
      scheduleReconcile(context);
    });

    const subscription = {
      unsubscribe: () => {
        clearReconcileTimer(context);
        baseSubscription.unsubscribe();
      },
    } as unknown as Subscription;

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

    const assetLookup = resolveAssetLookup(rootGetters);
    const asset = assetLookup(tx.assetAddress);

    if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    const request = await waitForApprovedRequest(tx);

    if (!ethersUtil.addressesAreEqual(rootState.web3.evmAddress, request.to)) {
      throw new Error(`Change account in ethereum wallet to ${request.to}`);
    }

    checkEvmNetwork(context);

    const amount = isDenominatedAsset(asset.address) ? tx.amount2 || tx.amount : tx.amount;

    const { contract, method, args } = await getOutgoingEvmTransactionData({
      asset,
      value: amount,
      recipient: tx.to,
      getContractAddress: rootGetters.web3.contractAddress,
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

    const assetLookup = resolveAssetLookup(rootGetters);
    const asset = assetLookup(tx.assetAddress);

    if (!asset?.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

    const evmAccount = rootState.web3.evmAddress;
    const isEvmAccountConnected = await ethersUtil.checkAccountIsConnected(evmAccount);

    if (!isEvmAccountConnected) throw new Error('Connect account in ethereum wallet');

    const contractAddress = rootGetters.web3.contractAddress(KnownEthBridgeAsset.Other) as string;

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
      getContractAddress: rootGetters.web3.contractAddress,
    });

    checkEvmNetwork(context);

    const transaction: ethers.TransactionResponse = await contract[method](...args);

    return transaction;
  },
});

export default actions;
