'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.HEADER = void 0;
exports.exportInterface = exportInterface;
exports.formatType = formatType;
var _handlebars = _interopRequireDefault(require('handlebars'));
var typesCodec = _interopRequireWildcard(require('@polkadot/types-codec'));
var _typesCreate = require('@polkadot/types-create');
var _util = require('@polkadot/util');
var _file = require('./file');
var _imports = require('./imports');
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return { default: obj };
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unused-vars */

const NO_CODEC = ['Tuple', 'VecFixed'];
const ON_CODEC = Object.keys(typesCodec);
const ON_CODEC_TYPES = [
  'Codec',
  'AnyJson',
  'AnyFunction',
  'AnyNumber',
  'AnyString',
  'AnyTuple',
  'AnyU8a',
  'ICompact',
  'IEnum',
  'IMap',
  'INumber',
  'IOption',
  'IResult',
  'ISet',
  'IStruct',
  'ITuple',
  'IU8a',
  'IVec',
  'IMethod',
];
const HEADER = (type) =>
  `// Auto-generated via \`yarn polkadot-types-from-${type}\`, do not edit\n/* eslint-disable */\n\n`;
exports.HEADER = HEADER;
function extractImports(_ref) {
  let { imports, types } = _ref;
  const toplevel = [
    ...Object.keys(imports.codecTypes),
    ...Object.keys(imports.extrinsicTypes),
    ...Object.keys(imports.genericTypes),
    ...Object.keys(imports.metadataTypes),
    ...Object.keys(imports.primitiveTypes),
  ];
  return [
    {
      file: '@polkadot/types',
      types: toplevel.filter((n) => !NO_CODEC.includes(n) && !ON_CODEC.includes(n)),
    },
    {
      file: '@polkadot/types/lookup',
      types: Object.keys(imports.lookupTypes),
    },
    {
      file: '@polkadot/types/types',
      types: Object.keys(imports.typesTypes).filter((n) => !ON_CODEC_TYPES.includes(n)),
    },
    {
      file: '@polkadot/types-codec',
      types: toplevel.filter((n) => !NO_CODEC.includes(n) && ON_CODEC.includes(n)),
    },
    {
      file: '@polkadot/types-codec/types',
      types: Object.keys(imports.typesTypes).filter((n) => ON_CODEC_TYPES.includes(n)),
    },
    ...types,
  ]
    .filter((_ref2) => {
      let { types } = _ref2;
      return types.length;
    })
    .sort((_ref3, b) => {
      let { file } = _ref3;
      return file.localeCompare(b.file);
    })
    .map((_ref4) => {
      let { file, types } = _ref4;
      return `import type { ${types.sort().join(', ')} } from '${file}';`;
    });
}
_handlebars.default.registerPartial({
  header: _handlebars.default.compile((0, _file.readTemplate)('header')),
});
_handlebars.default.registerHelper({
  importsAll() {
    return extractImports(this).join('\n');
  },
  importsPackage() {
    return extractImports(this)
      .filter((l) => !l.includes("from '."))
      .join('\n  ');
  },
  importsRelative() {
    return extractImports(this)
      .filter((l) => l.includes("from '."))
      .join('\n');
  },
  trim(options) {
    return options.fn(this).trim();
  },
  upper(options) {
    return options.fn(this).toUpperCase();
  },
});

