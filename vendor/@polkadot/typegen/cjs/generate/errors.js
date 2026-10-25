'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.generateDefaultErrors = generateDefaultErrors;
var _handlebars = _interopRequireDefault(require('handlebars'));
var _util = require('@polkadot/util');
var _util2 = require('../util');
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

const generateForMetaTemplate = _handlebars.default.compile((0, _util2.readTemplate)('errors'));

/** @internal */
function generateForMeta(meta, dest, isStrict) {
  (0, _util2.writeFile)(dest, () => {
    const imports = (0, _util2.createImports)({});
    const { lookup, pallets } = meta.asLatest;
    const modules = pallets
      .filter((_ref) => {
        let { errors } = _ref;
        return errors.isSome;
      })
      .map((_ref2) => {
        let { errors, name } = _ref2;
        return {
          items: lookup
            .getSiType(errors.unwrap().type)
            .def.asVariant.variants.map((_ref3) => {
              let { docs, name } = _ref3;
              return {
                docs,
                name: name.toString(),
              };
            })
            .sort(_util2.compareName),
          name: (0, _util.stringCamelCase)(name),
        };
      })
      .sort(_util2.compareName);
    return generateForMetaTemplate({
      headerType: 'chain',
      imports,
      isStrict,
      modules,
      types: [
        {
          file: '@polkadot/api-base/types',
          types: ['ApiTypes', 'AugmentedError'],
        },
      ],
    });
  });
}

// Call `generateForMeta()` with current static metadata
/** @internal */
function generateDefaultErrors(dest, data) {
  let extraTypes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let isStrict = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  const { metadata } = (0, _util2.initMeta)(data, extraTypes);
  return generateForMeta(metadata, dest, isStrict);
}
