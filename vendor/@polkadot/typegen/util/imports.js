// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as codecClasses from '@polkadot/types/codec';
import * as extrinsicClasses from '@polkadot/types/extrinsic';
import * as genericClasses from '@polkadot/types/generic';
import * as primitiveClasses from '@polkadot/types/primitive';
import { getTypeDef, TypeDefInfo } from '@polkadot/types-create';
// returns the top-level types in the alternatives list, taking into account nested [], <> and () items
// E.g. for the string '[a<b,c>, d | e]' we return the array ['a<b,c>', 'd', 'e']
function splitAlternatives(type) {
  const alternatives = [];
  let beginOfAlternative = 1;
  let level = 0;

  // we assume that the string starts with '['
  for (let i = 1; i < type.length; i++) {
    if (level === 0) {
      switch (type[i]) {
        case ']':
        case ',':
        case '|':
          alternatives.push(type.substring(beginOfAlternative, i).trim());
          beginOfAlternative = i + 1;
          break;
      }
    }
    switch (type[i]) {
      case '[':
      case '(':
      case '<':
        level++;
        break;
      case ']':
      case ')':
      case '>':
        level--;
        break;
    }
  }
  return alternatives;
}

// Maps the types as found to the source location. This is used to generate the
// imports in the output file, dep-duped and sorted
/** @internal */
export function setImports(allDefs, imports, types) {
  const {
    codecTypes,
    extrinsicTypes,
    genericTypes,
    ignoredTypes,
    localTypes,
    metadataTypes,
    primitiveTypes,
    typesTypes,
  } = imports;
  types
    .filter((t) => !!t)
    .forEach((type) => {
      if (ignoredTypes.includes(type)) {
        // do nothing
      } else if (['AnyNumber', 'CallFunction', 'Codec', 'IExtrinsic', 'IMethod', 'ITuple'].includes(type)) {
        typesTypes[type] = true;
      } else if (['Metadata', 'PortableRegistry'].includes(type)) {
        metadataTypes[type] = true;
      } else if (codecClasses[type]) {
        codecTypes[type] = true;
      } else if (extrinsicClasses[type]) {
        extrinsicTypes[type] = true;
      } else if (genericClasses[type]) {
        genericTypes[type] = true;
      } else if (primitiveClasses[type]) {
        primitiveTypes[type] = true;
      } else if (type.startsWith('[') && type.includes('|')) {
        const splitTypes = splitAlternatives(type);
        setImports(allDefs, imports, splitTypes);
      } else if (type.includes('<') || type.includes('(') || type.includes('[')) {
        // If the type is a bit special (tuple, fixed u8, nested type...), then we
        // need to parse it with `getTypeDef`.
        const typeDef = getTypeDef(type);
        setImports(allDefs, imports, [TypeDefInfo[typeDef.info]]);

        // TypeDef.sub is a `TypeDef | TypeDef[]`
        if (Array.isArray(typeDef.sub)) {
          typeDef.sub.forEach((subType) => setImports(allDefs, imports, [subType.lookupName || subType.type]));
        } else if (typeDef.sub && (typeDef.info !== TypeDefInfo.VecFixed || typeDef.sub.type !== 'u8')) {
          // typeDef.sub is a TypeDef in this case
          setImports(allDefs, imports, [typeDef.sub.lookupName || typeDef.sub.type]);
        }
      } else {
        // find this module inside the exports from the rest
        const [moduleName] = Object.entries(allDefs).find(([, { types }]) => Object.keys(types).includes(type)) || [
          null,
        ];
        if (moduleName) {
          localTypes[moduleName][type] = true;
        }
      }
    });
}

// Create an Imports object, can be pre-filled with `ignoredTypes`
/** @internal */
export function createImports(
  importDefinitions,
  { types } = {
    types: {},
  }
) {
  const definitions = {};
  const typeToModule = {};
  Object.entries(importDefinitions).forEach(([packagePath, packageDef]) => {
    Object.entries(packageDef).forEach(([name, moduleDef]) => {
      const fullName = `${packagePath}/${name}`;
      definitions[fullName] = moduleDef;
      Object.keys(moduleDef.types).forEach((type) => {
        if (typeToModule[type]) {
          console.warn(`\t\tWARN: Overwriting duplicated type '${type}' ${typeToModule[type]} -> ${fullName}`);
        }
        typeToModule[type] = fullName;
      });
    });
  });
  return {
    codecTypes: {},
    definitions,
    extrinsicTypes: {},
    genericTypes: {},
    ignoredTypes: Object.keys(types),
    localTypes: Object.keys(definitions).reduce((local, mod) => {
      local[mod] = {};
      return local;
    }, {}),
    lookupTypes: {},
    metadataTypes: {},
    primitiveTypes: {},
    typeToModule,
    typesTypes: {},
  };
}
