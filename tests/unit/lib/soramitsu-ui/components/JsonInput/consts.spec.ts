import { describe, expect, it } from 'vitest';

import {
  JSON_INPUT_AUTOCOMPLETE_VALUES,
  JSON_INPUT_SIZE_VALUES,
  JSON_INPUT_TYPE_VALUES,
} from '@/lib/soramitsu-ui/components/JsonInput/consts';

describe('JsonInput consts', () => {
  it('exports the supported autocomplete, type, and size values', () => {
    expect(JSON_INPUT_AUTOCOMPLETE_VALUES).toEqual(['off', 'on']);
    expect(JSON_INPUT_SIZE_VALUES).toEqual(['small', 'medium', 'big']);
    expect(JSON_INPUT_TYPE_VALUES).toEqual(
      expect.arrayContaining(['text', 'textarea', 'checkbox', 'number', 'password', 'submit', 'url'])
    );
  });
});
