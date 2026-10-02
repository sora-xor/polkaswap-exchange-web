import { Operation, FPNumber } from '@sora-substrate/sdk';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EthCurrencyType, EthAssetKind } from '@sora-substrate/sdk/build/bridgeProxy/eth/consts';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

import { SmartContractType, KnownEthBridgeAsset, SmartContracts } from '@/consts/evm';
import { asZeroValue } from '@/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import ethersUtil from '@/utils/ethers-util';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory, EthApprovedRequest } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { Subscription } from 'rxjs';

type EthTxParams = {
  asset: RegisteredAccountAsset;
  value: string;
  recipient: string;
  getContractAddress: (symbol: KnownEthBridgeAsset) => Nullable<string>;
  request?: EthApprovedRequest;
};

/**
 * Guards approved-request data before constructing wallet calldata.
 */
const assertOutgoingRequest = (request: EthApprovedRequest): void => {
  const currencyTypes = Object.values(EthCurrencyType);

  if (!currencyTypes.includes(request.currencyType)) {
    throw new Error(`[Bridge]: Unsupported Ethereum bridge currency type "${request.currencyType}"`);
  }

  if (!(request.from && request.hash && request.to && request.currencyId)) {
    throw new Error('[Bridge]: Approved Ethereum bridge request is missing required fields');
  }

  if (!/^[1-9]\d*$/.test(request.amount) || BigInt(request.amount) >= 1n << 256n) {
    throw new Error('[Bridge]: Approved Ethereum bridge request has an invalid amount');
  }

  const signatureLength = request.v?.length;

  if (!signatureLength || request.r?.length !== signatureLength || request.s?.length !== signatureLength) {
    throw new Error('[Bridge]: Approved Ethereum bridge request has malformed signatures');
  }
};

export const isOutgoingTx = (tx: EthHistory): boolean => {
  return tx.type === Operation.EthBridgeOutgoing;
};

export const isUnsignedFromPart = (tx: EthHistory): boolean => {
  if (isOutgoingTx(tx)) {
    return !tx.blockId && !tx.txId;
  } else {
    return !tx.externalHash;
  }
};

export const isUnsignedToPart = (tx: EthHistory): boolean => {
  if (tx.type === Operation.EthBridgeOutgoing) {
    return !tx.externalHash;
  } else if (tx.type === Operation.EthBridgeIncoming) {
    return false;
  } else {
    return true;
  }
};

export const isUnsignedTx = (tx: EthHistory): boolean => {
  return isUnsignedFromPart(tx);
};

export const isWaitingForAction = (tx: EthHistory): boolean => {
  return tx.transactionState === ETH_BRIDGE_STATES.EVM_REJECTED && isUnsignedToPart(tx);
};

/**
 * Finds the authoritative persisted Ethereum bridge row by its local id or any
 * chain identifier that may become the canonical route id during recovery.
 */
export const findTransaction = (id: string): EthHistory | null => {
  const history = (ethBridgeApi.history ?? {}) as Record<string, EthHistory>;
  const keyedTransaction = (ethBridgeApi.getHistory(id) as EthHistory | null) ?? history[id];

  if (keyedTransaction) return keyedTransaction;

  return (
    Object.values(history).find((item) => {
      return item?.id === id || item?.hash === id || item?.txId === id || item?.externalHash === id;
    }) ?? null
  );
};

/**
 * Loads persisted bridge state before falling back to a UI cache snapshot.
 * SDK submission callbacks write tx/block/request identifiers directly to
 * persisted history, while the Pinia snapshot can lag behind those callbacks.
 */
export const getTransaction = (id: string, cachedTransaction?: EthHistory | null): EthHistory => {
  const tx = findTransaction(id) ?? cachedTransaction;

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
};

export const updateTransaction = async (id: string, params = {}) => {
  const tx = getTransaction(id);
  ethBridgeApi.saveHistory({ ...tx, ...params });
};

const failedRequestStatuses = [BridgeTxStatus.Failed, BridgeTxStatus.Frozen, BridgeTxStatus.Broken];
const REQUEST_READY_POLL_INTERVAL_MS = 2_000;
const INCOMING_REQUEST_MAX_POLL_INTERVAL_MS = 30_000;

