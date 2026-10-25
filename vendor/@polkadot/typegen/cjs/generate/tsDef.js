'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.createGetter = createGetter;
exports.generateDefaultTsDef = generateDefaultTsDef;
exports.generateTsDef = generateTsDef;
exports.generateTsDefFor = generateTsDefFor;
exports.typeEncoders = void 0;
var _handlebars = _interopRequireDefault(require('handlebars'));
var _path = _interopRequireDefault(require('path'));
var _create = require('@polkadot/types/create');
var defaultDefinitions = _interopRequireWildcard(require('@polkadot/types/interfaces/definitions'));
var _typesCreate = require('@polkadot/types-create');
var _util = require('@polkadot/util');
var _util2 = require('../util');
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

const generateTsDefIndexTemplate = _handlebars.default.compile((0, _util2.readTemplate)('tsDef/index'));
const generateTsDefModuleTypesTemplate = _handlebars.default.compile((0, _util2.readTemplate)('tsDef/moduleTypes'));
const generateTsDefTypesTemplate = _handlebars.default.compile((0, _util2.readTemplate)('tsDef/types'));

// helper to generate a `readonly <Name>: <Type>;` getter
/** @internal */
function createGetter(definitions) {
  let name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  let type = arguments.length > 2 ? arguments[2] : undefined;
  let imports = arguments.length > 3 ? arguments[3] : undefined;
  (0, _util2.setImports)(definitions, imports, [type]);
  return `  readonly ${name}: ${type};\n`;
}

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorUnhandled(_, definitions, def, imports) {
  throw new Error(`Generate: ${def.name || ''}: Unhandled type ${_typesCreate.TypeDefInfo[def.info]}`);
}

/** @internal */
function tsExport(registry, definitions, def, imports) {
  return (0, _util2.exportInterface)(
    def.lookupIndex,
    def.name,
    (0, _util2.formatType)(registry, definitions, def, imports, false)
  );
}

/** @internal */
function tsEnum(registry, definitions, _ref, imports) {
  let { lookupIndex, name: enumName, sub } = _ref;
  let withShortcut = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
  (0, _util2.setImports)(definitions, imports, ['Enum']);
  const indent = withShortcut ? '  ' : '';
  const named = sub.filter((_ref2) => {
    let { name } = _ref2;
    return !!name && !name.startsWith('__Unused');
  });
  const keys = named.map((def) => {
    const { info, lookupName, name = '', type } = def;
    const getter = (0, _util.stringPascalCase)(name.replace(' ', '_'));
    const isComplex = [
      _typesCreate.TypeDefInfo.Option,
      _typesCreate.TypeDefInfo.Range,
      _typesCreate.TypeDefInfo.RangeInclusive,
      _typesCreate.TypeDefInfo.Result,
      _typesCreate.TypeDefInfo.Struct,
      _typesCreate.TypeDefInfo.Tuple,
      _typesCreate.TypeDefInfo.Vec,
      _typesCreate.TypeDefInfo.VecFixed,
    ].includes(info);
    const asGetter =
      type === 'Null' || info === _typesCreate.TypeDefInfo.DoNotConstruct
        ? ''
        : createGetter(
            definitions,
            `as${getter}`,
            lookupName ||
              (isComplex
                ? (0, _util2.formatType)(
                    registry,
                    definitions,
                    info === _typesCreate.TypeDefInfo.Struct ? def : type,
                    imports,
                    withShortcut
                  )
                : type),
            imports
          );
    const isGetter =
      info === _typesCreate.TypeDefInfo.DoNotConstruct
        ? ''
        : createGetter(definitions, `is${getter}`, 'boolean', imports);
    switch (info) {
      case _typesCreate.TypeDefInfo.Compact:
      case _typesCreate.TypeDefInfo.Plain:
      case _typesCreate.TypeDefInfo.Range:
      case _typesCreate.TypeDefInfo.RangeInclusive:
      case _typesCreate.TypeDefInfo.Result:
      case _typesCreate.TypeDefInfo.Si:
      case _typesCreate.TypeDefInfo.Struct:
      case _typesCreate.TypeDefInfo.Tuple:
      case _typesCreate.TypeDefInfo.Vec:
      case _typesCreate.TypeDefInfo.BTreeMap:
      case _typesCreate.TypeDefInfo.BTreeSet:
      case _typesCreate.TypeDefInfo.Option:
      case _typesCreate.TypeDefInfo.VecFixed:
      case _typesCreate.TypeDefInfo.WrapperKeepOpaque:
      case _typesCreate.TypeDefInfo.WrapperOpaque:
        return `${indent}${isGetter}${indent}${asGetter}`;
      case _typesCreate.TypeDefInfo.DoNotConstruct:
      case _typesCreate.TypeDefInfo.Null:
        return `${indent}${isGetter}`;
      default:
        throw new Error(
          `Enum: ${enumName || 'undefined'}: Unhandled type ${_typesCreate.TypeDefInfo[info]}, ${(0, _util.stringify)(def)}`
        );
    }
  });
  return (0, _util2.exportInterface)(
    lookupIndex,
    enumName,
    'Enum',
    `${keys.join('')}  ${indent}readonly type: ${named
      .map((_ref3) => {
        let { name = '' } = _ref3;
        return `'${(0, _util.stringPascalCase)(name.replace(' ', '_'))}'`;
      })
      .join(' | ')};\n`,
    withShortcut
  );
}
function tsInt(_, definitions, def, imports) {
  let type = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'Int';
  (0, _util2.setImports)(definitions, imports, [type]);
  return (0, _util2.exportInterface)(def.lookupIndex, def.name, type);
}