// helper to generate a `export interface <Name> extends <Base> {<Body>}
/** @internal */
function exportInterface() {
  let lookupIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : -1;
  let name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  let base = arguments.length > 2 ? arguments[2] : undefined;
  let body = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
  let withShortcut = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
  // * @description extends [[${base}]]
  const doc = withShortcut ? '' : `/** @name ${name}${lookupIndex !== -1 ? ` (${lookupIndex})` : ''} */\n`;
  return `${doc}${withShortcut ? '' : `export interface ${name} extends ${base} `}{${body.length ? '\n' : ''}${body}${withShortcut ? '  ' : ''}}`;
}
function singleParamNotation(registry, wrapper, typeDef, definitions, imports, withShortcut) {
  const sub = typeDef.sub;
  (0, _imports.setImports)(definitions, imports, [wrapper, sub.lookupName]);
  return (0, _typesCreate.paramsNotation)(
    wrapper,
    sub.lookupName || formatType(registry, definitions, sub.type, imports, withShortcut)
  );
}
function dualParamsNotation(registry, wrapper, typeDef, definitions, imports, withShortcut) {
  const [a, b] = typeDef.sub;
  (0, _imports.setImports)(definitions, imports, [wrapper, a.lookupName, b.lookupName]);
  return (0, _typesCreate.paramsNotation)(wrapper, [
    a.lookupName || formatType(registry, definitions, a.type, imports, withShortcut),
    b.lookupName || formatType(registry, definitions, b.type, imports, withShortcut),
  ]);
}
const formatters = {
  [_typesCreate.TypeDefInfo.Compact]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'Compact', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.DoNotConstruct]: (registry, _ref5, definitions, imports, withShortcut) => {
    let { lookupName } = _ref5;
    (0, _imports.setImports)(definitions, imports, ['DoNotConstruct']);
    return 'DoNotConstruct';
  },
  [_typesCreate.TypeDefInfo.Enum]: (registry, typeDef, definitions, imports, withShortcut) => {
    if (typeDef.lookupName) {
      return typeDef.lookupName;
    }
    throw new Error(`TypeDefInfo.Enum: Parameter formatting not implemented on ${(0, _util.stringify)(typeDef)}`);
  },
  [_typesCreate.TypeDefInfo.Int]: (registry, typeDef, definitions, imports, withShortcut) => {
    throw new Error(`TypeDefInfo.Int: Parameter formatting not implemented on ${(0, _util.stringify)(typeDef)}`);
  },
  [_typesCreate.TypeDefInfo.UInt]: (registry, typeDef, definitions, imports, withShortcut) => {
    throw new Error(`TypeDefInfo.UInt: Parameter formatting not implemented on ${(0, _util.stringify)(typeDef)}`);
  },
  [_typesCreate.TypeDefInfo.Null]: (registry, typeDef, definitions, imports, withShortcut) => {
    (0, _imports.setImports)(definitions, imports, ['Null']);
    return 'Null';
  },
  [_typesCreate.TypeDefInfo.Option]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'Option', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.Plain]: (registry, typeDef, definitions, imports, withShortcut) => {
    (0, _imports.setImports)(definitions, imports, [typeDef.type]);
    return typeDef.type;
  },
  [_typesCreate.TypeDefInfo.Range]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'Range', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.RangeInclusive]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'RangeInclusive', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.Set]: (registry, typeDef, definitions, imports, withShortcut) => {
    throw new Error(`TypeDefInfo.Set: Parameter formatting not implemented on ${(0, _util.stringify)(typeDef)}`);
  },
  [_typesCreate.TypeDefInfo.Si]: (registry, typeDef, definitions, imports, withShortcut) => {
    return formatType(registry, definitions, registry.lookup.getTypeDef(typeDef.type), imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.Struct]: (registry, typeDef, definitions, imports, withShortcut) => {
    if (typeDef.lookupName) {
      return typeDef.lookupName;
    }
    const sub = typeDef.sub;
    (0, _imports.setImports)(definitions, imports, [
      'Struct',
      ...sub.map((_ref6) => {
        let { lookupName } = _ref6;
        return lookupName;
      }),
    ]);
    return `{${withShortcut ? ' ' : '\n'}${sub
      .map((_ref7, index) => {
        let { lookupName, name, type } = _ref7;
        return [
          name || `unknown${index}`,
          lookupName || formatType(registry, definitions, type, imports, withShortcut),
        ];
      })
      .map((_ref8) => {
        let [k, t] = _ref8;
        return `${withShortcut ? '' : '    readonly '}${k}: ${t};`;
      })
      .join(withShortcut ? ' ' : '\n')}${withShortcut ? ' ' : '\n  '}} & Struct`;
  },
  [_typesCreate.TypeDefInfo.Tuple]: (registry, typeDef, definitions, imports, withShortcut) => {
    const sub = typeDef.sub;
    (0, _imports.setImports)(definitions, imports, [
      'ITuple',
      ...sub.map((_ref9) => {
        let { lookupName } = _ref9;
        return lookupName;
      }),
    ]);

    // `(a,b)` gets transformed into `ITuple<[a, b]>`
    return (0, _typesCreate.paramsNotation)(
      'ITuple',
      `[${sub
        .map((_ref10) => {
          let { lookupName, type } = _ref10;
          return lookupName || formatType(registry, definitions, type, imports, withShortcut);
        })
        .join(', ')}]`
    );
  },
  [_typesCreate.TypeDefInfo.Vec]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'Vec', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.VecFixed]: (registry, typeDef, definitions, imports, withShortcut) => {
    const sub = typeDef.sub;
    if (sub.type === 'u8') {
      (0, _imports.setImports)(definitions, imports, ['U8aFixed']);
      return 'U8aFixed';
    }
    return singleParamNotation(registry, 'Vec', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.BTreeMap]: (registry, typeDef, definitions, imports, withShortcut) => {
    return dualParamsNotation(registry, 'BTreeMap', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.BTreeSet]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'BTreeSet', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.HashMap]: (registry, typeDef, definitions, imports, withShortcut) => {
    return dualParamsNotation(registry, 'HashMap', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.Linkage]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'Linkage', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.Result]: (registry, typeDef, definitions, imports, withShortcut) => {
    return dualParamsNotation(registry, 'Result', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.WrapperKeepOpaque]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'WrapperKeepOpaque', typeDef, definitions, imports, withShortcut);
  },
  [_typesCreate.TypeDefInfo.WrapperOpaque]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'WrapperOpaque', typeDef, definitions, imports, withShortcut);
  },
};

/**
 * Correctly format a given type
 */
/** @internal */
// eslint-disable-next-line @typescript-eslint/ban-types
function formatType(registry, definitions, type, imports) {
  let withShortcut = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
  let typeDef;
  if ((0, _util.isString)(type)) {
    const _type = type.toString();

    // If type is "unorthodox" (i.e. `{ something: any }` for an Enum input or `[a | b | c, d | e | f]` for a Tuple's similar types),
    // we return it as-is
    if (withShortcut && /(^{.+:.+})|^\([^,]+\)|^\(.+\)\[\]|^\[.+\]/.exec(_type) && !/\[\w+;\w+\]/.exec(_type)) {
      return _type;
    }
    typeDef = (0, _typesCreate.getTypeDef)(type);
  } else {
    typeDef = type;
  }
  (0, _imports.setImports)(definitions, imports, [typeDef.lookupName || typeDef.type]);
  return formatters[typeDef.info](registry, typeDef, definitions, imports, withShortcut);
}
