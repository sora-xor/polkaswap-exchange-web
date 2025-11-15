import { assert } from '@polkadot/util';
import { map } from 'rxjs';
import { FPNumber, NumberLike } from '@sora-substrate/math';
import type { Observable } from '@polkadot/types/types';

import { Messages } from '../logger';
import { XOR } from '../assets/consts';
import { Operation } from '../types';
import type { Api } from '../api';

export class ReferralSystemModule<T> {
  constructor(private readonly root: Api<T>) {}

  /**
   * Returns the referrer of the invited user by Id
   * @param invitedUserId address of invited account
   * @returns referrer
   */
  public async getReferrer(invitedUserId: string): Promise<string> {
    const referrer = await this.root.api.query.referrals.referrers(invitedUserId);
    return !referrer ? '' : referrer.toString();
  }

  /**
   * Returns the referrer of the account
   * @returns referrer
   */
  public async getAccountReferrer(): Promise<string> {
    assert(this.root.account, Messages.connectWallet);
    return this.getReferrer(this.root.account.pair.address);
  }

  /**
   * Returns the referrer subscription
   * @param invitedUserId address of invited account
   */
  public subscribeOnReferrer(invitedUserId: string): Observable<null | string> {
    return this.root.apiRx.query.referrals
      .referrers(invitedUserId)
      .pipe(map((codec) => codec.toJSON() as null | string));
  }

  /**
   * Returns the referrer subscription
   */
  public subscribeOnAccountReferrer(): Observable<null | string> {
    assert(this.root.account, Messages.connectWallet);
    return this.subscribeOnReferrer(this.root.account.pair.address);
  }

  /**
   * Returns invited users of the referrer
   * @param referrerId address of referrer account
   * @returns array of invited users
   */
  public async getInvitedUsers(referrerId: string): Promise<Array<string>> {
    return (await this.root.api.query.referrals.referrals(referrerId)).map((accountId) => accountId.toString());
  }

  /**
   * Referrer's invited users subscription
   * @param referrerId address of referrer account
   */
  public subscribeOnInvitedUsers(referrerId: string): Observable<Array<string>> {
    return this.root.apiRx.query.referrals
      .referrals(referrerId)
      .pipe(map((data) => data.map((accountId) => accountId.toString())));
  }

  /**
   * Account's invited users subscription
   */
  public subscribeOnAccountInvitedUsers(): Observable<Array<string>> {
    assert(this.root.account, Messages.connectWallet);
    return this.subscribeOnInvitedUsers(this.root.account.pair.address);
  }

  /**
   * Transfer XOR balance from the referral account to the special account
   * This balance can be used by referrals to pay the fee
   * @param amount balance to reserve
   */
  public reserveXor(amount: NumberLike): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    return this.root.submitExtrinsic(
      this.root.api.tx.referrals.reserve(new FPNumber(amount, XOR.decimals).toCodecString()),
      this.root.account.pair,
      { symbol: XOR.symbol, amount: `${amount}`, assetAddress: XOR.address, type: Operation.ReferralReserveXor }
    );
  }

  /**
   * Unreserve XOR balance
   * @param amount balance to unreserve
   */
  public unreserveXor(amount: NumberLike): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    return this.root.submitExtrinsic(
      this.root.api.tx.referrals.unreserve(new FPNumber(amount, XOR.decimals).toCodecString()),
      this.root.account.pair,
      { symbol: XOR.symbol, amount: `${amount}`, assetAddress: XOR.address, type: Operation.ReferralUnreserveXor }
    );
  }

  /**
   * Sets invited user to their referrer if the account doesn’t have a referrer yet.
   * This extrinsic is paid by the bonded balance of the referrer if the invited user doesn’t have a referrer,
   * otherwise the extrinsic fails and the fee is paid by the invited user. Also, if referrer doesn't have enough
   * bonded balance for this call, then this method will fail.
   * @param referrerId address of referrer account
   */
  public async setInvitedUser(referrerId: string): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    // Check the ability for paying fee
    const bondedData = await this.root.api.query.referrals.referrerBalances(referrerId);
    const bonded = new FPNumber(bondedData || 0);
    const requiredFeeValue = FPNumber.fromCodecValue(this.root.NetworkFee.ReferralSetInvitedUser || 0);
    assert(FPNumber.gte(bonded, requiredFeeValue), Messages.inabilityOfReferrerToPayFee);

    const formattedToAddress = referrerId.startsWith('cn') ? referrerId : this.root.formatAddress(referrerId);
    return this.root.submitExtrinsic(this.root.api.tx.referrals.setReferrer(referrerId), this.root.account.pair, {
      to: formattedToAddress,
      type: Operation.ReferralSetInvitedUser,
    });
  }

  /**
   * Checks referrer input. Returns `true` if referrer you set has enough bonded XOR to invite you.
   * @param accountId Referrer account ID
   */
  public async hasEnoughXorForFee(accountId: string): Promise<boolean> {
    const bondedData = await this.root.api.query.referrals.referrerBalances(accountId);
    const bonded = new FPNumber(bondedData || 0);
    const requiredFeeValue = FPNumber.fromCodecValue(this.root.NetworkFee.ReferralSetInvitedUser || 0);
    return FPNumber.gte(bonded, requiredFeeValue);
  }
}