/** @internal */
function tsNull(registry, definitions, _ref4, imports) {
  let { lookupIndex = -1, name } = _ref4;
  (0, _util2.setImports)(definitions, imports, ['Null']);

  // * @description extends [[${base}]]
  const doc = `/** @name ${name || ''}${lookupIndex !== -1 ? ` (${lookupIndex})` : ''} */\n`;
  return `${doc}export type ${name || ''} = Null;`;
}

/** @internal */
function tsResultGetter(registry, definitions) {
  let resultName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  let getter = arguments.length > 3 ? arguments[3] : undefined;
  let def = arguments.length > 4 ? arguments[4] : undefined;
  let imports = arguments.length > 5 ? arguments[5] : undefined;
  const { info, lookupName, type } = def;
  const asGetter =
    type === 'Null'
      ? ''
      : createGetter(
          definitions,
          `as${getter}`,
          lookupName ||
            (info === _typesCreate.TypeDefInfo.Tuple
              ? (0, _util2.formatType)(registry, definitions, def, imports, false)
              : type),
          imports
        );
  const isGetter = createGetter(definitions, `is${getter}`, 'boolean', imports);
  switch (info) {
    case _typesCreate.TypeDefInfo.Option:
    case _typesCreate.TypeDefInfo.Plain:
    case _typesCreate.TypeDefInfo.Si:
    case _typesCreate.TypeDefInfo.Tuple:
    case _typesCreate.TypeDefInfo.Vec:
    case _typesCreate.TypeDefInfo.BTreeMap:
    case _typesCreate.TypeDefInfo.BTreeSet:
    case _typesCreate.TypeDefInfo.WrapperKeepOpaque:
    case _typesCreate.TypeDefInfo.WrapperOpaque:
      return `${isGetter}${asGetter}`;
    case _typesCreate.TypeDefInfo.Null:
      return `${isGetter}`;
    default:
      throw new Error(
        `Result: ${resultName}: Unhandled type ${_typesCreate.TypeDefInfo[info]}, ${(0, _util.stringify)(def)}`
      );
  }
}

