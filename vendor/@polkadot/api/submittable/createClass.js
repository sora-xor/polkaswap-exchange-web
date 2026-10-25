// Copyright 2017-2023 @polkadot/api authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-dupe-class-members */

import { catchError, first, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { isBn, isFunction, isNumber, isString, isU8a, objectSpread } from '@polkadot/util';
import { filterEvents, isKeyringPair } from '../util/index.js';
import { SubmittableResult } from './Result.js';
const identity = (input) => input;
function makeEraOptions(api, registry, partialOptions, { header, mortalLength, nonce }) {
  if (!header) {
    if (partialOptions.era && !partialOptions.blockHash) {
      throw new Error('Expected blockHash to be passed alongside non-immortal era options');
    }
    if (isNumber(partialOptions.era)) {
      // since we have no header, it is immortal, remove any option overrides
      // so we only supply the genesisHash and no era to the construction
      delete partialOptions.era;
      delete partialOptions.blockHash;
    }
    return makeSignOptions(api, partialOptions, {
      nonce,
    });
  }
  return makeSignOptions(api, partialOptions, {
    blockHash: header.hash,
    era: registry.createTypeUnsafe('ExtrinsicEra', [
      {
        current: header.number,
        period: partialOptions.era || mortalLength,
      },
    ]),
    nonce,
  });
}
function makeSignAndSendOptions(partialOptions, statusCb) {
  let options = {};
  if (isFunction(partialOptions)) {
    statusCb = partialOptions;
  } else {
    options = objectSpread({}, partialOptions);
  }
  return [options, statusCb];
}
function makeSignOptions(api, partialOptions, extras) {
  return objectSpread(
    {
      blockHash: api.genesisHash,
      genesisHash: api.genesisHash,
    },
    partialOptions,
    extras,
    {
      runtimeVersion: api.runtimeVersion,
      signedExtensions: api.registry.signedExtensions,
      version: api.extrinsicType,
    }
  );
}
function optionsOrNonce(partialOptions = {}) {
  return isBn(partialOptions) || isNumber(partialOptions)
    ? {
        nonce: partialOptions,
      }
    : partialOptions;
}
export function createClass({ api, apiType, blockHash, decorateMethod }) {
  // an instance of the base extrinsic for us to extend
  const ExtrinsicBase = api.registry.createClass('Extrinsic');
  class Submittable extends ExtrinsicBase {
    #ignoreStatusCb;
    #transformResult = identity;
    constructor(registry, extrinsic) {
      super(registry, extrinsic, {
        version: api.extrinsicType,
      });
      this.#ignoreStatusCb = apiType === 'rxjs';
    }
    get hasDryRun() {
      var _api$rpc$system;
      return isFunction((_api$rpc$system = api.rpc.system) == null ? void 0 : _api$rpc$system.dryRun);
    }
    get hasPaymentInfo() {
      var _api$call$transaction;
      return isFunction(
        (_api$call$transaction = api.call.transactionPaymentApi) == null ? void 0 : _api$call$transaction.queryInfo
      );
    }

    // dry run an extrinsic
    dryRun(account, optionsOrHash) {
      if (!this.hasDryRun) {
        throw new Error('The system.dryRun RPC call is not available in your environment');
      }
      if (blockHash || isString(optionsOrHash) || isU8a(optionsOrHash)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return decorateMethod(() => api.rpc.system.dryRun(this.toHex(), blockHash || optionsOrHash));
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
      return decorateMethod(() =>
        this.#observeSign(account, optionsOrHash).pipe(switchMap(() => api.rpc.system.dryRun(this.toHex())))
      )();
    }

    // calculate the payment info for this transaction (if signed and submitted)
    paymentInfo(account, optionsOrHash) {
      if (!this.hasPaymentInfo) {
        throw new Error('The transactionPaymentApi.queryInfo runtime call is not available in your environment');
      }
      if (blockHash || isString(optionsOrHash) || isU8a(optionsOrHash)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return decorateMethod(() =>
          api.callAt(blockHash || optionsOrHash).pipe(
            switchMap((callAt) => {
              const u8a = this.toU8a();
              return callAt.transactionPaymentApi.queryInfo(u8a, u8a.length);
            })
          )
        );
      }
      const [allOptions] = makeSignAndSendOptions(optionsOrHash);
      const address = isKeyringPair(account) ? account.address : account.toString();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
      return decorateMethod(() =>
        api.derive.tx.signingInfo(address, allOptions.nonce, allOptions.era).pipe(
          first(),
          switchMap((signingInfo) => {
            // setup our options (same way as in signAndSend)
            const eraOptions = makeEraOptions(api, this.registry, allOptions, signingInfo);
            const signOptions = makeSignOptions(api, eraOptions, {});
            const u8a = this.isSigned
              ? api.tx(this).signFake(address, signOptions).toU8a()
              : this.signFake(address, signOptions).toU8a();
            return api.call.transactionPaymentApi.queryInfo(u8a, u8a.length);
          })
        )
      )();
    }

    // send with an immediate Hash result

    // send implementation for both immediate Hash and statusCb variants
    send(statusCb) {
      const isSubscription = api.hasSubscriptions && (this.#ignoreStatusCb || !!statusCb);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
      return decorateMethod(isSubscription ? this.#observeSubscribe : this.#observeSend)(statusCb);
    }

    /**
     * @description Signs a transaction, returning `this` to allow chaining. E.g.: `signAsync(...).send()`. Like `.signAndSend` this will retrieve the nonce and blockHash to send the tx with.
     */
    signAsync(account, partialOptions) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
      return decorateMethod(() => this.#observeSign(account, partialOptions).pipe(map(() => this)))();
    }

    // signAndSend with an immediate Hash result

    // signAndSend implementation for all 3 cases above
    signAndSend(account, partialOptions, optionalStatusCb) {
      const [options, statusCb] = makeSignAndSendOptions(partialOptions, optionalStatusCb);
      const isSubscription = api.hasSubscriptions && (this.#ignoreStatusCb || !!statusCb);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
      return decorateMethod(
        () =>
          this.#observeSign(account, options).pipe(
            switchMap((info) => (isSubscription ? this.#observeSubscribe(info) : this.#observeSend(info)))
          ) // FIXME This is wrong, SubmittableResult is _not_ a codec
      )(statusCb);
    }

    // adds a transform to the result, applied before result is returned
    withResultTransform(transform) {
      this.#transformResult = transform;
      return this;
    }
    #observeSign = (account, partialOptions) => {
      const address = isKeyringPair(account) ? account.address : account.toString();
      const options = optionsOrNonce(partialOptions);
      return api.derive.tx.signingInfo(address, options.nonce, options.era).pipe(
        first(),
        mergeMap(async (signingInfo) => {
          const eraOptions = makeEraOptions(api, this.registry, options, signingInfo);
          let updateId = -1;
          if (isKeyringPair(account)) {
            this.sign(account, eraOptions);
          } else {
            updateId = await this.#signViaSigner(address, eraOptions, signingInfo.header);
          }
          return {
            options: eraOptions,
            updateId,
          };
        })
      );
    };
    #observeStatus = (txHash, status) => {
      if (!status.isFinalized && !status.isInBlock) {
        return of(
          this.#transformResult(
            new SubmittableResult({
              status,
              txHash,
            })
          )
        );
      }
      const blockHash = status.isInBlock ? status.asInBlock : status.asFinalized;
      return api.derive.tx.events(blockHash).pipe(
        map(({ block, events }) =>
          this.#transformResult(
            new SubmittableResult({
              ...filterEvents(txHash, block, events, status),
              status,
              txHash,
            })
          )
        ),
        catchError((internalError) =>
          of(
            this.#transformResult(
              new SubmittableResult({
                internalError,
                status,
                txHash,
              })
            )
          )
        )
      );
    };
    #observeSend = (info) => {
      return api.rpc.author.submitExtrinsic(this).pipe(
        tap((hash) => {
          this.#updateSigner(hash, info);
        })
      );
    };
    #observeSubscribe = (info) => {
      const txHash = this.hash;
      return api.rpc.author.submitAndWatchExtrinsic(this).pipe(
        switchMap((status) => this.#observeStatus(txHash, status)),
        tap((status) => {
          this.#updateSigner(status, info);
        })
      );
    };
    #signViaSigner = async (address, options, header) => {
      const signer = options.signer || api.signer;
      if (!signer) {
        throw new Error(
          'No signer specified, either via api.setSigner or via sign options. You possibly need to pass through an explicit keypair for the origin so it can be used for signing.'
        );
      }
      const payload = this.registry.createTypeUnsafe('SignerPayload', [
        objectSpread({}, options, {
          address,
          blockNumber: header ? header.number : 0,
          method: this.method,
        }),
      ]);
      let result;
      if (isFunction(signer.signPayload)) {
        result = await signer.signPayload(payload.toPayload());
      } else if (isFunction(signer.signRaw)) {
        result = await signer.signRaw(payload.toRaw());
      } else {
        throw new Error('Invalid signer interface, it should implement either signPayload or signRaw (or both)');
      }

      // Here we explicitly call `toPayload()` again instead of working with an object
      // (reference) as passed to the signer. This means that we are sure that the
      // payload data is not modified from our inputs, but the signer
      super.addSignature(address, result.signature, payload.toPayload());
      return result.id;
    };
    #updateSigner = (status, info) => {
      if (info && info.updateId !== -1) {
        const { options, updateId } = info;
        const signer = options.signer || api.signer;
        if (signer && isFunction(signer.update)) {
          signer.update(updateId, status);
        }
      }
    };
  }
  return Submittable;
}
