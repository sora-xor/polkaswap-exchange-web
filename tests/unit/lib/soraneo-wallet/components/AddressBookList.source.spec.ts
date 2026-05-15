import { describe, expect, it } from 'vitest';

import addressBookListSource from '@/lib/soraneo-wallet/src/components/AddressBook/List.vue?raw';

describe('AddressBookList source styles', () => {
  it('keeps contact rows spaced with the design-system base token', () => {
    expect(addressBookListSource).toMatch(/& \+ & \{\s*margin-top: var\(--s-basic-spacing\);\s*\}/);
  });
});
