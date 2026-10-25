'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.main = main;
var _process = _interopRequireDefault(require('process'));
var _yargs = _interopRequireDefault(require('yargs'));
var _api = require('@polkadot/api');
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Connects to the local chain and outputs a re-usable calls-only chain definition in  the form
// export default { chain: 'Development', genesisHash: '0x27b6d5e0f4fdce1c4d20b82406f193acacce0c19e0d2c0e7ca47725c2572a06a', ss58Format: 42, tokenDecimals: 0, tokenSymbol: 'UNIT'; metaCalls: 'bWV0...4AAA==' };

/** @internal */
async function run(ws) {
  const provider = new _api.WsProvider(ws);
  const api = await _api.ApiPromise.create({
    provider,
    throwOnConnect: true,
  });
  const [chain, props] = await Promise.all([api.rpc.system.chain(), api.rpc.system.properties()]);

  // output the chain info, for easy re-use
  console.error(
    `// Generated via 'yarn run chain:info ${ws}'\n\nexport default {\n  chain: '${chain.toString()}',\n  genesisHash: '${api.genesisHash.toHex()}',\n  specVersion: ${api.runtimeVersion.specVersion.toNumber()},\n  ss58Format: ${props.ss58Format.unwrapOr(42).toString()},\n  tokenDecimals: ${props.tokenDecimals.unwrapOr(0).toString()},\n  tokenSymbol: '${props.tokenSymbol.unwrapOr('UNIT').toString()}',\n  metaCalls: '${Buffer.from(api.runtimeMetadata.asCallsOnly.toU8a()).toString('base64')}'\n};`
  );

  // show any missing types
  api.runtimeMetadata.getUniqTypes(false);
}
function main() {
  // retrieve and parse arguments - we do this globally, since this is a single command
  const { ws } = _yargs.default
    .usage('Usage: [options]')
    .wrap(120)
    .strict()
    .options({
      ws: {
        default: 'ws://127.0.0.1:9944',
        description: 'The API endpoint to connect to, e.g. wss://kusama-rpc.polkadot.io',
        required: true,
        type: 'string',
      },
    }).argv;
  run(ws)
    .then(() => {
      _process.default.exit(0);
    })
    .catch((error) => {
      console.error('FATAL:', error.message);
      _process.default.exit(-1);
    });
}