const assertRequestStatusIsNotFailed = (status: unknown): void => {
  if (failedRequestStatuses.includes(status as BridgeTxStatus)) {
    throw new Error('[Bridge]: Transaction was failed or canceled');
  }
};

const getApprovedRequestIfAvailable = async (hash: string): Promise<EthApprovedRequest | null> => {
  try {
    return (await ethBridgeApi.getApprovedRequest(hash)) ?? null;
  } catch {
    return null;
  }
};

const getRequestStatusIfAvailable = async (hash: string): Promise<BridgeTxStatus | null> => {
  try {
    return await ethBridgeApi.getRequestStatus(hash);
  } catch {
    return null;
  }
};

const checkApprovedRequest = async (hash: string): Promise<EthApprovedRequest | null> => {
  const request = await getApprovedRequestIfAvailable(hash);

  if (request) {
    return request;
  }

  const status = await getRequestStatusIfAvailable(hash);

  assertRequestStatusIsNotFailed(status);

  return null;
};

type IncomingSoraTransaction = { hash: string; blockId: string };

const createBridgeTrackingAbortError = (): Error => {
  const error = new Error('Bridge transaction tracking canceled');
  error.name = 'AbortError';
  return error;
};

const throwIfBridgeTrackingAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw createBridgeTrackingAbortError();
};

/** Returns false for the zero-value H256 emitted by missing ValueQuery storage. */
const isAvailableBridgeHash = (hash: unknown): hash is string => {
  return typeof hash === 'string' && !!hash && !/^0x0*$/i.test(hash);
};

/**
 * Resolves an Ethereum load request to its finalized SORA request and block.
 * Missing mapping/status data is a transient indexing or RPC state, not a
 * failed transfer, so callers can safely poll this read-only lookup.
 */
const getIncomingSoraTransactionIfAvailable = async (externalHash: string): Promise<IncomingSoraTransaction | null> => {
  const loadStatus = await getRequestStatusIfAvailable(externalHash);
  assertRequestStatusIsNotFailed(loadStatus);

  let soraHash: string;

  try {
    soraHash = await ethBridgeApi.getSoraHashByEthereumHash(externalHash);
  } catch {
    return null;
  }

  if (!isAvailableBridgeHash(soraHash)) return null;

  const incomingStatus = await getRequestStatusIfAvailable(soraHash);
  assertRequestStatusIsNotFailed(incomingStatus);

  if (incomingStatus !== BridgeTxStatus.Done) return null;

  try {
    // Submission height belongs to the original load request (the Ethereum
    // hash); `soraHash` identifies the finalized incoming request itself.
    const blockId = await ethBridgeApi.getSoraBlockHashByRequestHash(externalHash);

    return isAvailableBridgeHash(blockId) ? { hash: soraHash, blockId } : null;
  } catch {
    return null;
  }
};

