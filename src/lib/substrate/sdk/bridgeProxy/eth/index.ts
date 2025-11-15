import first from 'lodash/fp/first';
import { assert } from '@polkadot/util';
import { map, combineLatest } from 'rxjs';
import { FPNumber } from '@sora-substrate/math';
import type { Observable } from '@polkadot/types/types';
import type { BridgeTypesGenericNetworkId, EthBridgeRequestsOffchainRequest } from '@polkadot/types/lookup';

import { ApiAccount, isEthOperation } from '../../apiAccount';
import { Operation } from '../../types';
import { Messages } from '../../logger';
import { getLockedAssets } from '../methods';
import { BridgeNetworkType, BridgeTxStatus } from '../consts';
import { EthNetwork } from './consts';
import { assertRequest, formatRequest, formatApprovedRequest } from './methods';
import type { EthAssetKind } from './consts';
import type { EthAsset, EthApprovedRequest, EthRequest, EthHistory } from './types';
import type { EvmNetwork } from '../evm/types';
import type { Asset } from '../../assets/types';

export class EthBridgeApi<T> extends ApiAccount<T> {
  private externalNetwork: EthNetwork = EthNetwork.Ethereum;

  constructor() {
    super('ethBridgeHistory');
  }

  public prepareNetworkParam(_evmNetwork: EvmNetwork): BridgeTypesGenericNetworkId {
    const genericNetworkId: BridgeTypesGenericNetworkId = this.api.createType('BridgeTypesGenericNetworkId', {
      [BridgeNetworkType.Eth]: this.externalNetwork,
    });

    return genericNetworkId;
  }

  public override initAccountStorage(): void {
    super.initAccountStorage();
    // 1.18 migration
    // "bridgeHistory" -> "ethBridgeHistory"
    // "bridgeHistorySyncTimestamp" -> "ethBridgeHistorySyncTimestamp"
    this.accountStorage?.remove('bridgeHistory');
    this.accountStorage?.remove('bridgeHistorySyncTimestamp');
  }

  public generateHistoryItem(params: EthHistory): EthHistory | null {
    if (!params.type) {
      return null;
    }
    const historyItem = (params || {}) as EthHistory;
    historyItem.startTime = historyItem.startTime || Date.now();
    historyItem.id = this.encrypt(`${historyItem.startTime}`);
    historyItem.transactionState = historyItem.transactionState || 'INITIAL';
    this.saveHistory(historyItem);
    return historyItem;
  }

  public override saveHistory(history: EthHistory): void {
    if (!(history?.id && isEthOperation(history.type))) {
      return;
    }
    super.saveHistory(history);
  }

  protected getTransferExtrinsic(asset: Asset, recipient: string, amount: string | number) {
    const value = new FPNumber(amount, asset.decimals).toCodecString();

    return this.api.tx.ethBridge.transferToSidechain(asset.address, recipient, value, this.externalNetwork);
  }

  /**
   * Transfer through the bridge operation
   * @param asset Asset
   * @param recipient Ethereum account address
   * @param amount
   * @param historyId not required
   */
  public transfer(asset: Asset, recipient: string, amount: string | number, historyId?: string): Promise<T> {
    assert(this.account, Messages.connectWallet);

    const extrinsic = this.getTransferExtrinsic(asset, recipient, amount);
    const historyParam = historyId ? this.getHistory(historyId) : undefined;
    const historyItem = historyParam || {
      symbol: asset.symbol,
      assetAddress: asset.address,
      amount: `${amount}`,
      type: Operation.EthBridgeOutgoing,
    };

    return this.submitExtrinsic(extrinsic, this.account.pair, historyItem);
  }

