import { Connection } from '@sora-substrate/connection';
import { FPNumber, Operation } from '@sora-substrate/util';
import { formatBalance } from '@sora-substrate/util/build/assets';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';

import { ZeroStringValue } from '@/consts';
import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { ApiPromise, ApiRx } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type { ISubmittableResult } from '@polkadot/types/types';
import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/types';

export class SubAdapter {
  protected endpoint!: string;

  public connection!: Connection;
  public readonly subNetwork!: SubNetwork;

  constructor(subNetwork: SubNetwork) {
    this.subNetwork = subNetwork;
    this.connection = new Connection({});
  }

  get api(): ApiPromise {
    return this.connection.api as ApiPromise;
  }

  get apiRx() {
    return this.api.rx as ApiRx;
  }

  get connected(): boolean {
    return !!this.api?.isConnected;
  }

  public setEndpoint(endpoint: string): void {
    this.endpoint = endpoint;
  }

  public setApi(api: ApiPromise): void {
    console.info(`[${this.subNetwork}] Api injected`);
    this.connection.api = api;
  }

  public async connect(): Promise<void> {
    if (!this.connected && !this.api && !this.connection.loading && this.endpoint) {
      console.info(`[${this.subNetwork}] Connection request to node:`, this.endpoint);
      await this.connection.open(this.endpoint);
      console.info(`[${this.subNetwork}] Connected to node:`, this.endpoint);
    }
    await this.api.isReady;
  }

  public async stop(): Promise<void> {
    if (this.connected) {
      await this.connection.close();
      console.info(`[${this.subNetwork}] Disconnected from node:`, this.endpoint);
    }
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
    if (!this.connected) return 0;

    await this.api.isReady;

    const result = await this.api.query.system.number();

    return result.toNumber();
  }

  protected async getAccountBalance(accountAddress: string): Promise<CodecString> {
    if (!(this.connected && accountAddress)) return ZeroStringValue;

    await this.api.isReady;

    const accountInfo = await this.api.query.system.account(accountAddress);
    const accountBalance = formatBalance(accountInfo.data);
    const balance = accountBalance.transferable;

    return balance;
  }

  public async transfer(asset: RegisteredAsset, recipient: string, amount: string | number, historyId?: string) {
    const historyItem = subBridgeApi.getHistory(historyId as string) ?? {
      type: Operation.SubstrateIncoming,
      symbol: asset.symbol,
      assetAddress: asset.address,
      amount: `${amount}`,
      externalNetwork: this.subNetwork,
      externalNetworkType: BridgeNetworkType.Sub,
    };

    const extrinsic = this.getTransferExtrinsic(asset, recipient, amount);

    await subBridgeApi.submitApiExtrinsic(this.api, extrinsic, subBridgeApi.account.pair, historyItem);
  }

  /* [Substrate 5] Runtime call transactionPaymentApi */
  public async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    if (!this.connected) return ZeroStringValue;

    await this.api.isReady;
    const decimals = this.api.registry.chainDecimals[0];
    const tx = this.getTransferExtrinsic(asset, recipient, ZeroStringValue);
    const res = await tx.paymentInfo(sender);
    return new FPNumber(res.partialFee, decimals).toCodecString();
  }

  public async getTokenBalance(accountAddress: string, address?: string): Promise<CodecString> {
    return await this.getAccountBalance(accountAddress);
  }

  protected getTransferExtrinsic(
    asset: RegisteredAsset,
    recipient: string,
    amount: string | number
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    throw new Error(`[${this.constructor.name}] "getTransferExtrinsic" method is not implemented`);
  }
}
