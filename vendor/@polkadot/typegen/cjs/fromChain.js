'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.main = main;
var _path = _interopRequireDefault(require('path'));
var _yargs = _interopRequireDefault(require('yargs'));
var _util = require('@polkadot/util');
var _generate = require('./generate');
var _util2 = require('./util');
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

function generate(metaHex, pkg, output, isStrict) {
  console.log(`Generating from metadata, ${(0, _util.formatNumber)((metaHex.length - 2) / 2)} bytes`);
  const outputPath = (0, _util2.assertDir)(_path.default.join(process.cwd(), output));
  let extraTypes = {};
  let customLookupDefinitions = {
    rpc: {},
    types: {},
  };
  if (pkg) {
    try {
      extraTypes = {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-argument
        [pkg]: require((0, _util2.assertFile)(_path.default.join(outputPath, 'definitions.ts'))),
      };
    } catch (error) {
      console.error('ERROR: No custom definitions found:', error.message);
    }
  }
  try {
    customLookupDefinitions = {
      rpc: {},
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
      types: require((0, _util2.assertFile)(_path.default.join(outputPath, 'lookup.ts'))).default,
    };
  } catch (error) {
    console.error('ERROR: No lookup definitions found:', error.message);
  }
  (0, _generate.generateDefaultConsts)(
    _path.default.join(outputPath, 'augment-api-consts.ts'),
    metaHex,
    extraTypes,
    isStrict,
    customLookupDefinitions
  );
  (0, _generate.generateDefaultErrors)(
    _path.default.join(outputPath, 'augment-api-errors.ts'),
    metaHex,
    extraTypes,
    isStrict
  );
  (0, _generate.generateDefaultEvents)(
    _path.default.join(outputPath, 'augment-api-events.ts'),
    metaHex,
    extraTypes,
    isStrict,
    customLookupDefinitions
  );
  (0, _generate.generateDefaultQuery)(
    _path.default.join(outputPath, 'augment-api-query.ts'),
    metaHex,
    extraTypes,
    isStrict,
    customLookupDefinitions
  );
  (0, _generate.generateDefaultRpc)(_path.default.join(outputPath, 'augment-api-rpc.ts'), extraTypes);
  (0, _generate.generateDefaultRuntime)(
    _path.default.join(outputPath, 'augment-api-runtime.ts'),
    metaHex,
    extraTypes,
    isStrict,
    customLookupDefinitions
  );
  (0, _generate.generateDefaultTx)(
    _path.default.join(outputPath, 'augment-api-tx.ts'),
    metaHex,
    extraTypes,
    isStrict,
    customLookupDefinitions
  );
  (0, _util2.writeFile)(_path.default.join(outputPath, 'augment-api.ts'), () =>
    [
      (0, _util2.HEADER)('chain'),
      ...[
        ...['consts', 'errors', 'events', 'query', 'tx', 'rpc', 'runtime']
          .filter((key) => !!key)
          .map((key) => `./augment-api-${key}`),
      ].map((path) => `import '${path}';\n`),
    ].join('')
  );
  process.exit(0);
}
function main() {
  const {
    endpoint,
    output,
    package: pkg,
    strict: isStrict,
  } = _yargs.default.strict().options({
    endpoint: {
      description:
        'The endpoint to connect to (e.g. wss://kusama-rpc.polkadot.io) or relative path to a file containing the JSON output of an RPC state_getMetadata call',
      required: true,
      type: 'string',
    },
    output: {
      description: 'The target directory to write the data to',
      required: true,
      type: 'string',
    },
    package: {
      description: 'Optional package in output location (for extra definitions)',
      type: 'string',
    },
    strict: {
      description: 'Turns on strict mode, no output of catch-all generic versions',
      type: 'boolean',
    },
  }).argv;
  if (endpoint.startsWith('wss://') || endpoint.startsWith('ws://')) {
    (0, _util2.getMetadataViaWs)(endpoint)
      .then((metadata) => generate(metadata, pkg, output, isStrict))
      .catch(() => process.exit(1));
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const metadata = require((0, _util2.assertFile)(_path.default.join(process.cwd(), endpoint))).result;
    generate(metadata, pkg, output, isStrict);
  }
}
