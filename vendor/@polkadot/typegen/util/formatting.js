// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unused-vars */

import Handlebars from 'handlebars';
import * as typesCodec from '@polkadot/types-codec';
import { getTypeDef, paramsNotation, TypeDefInfo } from '@polkadot/types-create';
import { isString, stringify } from '@polkadot/util';
import { readTemplate } from './file.js';
import { setImports } from './imports.js';
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
export const HEADER = (type) =>
  `// Auto-generated via \`yarn polkadot-types-from-${type}\`, do not edit\n/* eslint-disable */\n\n`;
function extractImports({ imports, types }) {
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
    .filter(({ types }) => types.length)
    .sort(({ file }, b) => file.localeCompare(b.file))
    .map(({ file, types }) => `import type { ${types.sort().join(', ')} } from '${file}';`);
}
Handlebars.registerPartial({
  header: Handlebars.compile(readTemplate('header')),
});
Handlebars.registerHelper({
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
export function exportInterface(lookupIndex = -1, name = '', base, body = '', withShortcut = false) {
  // * @description extends [[${base}]]
  const doc = withShortcut ? '' : `/** @name ${name}${lookupIndex !== -1 ? ` (${lookupIndex})` : ''} */\n`;
  return `${doc}${withShortcut ? '' : `export interface ${name} extends ${base} `}{${body.length ? '\n' : ''}${body}${withShortcut ? '  ' : ''}}`;
}
function singleParamNotation(registry, wrapper, typeDef, definitions, imports, withShortcut) {
  const sub = typeDef.sub;
  setImports(definitions, imports, [wrapper, sub.lookupName]);
  return paramsNotation(wrapper, sub.lookupName || formatType(registry, definitions, sub.type, imports, withShortcut));
}
function dualParamsNotation(registry, wrapper, typeDef, definitions, imports, withShortcut) {
  const [a, b] = typeDef.sub;
  setImports(definitions, imports, [wrapper, a.lookupName, b.lookupName]);
  return paramsNotation(wrapper, [
    a.lookupName || formatType(registry, definitions, a.type, imports, withShortcut),
    b.lookupName || formatType(registry, definitions, b.type, imports, withShortcut),
  ]);
}
const formatters = {
  [TypeDefInfo.Compact]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'Compact', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.DoNotConstruct]: (registry, { lookupName }, definitions, imports, withShortcut) => {
    setImports(definitions, imports, ['DoNotConstruct']);
    return 'DoNotConstruct';
  },
  [TypeDefInfo.Enum]: (registry, typeDef, definitions, imports, withShortcut) => {
    if (typeDef.lookupName) {
      return typeDef.lookupName;
    }
    throw new Error(`TypeDefInfo.Enum: Parameter formatting not implemented on ${stringify(typeDef)}`);
  },
  [TypeDefInfo.Int]: (registry, typeDef, definitions, imports, withShortcut) => {
    throw new Error(`TypeDefInfo.Int: Parameter formatting not implemented on ${stringify(typeDef)}`);
  },
  [TypeDefInfo.UInt]: (registry, typeDef, definitions, imports, withShortcut) => {
    throw new Error(`TypeDefInfo.UInt: Parameter formatting not implemented on ${stringify(typeDef)}`);
  },
  [TypeDefInfo.Null]: (registry, typeDef, definitions, imports, withShortcut) => {
    setImports(definitions, imports, ['Null']);
    return 'Null';
  },
  [TypeDefInfo.Option]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'Option', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.Plain]: (registry, typeDef, definitions, imports, withShortcut) => {
    setImports(definitions, imports, [typeDef.type]);
    return typeDef.type;
  },
  [TypeDefInfo.Range]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'Range', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.RangeInclusive]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'RangeInclusive', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.Set]: (registry, typeDef, definitions, imports, withShortcut) => {
    throw new Error(`TypeDefInfo.Set: Parameter formatting not implemented on ${stringify(typeDef)}`);
  },
  [TypeDefInfo.Si]: (registry, typeDef, definitions, imports, withShortcut) => {
    return formatType(registry, definitions, registry.lookup.getTypeDef(typeDef.type), imports, withShortcut);
  },
  [TypeDefInfo.Struct]: (registry, typeDef, definitions, imports, withShortcut) => {
    if (typeDef.lookupName) {
      return typeDef.lookupName;
    }
    const sub = typeDef.sub;
    setImports(definitions, imports, ['Struct', ...sub.map(({ lookupName }) => lookupName)]);
    return `{${withShortcut ? ' ' : '\n'}${sub
      .map(({ lookupName, name, type }, index) => [
        name || `unknown${index}`,
        lookupName || formatType(registry, definitions, type, imports, withShortcut),
      ])
      .map(([k, t]) => `${withShortcut ? '' : '    readonly '}${k}: ${t};`)
      .join(withShortcut ? ' ' : '\n')}${withShortcut ? ' ' : '\n  '}} & Struct`;
  },
  [TypeDefInfo.Tuple]: (registry, typeDef, definitions, imports, withShortcut) => {
    const sub = typeDef.sub;
    setImports(definitions, imports, ['ITuple', ...sub.map(({ lookupName }) => lookupName)]);

    // `(a,b)` gets transformed into `ITuple<[a, b]>`
    return paramsNotation(
      'ITuple',
      `[${sub
        .map(({ lookupName, type }) => lookupName || formatType(registry, definitions, type, imports, withShortcut))
        .join(', ')}]`
    );
  },
  [TypeDefInfo.Vec]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'Vec', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.VecFixed]: (registry, typeDef, definitions, imports, withShortcut) => {
    const sub = typeDef.sub;
    if (sub.type === 'u8') {
      setImports(definitions, imports, ['U8aFixed']);
      return 'U8aFixed';
    }
    return singleParamNotation(registry, 'Vec', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.BTreeMap]: (registry, typeDef, definitions, imports, withShortcut) => {
    return dualParamsNotation(registry, 'BTreeMap', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.BTreeSet]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'BTreeSet', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.HashMap]: (registry, typeDef, definitions, imports, withShortcut) => {
    return dualParamsNotation(registry, 'HashMap', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.Linkage]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'Linkage', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.Result]: (registry, typeDef, definitions, imports, withShortcut) => {
    return dualParamsNotation(registry, 'Result', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.WrapperKeepOpaque]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'WrapperKeepOpaque', typeDef, definitions, imports, withShortcut);
  },
  [TypeDefInfo.WrapperOpaque]: (registry, typeDef, definitions, imports, withShortcut) => {
    return singleParamNotation(registry, 'WrapperOpaque', typeDef, definitions, imports, withShortcut);
  },
};

/**
 * Correctly format a given type
 */
/** @internal */
// eslint-disable-next-line @typescript-eslint/ban-types
export function formatType(registry, definitions, type, imports, withShortcut = false) {
  let typeDef;
  if (isString(type)) {
    const _type = type.toString();

    // If type is "unorthodox" (i.e. `{ something: any }` for an Enum input or `[a | b | c, d | e | f]` for a Tuple's similar types),
    // we return it as-is
    if (withShortcut && /(^{.+:.+})|^\([^,]+\)|^\(.+\)\[\]|^\[.+\]/.exec(_type) && !/\[\w+;\w+\]/.exec(_type)) {
      return _type;
    }
    typeDef = getTypeDef(type);
  } else {
    typeDef = type;
  }
  setImports(definitions, imports, [typeDef.lookupName || typeDef.type]);
  return formatters[typeDef.info](registry, typeDef, definitions, imports, withShortcut);
}