/** @internal */
function tsResult(registry, definitions, def, imports) {
  const [okDef, errorDef] = def.sub;
  const inner = [
    tsResultGetter(registry, definitions, def.name, 'Err', errorDef, imports),
    tsResultGetter(registry, definitions, def.name, 'Ok', okDef, imports),
  ].join('');
  (0, _util2.setImports)(definitions, imports, [def.type]);
  const fmtType =
    def.lookupName && def.name !== def.lookupName
      ? def.lookupName
      : (0, _util2.formatType)(registry, definitions, def, imports, false);
  return (0, _util2.exportInterface)(def.lookupIndex, def.name, fmtType, inner);
}

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function tsSi(registry, definitions, typeDef, imports) {
  // FIXME
  return `// SI: ${JSON.stringify(typeDef)}`;
}

/** @internal */
function tsSet(_, definitions, _ref5, imports) {
  let { lookupIndex, name: setName, sub } = _ref5;
  (0, _util2.setImports)(definitions, imports, ['Set']);
  const types = sub.map((_ref6) => {
    let { name } = _ref6;
    (0, _util.assert)(name, 'Invalid TypeDef found, no name specified');
    return createGetter(definitions, `is${name}`, 'boolean', imports);
  });
  return (0, _util2.exportInterface)(lookupIndex, setName, 'Set', types.join(''));
}

/** @internal */
function tsStruct(registry, definitions, _ref7, imports) {
  let { lookupIndex, name: structName, sub } = _ref7;
  (0, _util2.setImports)(definitions, imports, ['Struct']);
  const keys = sub.map((def) => {
    const fmtType =
      def.lookupName && def.name !== def.lookupName
        ? def.lookupName
        : def.info === _typesCreate.TypeDefInfo.Enum
          ? `${tsEnum(registry, definitions, def, imports, true)} & Enum`
          : (0, _util2.formatType)(registry, definitions, def, imports, false);
    return createGetter(definitions, def.name, fmtType, imports);
  });
  return (0, _util2.exportInterface)(lookupIndex, structName, 'Struct', keys.join(''));
}

/** @internal */
function tsUInt(registry, definitions, def, imports) {
  return tsInt(registry, definitions, def, imports, 'UInt');
}

/** @internal */
function tsVec(registry, definitions, def, imports) {
  const type = def.sub.type;
  if (type === 'u8') {
    if (def.info === _typesCreate.TypeDefInfo.VecFixed) {
      (0, _util2.setImports)(definitions, imports, ['U8aFixed']);
      return (0, _util2.exportInterface)(def.lookupIndex, def.name, 'U8aFixed');
    } else {
      (0, _util2.setImports)(definitions, imports, ['Bytes']);
      return (0, _util2.exportInterface)(def.lookupIndex, def.name, 'Bytes');
    }
  }
  const fmtType =
    def.lookupName && def.name !== def.lookupName
      ? def.lookupName
      : (0, _util2.formatType)(registry, definitions, def, imports, false);
  return (0, _util2.exportInterface)(def.lookupIndex, def.name, fmtType);
}