/** Waits until bridge peers have approved an outgoing SORA-to-EVM request. */
const waitForApprovedRequestData = async (hash: string, signal?: AbortSignal): Promise<EthApprovedRequest> => {
  throwIfBridgeTrackingAborted(signal);
  let subscription: Subscription | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;

  try {
    return await new Promise<EthApprovedRequest>((resolve, reject) => {
      let settled = false;
      let checking = false;
      let rerunRequested = false;

      const settle = (callback: () => void): void => {
        if (settled) return;
        settled = true;
        callback();
      };
      const schedulePoll = (delayMs: number): void => {
        if (settled) return;
        if (pollTimer) clearTimeout(pollTimer);
        pollTimer = setTimeout(() => {
          pollTimer = undefined;
          void pollApproval();
        }, delayMs);
      };
      const handleStatus = (status: BridgeTxStatus | null): void => {
        try {
          assertRequestStatusIsNotFailed(status);
        } catch (error) {
          settle(() => reject(error));
          return;
        }

        if (status === BridgeTxStatus.Ready) {
          void pollApproval();
        }
      };
      const pollApproval = async (): Promise<void> => {
        if (settled) return;
        if (signal?.aborted) {
          settle(() => reject(createBridgeTrackingAbortError()));
          return;
        }
        if (checking) {
          rerunRequested = true;
          return;
        }

        checking = true;
        try {
          const request = await checkApprovedRequest(hash);
          throwIfBridgeTrackingAborted(signal);

          if (request) {
            settle(() => resolve(request));
          }
        } catch (error) {
          settle(() => reject(error));
        } finally {
          checking = false;

          if (!settled) {
            if (rerunRequested) {
              rerunRequested = false;
              schedulePoll(0);
            } else {
              schedulePoll(REQUEST_READY_POLL_INTERVAL_MS);
            }
          }
        }
      };

      abortHandler = () => settle(() => reject(createBridgeTrackingAbortError()));
      signal?.addEventListener('abort', abortHandler, { once: true });

      if (signal?.aborted) {
        abortHandler();
        return;
      }

      try {
        subscription = ethBridgeApi.subscribeOnRequestStatus(hash).subscribe({
          next: handleStatus,
          // Polling remains authoritative while the websocket reconnects.
          error: () => void pollApproval(),
        });
      } catch {
        // Direct storage polling also supports providers without subscriptions.
      }

      void pollApproval();
    });
  } finally {
    if (pollTimer) clearTimeout(pollTimer);
    if (abortHandler) signal?.removeEventListener('abort', abortHandler);
    subscription?.unsubscribe();
  }
};

export const waitForApprovedRequest = async (tx: EthHistory, signal?: AbortSignal): Promise<EthApprovedRequest> => {
  const hash = tx.hash;

  if (!hash) throw new Error(`[Bridge]: Tx hash cannot be empty`);
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  const request = await waitForApprovedRequestData(hash, signal);

  if (!request) throw new Error(`[Bridge]: getApprovedRequest is empty, hash="${hash}"`);

  return request;
};

export const waitForIncomingRequest = async (
  tx: EthHistory,
  signal?: AbortSignal
): Promise<{ hash: string; blockId: string }> => {
  if (!tx.externalHash) throw new Error('[Bridge]: externalHash cannot be empty!');
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  const externalHash = tx.externalHash;
  throwIfBridgeTrackingAborted(signal);

  let subscription: Subscription | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;

  try {
    return await new Promise<IncomingSoraTransaction>((resolve, reject) => {
      let settled = false;
      let checking = false;
      let rerunRequested = false;
      let nextPollDelay = REQUEST_READY_POLL_INTERVAL_MS;

      const settle = (callback: () => void): void => {
        if (settled) return;
        settled = true;
        callback();
      };
      const schedulePoll = (delayMs: number): void => {
        if (settled) return;
        if (pollTimer) clearTimeout(pollTimer);
        pollTimer = setTimeout(() => {
          pollTimer = undefined;
          void pollIncomingRequest();
        }, delayMs);
      };
      const pollIncomingRequest = async (): Promise<void> => {
        if (settled) return;
        if (signal?.aborted) {
          settle(() => reject(createBridgeTrackingAbortError()));
          return;
        }
        if (checking) {
          rerunRequested = true;
          return;
        }

        checking = true;
        try {
          const transaction = await getIncomingSoraTransactionIfAvailable(externalHash);

          if (transaction) {
            settle(() => resolve(transaction));
          }
        } catch (error) {
          settle(() => reject(error));
        } finally {
          checking = false;

          if (!settled) {
            if (rerunRequested) {
              rerunRequested = false;
              schedulePoll(0);
            } else {
              schedulePoll(nextPollDelay);
              nextPollDelay = Math.min(nextPollDelay * 2, INCOMING_REQUEST_MAX_POLL_INTERVAL_MS);
            }
          }
        }
      };
      const handleStatus = (status: BridgeTxStatus | null): void => {
        try {
          assertRequestStatusIsNotFailed(status);
        } catch (error) {
          settle(() => reject(error));
          return;
        }

        nextPollDelay = REQUEST_READY_POLL_INTERVAL_MS;
        void pollIncomingRequest();
      };

      abortHandler = () => settle(() => reject(createBridgeTrackingAbortError()));
      signal?.addEventListener('abort', abortHandler, { once: true });

      try {
        subscription = ethBridgeApi.subscribeOnRequestStatus(externalHash).subscribe({
          next: handleStatus,
          // A websocket subscription failure is transient; serialized direct
          // storage polling remains authoritative.
          error: () => void pollIncomingRequest(),
        });
      } catch {
        // Polling also covers providers that cannot subscribe during reconnects.
      }

      void pollIncomingRequest();
    });
  } finally {
    if (pollTimer) clearTimeout(pollTimer);
    if (abortHandler) signal?.removeEventListener('abort', abortHandler);
    subscription?.unsubscribe();
  }
};

