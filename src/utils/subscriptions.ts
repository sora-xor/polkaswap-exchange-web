import { api } from '@/lib/soraneo-wallet/src/api';

import type { AccountBalance, AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Observable, Subscription } from 'rxjs';

export const FIRST_EMISSION_TIMEOUT_MS = 4_000;

/**
 * Keeps one observable subscription alive while waiting for its first value.
 * Rejects and tears down the subscription when the source errors, completes
 * without a value, or stays silent past the timeout.
 */
export const subscribeAndWaitForFirst = <T>(
  observable: Observable<T>,
  onValue: (value: T) => void,
  timeoutMs = FIRST_EMISSION_TIMEOUT_MS
): Promise<Subscription> => {
  return new Promise((resolve, reject) => {
    let subscription: Subscription | null = null;
    let firstEmissionSeen = false;
    let settled = false;
    let resolveAfterSubscribe = false;
    let unsubscribeAfterSubscribe = false;

    const timer = setTimeout(() => {
      rejectOnce(new Error(`Observable did not emit within ${timeoutMs} ms`));
    }, timeoutMs);

    const clearTimer = (): void => clearTimeout(timer);

    const unsubscribe = (): void => {
      if (subscription) {
        subscription.unsubscribe();
      } else {
        unsubscribeAfterSubscribe = true;
      }
    };

    function rejectOnce(reason: unknown): void {
      if (settled) return;

      settled = true;
      clearTimer();
      unsubscribe();
      reject(reason instanceof Error ? reason : new Error(String(reason)));
    }

    const resolveOnce = (): void => {
      if (settled) return;

      settled = true;
      clearTimer();

      if (subscription) {
        resolve(subscription);
      } else {
        resolveAfterSubscribe = true;
      }
    };

    try {
      subscription = observable.subscribe(
        (value) => {
          const isFirstEmission = !firstEmissionSeen;
          firstEmissionSeen = true;

          try {
            onValue(value);
          } catch (error) {
            if (isFirstEmission) {
              rejectOnce(error);
              return;
            }

            throw error;
          }

          if (isFirstEmission) resolveOnce();
        },
        (error) => rejectOnce(error),
        () => {
          if (!firstEmissionSeen) {
            rejectOnce(new Error('Observable completed before its first emission'));
          }
        }
      );

      if (unsubscribeAfterSubscribe) subscription.unsubscribe();
      if (resolveAfterSubscribe) resolve(subscription);
    } catch (error) {
      rejectOnce(error);
    }
  });
};

type UpdateBalance = (balance: Nullable<AccountBalance>) => void;

type SubscriptionPayload = {
  updateBalance: UpdateBalance;
  token: AccountAsset;
};

type TokenSubscription = {
  subscription: Subscription | null;
  updateBalance: UpdateBalance;
};

/** Owns account-bound balance streams and invalidates unusable or abandoned values. */
export class TokenBalanceSubscriptions {
  private subscriptions: Map<string, TokenSubscription>;

  constructor() {
    this.subscriptions = new Map();
  }

  /** Replaces the keyed stream and clears cached balances if setup fails or the stream terminates. */
  add(key: string, { updateBalance, token }: SubscriptionPayload): void {
    this.remove(key);
    const item: TokenSubscription = { updateBalance, subscription: null };
    this.subscriptions.set(key, item);

    const isCurrent = (): boolean => this.subscriptions.get(key) === item;
    const invalidate = (): void => {
      if (isCurrent()) this.remove(key);
    };

    try {
      const getBalanceObservable = api.assets?.getAssetBalanceObservable;
      if (typeof getBalanceObservable !== 'function') {
        invalidate();
        return;
      }

      const observable = getBalanceObservable.call(api.assets, token);
      if (!observable || typeof observable.subscribe !== 'function') {
        invalidate();
        return;
      }

      const subscription = observable.subscribe(
        (balance) => {
          if (isCurrent()) updateBalance(balance);
        },
        invalidate,
        invalidate
      );

      if (isCurrent()) {
        item.subscription = subscription;
      } else {
        // A synchronous error or callback can invalidate the entry before subscribe returns.
        subscription.unsubscribe();
      }
    } catch {
      invalidate();
    }
  }

  /** Revokes callback ownership before teardown so late emissions cannot restore a removed balance. */
  remove(key: string): void {
    const item = this.subscriptions.get(key);
    this.subscriptions.delete(key);

    item?.subscription?.unsubscribe?.();
    item?.updateBalance?.(null);
  }

  /** Tears down the currently registered streams and clears their balances. */
  resetSubscriptions(): void {
    for (const key of [...this.subscriptions.keys()]) {
      this.remove(key);
    }
  }
}
