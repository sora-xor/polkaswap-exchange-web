// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

import Handlebars from 'handlebars';
import path from 'path';
import { TypeRegistry } from '@polkadot/types/create';
import * as defaultDefinitions from '@polkadot/types/interfaces/definitions';
import { getTypeDef, TypeDefInfo } from '@polkadot/types-create';
import { assert, isString, stringify, stringPascalCase } from '@polkadot/util';
import { createImports, exportInterface, formatType, readTemplate, setImports, writeFile } from '../util/index.js';
const generateTsDefIndexTemplate = Handlebars.compile(readTemplate('tsDef/index'));
const generateTsDefModuleTypesTemplate = Handlebars.compile(readTemplate('tsDef/moduleTypes'));
const generateTsDefTypesTemplate = Handlebars.compile(readTemplate('tsDef/types'));

// helper to generate a `readonly <Name>: <Type>;` getter
/** @internal */
export function createGetter(definitions, name = '', type, imports) {
  setImports(definitions, imports, [type]);
  return `  readonly ${name}: ${type};\n`;
}

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorUnhandled(_, definitions, def, imports) {
  throw new Error(`Generate: ${def.name || ''}: Unhandled type ${TypeDefInfo[def.info]}`);
}

/** @internal */
function tsExport(registry, definitions, def, imports) {
  return exportInterface(def.lookupIndex, def.name, formatType(registry, definitions, def, imports, false));
}

/** @internal */
function tsEnum(registry, definitions, { lookupIndex, name: enumName, sub }, imports, withShortcut = false) {
  setImports(definitions, imports, ['Enum']);
  const indent = withShortcut ? '  ' : '';
  const named = sub.filter(({ name }) => !!name && !name.startsWith('__Unused'));
  const keys = named.map((def) => {
    const { info, lookupName, name = '', type } = def;
    const getter = stringPascalCase(name.replace(' ', '_'));
    const isComplex = [
      TypeDefInfo.Option,
      TypeDefInfo.Range,
      TypeDefInfo.RangeInclusive,
      TypeDefInfo.Result,
      TypeDefInfo.Struct,
      TypeDefInfo.Tuple,
      TypeDefInfo.Vec,
      TypeDefInfo.VecFixed,
    ].includes(info);
    const asGetter =
      type === 'Null' || info === TypeDefInfo.DoNotConstruct
        ? ''
        : createGetter(
            definitions,
            `as${getter}`,
            lookupName ||
              (isComplex
                ? formatType(registry, definitions, info === TypeDefInfo.Struct ? def : type, imports, withShortcut)
                : type),
            imports
          );
    const isGetter =
      info === TypeDefInfo.DoNotConstruct ? '' : createGetter(definitions, `is${getter}`, 'boolean', imports);
    switch (info) {
      case TypeDefInfo.Compact:
      case TypeDefInfo.Plain:
      case TypeDefInfo.Range:
      case TypeDefInfo.RangeInclusive:
      case TypeDefInfo.Result:
      case TypeDefInfo.Si:
      case TypeDefInfo.Struct:
      case TypeDefInfo.Tuple:
      case TypeDefInfo.Vec:
      case TypeDefInfo.BTreeMap:
      case TypeDefInfo.BTreeSet:
      case TypeDefInfo.Option:
      case TypeDefInfo.VecFixed:
      case TypeDefInfo.WrapperKeepOpaque:
      case TypeDefInfo.WrapperOpaque:
        return `${indent}${isGetter}${indent}${asGetter}`;
      case TypeDefInfo.DoNotConstruct:
      case TypeDefInfo.Null:
        return `${indent}${isGetter}`;
      default:
        throw new Error(`Enum: ${enumName || 'undefined'}: Unhandled type ${TypeDefInfo[info]}, ${stringify(def)}`);
    }
  });
  return exportInterface(
    lookupIndex,
    enumName,
    'Enum',
    `${keys.join('')}  ${indent}readonly type: ${named
      .map(({ name = '' }) => `'${stringPascalCase(name.replace(' ', '_'))}'`)
      .join(' | ')};\n`,
    withShortcut
  );
}
function tsInt(_, definitions, def, imports, type = 'Int') {
  setImports(definitions, imports, [type]);
  return exportInterface(def.lookupIndex, def.name, type);
}