export async function getIncomingEvmTransactionData({ asset, value, recipient, getContractAddress }: EthTxParams) {
  const isNativeEvmToken = ethersUtil.isNativeEvmTokenAddress(asset.externalAddress);
  const accountId = ethersUtil.accountAddressToHex(recipient);
  const amount = new FPNumber(value, asset.externalDecimals).toCodecString();

  const contractAddress = getContractAddress(KnownEthBridgeAsset.Other) as string;
  const contractAbi = SmartContracts[SmartContractType.EthBridge][KnownEthBridgeAsset.Other];
  const contract = await ethersUtil.getContract(contractAddress, contractAbi);

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
  const args = [...methodArgs, overrides];

  return {
    contract,
    method,
    args,
  };
}

/**
 * Constructs a claim from the peer-signed payload. The caller must reconcile
 * its displayed destination value from this proof before requesting a signature;
 * stale denomination estimates must never replace the signed codec amount.
 */
export async function getOutgoingEvmTransactionData({
  asset,
  value,
  recipient,
  getContractAddress,
  request,
}: EthTxParams) {
  if (!request) throw new Error('request is required!');
  assertOutgoingRequest(request);

  const symbol = asset.symbol as KnownEthBridgeAsset;
  const isValOrXor = [KnownEthBridgeAsset.XOR, KnownEthBridgeAsset.VAL].includes(symbol);
  const isEthereumCurrency = request.currencyType === EthCurrencyType.TokenAddress;
  const useLegacyPeerMinting = isValOrXor && isEthereumCurrency;
  const bridgeAsset: KnownEthBridgeAsset = useLegacyPeerMinting ? symbol : KnownEthBridgeAsset.Other;
  const bridgeContractMethod = isEthereumCurrency ? 'receiveByEthereumAssetAddress' : 'receiveBySidechainAssetId';
  const method = useLegacyPeerMinting ? 'mintTokensByPeers' : bridgeContractMethod;
  const expectedCurrencyId = isEthereumCurrency ? asset.externalAddress : asset.address;

  if (!expectedCurrencyId) {
    throw new Error('[Bridge]: Asset is missing required Ethereum bridge address data');
  }

  if (request.currencyId.toLowerCase() !== expectedCurrencyId.toLowerCase()) {
    throw new Error('[Bridge]: Approved Ethereum bridge currency does not match the selected asset');
  }

  if (request.to.toLowerCase() !== recipient.toLowerCase()) {
    throw new Error('[Bridge]: Approved Ethereum bridge recipient does not match the transaction');
  }

  const expectedAmount = new FPNumber(value, asset.externalDecimals);
  const fractionBeyondPrecision = value.split('.')[1]?.slice(asset.externalDecimals ?? FPNumber.DEFAULT_PRECISION);
  if (
    !/^\d+(?:\.\d+)?$/.test(value) ||
    /[1-9]/.test(fractionBeyondPrecision ?? '') ||
    !expectedAmount.isFinity() ||
    expectedAmount.toCodecString() !== request.amount
  ) {
    throw new Error('[Bridge]: Approved Ethereum bridge amount does not match the displayed destination amount');
  }

  const contractAddress = getContractAddress(bridgeAsset);
  if (!contractAddress) throw new Error('[Bridge]: Ethereum bridge contract address is unavailable');
  const contractAbi = SmartContracts[SmartContractType.EthBridge][bridgeAsset];
  const contract = await ethersUtil.getContract(contractAddress, contractAbi);

  const args: Array<string | number[] | string[]> = [
    request.currencyId, // address tokenAddress OR bytes32 assetId
    request.amount, // uint256 amount
    request.to, // address beneficiary
  ];
  args.push(
    ...(useLegacyPeerMinting
      ? [
          request.hash, // bytes32 txHash
          request.v, // uint8[] memory v
          request.r, // bytes32[] memory r
          request.s, // bytes32[] memory s
          request.from, // address from
        ]
      : [
          request.from, // address from
          request.hash, // bytes32 txHash
          request.v, // uint8[] memory v
          request.r, // bytes32[] memory r
          request.s, // bytes32[] memory s
        ])
  );

  return {
    contract,
    method,
    args,
  };
}

