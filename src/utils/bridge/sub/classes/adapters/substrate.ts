import { Connection } from '@sora-substrate/connection';
import { WithConnectionApi, FPNumber, Storage } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';
import { ApiPromise, WsProvider } from 'polkadotApi';

import { ZeroStringValue } from '@/consts';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { NodesConnection } from '@/utils/connection';

import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type { ISubmittableResult } from '@polkadot/types/types';
import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/types';

export class SubAdapter extends WithConnectionApi {
  public readonly subNetwork!: SubNetwork;
  public readonly subNetworkConnection!: NodesConnection;

  constructor(subNetwork: SubNetwork) {
    super();

    this.subNetwork = subNetwork;
    this.subNetworkConnection = new NodesConnection(
      new Storage(this.subNetwork),
      new Connection(ApiPromise, WsProvider, {}),
      this.subNetwork
    );

    this.setConnection(this.subNetworkConnection.connection);
  }

  get closed(): boolean {
    return !this.connected && !this.subNetworkConnection.nodeAddressConnecting;
  }

  protected async withConnection<T>(onSuccess: AsyncFnWithoutArgs<T> | FnWithoutArgs<T>, fallback: T) {
    if (this.closed) {
      return fallback;
    }

    await this.api.isReady;

    return await onSuccess();
  }

  public setApi(api: ApiPromise): void {
    console.info(`[${this.subNetwork}] Api injected`);
    this.connection.api = api;
  }

  public async connect(): Promise<void> {
    if (this.closed && !this.api) {
      try {
        await this.subNetworkConnection.connect();
      } catch {}
    }

    await this.api.isReady;
  }

  public async stop(): Promise<void> {
    await this.subNetworkConnection.closeConnection();
  }

  public getParachainId(): number | undefined {
    return subBridgeApi.isParachain(this.subNetwork) ? subBridgeApi.getParachainId(this.subNetwork) : undefined;
  }

  public getSoraParachainId(): number | undefined {
    try {
      const soraParachain = subBridgeApi.getSoraParachain(this.subNetwork);
      const soraParachainId = subBridgeApi.getParachainId(soraParachain);

      return soraParachainId;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  public async getBlockNumber(): Promise<number> {
    return await this.withConnection(async () => {
      const result = await this.api.query.system.number();
      return result.toNumber();
    }, 0);
  }

  protected async getAccountBalance(accountAddress: string): Promise<CodecString> {
    if (!accountAddress) return ZeroStringValue;

    return await this.withConnection(async () => {
      const accountInfo = await this.api.query.system.account(accountAddress);
      const balance = formatBalance(accountInfo.data, this.chainDecimals);

      return balance.transferable;
    }, ZeroStringValue);
  }

  /* [Substrate 5] Runtime call transactionPaymentApi */
  public async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    return await this.withConnection(async () => {
      const tx = this.getTransferExtrinsic(asset, recipient, ZeroStringValue);
      const res = await tx.paymentInfo(sender);
      return new FPNumber(res.partialFee, this.chainDecimals).toCodecString();
    }, ZeroStringValue);
  }

  public async getTokenBalance(accountAddress: string, asset?: RegisteredAsset): Promise<CodecString> {
    return await this.getAccountBalance(accountAddress);
  }

  public async getAssetMinDeposit(asset: RegisteredAsset): Promise<CodecString> {
    return await this.getExistentialDeposit();
  }

  protected async getExistentialDeposit(): Promise<CodecString> {
    return await this.withConnection(() => this.api.consts.balances.existentialDeposit.toString(), ZeroStringValue);
  }

  public getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: string | number) {
    throw new Error(`[${this.constructor.name}] "getTransferExtrinsic" method is not implemented`);
  }
}