  /**
   * Get registered assets for bridge
   * @returns Array with all registered assets
   */
  public async getRegisteredAssets(): Promise<Record<string, EthAsset>> {
    const data = await this.api.rpc.ethBridge.getRegisteredAssets(this.externalNetwork);

    if (!data.isOk) {
      // Returns an empty list and logs issue
      console.warn('[api.bridge.getRegisteredAssets]:', data.asErr.toString());
      return {};
    }

    return data.asOk.reduce<Record<string, EthAsset>>((buffer, [kind, soraAsset, externalAsset]) => {
      const assetKind = kind.toString() as EthAssetKind;
      const soraAssetId = soraAsset[0].toString();

      let externalAddress = '';
      let externalDecimals: number | undefined = undefined;

      if (externalAsset.isSome) {
        const [externalAssetId, externalAssetDecimals] = externalAsset.unwrap();
        externalAddress = externalAssetId.toString();
        externalDecimals = externalAssetDecimals.toNumber();
      }

      buffer[soraAssetId] = {
        address: externalAddress,
        decimals: externalDecimals,
        assetKind,
      };

      return buffer;
    }, {});
  }

  /**
   * Get approved request
   * @param hash Bridge hash
   * @returns Approved request with proofs
   */
  public async getApprovedRequest(hash: string): Promise<EthApprovedRequest | undefined> {
    const data = await this.api.rpc.ethBridge.getApprovedRequests([hash], this.externalNetwork);
    assertRequest(data, 'api.bridge.getApprovedRequest');
    return first(data.asOk.map(([request, proofs]) => formatApprovedRequest(request, proofs)));
  }

  /**
   * Returns bridge request status
   * @param hash sora or evm transaction hash
   * @returns BridgeRequest status
   */
  public async getRequestStatus(hash: string): Promise<BridgeTxStatus | null> {
    return (
      ((await this.api.query.ethBridge.requestStatuses(this.externalNetwork, hash)).toHuman() as BridgeTxStatus) || null
    );
  }

  /**
   * Creates a subscription to bridge request status
   * @param hash sora or evm transaction hash
   * @returns BridgeRequest status
   */
  public subscribeOnRequestStatus(hash: string): Observable<BridgeTxStatus | null> {
    return this.apiRx.query.ethBridge
      .requestStatuses(this.externalNetwork, hash)
      .pipe(map((data) => (data.toHuman() as BridgeTxStatus) || null));
  }

  /**
   * Creates a subscription to bridge request data
   * @param hash sora or evm transaction hash
   * @returns BridgeRequest not formatted body
   */
  private subscribeOnRequestData(hash: string): Observable<EthBridgeRequestsOffchainRequest | null> {
    return this.apiRx.query.ethBridge
      .requests(this.externalNetwork, hash)
      .pipe(map((data) => (data.isSome ? data.unwrap() : null)));
  }

  /**
   * Creates a subscription to bridge request
   * @param hash sora or evm transaction hash
   * @returns BridgeRequest if request is registered
   */
  public subscribeOnRequest(hash: string): Observable<EthRequest | null> {
    const data = this.subscribeOnRequestData(hash);
    const status = this.subscribeOnRequestStatus(hash);

    return combineLatest([data, status]).pipe(
      map(([data, status]) => {
        return !!data && !!status ? formatRequest(data, status) : null;
      })
    );
  }

  public async getSoraHashByEthereumHash(ethereumHash: string): Promise<string> {
    return (await this.api.query.ethBridge.loadToIncomingRequestHash(this.externalNetwork, ethereumHash)).toString();
  }

  public async getSoraBlockHashByRequestHash(requestHash: string): Promise<string> {
    const soraBlockNumber = (
      await this.api.query.ethBridge.requestSubmissionHeight(this.externalNetwork, requestHash)
    ).toNumber();

    const soraBlockHash = (await this.api.rpc.chain.getBlockHash(soraBlockNumber)).toString();

    return soraBlockHash;
  }

  public async getAssetKind(assetAddress: string): Promise<EthAssetKind | null> {
    const data = await this.api.query.ethBridge.registeredAsset(this.externalNetwork, assetAddress);

    if (!data.isSome) return null;

    const kind = data.unwrap();

    return kind.toString() as EthAssetKind;
  }

  public async getLockedAssets(evmNetwork: EvmNetwork, assetAddress: string) {
    return await getLockedAssets(this.api, this.prepareNetworkParam(evmNetwork), assetAddress);
  }
}
