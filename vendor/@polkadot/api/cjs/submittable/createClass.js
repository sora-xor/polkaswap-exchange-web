'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.createClass = createClass;
var _rxjs = require('rxjs');
var _util = require('@polkadot/util');
var _util2 = require('../util');
var _Result = require('./Result');
// Copyright 2017-2023 @polkadot/api authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-dupe-class-members */

const identity = (input) => input;
function makeEraOptions(api, registry, partialOptions, _ref) {
  let { header, mortalLength, nonce } = _ref;
  if (!header) {
    if (partialOptions.era && !partialOptions.blockHash) {
      throw new Error('Expected blockHash to be passed alongside non-immortal era options');
    }
    if ((0, _util.isNumber)(partialOptions.era)) {
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
  if ((0, _util.isFunction)(partialOptions)) {
    statusCb = partialOptions;
  } else {
    options = (0, _util.objectSpread)({}, partialOptions);
  }
  return [options, statusCb];
}
function makeSignOptions(api, partialOptions, extras) {
  return (0, _util.objectSpread)(
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
function optionsOrNonce() {
  let partialOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return (0, _util.isBn)(partialOptions) || (0, _util.isNumber)(partialOptions)
    ? {
        nonce: partialOptions,
      }
    : partialOptions;
}
function createClass(_ref2) {
  let { api, apiType, blockHash, decorateMethod } = _ref2;
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
      return (0, _util.isFunction)((_api$rpc$system = api.rpc.system) == null ? void 0 : _api$rpc$system.dryRun);
    }
    get hasPaymentInfo() {
      var _api$call$transaction;
      return (0, _util.isFunction)(
        (_api$call$transaction = api.call.transactionPaymentApi) == null ? void 0 : _api$call$transaction.queryInfo
      );
    }

    // dry run an extrinsic
    dryRun(account, optionsOrHash) {
      if (!this.hasDryRun) {
        throw new Error('The system.dryRun RPC call is not available in your environment');
      }
      if (blockHash || (0, _util.isString)(optionsOrHash) || (0, _util.isU8a)(optionsOrHash)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return decorateMethod(() => api.rpc.system.dryRun(this.toHex(), blockHash || optionsOrHash));
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
      return decorateMethod(() =>
        this.#observeSign(account, optionsOrHash).pipe((0, _rxjs.switchMap)(() => api.rpc.system.dryRun(this.toHex())))
      )();
    }

    // calculate the payment info for this transaction (if signed and submitted)
    paymentInfo(account, optionsOrHash) {
      if (!this.hasPaymentInfo) {
        throw new Error('The transactionPaymentApi.queryInfo runtime call is not available in your environment');
      }
      if (blockHash || (0, _util.isString)(optionsOrHash) || (0, _util.isU8a)(optionsOrHash)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return decorateMethod(() =>
          api.callAt(blockHash || optionsOrHash).pipe(
            (0, _rxjs.switchMap)((callAt) => {
              const u8a = this.toU8a();
              return callAt.transactionPaymentApi.queryInfo(u8a, u8a.length);
            })
          )
        );
      }
      const [allOptions] = makeSignAndSendOptions(optionsOrHash);
      const address = (0, _util2.isKeyringPair)(account) ? account.address : account.toString();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
      return decorateMethod(() =>
        api.derive.tx.signingInfo(address, allOptions.nonce, allOptions.era).pipe(
          (0, _rxjs.first)(),
          (0, _rxjs.switchMap)((signingInfo) => {
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
      return decorateMethod(() => this.#observeSign(account, partialOptions).pipe((0, _rxjs.map)(() => this)))();
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
            (0, _rxjs.switchMap)((info) => (isSubscription ? this.#observeSubscribe(info) : this.#observeSend(info)))
          ) // FIXME This is wrong, SubmittableResult is _not_ a codec
      )(statusCb);
    }

    // adds a transform to the result, applied before result is returned
    withResultTransform(transform) {
      this.#transformResult = transform;
      return this;
    }
    #observeSign = (account, partialOptions) => {
      const address = (0, _util2.isKeyringPair)(account) ? account.address : account.toString();
      const options = optionsOrNonce(partialOptions);
      return api.derive.tx.signingInfo(address, options.nonce, options.era).pipe(
        (0, _rxjs.first)(),
        (0, _rxjs.mergeMap)(async (signingInfo) => {
          const eraOptions = makeEraOptions(api, this.registry, options, signingInfo);
          let updateId = -1;
          if ((0, _util2.isKeyringPair)(account)) {
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
        return (0, _rxjs.of)(
          this.#transformResult(
            new _Result.SubmittableResult({
              status,
              txHash,
            })
          )
        );
      }
      const blockHash = status.isInBlock ? status.asInBlock : status.asFinalized;
      return api.derive.tx.events(blockHash).pipe(
        (0, _rxjs.map)((_ref3) => {
          let { block, events } = _ref3;
          return this.#transformResult(
            new _Result.SubmittableResult({
              ...(0, _util2.filterEvents)(txHash, block, events, status),
              status,
              txHash,
            })
          );
        }),
        (0, _rxjs.catchError)((internalError) =>
          (0, _rxjs.of)(
            this.#transformResult(
              new _Result.SubmittableResult({
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
        (0, _rxjs.tap)((hash) => {
          this.#updateSigner(hash, info);
        })
      );
    };
    #observeSubscribe = (info) => {
      const txHash = this.hash;
      return api.rpc.author.submitAndWatchExtrinsic(this).pipe(
        (0, _rxjs.switchMap)((status) => this.#observeStatus(txHash, status)),
        (0, _rxjs.tap)((status) => {
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
        (0, _util.objectSpread)({}, options, {
          address,
          blockNumber: header ? header.number : 0,
          method: this.method,
        }),
      ]);
      let result;
      if ((0, _util.isFunction)(signer.signPayload)) {
        result = await signer.signPayload(payload.toPayload());
      } else if ((0, _util.isFunction)(signer.signRaw)) {
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
        if (signer && (0, _util.isFunction)(signer.update)) {
          signer.update(updateId, status);
        }
      }
    };
  }
  return Submittable;
}
