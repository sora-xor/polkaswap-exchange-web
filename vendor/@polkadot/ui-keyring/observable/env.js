// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BehaviorSubject } from 'rxjs';
const subject = new BehaviorSubject(false);
export const env = {
  isDevelopment: () => subject.getValue(),
  set: (isDevelopment) => {
    subject.next(isDevelopment);
  },
  subject,
};
