'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.chains = void 0;
var _networks = require('@polkadot/networks');
var _util = require('@polkadot/util');
// Copyright 2017-2023 @polkadot/ui-settings authors & contributors
// SPDX-License-Identifier: Apache-2.0

const chains = _networks.selectableNetworks
  .filter((n) => n.genesisHash.length)
  .reduce((chains, _ref) => {
    let { genesisHash, network } = _ref;
    return (0, _util.objectSpread)(chains, {
      [network]: genesisHash,
    });
  }, {});
exports.chains = chains;
