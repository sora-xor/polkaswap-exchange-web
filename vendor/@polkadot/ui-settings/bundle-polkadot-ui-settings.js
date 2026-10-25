(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports, require('@polkadot/util'), require('@polkadot/util-crypto'))
    : typeof define === 'function' && define.amd
      ? define(['exports', '@polkadot/util', '@polkadot/util-crypto'], factory)
      : ((global = typeof globalThis !== 'undefined' ? globalThis : global || self),
        factory((global.polkadotUiSettings = {}), global.polkadotUtil, global.polkadotUtilCrypto));
})(this, function (exports, util$7, utilCrypto) {
  'use strict';

  const global = typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : window;

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

  var eventemitter3Exports = {};
  var eventemitter3 = {
    get exports() {
      return eventemitter3Exports;
    },
    set exports(v) {
      eventemitter3Exports = v;
    },
  };

  (function (module) {
    var has = Object.prototype.hasOwnProperty,
      prefix = '~';
    function Events() {}
    if (Object.create) {
      Events.prototype = Object.create(null);
      if (!new Events().__proto__) prefix = false;
    }
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== 'function') {
        throw new TypeError('The listener must be a function');
      }
      var listener = new EE(fn, context || emitter, once),
        evt = prefix ? prefix + event : event;
      if (!emitter._events[evt]) ((emitter._events[evt] = listener), emitter._eventsCount++);
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
      return emitter;
    }
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    function EventEmitter() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    EventEmitter.prototype.eventNames = function eventNames() {
      var names = [],
        events,
        name;
      if (this._eventsCount === 0) return names;
      for (name in (events = this._events)) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }
      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }
      return names;
    };
    EventEmitter.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event,
        handlers = this._events[evt];
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }
      return ee;
    };
    EventEmitter.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event,
        listeners = this._events[evt];
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    };
    EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return false;
      var listeners = this._events[evt],
        len = arguments.length,
        args,
        i;
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);
        switch (len) {
          case 1:
            return (listeners.fn.call(listeners.context), true);
          case 2:
            return (listeners.fn.call(listeners.context, a1), true);
          case 3:
            return (listeners.fn.call(listeners.context, a1, a2), true);
          case 4:
            return (listeners.fn.call(listeners.context, a1, a2, a3), true);
          case 5:
            return (listeners.fn.call(listeners.context, a1, a2, a3, a4), true);
          case 6:
            return (listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true);
        }
        for (i = 1, args = new Array(len - 1); i < len; i++) {
          args[i - 1] = arguments[i];
        }
        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length,
          j;
        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);
          switch (len) {
            case 1:
              listeners[i].fn.call(listeners[i].context);
              break;
            case 2:
              listeners[i].fn.call(listeners[i].context, a1);
              break;
            case 3:
              listeners[i].fn.call(listeners[i].context, a1, a2);
              break;
            case 4:
              listeners[i].fn.call(listeners[i].context, a1, a2, a3);
              break;
            default:
              if (!args)
                for (j = 1, args = new Array(len - 1); j < len; j++) {
                  args[j - 1] = arguments[j];
                }
              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }
      return true;
    };
    EventEmitter.prototype.on = function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };
    EventEmitter.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };
    EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
      var listeners = this._events[evt];
      if (listeners.fn) {
        if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (listeners[i].fn !== fn || (once && !listeners[i].once) || (context && listeners[i].context !== context)) {
            events.push(listeners[i]);
          }
        }
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
      return this;
    };
    EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
      return this;
    };
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    EventEmitter.prefixed = prefix;
    EventEmitter.EventEmitter = EventEmitter;
    {
      module.exports = EventEmitter;
    }
  })(eventemitter3);

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

  const CRYPTOS = [
    {
      info: 'sr25519',
      text: 'Schnorrkel (sr25519, recommended)',
      value: 'sr25519',
    },
    {
      info: 'ed25519',
      text: 'Edwards (ed25519, alternative)',
      value: 'ed25519',
    },
    {
      info: 'ecdsa',
      text: 'ECDSA (Non BTC/ETH compatible)',
      value: 'ecdsa',
    },
  ];
  const CRYPTOS_ETH = [
    {
      info: 'ethereum',
      text: 'ECDSA (ETH compatible)',
      value: 'ethereum',
    },
  ];
  const CRYPTOS_LEDGER = [
    ...CRYPTOS,
    {
      info: 'ed25519-ledger',
      text: 'Ledger (ed25519, BIP32 derivation)',
      value: 'ed25519-ledger',
    },
  ];

  const ENDPOINTS = [
    {
      info: 'local',
      text: 'Local Node (Own, 127.0.0.1:9944)',
      value: 'ws://127.0.0.1:9944/',
    },
  ];
  const ENDPOINT_DEFAULT = ENDPOINTS[0];

  const LEDGER_CONN_DEFAULT = 'none';
  const LEDGER_CONN = [
    {
      info: 'none',
      text: 'Do not attach Ledger devices',
      value: 'none',
    },
    {
      info: 'webusb',
      text: 'Attach Ledger via WebUSB (Chrome, recommended)',
      value: 'webusb',
    },
    {
      info: 'hid',
      text: 'Attach Ledger via WebHID (Chrome, experimental)',
      value: 'hid',
    },
  ];

  const PREFIX_DEFAULT = -1;
  const defaultNetwork = {
    info: 'default',
    text: 'Default for the connected node',
    value: -1,
  };
  const networks = utilCrypto.availableNetworks.map(({ displayName, network, prefix }) => ({
    info: network,
    text: displayName,
    value: prefix,
  }));
  const PREFIXES = [defaultNetwork, ...networks];

  const isPolkadot = typeof window !== 'undefined' && window.location.host.includes('polkadot');

  const UIMODE_DEFAULT =
    !isPolkadot && typeof window !== 'undefined' && window.location.host.includes('ui-light') ? 'light' : 'full';
  const UIMODES = [
    {
      info: 'full',
      text: 'Fully featured',
      value: 'full',
    },
    {
      info: 'light',
      text: 'Basic features only',
      value: 'light',
    },
  ];
  const UITHEME_DEFAULT = isPolkadot ? 'polkadot' : 'substrate';
  const UITHEMES = [
    {
      info: 'polkadot',
      text: 'Polkadot',
      value: 'polkadot',
    },
    {
      info: 'substrate',
      text: 'Substrate',
      value: 'substrate',
    },
  ];
  const ICON_DEFAULT = 'default';
  const ICON_DEFAULT_HOST = isPolkadot ? 'polkadot' : 'substrate';
  const ICONS = [
    {
      info: 'default',
      text: 'Default for the connected node',
      value: 'default',
    },
    {
      info: 'polkadot',
      text: 'Polkadot',
      value: 'polkadot',
    },
    {
      info: 'substrate',
      text: 'Substrate',
      value: 'substrate',
    },
    {
      info: 'beachball',
      text: 'Beachball',
      value: 'beachball',
    },
  ];
  const NOTIFICATION_DEFAULT = 'popup';

  const CAMERA_DEFAULT = 'off';
  const CAMERA = [
    {
      info: 'on',
      text: 'Allow camera access',
      value: 'on',
    },
    {
      info: 'off',
      text: 'Do not allow camera access',
      value: 'off',
    },
  ];
  const LANGUAGE_DEFAULT = 'default';
  const LOCKING_DEFAULT = 'session';
  const LOCKING = [
    {
      info: 'session',
      text: 'Once per session',
      value: 'session',
    },
    {
      info: 'tx',
      text: 'On each transaction',
      value: 'tx',
    },
  ];
  const METADATA_UP_DEFAULT = 'off';
  const METADATA_UP = [
    {
      info: 'off',
      text: 'Do not auto-update extension metadata',
      value: 'off',
    },
    {
      info: 'on',
      text: 'Auto-update extension metadata',
      value: 'on',
    },
  ];
  const STORAGE_DEFAULT = 'off';
  const STORAGE = [
    {
      info: 'on',
      text: 'Allow local in-browser account storage',
      value: 'on',
    },
    {
      info: 'off',
      text: 'Do not allow local in-browser account storage',
      value: 'off',
    },
  ];

  function withDefault(options, option, fallback) {
    const _option = option || fallback;
    return options.some(({ value }) => value === _option) ? _option : fallback;
  }
  class Settings {
    #emitter;
    #apiType;
    #apiUrl;
    #camera;
    #i18nLang;
    #icon;
    #ledgerConn;
    #locking;
    #metadataUp;
    #prefix;
    #storage;
    #uiMode;
    #uiTheme;
    #notification;
    constructor() {
      const settings = store_legacy.get('settings') || {};
      this.#emitter = new eventemitter3Exports();
      this.#apiUrl =
        (typeof settings.apiUrl === 'string' && settings.apiUrl) ||
        (util$7.hasProcess && process.env && process.env.WS_URL) ||
        ENDPOINT_DEFAULT.value;
      this.#apiType = {
        param: this.#apiUrl,
        type: 'json-rpc',
      };
      this.#camera = withDefault(CAMERA, settings.camera, CAMERA_DEFAULT);
      this.#ledgerConn = withDefault(LEDGER_CONN, settings.ledgerConn, LEDGER_CONN_DEFAULT);
      this.#i18nLang = settings.i18nLang || LANGUAGE_DEFAULT;
      this.#icon = settings.icon || ICON_DEFAULT;
      this.#locking = settings.locking || LOCKING_DEFAULT;
      this.#metadataUp = withDefault(METADATA_UP, settings.storage, METADATA_UP_DEFAULT);
      this.#notification = settings.notification || NOTIFICATION_DEFAULT;
      this.#prefix = util$7.isUndefined(settings.prefix) ? PREFIX_DEFAULT : settings.prefix;
      this.#storage = withDefault(STORAGE, settings.storage, STORAGE_DEFAULT);
      this.#uiMode = settings.uiMode || UIMODE_DEFAULT;
      this.#uiTheme = settings.uiTheme || UITHEME_DEFAULT;
    }
    get camera() {
      return this.#camera;
    }
    get apiType() {
      return this.#apiType;
    }
    get apiUrl() {
      return this.#apiUrl;
    }
    get i18nLang() {
      return this.#i18nLang;
    }
    get icon() {
      return this.#icon;
    }
    get notification() {
      return this.#notification;
    }
    get ledgerConn() {
      return this.#ledgerConn;
    }
    get locking() {
      return this.#locking;
    }
    get metadataUp() {
      return this.#metadataUp;
    }
    get prefix() {
      return this.#prefix;
    }
    get storage() {
      return this.#storage;
    }
    get uiMode() {
      return this.#uiMode;
    }
    get uiTheme() {
      return this.#uiTheme;
    }
    get availableCamera() {
      return CAMERA;
    }
    get availableCryptos() {
      return CRYPTOS;
    }
    get availableCryptosEth() {
      return CRYPTOS_ETH;
    }
    get availableCryptosLedger() {
      return CRYPTOS_LEDGER;
    }
    get availableIcons() {
      return ICONS;
    }
    get availableLedgerConn() {
      return LEDGER_CONN;
    }
    get availableLocking() {
      return LOCKING;
    }
    get availableMetadataUp() {
      return METADATA_UP;
    }
    get availableNodes() {
      return ENDPOINTS;
    }
    get availablePrefixes() {
      return PREFIXES;
    }
    get availableStorage() {
      return STORAGE;
    }
    get availableUIModes() {
      return UIMODES;
    }
    get availableUIThemes() {
      return UITHEMES;
    }
    get() {
      return {
        apiType: this.#apiType,
        apiUrl: this.#apiUrl,
        camera: this.#camera,
        i18nLang: this.#i18nLang,
        icon: this.#icon,
        ledgerConn: this.#ledgerConn,
        locking: this.#locking,
        metadataUp: this.#metadataUp,
        notification: this.#notification,
        prefix: this.#prefix,
        storage: this.#storage,
        uiMode: this.#uiMode,
        uiTheme: this.#uiTheme,
      };
    }
    set(settings) {
      this.#apiType = settings.apiType || this.#apiType;
      this.#apiUrl = settings.apiUrl || this.#apiUrl;
      this.#camera = settings.camera || this.#camera;
      this.#ledgerConn = settings.ledgerConn || this.#ledgerConn;
      this.#i18nLang = settings.i18nLang || this.#i18nLang;
      this.#icon = settings.icon || this.#icon;
      this.#locking = settings.locking || this.#locking;
      this.#metadataUp = settings.metadataUp || this.#metadataUp;
      this.#notification = settings.notification || this.#notification;
      this.#prefix = util$7.isUndefined(settings.prefix) ? this.#prefix : settings.prefix;
      this.#storage = settings.storage || this.#storage;
      this.#uiMode = settings.uiMode || this.#uiMode;
      this.#uiTheme = settings.uiTheme || this.#uiTheme;
      const newValues = this.get();
      store_legacy.set('settings', newValues);
      this.#emitter.emit('change', newValues);
    }
    on(type, cb) {
      this.#emitter.on(type, cb);
    }
  }
  const settings = new Settings();

  const chains = utilCrypto.selectableNetworks
    .filter((n) => n.genesisHash.length)
    .reduce(
      (chains, { genesisHash, network }) =>
        util$7.objectSpread(chains, {
          [network]: genesisHash,
        }),
      {}
    );

  const packageInfo = {
    name: '@polkadot/ui-settings',
    path:
      {
        url:
          typeof document === 'undefined' && typeof location === 'undefined'
            ? new (require('u' + 'rl').URL)('file:' + __filename).href
            : typeof document === 'undefined'
              ? location.href
              : (document.currentScript && document.currentScript.src) ||
                new URL('bundle-polkadot-ui-settings.js', document.baseURI).href,
      } &&
      (typeof document === 'undefined' && typeof location === 'undefined'
        ? new (require('u' + 'rl').URL)('file:' + __filename).href
        : typeof document === 'undefined'
          ? location.href
          : (document.currentScript && document.currentScript.src) ||
            new URL('bundle-polkadot-ui-settings.js', document.baseURI).href)
        ? new URL(
            typeof document === 'undefined' && typeof location === 'undefined'
              ? new (require('u' + 'rl').URL)('file:' + __filename).href
              : typeof document === 'undefined'
                ? location.href
                : (document.currentScript && document.currentScript.src) ||
                  new URL('bundle-polkadot-ui-settings.js', document.baseURI).href
          ).pathname.substring(
            0,
            new URL(
              typeof document === 'undefined' && typeof location === 'undefined'
                ? new (require('u' + 'rl').URL)('file:' + __filename).href
                : typeof document === 'undefined'
                  ? location.href
                  : (document.currentScript && document.currentScript.src) ||
                    new URL('bundle-polkadot-ui-settings.js', document.baseURI).href
            ).pathname.lastIndexOf('/') + 1
          )
        : 'auto',
    type: 'esm',
    version: '2.12.1',
  };

  exports.ENDPOINT_DEFAULT = ENDPOINT_DEFAULT;
  exports.ICON_DEFAULT = ICON_DEFAULT;
  exports.ICON_DEFAULT_HOST = ICON_DEFAULT_HOST;
  exports.LANGUAGE_DEFAULT = LANGUAGE_DEFAULT;
  exports.LOCKING_DEFAULT = LOCKING_DEFAULT;
  exports.PREFIX_DEFAULT = PREFIX_DEFAULT;
  exports.Settings = Settings;
  exports.UIMODE_DEFAULT = UIMODE_DEFAULT;
  exports.UITHEME_DEFAULT = UITHEME_DEFAULT;
  exports.chains = chains;
  exports.packageInfo = packageInfo;
  exports.settings = settings;
});