/** @internal */
function tsNull(registry, definitions, { lookupIndex = -1, name }, imports) {
  setImports(definitions, imports, ['Null']);

  // * @description extends [[${base}]]
  const doc = `/** @name ${name || ''}${lookupIndex !== -1 ? ` (${lookupIndex})` : ''} */\n`;
  return `${doc}export type ${name || ''} = Null;`;
}

/** @internal */
function tsResultGetter(registry, definitions, resultName = '', getter, def, imports) {
  const { info, lookupName, type } = def;
  const asGetter =
    type === 'Null'
      ? ''
      : createGetter(
          definitions,
          `as${getter}`,
          lookupName || (info === TypeDefInfo.Tuple ? formatType(registry, definitions, def, imports, false) : type),
          imports
        );
  const isGetter = createGetter(definitions, `is${getter}`, 'boolean', imports);
  switch (info) {
    case TypeDefInfo.Option:
    case TypeDefInfo.Plain:
    case TypeDefInfo.Si:
    case TypeDefInfo.Tuple:
    case TypeDefInfo.Vec:
    case TypeDefInfo.BTreeMap:
    case TypeDefInfo.BTreeSet:
    case TypeDefInfo.WrapperKeepOpaque:
    case TypeDefInfo.WrapperOpaque:
      return `${isGetter}${asGetter}`;
    case TypeDefInfo.Null:
      return `${isGetter}`;
    default:
      throw new Error(`Result: ${resultName}: Unhandled type ${TypeDefInfo[info]}, ${stringify(def)}`);
  }
}

/** @internal */
function tsResult(registry, definitions, def, imports) {
  const [okDef, errorDef] = def.sub;
  const inner = [
    tsResultGetter(registry, definitions, def.name, 'Err', errorDef, imports),
    tsResultGetter(registry, definitions, def.name, 'Ok', okDef, imports),
  ].join('');
  setImports(definitions, imports, [def.type]);
  const fmtType =
    def.lookupName && def.name !== def.lookupName
      ? def.lookupName
      : formatType(registry, definitions, def, imports, false);
  return exportInterface(def.lookupIndex, def.name, fmtType, inner);
}

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function tsSi(registry, definitions, typeDef, imports) {
  // FIXME
  return `// SI: ${JSON.stringify(typeDef)}`;
}

/** @internal */
function tsSet(_, definitions, { lookupIndex, name: setName, sub }, imports) {
  setImports(definitions, imports, ['Set']);
  const types = sub.map(({ name }) => {
    assert(name, 'Invalid TypeDef found, no name specified');
    return createGetter(definitions, `is${name}`, 'boolean', imports);
  });
  return exportInterface(lookupIndex, setName, 'Set', types.join(''));
}

/** @internal */
function tsStruct(registry, definitions, { lookupIndex, name: structName, sub }, imports) {
  setImports(definitions, imports, ['Struct']);
  const keys = sub.map((def) => {
    const fmtType =
      def.lookupName && def.name !== def.lookupName
        ? def.lookupName
        : def.info === TypeDefInfo.Enum
          ? `${tsEnum(registry, definitions, def, imports, true)} & Enum`
          : formatType(registry, definitions, def, imports, false);
    return createGetter(definitions, def.name, fmtType, imports);
  });
  return exportInterface(lookupIndex, structName, 'Struct', keys.join(''));
}

/** @internal */
function tsUInt(registry, definitions, def, imports) {
  return tsInt(registry, definitions, def, imports, 'UInt');
}

