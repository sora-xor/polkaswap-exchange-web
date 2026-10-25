import { describe, expect, it } from 'vitest';

import { omit, template, unset } from 'lodash-es';

describe('vendored lodash-es security regressions', () => {
  it.each([
    ['constructor', 'prototype', 'protectedValue'],
    [['constructor'], ['prototype'], 'protectedValue'],
    ['__proto__', 'protectedValue'],
    [['__proto__'], 'protectedValue'],
  ])('rejects prototype traversal with path %j', (...path) => {
    const prototype = { protectedValue: 'keep' };
    const object = Object.create(prototype);
    Object.defineProperty(prototype, 'constructor', { value: { prototype } });

    expect(unset(object, path)).toBe(false);
    expect(prototype.protectedValue).toBe('keep');
  });

  it('does not let omit delete constructor prototype properties through array paths', () => {
    class ProtectedValue {}
    Object.defineProperty(ProtectedValue.prototype, 'protectedValue', {
      configurable: true,
      value: 'keep',
    });
    const object = { nested: new ProtectedValue(), keep: true };

    omit(object, [['nested', ['constructor'], ['prototype'], 'protectedValue']]);

    expect(Reflect.get(ProtectedValue.prototype, 'protectedValue')).toBe('keep');
    expect(object.keep).toBe(true);
  });

  it('continues to remove ordinary own nested properties', () => {
    const object = { wallet: { label: 'old', balance: '100' } };

    expect(unset(object, 'wallet.label')).toBe(true);
    expect(object).toEqual({ wallet: { balance: '100' } });
    expect(omit(object, 'wallet.balance')).toEqual({ wallet: {} });
    expect(object.wallet.balance).toBe('100');
  });

  it('rejects executable template import keys before evaluating them', () => {
    const maliciousKey = 'probe=(() => { throw new Error("unexpected-template-execution"); })()';

    expect(() => template('fixed', { imports: { [maliciousKey]: undefined } })).toThrow(
      'Invalid `imports` option passed into `_.template`'
    );
  });

  it('ignores inherited template import keys', () => {
    const imports = Object.create({
      'probe=(() => { throw new Error("unexpected-template-execution"); })()': undefined,
    });

    expect(template('fixed', { imports })({})).toBe('fixed');
  });

  it('continues to support developer-defined template imports', () => {
    const render = template('<%= label(value) %>', {
      imports: { label: (value: string) => `Account ${value}` },
    });

    expect(render({ value: '1' })).toBe('Account 1');
  });
});