// handlers are defined externally to use - this means that when we do a
// `generators[typedef.info](...)` TS will show any unhandled types. Rather
// we are being explicit in having no handlers where we do not support (yet)
const typeEncoders = {
  [_typesCreate.TypeDefInfo.BTreeMap]: tsExport,
  [_typesCreate.TypeDefInfo.BTreeSet]: tsExport,
  [_typesCreate.TypeDefInfo.Compact]: tsExport,
  [_typesCreate.TypeDefInfo.DoNotConstruct]: tsExport,
  [_typesCreate.TypeDefInfo.Enum]: tsEnum,
  [_typesCreate.TypeDefInfo.HashMap]: tsExport,
  [_typesCreate.TypeDefInfo.Int]: tsInt,
  [_typesCreate.TypeDefInfo.Linkage]: errorUnhandled,
  [_typesCreate.TypeDefInfo.Null]: tsNull,
  [_typesCreate.TypeDefInfo.Option]: tsExport,
  [_typesCreate.TypeDefInfo.Plain]: tsExport,
  [_typesCreate.TypeDefInfo.Range]: tsExport,
  [_typesCreate.TypeDefInfo.RangeInclusive]: tsExport,
  [_typesCreate.TypeDefInfo.Result]: tsResult,
  [_typesCreate.TypeDefInfo.Set]: tsSet,
  [_typesCreate.TypeDefInfo.Si]: tsSi,
  [_typesCreate.TypeDefInfo.Struct]: tsStruct,
  [_typesCreate.TypeDefInfo.Tuple]: tsExport,
  [_typesCreate.TypeDefInfo.UInt]: tsUInt,
  [_typesCreate.TypeDefInfo.Vec]: tsVec,
  [_typesCreate.TypeDefInfo.VecFixed]: tsVec,
  [_typesCreate.TypeDefInfo.WrapperKeepOpaque]: tsExport,
  [_typesCreate.TypeDefInfo.WrapperOpaque]: tsExport,
};

/** @internal */
exports.typeEncoders = typeEncoders;
function generateInterfaces(registry, definitions, _ref8, imports) {
  let { types } = _ref8;
  return Object.entries(types).map((_ref9) => {
    let [name, type] = _ref9;
    const def = (0, _typesCreate.getTypeDef)((0, _util.isString)(type) ? type : (0, _util.stringify)(type), {
      name,
    });
    return [name, typeEncoders[def.info](registry, definitions, def, imports)];
  });
}

/** @internal */
function generateTsDefFor(registry, importDefinitions, defName, _ref10, outputDir) {
  let { types } = _ref10;
  const imports = {
    ...(0, _util2.createImports)(importDefinitions, {
      types,
    }),
    interfaces: [],
  };
  const definitions = imports.definitions;
  const interfaces = generateInterfaces(
    registry,
    definitions,
    {
      types,
    },
    imports
  );
  const items = interfaces
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((_ref11) => {
      let [, definition] = _ref11;
      return definition;
    });
  (0, _util2.writeFile)(
    _path.default.join(outputDir, defName, 'types.ts'),
    () =>
      generateTsDefModuleTypesTemplate({
        headerType: 'defs',
        imports,
        items,
        name: defName,
        types: [
          ...Object.keys(imports.localTypes)
            .sort()
            .map((packagePath) => ({
              file: packagePath.replace('@polkadot/types/augment', '@polkadot/types'),
              types: Object.keys(imports.localTypes[packagePath]),
            })),
        ],
      }),
    true
  );
  (0, _util2.writeFile)(
    _path.default.join(outputDir, defName, 'index.ts'),
    () =>
      generateTsDefIndexTemplate({
        headerType: 'defs',
      }),
    true
  );
}

/** @internal */
function generateTsDef(importDefinitions, outputDir, generatingPackage) {
  const registry = new _create.TypeRegistry();
  (0, _util2.writeFile)(_path.default.join(outputDir, 'types.ts'), () => {
    const definitions = importDefinitions[generatingPackage];
    Object.entries(definitions).forEach((_ref12) => {
      let [defName, obj] = _ref12;
      console.log(`\tExtracting interfaces for ${defName}`);
      generateTsDefFor(registry, importDefinitions, defName, obj, outputDir);
    });
    return generateTsDefTypesTemplate({
      headerType: 'defs',
      items: Object.keys(definitions),
    });
  });
  (0, _util2.writeFile)(
    _path.default.join(outputDir, 'index.ts'),
    () =>
      generateTsDefIndexTemplate({
        headerType: 'defs',
      }),
    true
  );
}

/** @internal */
function generateDefaultTsDef() {
  generateTsDef(
    {
      '@polkadot/types/interfaces': defaultDefinitions,
    },
    'packages/types/src/interfaces',
    '@polkadot/types/interfaces'
  );
}
