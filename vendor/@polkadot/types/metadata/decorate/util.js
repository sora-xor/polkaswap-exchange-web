// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { stringCamelCase } from '@polkadot/util';
function convert(fn) {
  return ({ name }) => fn(name);
}
export const objectNameToCamel = convert(stringCamelCase);
export const objectNameToString = convert((n) => n.toString());
