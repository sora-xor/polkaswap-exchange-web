// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

import Handlebars from 'handlebars';
import { stringCamelCase } from '@polkadot/util';
import { compareName, createImports, initMeta, readTemplate, writeFile } from '../util/index.js';
const generateForMetaTemplate = Handlebars.compile(readTemplate('errors'));

/** @internal */
function generateForMeta(meta, dest, isStrict) {
  writeFile(dest, () => {
    const imports = createImports({});
    const { lookup, pallets } = meta.asLatest;
    const modules = pallets
      .filter(({ errors }) => errors.isSome)
      .map(({ errors, name }) => ({
        items: lookup
          .getSiType(errors.unwrap().type)
          .def.asVariant.variants.map(({ docs, name }) => ({
            docs,
            name: name.toString(),
          }))
          .sort(compareName),
        name: stringCamelCase(name),
      }))
      .sort(compareName);
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
export function generateDefaultErrors(dest, data, extraTypes = {}, isStrict = false) {
  const { metadata } = initMeta(data, extraTypes);
  return generateForMeta(metadata, dest, isStrict);
}
