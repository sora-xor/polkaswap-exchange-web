import { describe, expect, it } from 'vitest';

import {
  createSoraNexusXorBurnRemark,
  normalizeSoraNexusAccountId,
  parseSoraNexusXorBurnRemark,
} from '@/utils/soraNexusAccount';

const validSoraNexusAccount = 'sorauﾛ1NﾗhBUd2BﾂｦﾄiﾔﾆﾂﾇKSﾃaﾘﾒﾓQﾗrﾒoﾘﾅnｳﾘbQｳQJﾆLJ5HSE';

describe('soraNexusAccount', () => {
  it('accepts production SORA Nexus i105 account literals', () => {
    expect(normalizeSoraNexusAccountId(` ${validSoraNexusAccount} `)).toBe(validSoraNexusAccount);
  });

  it('rejects non-production or non-canonical i105 account literals', () => {
    const fullWidthKana =
      'sorauロ1NラhBUd2BツヲトiヤニツヌKSテaリメモQラrメoリナnウリbQウQJニLJ5HSE';

    expect(normalizeSoraNexusAccountId(fullWidthKana)).toBeNull();
    expect(normalizeSoraNexusAccountId(validSoraNexusAccount.replace(/^sora/, 'test'))).toBeNull();
    expect(normalizeSoraNexusAccountId(`${validSoraNexusAccount.slice(0, -1)}F`)).toBeNull();
  });

  it('creates and parses compact burn remarks', () => {
    const remark = createSoraNexusXorBurnRemark(validSoraNexusAccount);

    expect(JSON.parse(remark)).toEqual({
      type: 'soraNexusXorClaim',
      version: 1,
      recipient: validSoraNexusAccount,
    });
    expect(parseSoraNexusXorBurnRemark(remark)).toEqual({
      type: 'soraNexusXorClaim',
      version: 1,
      recipient: validSoraNexusAccount,
    });
  });

  it('rejects invalid burn remarks', () => {
    expect(() => createSoraNexusXorBurnRemark('invalid')).toThrow('Invalid SORA Nexus account');
    expect(parseSoraNexusXorBurnRemark('not-json')).toBeNull();
    expect(parseSoraNexusXorBurnRemark(JSON.stringify({ type: 'other', version: 1 }))).toBeNull();
  });
});