/** @internal */
function tsVec(registry, definitions, def, imports) {
  const type = def.sub.type;
  if (type === 'u8') {
    if (def.info === TypeDefInfo.VecFixed) {
      setImports(definitions, imports, ['U8aFixed']);
      return exportInterface(def.lookupIndex, def.name, 'U8aFixed');
    } else {
      setImports(definitions, imports, ['Bytes']);
      return exportInterface(def.lookupIndex, def.name, 'Bytes');
    }
  }
  const fmtType =
    def.lookupName && def.name !== def.lookupName
      ? def.lookupName
      : formatType(registry, definitions, def, imports, false);
  return exportInterface(def.lookupIndex, def.name, fmtType);
}

// handlers are defined externally to use - this means that when we do a
// `generators[typedef.info](...)` TS will show any unhandled types. Rather
// we are being explicit in having no handlers where we do not support (yet)
export const typeEncoders = {
  [TypeDefInfo.BTreeMap]: tsExport,
  [TypeDefInfo.BTreeSet]: tsExport,
  [TypeDefInfo.Compact]: tsExport,
  [TypeDefInfo.DoNotConstruct]: tsExport,
  [TypeDefInfo.Enum]: tsEnum,
  [TypeDefInfo.HashMap]: tsExport,
  [TypeDefInfo.Int]: tsInt,
  [TypeDefInfo.Linkage]: errorUnhandled,
  [TypeDefInfo.Null]: tsNull,
  [TypeDefInfo.Option]: tsExport,
  [TypeDefInfo.Plain]: tsExport,
  [TypeDefInfo.Range]: tsExport,
  [TypeDefInfo.RangeInclusive]: tsExport,
  [TypeDefInfo.Result]: tsResult,
  [TypeDefInfo.Set]: tsSet,
  [TypeDefInfo.Si]: tsSi,
  [TypeDefInfo.Struct]: tsStruct,
  [TypeDefInfo.Tuple]: tsExport,
  [TypeDefInfo.UInt]: tsUInt,
  [TypeDefInfo.Vec]: tsVec,
  [TypeDefInfo.VecFixed]: tsVec,
  [TypeDefInfo.WrapperKeepOpaque]: tsExport,
  [TypeDefInfo.WrapperOpaque]: tsExport,
};

/** @internal */
function generateInterfaces(registry, definitions, { types }, imports) {
  return Object.entries(types).map(([name, type]) => {
    const def = getTypeDef(isString(type) ? type : stringify(type), {
      name,
    });
    return [name, typeEncoders[def.info](registry, definitions, def, imports)];
  });
}

/** @internal */
export function generateTsDefFor(registry, importDefinitions, defName, { types }, outputDir) {
  const imports = {
    ...createImports(importDefinitions, {
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
  const items = interfaces.sort((a, b) => a[0].localeCompare(b[0])).map(([, definition]) => definition);
  writeFile(
    path.join(outputDir, defName, 'types.ts'),
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
  writeFile(
    path.join(outputDir, defName, 'index.ts'),
    () =>
      generateTsDefIndexTemplate({
        headerType: 'defs',
      }),
    true
  );
}

/** @internal */
export function generateTsDef(importDefinitions, outputDir, generatingPackage) {
  const registry = new TypeRegistry();
  writeFile(path.join(outputDir, 'types.ts'), () => {
    const definitions = importDefinitions[generatingPackage];
    Object.entries(definitions).forEach(([defName, obj]) => {
      console.log(`\tExtracting interfaces for ${defName}`);
      generateTsDefFor(registry, importDefinitions, defName, obj, outputDir);
    });
    return generateTsDefTypesTemplate({
      headerType: 'defs',
      items: Object.keys(definitions),
    });
  });
  writeFile(
    path.join(outputDir, 'index.ts'),
    () =>
      generateTsDefIndexTemplate({
        headerType: 'defs',
      }),
    true
  );
}

/** @internal */
export function generateDefaultTsDef() {
  generateTsDef(
    {
      '@polkadot/types/interfaces': defaultDefinitions,
    },
    'packages/types/src/interfaces',
    '@polkadot/types/interfaces'
  );
}