const gasLimit = {
  approve: BigInt(45000),
  sendERC20ToSidechain: BigInt(53000),
  sendEthToSidechain: BigInt(26093),
  mintTokensByPeers: BigInt(211000),
  receiveByEthereumAssetAddress: {
    ETH: BigInt(155000),
    OTHER: BigInt(181000),
  },
  receiveBySidechainAssetId: BigInt(184000),
};

/**
 * It's in gwei.
 */
const getEthBridgeOutgoingGasLimit = (assetEvmAddress: string, assetKind: EthAssetKind): bigint => {
  switch (assetKind) {
    case EthAssetKind.SidechainOwned:
      return gasLimit.mintTokensByPeers;
    case EthAssetKind.Thischain:
      return gasLimit.receiveBySidechainAssetId;
    case EthAssetKind.Sidechain:
      return ethersUtil.isNativeEvmTokenAddress(assetEvmAddress)
        ? gasLimit.receiveByEthereumAssetAddress.ETH
        : gasLimit.receiveByEthereumAssetAddress.OTHER;
    default:
      throw new Error(`Unknown kind "${assetKind}" for asset "${assetEvmAddress}"`);
  }
};

const getEthBridgeIncomingGasLimit = (assetEvmAddress: string): bigint => {
  return ethersUtil.isNativeEvmTokenAddress(assetEvmAddress)
    ? gasLimit.sendEthToSidechain
    : gasLimit.sendERC20ToSidechain;
};

export async function getEthNetworkFee(
  asset: RegisteredAccountAsset,
  assetKind: string,
  getContractAddress: (symbol: KnownEthBridgeAsset) => Nullable<string>,
  value: string,
  isOutgoing: boolean,
  soraAccount: string,
  evmAccount: string
) {
  let gasLimitTotal!: bigint;

  if (isOutgoing) {
    gasLimitTotal = getEthBridgeOutgoingGasLimit(asset.externalAddress, assetKind as EthAssetKind);
  } else {
    const bridgeContractAddress = getContractAddress(KnownEthBridgeAsset.Other) as string;
    const allowance = await ethersUtil.getAllowance(evmAccount, bridgeContractAddress, asset.externalAddress);
    // Use FPNumber comparison to avoid precision loss in token math
    const approveGasLimit =
      !!allowance && FPNumber.isLessThan(new FPNumber(allowance), new FPNumber(value)) ? gasLimit.approve : BigInt(0);

    let txGasLimit!: bigint;

    try {
      if (asZeroValue(value)) {
        throw new Error('Calculation with Zero amount is not allowed');
      }

      const txParams = {
        asset,
        value,
        recipient: soraAccount,
        getContractAddress,
      };
      const { contract, method, args } = await getIncomingEvmTransactionData(txParams);
      const signer = contract.runner;
      const tx = await contract[method].populateTransaction(...args);

      txGasLimit = (await signer?.estimateGas?.(tx)) ?? BigInt(0);
    } catch {
      txGasLimit = getEthBridgeIncomingGasLimit(asset.externalAddress);
    }

    gasLimitTotal = txGasLimit + approveGasLimit;
  }

  const gasPrice = await ethersUtil.getEvmGasPrice();

  return ethersUtil.calcEvmFee(gasPrice, gasLimitTotal);
}
