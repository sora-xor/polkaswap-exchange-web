(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(
        exports,
        require('@polkadot/keyring'),
        require('@polkadot/ui-settings'),
        require('@polkadot/util'),
        require('@polkadot/util-crypto')
      )
    : typeof define === 'function' && define.amd
      ? define(
          ['exports', '@polkadot/keyring', '@polkadot/ui-settings', '@polkadot/util', '@polkadot/util-crypto'],
          factory
        )
      : ((global = typeof globalThis !== 'undefined' ? globalThis : global || self),
        factory(
          (global.polkadotUiKeyring = {}),
          global.polkadotKeyring,
          global.polkadotUiSettings,
          global.polkadotUtil,
          global.polkadotUtilCrypto
        ));
})(this, function (exports, keyring$1, uiSettings, util$7, utilCrypto) {
  'use strict';

  const global = typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : window;

  var extendStatics = function (d, b) {
    extendStatics =
      Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array &&
        function (d, b) {
          d.__proto__ = b;
        }) ||
      function (d, b) {
        for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      };
    return extendStatics(d, b);
  };
  function __extends(d, b) {
    if (typeof b !== 'function' && b !== null)
      throw new TypeError('Class extends value ' + String(b) + ' is not a constructor or null');
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
  }
  function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  function __generator(thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  }
  function __values(o) {
    var s = typeof Symbol === 'function' && Symbol.iterator,
      m = s && o[s],
      i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === 'number')
      return {
        next: function () {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
        },
      };
    throw new TypeError(s ? 'Object is not iterable.' : 'Symbol.iterator is not defined.');
  }
  function __read(o, n) {
    var m = typeof Symbol === 'function' && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o),
      r,
      ar = [],
      e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error: error };
    } finally {
      try {
        if (r && !r.done && (m = i['return'])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  }
  function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  }
  function __await(v) {
    return this instanceof __await ? ((this.v = v), this) : new __await(v);
  }
  function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError('Symbol.asyncIterator is not defined.');
    var g = generator.apply(thisArg, _arguments || []),
      i,
      q = [];
    return (
      (i = {}),
      verb('next'),
      verb('throw'),
      verb('return'),
      (i[Symbol.asyncIterator] = function () {
        return this;
      }),
      i
    );
    function verb(n) {
      if (g[n])
        i[n] = function (v) {
          return new Promise(function (a, b) {
            q.push([n, v, a, b]) > 1 || resume(n, v);
          });
        };
    }
    function resume(n, v) {
      try {
        step(g[n](v));
      } catch (e) {
        settle(q[0][3], e);
      }
    }
    function step(r) {
      r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
    }
    function fulfill(value) {
      resume('next', value);
    }
    function reject(value) {
      resume('throw', value);
    }
    function settle(f, v) {
      if ((f(v), q.shift(), q.length)) resume(q[0][0], q[0][1]);
    }
  }
  function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError('Symbol.asyncIterator is not defined.');
    var m = o[Symbol.asyncIterator],
      i;
    return m
      ? m.call(o)
      : ((o = typeof __values === 'function' ? __values(o) : o[Symbol.iterator]()),
        (i = {}),
        verb('next'),
        verb('throw'),
        verb('return'),
        (i[Symbol.asyncIterator] = function () {
          return this;
        }),
        i);
    function verb(n) {
      i[n] =
        o[n] &&
        function (v) {
          return new Promise(function (resolve, reject) {
            ((v = o[n](v)), settle(resolve, reject, v.done, v.value));
          });
        };
    }
    function settle(resolve, reject, d, v) {
      Promise.resolve(v).then(function (v) {
        resolve({ value: v, done: d });
      }, reject);
    }
  }

  function isFunction$2(value) {
    return typeof value === 'function';
  }

  function createErrorClass(createImpl) {
    var _super = function (instance) {
      Error.call(instance);
      instance.stack = new Error().stack;
    };
    var ctorFunc = createImpl(_super);
    ctorFunc.prototype = Object.create(Error.prototype);
    ctorFunc.prototype.constructor = ctorFunc;
    return ctorFunc;
  }

  var UnsubscriptionError = createErrorClass(function (_super) {
    return function UnsubscriptionErrorImpl(errors) {
      _super(this);
      this.message = errors
        ? errors.length +
          ' errors occurred during unsubscription:\n' +
          errors
            .map(function (err, i) {
              return i + 1 + ') ' + err.toString();
            })
            .join('\n  ')
        : '';
      this.name = 'UnsubscriptionError';
      this.errors = errors;
    };
  });

  function arrRemove(arr, item) {
    if (arr) {
      var index = arr.indexOf(item);
      0 <= index && arr.splice(index, 1);
    }
  }

  var Subscription = (function () {
    function Subscription(initialTeardown) {
      this.initialTeardown = initialTeardown;
      this.closed = false;
      this._parentage = null;
      this._finalizers = null;
    }
    Subscription.prototype.unsubscribe = function () {
      var e_1, _a, e_2, _b;
      var errors;
      if (!this.closed) {
        this.closed = true;
        var _parentage = this._parentage;
        if (_parentage) {
          this._parentage = null;
          if (Array.isArray(_parentage)) {
            try {
              for (
                var _parentage_1 = __values(_parentage), _parentage_1_1 = _parentage_1.next();
                !_parentage_1_1.done;
                _parentage_1_1 = _parentage_1.next()
              ) {
                var parent_1 = _parentage_1_1.value;
                parent_1.remove(this);
              }
            } catch (e_1_1) {
              e_1 = { error: e_1_1 };
            } finally {
              try {
                if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return)) _a.call(_parentage_1);
              } finally {
                if (e_1) throw e_1.error;
              }
            }
          } else {
            _parentage.remove(this);
          }
        }
        var initialFinalizer = this.initialTeardown;
        if (isFunction$2(initialFinalizer)) {
          try {
            initialFinalizer();
          } catch (e) {
            errors = e instanceof UnsubscriptionError ? e.errors : [e];
          }
        }
        var _finalizers = this._finalizers;
        if (_finalizers) {
          this._finalizers = null;
          try {
            for (
              var _finalizers_1 = __values(_finalizers), _finalizers_1_1 = _finalizers_1.next();
              !_finalizers_1_1.done;
              _finalizers_1_1 = _finalizers_1.next()
            ) {
              var finalizer = _finalizers_1_1.value;
              try {
                execFinalizer(finalizer);
              } catch (err) {
                errors = errors !== null && errors !== void 0 ? errors : [];
                if (err instanceof UnsubscriptionError) {
                  errors = __spreadArray(__spreadArray([], __read(errors)), __read(err.errors));
                } else {
                  errors.push(err);
                }
              }
            }
          } catch (e_2_1) {
            e_2 = { error: e_2_1 };
          } finally {
            try {
              if (_finalizers_1_1 && !_finalizers_1_1.done && (_b = _finalizers_1.return)) _b.call(_finalizers_1);
            } finally {
              if (e_2) throw e_2.error;
            }
          }
        }
        if (errors) {
          throw new UnsubscriptionError(errors);
        }
      }
    };
    Subscription.prototype.add = function (teardown) {
      var _a;
      if (teardown && teardown !== this) {
        if (this.closed) {
          execFinalizer(teardown);
        } else {
          if (teardown instanceof Subscription) {
            if (teardown.closed || teardown._hasParent(this)) {
              return;
            }
            teardown._addParent(this);
          }
          (this._finalizers = (_a = this._finalizers) !== null && _a !== void 0 ? _a : []).push(teardown);
        }
      }
    };
    Subscription.prototype._hasParent = function (parent) {
      var _parentage = this._parentage;
      return _parentage === parent || (Array.isArray(_parentage) && _parentage.includes(parent));
    };
    Subscription.prototype._addParent = function (parent) {
      var _parentage = this._parentage;
      this._parentage = Array.isArray(_parentage)
        ? (_parentage.push(parent), _parentage)
        : _parentage
          ? [_parentage, parent]
          : parent;
    };
    Subscription.prototype._removeParent = function (parent) {
      var _parentage = this._parentage;
      if (_parentage === parent) {
        this._parentage = null;
      } else if (Array.isArray(_parentage)) {
        arrRemove(_parentage, parent);
      }
    };
    Subscription.prototype.remove = function (teardown) {
      var _finalizers = this._finalizers;
      _finalizers && arrRemove(_finalizers, teardown);
      if (teardown instanceof Subscription) {
        teardown._removeParent(this);
      }
    };
    Subscription.EMPTY = (function () {
      var empty = new Subscription();
      empty.closed = true;
      return empty;
    })();
    return Subscription;
  })();
  var EMPTY_SUBSCRIPTION = Subscription.EMPTY;
  function isSubscription(value) {
    return (
      value instanceof Subscription ||
      (value &&
        'closed' in value &&
        isFunction$2(value.remove) &&
        isFunction$2(value.add) &&
        isFunction$2(value.unsubscribe))
    );
  }
  function execFinalizer(finalizer) {
    if (isFunction$2(finalizer)) {
      finalizer();
    } else {
      finalizer.unsubscribe();
    }
  }

  var config = {
    onUnhandledError: null,
    onStoppedNotification: null,
    Promise: undefined,
    useDeprecatedSynchronousErrorHandling: false,
    useDeprecatedNextContext: false,
  };

  var timeoutProvider = {
    setTimeout: function (handler, timeout) {
      var args = [];
      for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
      }
      var delegate = timeoutProvider.delegate;
      if (delegate === null || delegate === void 0 ? void 0 : delegate.setTimeout) {
        return delegate.setTimeout.apply(delegate, __spreadArray([handler, timeout], __read(args)));
      }
      return setTimeout.apply(void 0, __spreadArray([handler, timeout], __read(args)));
    },
    clearTimeout: function (handle) {
      var delegate = timeoutProvider.delegate;
      return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
    },
    delegate: undefined,
  };

  function reportUnhandledError(err) {
    timeoutProvider.setTimeout(function () {
      {
        throw err;
      }
    });
  }

  function noop() {}

  function errorContext(cb) {
    {
      cb();
    }
  }

  var Subscriber = (function (_super) {
    __extends(Subscriber, _super);
    function Subscriber(destination) {
      var _this = _super.call(this) || this;
      _this.isStopped = false;
      if (destination) {
        _this.destination = destination;
        if (isSubscription(destination)) {
          destination.add(_this);
        }
      } else {
        _this.destination = EMPTY_OBSERVER;
      }
      return _this;
    }
    Subscriber.create = function (next, error, complete) {
      return new SafeSubscriber(next, error, complete);
    };
    Subscriber.prototype.next = function (value) {
      if (this.isStopped);
      else {
        this._next(value);
      }
    };
    Subscriber.prototype.error = function (err) {
      if (this.isStopped);
      else {
        this.isStopped = true;
        this._error(err);
      }
    };
    Subscriber.prototype.complete = function () {
      if (this.isStopped);
      else {
        this.isStopped = true;
        this._complete();
      }
    };
    Subscriber.prototype.unsubscribe = function () {
      if (!this.closed) {
        this.isStopped = true;
        _super.prototype.unsubscribe.call(this);
        this.destination = null;
      }
    };
    Subscriber.prototype._next = function (value) {
      this.destination.next(value);
    };
    Subscriber.prototype._error = function (err) {
      try {
        this.destination.error(err);
      } finally {
        this.unsubscribe();
      }
    };
    Subscriber.prototype._complete = function () {
      try {
        this.destination.complete();
      } finally {
        this.unsubscribe();
      }
    };
    return Subscriber;
  })(Subscription);
  var _bind = Function.prototype.bind;
  function bind$2(fn, thisArg) {
    return _bind.call(fn, thisArg);
  }
  var ConsumerObserver = (function () {
    function ConsumerObserver(partialObserver) {
      this.partialObserver = partialObserver;
    }
    ConsumerObserver.prototype.next = function (value) {
      var partialObserver = this.partialObserver;
      if (partialObserver.next) {
        try {
          partialObserver.next(value);
        } catch (error) {
          handleUnhandledError(error);
        }
      }
    };
    ConsumerObserver.prototype.error = function (err) {
      var partialObserver = this.partialObserver;
      if (partialObserver.error) {
        try {
          partialObserver.error(err);
        } catch (error) {
          handleUnhandledError(error);
        }
      } else {
        handleUnhandledError(err);
      }
    };
    ConsumerObserver.prototype.complete = function () {
      var partialObserver = this.partialObserver;
      if (partialObserver.complete) {
        try {
          partialObserver.complete();
        } catch (error) {
          handleUnhandledError(error);
        }
      }
    };
    return ConsumerObserver;
  })();
  var SafeSubscriber = (function (_super) {
    __extends(SafeSubscriber, _super);
    function SafeSubscriber(observerOrNext, error, complete) {
      var _this = _super.call(this) || this;
      var partialObserver;
      if (isFunction$2(observerOrNext) || !observerOrNext) {
        partialObserver = {
          next: observerOrNext !== null && observerOrNext !== void 0 ? observerOrNext : undefined,
          error: error !== null && error !== void 0 ? error : undefined,
          complete: complete !== null && complete !== void 0 ? complete : undefined,
        };
      } else {
        var context_1;
        if (_this && config.useDeprecatedNextContext) {
          context_1 = Object.create(observerOrNext);
          context_1.unsubscribe = function () {
            return _this.unsubscribe();
          };
          partialObserver = {
            next: observerOrNext.next && bind$2(observerOrNext.next, context_1),
            error: observerOrNext.error && bind$2(observerOrNext.error, context_1),
            complete: observerOrNext.complete && bind$2(observerOrNext.complete, context_1),
          };
        } else {
          partialObserver = observerOrNext;
        }
      }
      _this.destination = new ConsumerObserver(partialObserver);
      return _this;
    }
    return SafeSubscriber;
  })(Subscriber);
  function handleUnhandledError(error) {
    {
      reportUnhandledError(error);
    }
  }
  function defaultErrorHandler(err) {
    throw err;
  }
  var EMPTY_OBSERVER = {
    closed: true,
    next: noop,
    error: defaultErrorHandler,
    complete: noop,
  };

  var observable = (function () {
    return (typeof Symbol === 'function' && Symbol.observable) || '@@observable';
  })();

  function identity(x) {
    return x;
  }

  function pipeFromArray(fns) {
    if (fns.length === 0) {
      return identity;
    }
    if (fns.length === 1) {
      return fns[0];
    }
    return function piped(input) {
      return fns.reduce(function (prev, fn) {
        return fn(prev);
      }, input);
    };
  }

  var Observable = (function () {
    function Observable(subscribe) {
      if (subscribe) {
        this._subscribe = subscribe;
      }
    }
    Observable.prototype.lift = function (operator) {
      var observable = new Observable();
      observable.source = this;
      observable.operator = operator;
      return observable;
    };
    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
      var _this = this;
      var subscriber = isSubscriber(observerOrNext)
        ? observerOrNext
        : new SafeSubscriber(observerOrNext, error, complete);
      errorContext(function () {
        var _a = _this,
          operator = _a.operator,
          source = _a.source;
        subscriber.add(
          operator
            ? operator.call(subscriber, source)
            : source
              ? _this._subscribe(subscriber)
              : _this._trySubscribe(subscriber)
        );
      });
      return subscriber;
    };
    Observable.prototype._trySubscribe = function (sink) {
      try {
        return this._subscribe(sink);
      } catch (err) {
        sink.error(err);
      }
    };
    Observable.prototype.forEach = function (next, promiseCtor) {
      var _this = this;
      promiseCtor = getPromiseCtor(promiseCtor);
      return new promiseCtor(function (resolve, reject) {
        var subscriber = new SafeSubscriber({
          next: function (value) {
            try {
              next(value);
            } catch (err) {
              reject(err);
              subscriber.unsubscribe();
            }
          },
          error: reject,
          complete: resolve,
        });
        _this.subscribe(subscriber);
      });
    };
    Observable.prototype._subscribe = function (subscriber) {
      var _a;
      return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
    };
    Observable.prototype[observable] = function () {
      return this;
    };
    Observable.prototype.pipe = function () {
      var operations = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        operations[_i] = arguments[_i];
      }
      return pipeFromArray(operations)(this);
    };
    Observable.prototype.toPromise = function (promiseCtor) {
      var _this = this;
      promiseCtor = getPromiseCtor(promiseCtor);
      return new promiseCtor(function (resolve, reject) {
        var value;
        _this.subscribe(
          function (x) {
            return (value = x);
          },
          function (err) {
            return reject(err);
          },
          function () {
            return resolve(value);
          }
        );
      });
    };
    Observable.create = function (subscribe) {
      return new Observable(subscribe);
    };
    return Observable;
  })();
  function getPromiseCtor(promiseCtor) {
    var _a;
    return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : config.Promise) !== null &&
      _a !== void 0
      ? _a
      : Promise;
  }
  function isObserver(value) {
    return value && isFunction$2(value.next) && isFunction$2(value.error) && isFunction$2(value.complete);
  }
  function isSubscriber(value) {
    return (value && value instanceof Subscriber) || (isObserver(value) && isSubscription(value));
  }

  function hasLift(source) {
    return isFunction$2(source === null || source === void 0 ? void 0 : source.lift);
  }
  function operate(init) {
    return function (source) {
      if (hasLift(source)) {
        return source.lift(function (liftedSource) {
          try {
            return init(liftedSource, this);
          } catch (err) {
            this.error(err);
          }
        });
      }
      throw new TypeError('Unable to lift unknown Observable type');
    };
  }

  function createOperatorSubscriber(destination, onNext, onComplete, onError, onFinalize) {
    return new OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize);
  }
  var OperatorSubscriber = (function (_super) {
    __extends(OperatorSubscriber, _super);
    function OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize, shouldUnsubscribe) {
      var _this = _super.call(this, destination) || this;
      _this.onFinalize = onFinalize;
      _this.shouldUnsubscribe = shouldUnsubscribe;
      _this._next = onNext
        ? function (value) {
            try {
              onNext(value);
            } catch (err) {
              destination.error(err);
            }
          }
        : _super.prototype._next;
      _this._error = onError
        ? function (err) {
            try {
              onError(err);
            } catch (err) {
              destination.error(err);
            } finally {
              this.unsubscribe();
            }
          }
        : _super.prototype._error;
      _this._complete = onComplete
        ? function () {
            try {
              onComplete();
            } catch (err) {
              destination.error(err);
            } finally {
              this.unsubscribe();
            }
          }
        : _super.prototype._complete;
      return _this;
    }
    OperatorSubscriber.prototype.unsubscribe = function () {
      var _a;
      if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
        var closed_1 = this.closed;
        _super.prototype.unsubscribe.call(this);
        !closed_1 && ((_a = this.onFinalize) === null || _a === void 0 ? void 0 : _a.call(this));
      }
    };
    return OperatorSubscriber;
  })(Subscriber);

  var ObjectUnsubscribedError = createErrorClass(function (_super) {
    return function ObjectUnsubscribedErrorImpl() {
      _super(this);
      this.name = 'ObjectUnsubscribedError';
      this.message = 'object unsubscribed';
    };
  });

  var Subject = (function (_super) {
    __extends(Subject, _super);
    function Subject() {
      var _this = _super.call(this) || this;
      _this.closed = false;
      _this.currentObservers = null;
      _this.observers = [];
      _this.isStopped = false;
      _this.hasError = false;
      _this.thrownError = null;
      return _this;
    }
    Subject.prototype.lift = function (operator) {
      var subject = new AnonymousSubject(this, this);
      subject.operator = operator;
      return subject;
    };
    Subject.prototype._throwIfClosed = function () {
      if (this.closed) {
        throw new ObjectUnsubscribedError();
      }
    };
    Subject.prototype.next = function (value) {
      var _this = this;
      errorContext(function () {
        var e_1, _a;
        _this._throwIfClosed();
        if (!_this.isStopped) {
          if (!_this.currentObservers) {
            _this.currentObservers = Array.from(_this.observers);
          }
          try {
            for (var _b = __values(_this.currentObservers), _c = _b.next(); !_c.done; _c = _b.next()) {
              var observer = _c.value;
              observer.next(value);
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            } finally {
              if (e_1) throw e_1.error;
            }
          }
        }
      });
    };
    Subject.prototype.error = function (err) {
      var _this = this;
      errorContext(function () {
        _this._throwIfClosed();
        if (!_this.isStopped) {
          _this.hasError = _this.isStopped = true;
          _this.thrownError = err;
          var observers = _this.observers;
          while (observers.length) {
            observers.shift().error(err);
          }
        }
      });
    };
    Subject.prototype.complete = function () {
      var _this = this;
      errorContext(function () {
        _this._throwIfClosed();
        if (!_this.isStopped) {
          _this.isStopped = true;
          var observers = _this.observers;
          while (observers.length) {
            observers.shift().complete();
          }
        }
      });
    };
    Subject.prototype.unsubscribe = function () {
      this.isStopped = this.closed = true;
      this.observers = this.currentObservers = null;
    };
    Object.defineProperty(Subject.prototype, 'observed', {
      get: function () {
        var _a;
        return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
      },
      enumerable: false,
      configurable: true,
    });
    Subject.prototype._trySubscribe = function (subscriber) {
      this._throwIfClosed();
      return _super.prototype._trySubscribe.call(this, subscriber);
    };
    Subject.prototype._subscribe = function (subscriber) {
      this._throwIfClosed();
      this._checkFinalizedStatuses(subscriber);
      return this._innerSubscribe(subscriber);
    };
    Subject.prototype._innerSubscribe = function (subscriber) {
      var _this = this;
      var _a = this,
        hasError = _a.hasError,
        isStopped = _a.isStopped,
        observers = _a.observers;
      if (hasError || isStopped) {
        return EMPTY_SUBSCRIPTION;
      }
      this.currentObservers = null;
      observers.push(subscriber);
      return new Subscription(function () {
        _this.currentObservers = null;
        arrRemove(observers, subscriber);
      });
    };
    Subject.prototype._checkFinalizedStatuses = function (subscriber) {
      var _a = this,
        hasError = _a.hasError,
        thrownError = _a.thrownError,
        isStopped = _a.isStopped;
      if (hasError) {
        subscriber.error(thrownError);
      } else if (isStopped) {
        subscriber.complete();
      }
    };
    Subject.prototype.asObservable = function () {
      var observable = new Observable();
      observable.source = this;
      return observable;
    };
    Subject.create = function (destination, source) {
      return new AnonymousSubject(destination, source);
    };
    return Subject;
  })(Observable);
  var AnonymousSubject = (function (_super) {
    __extends(AnonymousSubject, _super);
    function AnonymousSubject(destination, source) {
      var _this = _super.call(this) || this;
      _this.destination = destination;
      _this.source = source;
      return _this;
    }
    AnonymousSubject.prototype.next = function (value) {
      var _a, _b;
      (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0
        ? void 0
        : _b.call(_a, value);
    };
    AnonymousSubject.prototype.error = function (err) {
      var _a, _b;
      (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0
        ? void 0
        : _b.call(_a, err);
    };
    AnonymousSubject.prototype.complete = function () {
      var _a, _b;
      (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0
        ? void 0
        : _b.call(_a);
    };
    AnonymousSubject.prototype._subscribe = function (subscriber) {
      var _a, _b;
      return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null &&
        _b !== void 0
        ? _b
        : EMPTY_SUBSCRIPTION;
    };
    return AnonymousSubject;
  })(Subject);

  var BehaviorSubject = (function (_super) {
    __extends(BehaviorSubject, _super);
    function BehaviorSubject(_value) {
      var _this = _super.call(this) || this;
      _this._value = _value;
      return _this;
    }
    Object.defineProperty(BehaviorSubject.prototype, 'value', {
      get: function () {
        return this.getValue();
      },
      enumerable: false,
      configurable: true,
    });
    BehaviorSubject.prototype._subscribe = function (subscriber) {
      var subscription = _super.prototype._subscribe.call(this, subscriber);
      !subscription.closed && subscriber.next(this._value);
      return subscription;
    };
    BehaviorSubject.prototype.getValue = function () {
      var _a = this,
        hasError = _a.hasError,
        thrownError = _a.thrownError,
        _value = _a._value;
      if (hasError) {
        throw thrownError;
      }
      this._throwIfClosed();
      return _value;
    };
    BehaviorSubject.prototype.next = function (value) {
      _super.prototype.next.call(this, (this._value = value));
    };
    return BehaviorSubject;
  })(Subject);

  function isScheduler(value) {
    return value && isFunction$2(value.schedule);
  }

  function last(arr) {
    return arr[arr.length - 1];
  }
  function popResultSelector(args) {
    return isFunction$2(last(args)) ? args.pop() : undefined;
  }
  function popScheduler(args) {
    return isScheduler(last(args)) ? args.pop() : undefined;
  }

  var isArrayLike = function (x) {
    return x && typeof x.length === 'number' && typeof x !== 'function';
  };

  function isPromise(value) {
    return isFunction$2(value === null || value === void 0 ? void 0 : value.then);
  }

  function isInteropObservable(input) {
    return isFunction$2(input[observable]);
  }

  function isAsyncIterable(obj) {
    return Symbol.asyncIterator && isFunction$2(obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]);
  }

  function createInvalidObservableTypeError(input) {
    return new TypeError(
      'You provided ' +
        (input !== null && typeof input === 'object' ? 'an invalid object' : "'" + input + "'") +
        ' where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.'
    );
  }

  function getSymbolIterator() {
    if (typeof Symbol !== 'function' || !Symbol.iterator) {
      return '@@iterator';
    }
    return Symbol.iterator;
  }
  var iterator = getSymbolIterator();

  function isIterable(input) {
    return isFunction$2(input === null || input === void 0 ? void 0 : input[iterator]);
  }

  function readableStreamLikeToAsyncGenerator(readableStream) {
    return __asyncGenerator(this, arguments, function readableStreamLikeToAsyncGenerator_1() {
      var reader, _a, value, done;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            reader = readableStream.getReader();
            _b.label = 1;
          case 1:
            _b.trys.push([1, , 9, 10]);
            _b.label = 2;
          case 2:
            return [4, __await(reader.read())];
          case 3:
            ((_a = _b.sent()), (value = _a.value), (done = _a.done));
            if (!done) return [3, 5];
            return [4, __await(void 0)];
          case 4:
            return [2, _b.sent()];
          case 5:
            return [4, __await(value)];
          case 6:
            return [4, _b.sent()];
          case 7:
            _b.sent();
            return [3, 2];
          case 8:
            return [3, 10];
          case 9:
            reader.releaseLock();
            return [7];
          case 10:
            return [2];
        }
      });
    });
  }
  function isReadableStreamLike(obj) {
    return isFunction$2(obj === null || obj === void 0 ? void 0 : obj.getReader);
  }

  function innerFrom(input) {
    if (input instanceof Observable) {
      return input;
    }
    if (input != null) {
      if (isInteropObservable(input)) {
        return fromInteropObservable(input);
      }
      if (isArrayLike(input)) {
        return fromArrayLike(input);
      }
      if (isPromise(input)) {
        return fromPromise(input);
      }
      if (isAsyncIterable(input)) {
        return fromAsyncIterable(input);
      }
      if (isIterable(input)) {
        return fromIterable(input);
      }
      if (isReadableStreamLike(input)) {
        return fromReadableStreamLike(input);
      }
    }
    throw createInvalidObservableTypeError(input);
  }
  function fromInteropObservable(obj) {
    return new Observable(function (subscriber) {
      var obs = obj[observable]();
      if (isFunction$2(obs.subscribe)) {
        return obs.subscribe(subscriber);
      }
      throw new TypeError('Provided object does not correctly implement Symbol.observable');
    });
  }
  function fromArrayLike(array) {
    return new Observable(function (subscriber) {
      for (var i = 0; i < array.length && !subscriber.closed; i++) {
        subscriber.next(array[i]);
      }
      subscriber.complete();
    });
  }
  function fromPromise(promise) {
    return new Observable(function (subscriber) {
      promise
        .then(
          function (value) {
            if (!subscriber.closed) {
              subscriber.next(value);
              subscriber.complete();
            }
          },
          function (err) {
            return subscriber.error(err);
          }
        )
        .then(null, reportUnhandledError);
    });
  }
  function fromIterable(iterable) {
    return new Observable(function (subscriber) {
      var e_1, _a;
      try {
        for (
          var iterable_1 = __values(iterable), iterable_1_1 = iterable_1.next();
          !iterable_1_1.done;
          iterable_1_1 = iterable_1.next()
        ) {
          var value = iterable_1_1.value;
          subscriber.next(value);
          if (subscriber.closed) {
            return;
          }
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (iterable_1_1 && !iterable_1_1.done && (_a = iterable_1.return)) _a.call(iterable_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      subscriber.complete();
    });
  }
  function fromAsyncIterable(asyncIterable) {
    return new Observable(function (subscriber) {
      process(asyncIterable, subscriber).catch(function (err) {
        return subscriber.error(err);
      });
    });
  }
  function fromReadableStreamLike(readableStream) {
    return fromAsyncIterable(readableStreamLikeToAsyncGenerator(readableStream));
  }
  function process(asyncIterable, subscriber) {
    var asyncIterable_1, asyncIterable_1_1;
    var e_2, _a;
    return __awaiter(this, void 0, void 0, function () {
      var value, e_2_1;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            _b.trys.push([0, 5, 6, 11]);
            asyncIterable_1 = __asyncValues(asyncIterable);
            _b.label = 1;
          case 1:
            return [4, asyncIterable_1.next()];
          case 2:
            if (!((asyncIterable_1_1 = _b.sent()), !asyncIterable_1_1.done)) return [3, 4];
            value = asyncIterable_1_1.value;
            subscriber.next(value);
            if (subscriber.closed) {
              return [2];
            }
            _b.label = 3;
          case 3:
            return [3, 1];
          case 4:
            return [3, 11];
          case 5:
            e_2_1 = _b.sent();
            e_2 = { error: e_2_1 };
            return [3, 11];
          case 6:
            _b.trys.push([6, , 9, 10]);
            if (!(asyncIterable_1_1 && !asyncIterable_1_1.done && (_a = asyncIterable_1.return))) return [3, 8];
            return [4, _a.call(asyncIterable_1)];
          case 7:
            _b.sent();
            _b.label = 8;
          case 8:
            return [3, 10];
          case 9:
            if (e_2) throw e_2.error;
            return [7];
          case 10:
            return [7];
          case 11:
            subscriber.complete();
            return [2];
        }
      });
    });
  }

  function executeSchedule(parentSubscription, scheduler, work, delay, repeat) {
    if (delay === void 0) {
      delay = 0;
    }
    if (repeat === void 0) {
      repeat = false;
    }
    var scheduleSubscription = scheduler.schedule(function () {
      work();
      if (repeat) {
        parentSubscription.add(this.schedule(null, delay));
      } else {
        this.unsubscribe();
      }
    }, delay);
    parentSubscription.add(scheduleSubscription);
    if (!repeat) {
      return scheduleSubscription;
    }
  }

  function observeOn(scheduler, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    return operate(function (source, subscriber) {
      source.subscribe(
        createOperatorSubscriber(
          subscriber,
          function (value) {
            return executeSchedule(
              subscriber,
              scheduler,
              function () {
                return subscriber.next(value);
              },
              delay
            );
          },
          function () {
            return executeSchedule(
              subscriber,
              scheduler,
              function () {
                return subscriber.complete();
              },
              delay
            );
          },
          function (err) {
            return executeSchedule(
              subscriber,
              scheduler,
              function () {
                return subscriber.error(err);
              },
              delay
            );
          }
        )
      );
    });
  }

  function subscribeOn(scheduler, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    return operate(function (source, subscriber) {
      subscriber.add(
        scheduler.schedule(function () {
          return source.subscribe(subscriber);
        }, delay)
      );
    });
  }

  function scheduleObservable(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
  }

  function schedulePromise(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
  }

  function scheduleArray(input, scheduler) {
    return new Observable(function (subscriber) {
      var i = 0;
      return scheduler.schedule(function () {
        if (i === input.length) {
          subscriber.complete();
        } else {
          subscriber.next(input[i++]);
          if (!subscriber.closed) {
            this.schedule();
          }
        }
      });
    });
  }

  function scheduleIterable(input, scheduler) {
    return new Observable(function (subscriber) {
      var iterator$1;
      executeSchedule(subscriber, scheduler, function () {
        iterator$1 = input[iterator]();
        executeSchedule(
          subscriber,
          scheduler,
          function () {
            var _a;
            var value;
            var done;
            try {
              ((_a = iterator$1.next()), (value = _a.value), (done = _a.done));
            } catch (err) {
              subscriber.error(err);
              return;
            }
            if (done) {
              subscriber.complete();
            } else {
              subscriber.next(value);
            }
          },
          0,
          true
        );
      });
      return function () {
        return (
          isFunction$2(iterator$1 === null || iterator$1 === void 0 ? void 0 : iterator$1.return) && iterator$1.return()
        );
      };
    });
  }

  function scheduleAsyncIterable(input, scheduler) {
    if (!input) {
      throw new Error('Iterable cannot be null');
    }
    return new Observable(function (subscriber) {
      executeSchedule(subscriber, scheduler, function () {
        var iterator = input[Symbol.asyncIterator]();
        executeSchedule(
          subscriber,
          scheduler,
          function () {
            iterator.next().then(function (result) {
              if (result.done) {
                subscriber.complete();
              } else {
                subscriber.next(result.value);
              }
            });
          },
          0,
          true
        );
      });
    });
  }

  function scheduleReadableStreamLike(input, scheduler) {
    return scheduleAsyncIterable(readableStreamLikeToAsyncGenerator(input), scheduler);
  }

  function scheduled(input, scheduler) {
    if (input != null) {
      if (isInteropObservable(input)) {
        return scheduleObservable(input, scheduler);
      }
      if (isArrayLike(input)) {
        return scheduleArray(input, scheduler);
      }
      if (isPromise(input)) {
        return schedulePromise(input, scheduler);
      }
      if (isAsyncIterable(input)) {
        return scheduleAsyncIterable(input, scheduler);
      }
      if (isIterable(input)) {
        return scheduleIterable(input, scheduler);
      }
      if (isReadableStreamLike(input)) {
        return scheduleReadableStreamLike(input, scheduler);
      }
    }
    throw createInvalidObservableTypeError(input);
  }

  function from(input, scheduler) {
    return scheduler ? scheduled(input, scheduler) : innerFrom(input);
  }

  function map$1(project, thisArg) {
    return operate(function (source, subscriber) {
      var index = 0;
      source.subscribe(
        createOperatorSubscriber(subscriber, function (value) {
          subscriber.next(project.call(thisArg, value, index++));
        })
      );
    });
  }

  var isArray$1 = Array.isArray;
  function callOrApply(fn, args) {
    return isArray$1(args) ? fn.apply(void 0, __spreadArray([], __read(args))) : fn(args);
  }
  function mapOneOrManyArgs(fn) {
    return map$1(function (args) {
      return callOrApply(fn, args);
    });
  }

  var isArray = Array.isArray;
  var getPrototypeOf = Object.getPrototypeOf,
    objectProto = Object.prototype,
    getKeys = Object.keys;
  function argsArgArrayOrObject(args) {
    if (args.length === 1) {
      var first_1 = args[0];
      if (isArray(first_1)) {
        return { args: first_1, keys: null };
      }
      if (isPOJO(first_1)) {
        var keys = getKeys(first_1);
        return {
          args: keys.map(function (key) {
            return first_1[key];
          }),
          keys: keys,
        };
      }
    }
    return { args: args, keys: null };
  }
  function isPOJO(obj) {
    return obj && typeof obj === 'object' && getPrototypeOf(obj) === objectProto;
  }

  function createObject(keys, values) {
    return keys.reduce(function (result, key, i) {
      return ((result[key] = values[i]), result);
    }, {});
  }

  function combineLatest() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    var resultSelector = popResultSelector(args);
    var _a = argsArgArrayOrObject(args),
      observables = _a.args,
      keys = _a.keys;
    if (observables.length === 0) {
      return from([], scheduler);
    }
    var result = new Observable(
      combineLatestInit(
        observables,
        scheduler,
        keys
          ? function (values) {
              return createObject(keys, values);
            }
          : identity
      )
    );
    return resultSelector ? result.pipe(mapOneOrManyArgs(resultSelector)) : result;
  }
  function combineLatestInit(observables, scheduler, valueTransform) {
    if (valueTransform === void 0) {
      valueTransform = identity;
    }
    return function (subscriber) {
      maybeSchedule(
        scheduler,
        function () {
          var length = observables.length;
          var values = new Array(length);
          var active = length;
          var remainingFirstValues = length;
          var _loop_1 = function (i) {
            maybeSchedule(
              scheduler,
              function () {
                var source = from(observables[i], scheduler);
                var hasFirstValue = false;
                source.subscribe(
                  createOperatorSubscriber(
                    subscriber,
                    function (value) {
                      values[i] = value;
                      if (!hasFirstValue) {
                        hasFirstValue = true;
                        remainingFirstValues--;
                      }
                      if (!remainingFirstValues) {
                        subscriber.next(valueTransform(values.slice()));
                      }
                    },
                    function () {
                      if (!--active) {
                        subscriber.complete();
                      }
                    }
                  )
                );
              },
              subscriber
            );
          };
          for (var i = 0; i < length; i++) {
            _loop_1(i);
          }
        },
        subscriber
      );
    };
  }
  function maybeSchedule(scheduler, execute, subscription) {
    if (scheduler) {
      executeSchedule(subscription, scheduler, execute);
    } else {
      execute();
    }
  }

  const subject = new BehaviorSubject(false);
  const env = {
    isDevelopment: () => subject.getValue(),
    set: (isDevelopment) => {
      subject.next(isDevelopment);
    },
    subject,
  };

  const ACCOUNT_PREFIX = 'account:';
  const ADDRESS_PREFIX = 'address:';
  const CONTRACT_PREFIX = 'contract:';
  function toHex(address) {
    return util$7.u8aToHex(keyring$1.decodeAddress(address, true));
  }
  const accountKey = (address) => `${ACCOUNT_PREFIX}${toHex(address)}`;
  const addressKey = (address) => `${ADDRESS_PREFIX}${toHex(address)}`;
  const contractKey = (address) => `${CONTRACT_PREFIX}${toHex(address)}`;
  const accountRegex = new RegExp(`^${ACCOUNT_PREFIX}0x[0-9a-f]*`, '');
  const addressRegex = new RegExp(`^${ADDRESS_PREFIX}0x[0-9a-f]*`, '');
  const contractRegex = new RegExp(`^${CONTRACT_PREFIX}0x[0-9a-f]*`, '');

  function createOptionItem(address, _name) {
    const name = util$7.isUndefined(_name)
      ? address.length > 15
        ? `${address.slice(0, 6)}…${address.slice(-6)}`
        : address
      : _name;
    return {
      key: address,
      name,
      value: address,
    };
  }

  function callNext(current, subject, withTest) {
    const isDevMode = env.isDevelopment();
    const filtered = {};
    Object.keys(current).forEach((key) => {
      const { json: { meta: { isTesting = false } = {} } = {} } = current[key];
      if (!withTest || isDevMode || isTesting !== true) {
        filtered[key] = current[key];
      }
    });
    subject.next(filtered);
  }
  function genericSubject(keyCreator, withTest = false) {
    let current = {};
    const subject = new BehaviorSubject({});
    const next = () => callNext(current, subject, withTest);
    env.subject.subscribe(next);
    return {
      add: (store, address, json, type) => {
        current = util$7.objectCopy(current);
        current[address] = {
          json: util$7.objectSpread({}, json, {
            address,
          }),
          option: createOptionItem(address, json.meta.name),
          type,
        };
        if (!json.meta.isInjected && (!json.meta.isTesting || env.isDevelopment())) {
          store.set(keyCreator(address), json);
        }
        next();
        return current[address];
      },
      remove: (store, address) => {
        current = util$7.objectCopy(current);
        delete current[address];
        store.remove(keyCreator(address));
        next();
      },
      subject,
    };
  }

  const accounts = genericSubject(accountKey, true);

  const addresses = genericSubject(addressKey);

  const contracts = genericSubject(contractKey);

  var commonjsGlobal =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined'
          ? global
          : typeof self !== 'undefined'
            ? self
            : {};

  var assign = make_assign();
  var create$1 = make_create();
  var trim$1 = make_trim();
  var Global$5 = typeof window !== 'undefined' ? window : commonjsGlobal;
  var util$6 = {
    assign: assign,
    create: create$1,
    trim: trim$1,
    bind: bind$1,
    slice: slice$1,
    each: each$7,
    map: map,
    pluck: pluck$1,
    isList: isList$1,
    isFunction: isFunction$1,
    isObject: isObject$1,
    Global: Global$5,
  };
  function make_assign() {
    if (Object.assign) {
      return Object.assign;
    } else {
      return function shimAssign(obj, props1, props2, etc) {
        for (var i = 1; i < arguments.length; i++) {
          each$7(Object(arguments[i]), function (val, key) {
            obj[key] = val;
          });
        }
        return obj;
      };
    }
  }
  function make_create() {
    if (Object.create) {
      return function create(obj, assignProps1, assignProps2, etc) {
        var assignArgsList = slice$1(arguments, 1);
        return assign.apply(this, [Object.create(obj)].concat(assignArgsList));
      };
    } else {
      function F() {}
      return function create(obj, assignProps1, assignProps2, etc) {
        var assignArgsList = slice$1(arguments, 1);
        F.prototype = obj;
        return assign.apply(this, [new F()].concat(assignArgsList));
      };
    }
  }
  function make_trim() {
    if (String.prototype.trim) {
      return function trim(str) {
        return String.prototype.trim.call(str);
      };
    } else {
      return function trim(str) {
        return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
      };
    }
  }
  function bind$1(obj, fn) {
    return function () {
      return fn.apply(obj, Array.prototype.slice.call(arguments, 0));
    };
  }
  function slice$1(arr, index) {
    return Array.prototype.slice.call(arr, index || 0);
  }
  function each$7(obj, fn) {
    pluck$1(obj, function (val, key) {
      fn(val, key);
      return false;
    });
  }
  function map(obj, fn) {
    var res = isList$1(obj) ? [] : {};
    pluck$1(obj, function (v, k) {
      res[k] = fn(v, k);
      return false;
    });
    return res;
  }
  function pluck$1(obj, fn) {
    if (isList$1(obj)) {
      for (var i = 0; i < obj.length; i++) {
        if (fn(obj[i], i)) {
          return obj[i];
        }
      }
    } else {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (fn(obj[key], key)) {
            return obj[key];
          }
        }
      }
    }
  }
  function isList$1(val) {
    return val != null && typeof val != 'function' && typeof val.length == 'number';
  }
  function isFunction$1(val) {
    return val && {}.toString.call(val) === '[object Function]';
  }
  function isObject$1(val) {
    return val && {}.toString.call(val) === '[object Object]';
  }

  var util$5 = util$6;
  var slice = util$5.slice;
  var pluck = util$5.pluck;
  var each$6 = util$5.each;
  var bind = util$5.bind;
  var create = util$5.create;
  var isList = util$5.isList;
  var isFunction = util$5.isFunction;
  var isObject = util$5.isObject;
  var storeEngine = {
    createStore: createStore,
  };
  var storeAPI = {
    version: '2.0.12',
    enabled: false,
    get: function (key, optionalDefaultValue) {
      var data = this.storage.read(this._namespacePrefix + key);
      return this._deserialize(data, optionalDefaultValue);
    },
    set: function (key, value) {
      if (value === undefined) {
        return this.remove(key);
      }
      this.storage.write(this._namespacePrefix + key, this._serialize(value));
      return value;
    },
    remove: function (key) {
      this.storage.remove(this._namespacePrefix + key);
    },
    each: function (callback) {
      var self = this;
      this.storage.each(function (val, namespacedKey) {
        callback.call(self, self._deserialize(val), (namespacedKey || '').replace(self._namespaceRegexp, ''));
      });
    },
    clearAll: function () {
      this.storage.clearAll();
    },
    hasNamespace: function (namespace) {
      return this._namespacePrefix == '__storejs_' + namespace + '_';
    },
    createStore: function () {
      return createStore.apply(this, arguments);
    },
    addPlugin: function (plugin) {
      this._addPlugin(plugin);
    },
    namespace: function (namespace) {
      return createStore(this.storage, this.plugins, namespace);
    },
  };
  function _warn() {
    var _console = typeof console == 'undefined' ? null : console;
    if (!_console) {
      return;
    }
    var fn = _console.warn ? _console.warn : _console.log;
    fn.apply(_console, arguments);
  }
  function createStore(storages, plugins, namespace) {
    if (!namespace) {
      namespace = '';
    }
    if (storages && !isList(storages)) {
      storages = [storages];
    }
    if (plugins && !isList(plugins)) {
      plugins = [plugins];
    }
    var namespacePrefix = namespace ? '__storejs_' + namespace + '_' : '';
    var namespaceRegexp = namespace ? new RegExp('^' + namespacePrefix) : null;
    var legalNamespaces = /^[a-zA-Z0-9_\-]*$/;
    if (!legalNamespaces.test(namespace)) {
      throw new Error('store.js namespaces can only have alphanumerics + underscores and dashes');
    }
    var _privateStoreProps = {
      _namespacePrefix: namespacePrefix,
      _namespaceRegexp: namespaceRegexp,
      _testStorage: function (storage) {
        try {
          var testStr = '__storejs__test__';
          storage.write(testStr, testStr);
          var ok = storage.read(testStr) === testStr;
          storage.remove(testStr);
          return ok;
        } catch (e) {
          return false;
        }
      },
      _assignPluginFnProp: function (pluginFnProp, propName) {
        var oldFn = this[propName];
        this[propName] = function pluginFn() {
          var args = slice(arguments, 0);
          var self = this;
          function super_fn() {
            if (!oldFn) {
              return;
            }
            each$6(arguments, function (arg, i) {
              args[i] = arg;
            });
            return oldFn.apply(self, args);
          }
          var newFnArgs = [super_fn].concat(args);
          return pluginFnProp.apply(self, newFnArgs);
        };
      },
      _serialize: function (obj) {
        return JSON.stringify(obj);
      },
      _deserialize: function (strVal, defaultVal) {
        if (!strVal) {
          return defaultVal;
        }
        var val = '';
        try {
          val = JSON.parse(strVal);
        } catch (e) {
          val = strVal;
        }
        return val !== undefined ? val : defaultVal;
      },
      _addStorage: function (storage) {
        if (this.enabled) {
          return;
        }
        if (this._testStorage(storage)) {
          this.storage = storage;
          this.enabled = true;
        }
      },
      _addPlugin: function (plugin) {
        var self = this;
        if (isList(plugin)) {
          each$6(plugin, function (plugin) {
            self._addPlugin(plugin);
          });
          return;
        }
        var seenPlugin = pluck(this.plugins, function (seenPlugin) {
          return plugin === seenPlugin;
        });
        if (seenPlugin) {
          return;
        }
        this.plugins.push(plugin);
        if (!isFunction(plugin)) {
          throw new Error('Plugins must be function values that return objects');
        }
        var pluginProperties = plugin.call(this);
        if (!isObject(pluginProperties)) {
          throw new Error('Plugins must return an object of function properties');
        }
        each$6(pluginProperties, function (pluginFnProp, propName) {
          if (!isFunction(pluginFnProp)) {
            throw new Error(
              'Bad plugin property: ' +
                propName +
                ' from plugin ' +
                plugin.name +
                '. Plugins should only return functions.'
            );
          }
          self._assignPluginFnProp(pluginFnProp, propName);
        });
      },
      addStorage: function (storage) {
        _warn('store.addStorage(storage) is deprecated. Use createStore([storages])');
        this._addStorage(storage);
      },
    };
    var store = create(_privateStoreProps, storeAPI, {
      plugins: [],
    });
    store.raw = {};
    each$6(store, function (prop, propName) {
      if (isFunction(prop)) {
        store.raw[propName] = bind(store, prop);
      }
    });
    each$6(storages, function (storage) {
      store._addStorage(storage);
    });
    each$6(plugins, function (plugin) {
      store._addPlugin(plugin);
    });
    return store;
  }

  var util$4 = util$6;
  var Global$4 = util$4.Global;
  var localStorage_1 = {
    name: 'localStorage',
    read: read$5,
    write: write$5,
    each: each$5,
    remove: remove$5,
    clearAll: clearAll$5,
  };
  function localStorage() {
    return Global$4.localStorage;
  }
  function read$5(key) {
    return localStorage().getItem(key);
  }
  function write$5(key, data) {
    return localStorage().setItem(key, data);
  }
  function each$5(fn) {
    for (var i = localStorage().length - 1; i >= 0; i--) {
      var key = localStorage().key(i);
      fn(read$5(key), key);
    }
  }
  function remove$5(key) {
    return localStorage().removeItem(key);
  }
  function clearAll$5() {
    return localStorage().clear();
  }

  var util$3 = util$6;
  var Global$3 = util$3.Global;
  var oldFFGlobalStorage = {
    name: 'oldFF-globalStorage',
    read: read$4,
    write: write$4,
    each: each$4,
    remove: remove$4,
    clearAll: clearAll$4,
  };
  var globalStorage = Global$3.globalStorage;
  function read$4(key) {
    return globalStorage[key];
  }
  function write$4(key, data) {
    globalStorage[key] = data;
  }
  function each$4(fn) {
    for (var i = globalStorage.length - 1; i >= 0; i--) {
      var key = globalStorage.key(i);
      fn(globalStorage[key], key);
    }
  }
  function remove$4(key) {
    return globalStorage.removeItem(key);
  }
  function clearAll$4() {
    each$4(function (key, _) {
      delete globalStorage[key];
    });
  }

  var util$2 = util$6;
  var Global$2 = util$2.Global;
  var oldIEUserDataStorage = {
    name: 'oldIE-userDataStorage',
    write: write$3,
    read: read$3,
    each: each$3,
    remove: remove$3,
    clearAll: clearAll$3,
  };
  var storageName = 'storejs';
  var doc$1 = Global$2.document;
  var _withStorageEl = _makeIEStorageElFunction();
  var disable = (Global$2.navigator ? Global$2.navigator.userAgent : '').match(/ (MSIE 8|MSIE 9|MSIE 10)\./);
  function write$3(unfixedKey, data) {
    if (disable) {
      return;
    }
    var fixedKey = fixKey(unfixedKey);
    _withStorageEl(function (storageEl) {
      storageEl.setAttribute(fixedKey, data);
      storageEl.save(storageName);
    });
  }
  function read$3(unfixedKey) {
    if (disable) {
      return;
    }
    var fixedKey = fixKey(unfixedKey);
    var res = null;
    _withStorageEl(function (storageEl) {
      res = storageEl.getAttribute(fixedKey);
    });
    return res;
  }
  function each$3(callback) {
    _withStorageEl(function (storageEl) {
      var attributes = storageEl.XMLDocument.documentElement.attributes;
      for (var i = attributes.length - 1; i >= 0; i--) {
        var attr = attributes[i];
        callback(storageEl.getAttribute(attr.name), attr.name);
      }
    });
  }
  function remove$3(unfixedKey) {
    var fixedKey = fixKey(unfixedKey);
    _withStorageEl(function (storageEl) {
      storageEl.removeAttribute(fixedKey);
      storageEl.save(storageName);
    });
  }
  function clearAll$3() {
    _withStorageEl(function (storageEl) {
      var attributes = storageEl.XMLDocument.documentElement.attributes;
      storageEl.load(storageName);
      for (var i = attributes.length - 1; i >= 0; i--) {
        storageEl.removeAttribute(attributes[i].name);
      }
      storageEl.save(storageName);
    });
  }
  var forbiddenCharsRegex = new RegExp('[!"#$%&\'()*+,/\\\\:;<=>?@[\\]^`{|}~]', 'g');
  function fixKey(key) {
    return key.replace(/^\d/, '___$&').replace(forbiddenCharsRegex, '___');
  }
  function _makeIEStorageElFunction() {
    if (!doc$1 || !doc$1.documentElement || !doc$1.documentElement.addBehavior) {
      return null;
    }
    var scriptTag = 'script',
      storageOwner,
      storageContainer,
      storageEl;
    try {
      storageContainer = new ActiveXObject('htmlfile');
      storageContainer.open();
      storageContainer.write(
        '<' + scriptTag + '>document.w=window</' + scriptTag + '><iframe src="/favicon.ico"></iframe>'
      );
      storageContainer.close();
      storageOwner = storageContainer.w.frames[0].document;
      storageEl = storageOwner.createElement('div');
    } catch (e) {
      storageEl = doc$1.createElement('div');
      storageOwner = doc$1.body;
    }
    return function (storeFunction) {
      var args = [].slice.call(arguments, 0);
      args.unshift(storageEl);
      storageOwner.appendChild(storageEl);
      storageEl.addBehavior('#default#userData');
      storageEl.load(storageName);
      storeFunction.apply(this, args);
      storageOwner.removeChild(storageEl);
      return;
    };
  }

  var util$1 = util$6;
  var Global$1 = util$1.Global;
  var trim = util$1.trim;
  var cookieStorage = {
    name: 'cookieStorage',
    read: read$2,
    write: write$2,
    each: each$2,
    remove: remove$2,
    clearAll: clearAll$2,
  };
  var doc = Global$1.document;
  function read$2(key) {
    if (!key || !_has(key)) {
      return null;
    }
    var regexpStr = '(?:^|.*;\\s*)' + escape(key).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*';
    return unescape(doc.cookie.replace(new RegExp(regexpStr), '$1'));
  }
  function each$2(callback) {
    var cookies = doc.cookie.split(/; ?/g);
    for (var i = cookies.length - 1; i >= 0; i--) {
      if (!trim(cookies[i])) {
        continue;
      }
      var kvp = cookies[i].split('=');
      var key = unescape(kvp[0]);
      var val = unescape(kvp[1]);
      callback(val, key);
    }
  }
  function write$2(key, data) {
    if (!key) {
      return;
    }
    doc.cookie = escape(key) + '=' + escape(data) + '; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/';
  }
  function remove$2(key) {
    if (!key || !_has(key)) {
      return;
    }
    doc.cookie = escape(key) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  }
  function clearAll$2() {
    each$2(function (_, key) {
      remove$2(key);
    });
  }
  function _has(key) {
    return new RegExp('(?:^|;\\s*)' + escape(key).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=').test(doc.cookie);
  }

  var util = util$6;
  var Global = util.Global;
  var sessionStorage_1 = {
    name: 'sessionStorage',
    read: read$1,
    write: write$1,
    each: each$1,
    remove: remove$1,
    clearAll: clearAll$1,
  };
  function sessionStorage() {
    return Global.sessionStorage;
  }
  function read$1(key) {
    return sessionStorage().getItem(key);
  }
  function write$1(key, data) {
    return sessionStorage().setItem(key, data);
  }
  function each$1(fn) {
    for (var i = sessionStorage().length - 1; i >= 0; i--) {
      var key = sessionStorage().key(i);
      fn(read$1(key), key);
    }
  }
  function remove$1(key) {
    return sessionStorage().removeItem(key);
  }
  function clearAll$1() {
    return sessionStorage().clear();
  }

  var memoryStorage_1 = {
    name: 'memoryStorage',
    read: read,
    write: write,
    each: each,
    remove: remove,
    clearAll: clearAll,
  };
  var memoryStorage = {};
  function read(key) {
    return memoryStorage[key];
  }
  function write(key, data) {
    memoryStorage[key] = data;
  }
  function each(callback) {
    for (var key in memoryStorage) {
      if (memoryStorage.hasOwnProperty(key)) {
        callback(memoryStorage[key], key);
      }
    }
  }
  function remove(key) {
    delete memoryStorage[key];
  }
  function clearAll(key) {
    memoryStorage = {};
  }

  var all = [
    localStorage_1,
    oldFFGlobalStorage,
    oldIEUserDataStorage,
    cookieStorage,
    sessionStorage_1,
    memoryStorage_1,
  ];

  var json2$1 = {};

  var hasRequiredJson2;
  function requireJson2() {
    if (hasRequiredJson2) return json2$1;
    hasRequiredJson2 = 1;
    if (typeof JSON !== 'object') {
      JSON = {};
    }
    (function () {
      var rx_one = /^[\],:{}\s]*$/;
      var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
      var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
      var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
      var rx_escapable =
        /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
      var rx_dangerous =
        /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
      function f(n) {
        return n < 10 ? '0' + n : n;
      }
      function this_value() {
        return this.valueOf();
      }
      if (typeof Date.prototype.toJSON !== 'function') {
        Date.prototype.toJSON = function () {
          return isFinite(this.valueOf())
            ? this.getUTCFullYear() +
                '-' +
                f(this.getUTCMonth() + 1) +
                '-' +
                f(this.getUTCDate()) +
                'T' +
                f(this.getUTCHours()) +
                ':' +
                f(this.getUTCMinutes()) +
                ':' +
                f(this.getUTCSeconds()) +
                'Z'
            : null;
        };
        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
      }
      var gap;
      var indent;
      var meta;
      var rep;
      function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
          ? '"' +
              string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
              }) +
              '"'
          : '"' + string + '"';
      }
      function str(key, holder) {
        var i;
        var k;
        var v;
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];
        if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
          value = value.toJSON(key);
        }
        if (typeof rep === 'function') {
          value = rep.call(holder, key, value);
        }
        switch (typeof value) {
          case 'string':
            return quote(value);
          case 'number':
            return isFinite(value) ? String(value) : 'null';
          case 'boolean':
          case 'null':
            return String(value);
          case 'object':
            if (!value) {
              return 'null';
            }
            gap += indent;
            partial = [];
            if (Object.prototype.toString.apply(value) === '[object Array]') {
              length = value.length;
              for (i = 0; i < length; i += 1) {
                partial[i] = str(i, value) || 'null';
              }
              v =
                partial.length === 0
                  ? '[]'
                  : gap
                    ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                    : '[' + partial.join(',') + ']';
              gap = mind;
              return v;
            }
            if (rep && typeof rep === 'object') {
              length = rep.length;
              for (i = 0; i < length; i += 1) {
                if (typeof rep[i] === 'string') {
                  k = rep[i];
                  v = str(k, value);
                  if (v) {
                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                  }
                }
              }
            } else {
              for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                  v = str(k, value);
                  if (v) {
                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                  }
                }
              }
            }
            v =
              partial.length === 0
                ? '{}'
                : gap
                  ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                  : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
      }
      if (typeof JSON.stringify !== 'function') {
        meta = {
          '\b': '\\b',
          '\t': '\\t',
          '\n': '\\n',
          '\f': '\\f',
          '\r': '\\r',
          '"': '\\"',
          '\\': '\\\\',
        };
        JSON.stringify = function (value, replacer, space) {
          var i;
          gap = '';
          indent = '';
          if (typeof space === 'number') {
            for (i = 0; i < space; i += 1) {
              indent += ' ';
            }
          } else if (typeof space === 'string') {
            indent = space;
          }
          rep = replacer;
          if (
            replacer &&
            typeof replacer !== 'function' &&
            (typeof replacer !== 'object' || typeof replacer.length !== 'number')
          ) {
            throw new Error('JSON.stringify');
          }
          return str('', { '': value });
        };
      }
      if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {
          var j;
          function walk(holder, key) {
            var k;
            var v;
            var value = holder[key];
            if (value && typeof value === 'object') {
              for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                  v = walk(value, k);
                  if (v !== undefined) {
                    value[k] = v;
                  } else {
                    delete value[k];
                  }
                }
              }
            }
            return reviver.call(holder, key, value);
          }
          text = String(text);
          rx_dangerous.lastIndex = 0;
          if (rx_dangerous.test(text)) {
            text = text.replace(rx_dangerous, function (a) {
              return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
          }
          if (rx_one.test(text.replace(rx_two, '@').replace(rx_three, ']').replace(rx_four, ''))) {
            j = eval('(' + text + ')');
            return typeof reviver === 'function' ? walk({ '': j }, '') : j;
          }
          throw new SyntaxError('JSON.parse');
        };
      }
    })();
    return json2$1;
  }

  var json2 = json2Plugin;
  function json2Plugin() {
    requireJson2();
    return {};
  }

  var engine = storeEngine;
  var storages = all;
  var plugins = [json2];
  var store_legacy = engine.createStore(storages, plugins);

  class BrowserStore {
    all(fn) {
      store_legacy.each((value, key) => {
        fn(key, value);
      });
    }
    get(key, fn) {
      fn(store_legacy.get(key));
    }
    remove(key, fn) {
      store_legacy.remove(key);
      fn && fn();
    }
    set(key, value, fn) {
      store_legacy.set(key, value);
      fn && fn();
    }
  }

  class Base {
    #accounts;
    #addresses;
    #contracts;
    #keyring;
    _genesisHashAdd = [];
    constructor() {
      this.#accounts = accounts;
      this.#addresses = addresses;
      this.#contracts = contracts;
      this._store = new BrowserStore();
    }
    get accounts() {
      return this.#accounts;
    }
    get addresses() {
      return this.#addresses;
    }
    get contracts() {
      return this.#contracts;
    }
    get keyring() {
      if (this.#keyring) {
        return this.#keyring;
      }
      throw new Error("Keyring should be initialised via 'loadAll' before use");
    }
    get genesisHash() {
      return this._genesisHash;
    }
    get genesisHashes() {
      return this._genesisHash ? [this._genesisHash, ...this._genesisHashAdd] : [...this._genesisHashAdd];
    }
    decodeAddress = (key, ignoreChecksum, ss58Format) => {
      return this.keyring.decodeAddress(key, ignoreChecksum, ss58Format);
    };
    encodeAddress = (key, ss58Format) => {
      return this.keyring.encodeAddress(key, ss58Format);
    };
    getPair(address) {
      return this.keyring.getPair(address);
    }
    getPairs() {
      return this.keyring.getPairs().filter((pair) => env.isDevelopment() || pair.meta.isTesting !== true);
    }
    isAvailable(_address) {
      const accountsValue = this.accounts.subject.getValue();
      const addressesValue = this.addresses.subject.getValue();
      const contractsValue = this.contracts.subject.getValue();
      const address = util$7.isString(_address) ? _address : this.encodeAddress(_address);
      return !accountsValue[address] && !addressesValue[address] && !contractsValue[address];
    }
    isPassValid(password) {
      return password.length > 0;
    }
    setSS58Format(ss58Format) {
      if (this.#keyring && util$7.isNumber(ss58Format)) {
        this.#keyring.setSS58Format(ss58Format);
      }
    }
    setDevMode(isDevelopment) {
      env.set(isDevelopment);
    }
    initKeyring(options) {
      const keyring = keyring$1.createTestKeyring(options, true);
      if (util$7.isBoolean(options.isDevelopment)) {
        this.setDevMode(options.isDevelopment);
      }
      this.#keyring = keyring;
      this._genesisHash =
        options.genesisHash &&
        (util$7.isString(options.genesisHash) ? options.genesisHash.toString() : options.genesisHash.toHex());
      this._genesisHashAdd = options.genesisHashAdd || [];
      this._store = options.store || this._store;
      this.addAccountPairs();
    }
    addAccountPairs() {
      this.keyring.getPairs().forEach(({ address, meta }) => {
        this.accounts.add(this._store, address, {
          address,
          meta,
        });
      });
    }
    addTimestamp(pair) {
      if (!pair.meta.whenCreated) {
        pair.setMeta({
          whenCreated: Date.now(),
        });
      }
    }
  }

  const obervableAll = combineLatest([accounts.subject, addresses.subject, contracts.subject]).pipe(
    map$1(([accounts, addresses, contracts]) => ({
      accounts,
      addresses,
      contracts,
    }))
  );

  let hasCalledInitOptions = false;
  const sortByName = (a, b) => {
    const valueA = a.option.name;
    const valueB = b.option.name;
    return valueA.localeCompare(valueB);
  };
  const sortByCreated = (a, b) => {
    const valueA = a.json.meta.whenCreated || 0;
    const valueB = b.json.meta.whenCreated || 0;
    if (valueA < valueB) {
      return 1;
    }
    if (valueA > valueB) {
      return -1;
    }
    return 0;
  };
  class KeyringOption {
    optionsSubject = new BehaviorSubject(this.emptyOptions());
    createOptionHeader(name) {
      return {
        key: `header-${name.toLowerCase()}`,
        name,
        value: null,
      };
    }
    init(keyring) {
      util$7.assert(!hasCalledInitOptions, 'Unable to initialise options more than once');
      obervableAll.subscribe(() => {
        const opts = this.emptyOptions();
        this.addAccounts(keyring, opts);
        this.addAddresses(keyring, opts);
        this.addContracts(keyring, opts);
        opts.address = this.linkItems({
          Addresses: opts.address,
          Recent: opts.recent,
        });
        opts.account = this.linkItems({
          Accounts: opts.account,
          Development: opts.testing,
        });
        opts.contract = this.linkItems({
          Contracts: opts.contract,
        });
        opts.all = [].concat(opts.account, opts.address);
        opts.allPlus = [].concat(opts.account, opts.address, opts.contract);
        this.optionsSubject.next(opts);
      });
      hasCalledInitOptions = true;
    }
    linkItems(items) {
      return Object.keys(items).reduce((result, header) => {
        const options = items[header];
        return result.concat(options.length ? [this.createOptionHeader(header)] : [], options);
      }, []);
    }
    addAccounts(keyring, options) {
      const available = keyring.accounts.subject.getValue();
      Object.values(available)
        .sort(sortByName)
        .forEach(
          ({
            json: {
              meta: { isTesting = false },
            },
            option,
          }) => {
            if (!isTesting) {
              options.account.push(option);
            } else {
              options.testing.push(option);
            }
          }
        );
    }
    addAddresses(keyring, options) {
      const available = keyring.addresses.subject.getValue();
      Object.values(available)
        .filter(({ json }) => !!json.meta.isRecent)
        .sort(sortByCreated)
        .forEach(({ option }) => {
          options.recent.push(option);
        });
      Object.values(available)
        .filter(({ json }) => !json.meta.isRecent)
        .sort(sortByName)
        .forEach(({ option }) => {
          options.address.push(option);
        });
    }
    addContracts(keyring, options) {
      const available = keyring.contracts.subject.getValue();
      Object.values(available)
        .sort(sortByName)
        .forEach(({ option }) => {
          options.contract.push(option);
        });
    }
    emptyOptions() {
      return {
        account: [],
        address: [],
        all: [],
        allPlus: [],
        contract: [],
        recent: [],
        testing: [],
      };
    }
  }

  const RECENT_EXPIRY = 24 * 60 * 60;
  class Keyring extends Base {
    keyringOption = new KeyringOption();
    #stores = {
      account: () => this.accounts,
      address: () => this.addresses,
      contract: () => this.contracts,
    };
    addExternal(address, meta = {}) {
      const pair = this.keyring.addFromAddress(
        address,
        util$7.objectSpread({}, meta, {
          isExternal: true,
        }),
        null
      );
      return {
        json: this.saveAccount(pair),
        pair,
      };
    }
    addHardware(address, hardwareType, meta = {}) {
      return this.addExternal(
        address,
        util$7.objectSpread({}, meta, {
          hardwareType,
          isHardware: true,
        })
      );
    }
    addMultisig(addresses, threshold, meta = {}) {
      const address = utilCrypto.createKeyMulti(addresses, threshold);
      const who = util$7
        .u8aSorted(addresses.map((who) => this.decodeAddress(who)))
        .map((who) => this.encodeAddress(who));
      return this.addExternal(
        address,
        util$7.objectSpread({}, meta, {
          isMultisig: true,
          threshold: util$7.bnToBn(threshold).toNumber(),
          who,
        })
      );
    }
    addPair(pair, password) {
      this.keyring.addPair(pair);
      return {
        json: this.saveAccount(pair, password),
        pair,
      };
    }
    addUri(suri, password, meta = {}, type) {
      const pair = this.keyring.addFromUri(suri, meta, type);
      return {
        json: this.saveAccount(pair, password),
        pair,
      };
    }
    backupAccount(pair, password) {
      if (!pair.isLocked) {
        pair.lock();
      }
      pair.decodePkcs8(password);
      return pair.toJson(password);
    }
    async backupAccounts(addresses, password) {
      const accountPromises = addresses.map((address) => {
        return new Promise((resolve) => {
          this._store.get(accountKey(address), resolve);
        });
      });
      const accounts = await Promise.all(accountPromises);
      return util$7.objectSpread(
        {},
        utilCrypto.jsonEncrypt(util$7.stringToU8a(JSON.stringify(accounts)), ['batch-pkcs8'], password),
        {
          accounts: accounts.map((account) => ({
            address: account.address,
            meta: account.meta,
          })),
        }
      );
    }
    createFromJson(json, meta = {}) {
      return this.keyring.createFromJson(
        util$7.objectSpread({}, json, {
          meta: util$7.objectSpread({}, json.meta, meta),
        })
      );
    }
    createFromUri(suri, meta = {}, type) {
      return this.keyring.createFromUri(suri, meta, type);
    }
    encryptAccount(pair, password) {
      const json = pair.toJson(password);
      json.meta.whenEdited = Date.now();
      this.keyring.addFromJson(json);
      this.accounts.add(this._store, pair.address, json, pair.type);
    }
    forgetAccount(address) {
      this.keyring.removePair(address);
      this.accounts.remove(this._store, address);
    }
    forgetAddress(address) {
      this.addresses.remove(this._store, address);
    }
    forgetContract(address) {
      this.contracts.remove(this._store, address);
    }
    getAccount(address) {
      return this.getAddress(address, 'account');
    }
    getAccounts() {
      const available = this.accounts.subject.getValue();
      return Object.keys(available)
        .map((address) => this.getAddress(address, 'account'))
        .filter((account) => env.isDevelopment() || account.meta.isTesting !== true);
    }
    getAddress(_address, type = null) {
      const address = util$7.isString(_address) ? _address : this.encodeAddress(_address);
      const publicKey = this.decodeAddress(address);
      const stores = type ? [this.#stores[type]] : Object.values(this.#stores);
      const info = stores.reduce((lastInfo, store) => store().subject.getValue()[address] || lastInfo, undefined);
      return (
        info && {
          address,
          meta: info.json.meta,
          publicKey,
        }
      );
    }
    getAddresses() {
      const available = this.addresses.subject.getValue();
      return Object.keys(available).map((address) => this.getAddress(address));
    }
    getContract(address) {
      return this.getAddress(address, 'contract');
    }
    getContracts() {
      const available = this.contracts.subject.getValue();
      return Object.entries(available)
        .filter(
          ([
            ,
            {
              json: {
                meta: { contract },
              },
            },
          ]) => !!contract && contract.genesisHash === this.genesisHash
        )
        .map(([address]) => this.getContract(address));
    }
    rewriteKey(json, key, hexAddr, creator) {
      if (hexAddr.substring(0, 2) === '0x') {
        return;
      }
      this._store.remove(key);
      this._store.set(creator(hexAddr), json);
    }
    loadAccount(json, key) {
      if (!json.meta.isTesting && json.encoded) {
        const pair = this.keyring.addFromJson(json, true);
        this.accounts.add(this._store, pair.address, json, pair.type);
      }
      const [, hexAddr] = key.split(':');
      this.rewriteKey(json, key, hexAddr.trim(), accountKey);
    }
    loadAddress(json, key) {
      const { isRecent, whenCreated = 0 } = json.meta;
      if (isRecent && Date.now() - whenCreated > RECENT_EXPIRY) {
        this._store.remove(key);
        return;
      }
      const address =
        util$7.isHex(json.address) && json.address.length !== 66
          ? json.address
          : this.encodeAddress(
              util$7.isHex(json.address) ? util$7.hexToU8a(json.address) : this.decodeAddress(json.address, true)
            );
      const [, hexAddr] = key.split(':');
      this.addresses.add(this._store, address, json);
      this.rewriteKey(json, key, hexAddr, addressKey);
    }
    loadContract(json, key) {
      const address = this.encodeAddress(this.decodeAddress(json.address));
      const [, hexAddr] = key.split(':');
      json.meta.genesisHash = json.meta.genesisHash || (json.meta.contract && json.meta.contract.genesisHash);
      this.contracts.add(this._store, address, json);
      this.rewriteKey(json, key, hexAddr, contractKey);
    }
    loadInjected(address, meta, type) {
      const json = {
        address,
        meta: util$7.objectSpread({}, meta, {
          isInjected: true,
        }),
      };
      const pair = this.keyring.addFromAddress(address, json.meta, null, type);
      this.accounts.add(this._store, pair.address, json, pair.type);
    }
    allowGenesis(json) {
      if (json && json.meta && this.genesisHash) {
        const hashes = Object.values(uiSettings.chains).find((hashes) => hashes.includes(this.genesisHash || '')) || [
          this.genesisHash,
        ];
        if (json.meta.genesisHash) {
          return hashes.includes(json.meta.genesisHash) || this.genesisHashes.includes(json.meta.genesisHash);
        } else if (json.meta.contract) {
          return hashes.includes(json.meta.contract.genesisHash);
        }
      }
      return true;
    }
    loadAll(options, injected = []) {
      super.initKeyring(options);
      this._store.all((key, json) => {
        if (!util$7.isFunction(options.filter) || options.filter(json)) {
          try {
            if (this.allowGenesis(json)) {
              if (accountRegex.test(key)) {
                this.loadAccount(json, key);
              } else if (addressRegex.test(key)) {
                this.loadAddress(json, key);
              } else if (contractRegex.test(key)) {
                this.loadContract(json, key);
              }
            }
          } catch (error) {
            console.warn(`Keyring: Unable to load ${key}:${util$7.stringify(json)}`);
          }
        }
      });
      injected.forEach((account) => {
        if (this.allowGenesis(account)) {
          try {
            this.loadInjected(account.address, account.meta, account.type);
          } catch (error) {
            console.warn(`Keyring: Unable to inject ${util$7.stringify(account)}`);
          }
        }
      });
      this.keyringOption.init(this);
    }
    restoreAccount(json, password) {
      const cryptoType = Array.isArray(json.encoding.content) ? json.encoding.content[1] : 'ed25519';
      const encType = Array.isArray(json.encoding.type) ? json.encoding.type : [json.encoding.type];
      const pair = keyring$1.createPair(
        {
          toSS58: this.encodeAddress,
          type: cryptoType,
        },
        {
          publicKey: this.decodeAddress(json.address, true),
        },
        json.meta,
        util$7.isHex(json.encoded) ? util$7.hexToU8a(json.encoded) : utilCrypto.base64Decode(json.encoded),
        encType
      );
      pair.decodePkcs8(password);
      this.addPair(pair, password);
      pair.lock();
      return pair;
    }
    restoreAccounts(json, password) {
      const accounts = JSON.parse(util$7.u8aToString(utilCrypto.jsonDecrypt(json, password)));
      accounts.forEach((account) => {
        this.loadAccount(account, accountKey(account.address));
      });
    }
    saveAccount(pair, password) {
      this.addTimestamp(pair);
      const json = pair.toJson(password);
      this.keyring.addFromJson(json);
      this.accounts.add(this._store, pair.address, json, pair.type);
      return json;
    }
    saveAccountMeta(pair, meta) {
      const address = pair.address;
      this._store.get(accountKey(address), (json) => {
        pair.setMeta(meta);
        json.meta = pair.meta;
        this.accounts.add(this._store, address, json, pair.type);
      });
    }
    saveAddress(address, meta, type = 'address') {
      const available = this.addresses.subject.getValue();
      const json = (available[address] && available[address].json) || {
        address,
        meta: {
          isRecent: undefined,
          whenCreated: Date.now(),
        },
      };
      Object.keys(meta).forEach((key) => {
        json.meta[key] = meta[key];
      });
      delete json.meta.isRecent;
      this.#stores[type]().add(this._store, address, json);
      return json;
    }
    saveContract(address, meta) {
      return this.saveAddress(address, meta, 'contract');
    }
    saveRecent(address) {
      const available = this.addresses.subject.getValue();
      if (!available[address]) {
        this.addresses.add(this._store, address, {
          address,
          meta: {
            genesisHash: this.genesisHash,
            isRecent: true,
            whenCreated: Date.now(),
          },
        });
      }
      return this.addresses.subject.getValue()[address];
    }
  }

  const packageInfo = {
    name: '@polkadot/ui-keyring',
    path:
      {
        url:
          typeof document === 'undefined' && typeof location === 'undefined'
            ? new (require('u' + 'rl').URL)('file:' + __filename).href
            : typeof document === 'undefined'
              ? location.href
              : (document.currentScript && document.currentScript.src) ||
                new URL('bundle-polkadot-ui-keyring.js', document.baseURI).href,
      } &&
      (typeof document === 'undefined' && typeof location === 'undefined'
        ? new (require('u' + 'rl').URL)('file:' + __filename).href
        : typeof document === 'undefined'
          ? location.href
          : (document.currentScript && document.currentScript.src) ||
            new URL('bundle-polkadot-ui-keyring.js', document.baseURI).href)
        ? new URL(
            typeof document === 'undefined' && typeof location === 'undefined'
              ? new (require('u' + 'rl').URL)('file:' + __filename).href
              : typeof document === 'undefined'
                ? location.href
                : (document.currentScript && document.currentScript.src) ||
                  new URL('bundle-polkadot-ui-keyring.js', document.baseURI).href
          ).pathname.substring(
            0,
            new URL(
              typeof document === 'undefined' && typeof location === 'undefined'
                ? new (require('u' + 'rl').URL)('file:' + __filename).href
                : typeof document === 'undefined'
                  ? location.href
                  : (document.currentScript && document.currentScript.src) ||
                    new URL('bundle-polkadot-ui-keyring.js', document.baseURI).href
            ).pathname.lastIndexOf('/') + 1
          )
        : 'auto',
    type: 'esm',
    version: '2.12.1',
  };

  const keyring = new Keyring();

  exports.Keyring = Keyring;
  exports.keyring = keyring;
  exports.packageInfo = packageInfo;
});
