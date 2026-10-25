import { describe, expect, it } from 'vitest';
import { XOR, VAL, PSWAP } from '@/lib/substrate/sdk/assets/consts';
import { RESEARCH_DEFAULT_SETTINGS } from '@/features/bot-trading/research';
import {
  ruleRecipe,
  defaultRuleCondition,
  buildRuleBatch,
  encodeRuleShare,
  decodeRuleShare,
  ruleShareUrl,
  RULE_RECIPE_IDS,
  RULE_CONDITION_KINDS,
} from '@/features/bot-trading/rule-recipes';
import { parseStrategyRules } from '@/features/bot-trading/strategy-rules';

const assets = [XOR, VAL, PSWAP].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const settings = {
  ...RESEARCH_DEFAULT_SETTINGS,
  assetInAddress: XOR.address,
  assetOutAddress: VAL.address,
  intervalBlocks: 600,
};

describe('composable recipes and public links', () => {
  it.each(RULE_RECIPE_IDS)('returns a valid detached %s recipe', (id) => {
    const first = ruleRecipe(id);
    expect(parseStrategyRules(first)).toEqual(first);
    first.entry.conditions[0].window = 2;
    expect(ruleRecipe(id).entry.conditions[0].window).not.toBe(2);
    const encoded = encodeRuleShare(ruleRecipe(id));
    expect(encoded.length).toBeLessThan(4096);
    expect(decodeRuleShare(encoded)).toEqual(ruleRecipe(id));
  });
  it.each(RULE_CONDITION_KINDS)('starts %s with only its own fields', (kind) => {
    const condition = defaultRuleCondition(kind);
    expect(
      parseStrategyRules({ version: 1, entry: { operator: 'all', conditions: [condition] }, exit: null }).entry
        .conditions
    ).toEqual([condition]);
  });
  it('rejects unknown, oversized, malformed and executable-looking links', () => {
    for (const value of [
      undefined,
      {},
      ['x'],
      '',
      'a'.repeat(4097),
      'javascript:alert(1)',
      btoa('{"version":2}'),
      btoa('{"__proto__":{}}'),
    ]) {
      expect(decodeRuleShare(value)).toBeNull();
    }
  });
  it('retains the IPFS prefix and shares no unrelated account, market or execution state', () => {
    const url = new URL(
      ruleShareUrl(
        ruleRecipe('dip'),
        'https://example.com/ipfs/bafy-build/?token=secret#/bots/my-bots?bot=local&start=live'
      )
    );
    expect(url.pathname).toBe('/ipfs/bafy-build/');
    expect(url.search).toBe('');
    expect(url.hash.startsWith('#/bots/lab?rules=')).toBe(true);
    expect(url.href).not.toMatch(/secret|start=|local|token=/);
    expect(() => ruleShareUrl(ruleRecipe('trend'), 'javascript:alert(1)')).toThrow();
    expect(() => ruleShareUrl(ruleRecipe('trend'), 'https://user:pass@example.com')).toThrow();
  });
  it('freezes one exact untuned rule study per market and preserves decimal sizing', () => {
    let id = 0;
    const source = ruleRecipe('quiet');
    const result = buildRuleBatch(
      { ...settings, capital: '123.456', tradePercent: 10, optimize: true },
      [VAL.address, PSWAP.address],
      source,
      'Quiet example',
      assets,
      () => `rules-${++id}`
    );
    expect(result).toHaveLength(2);
    expect(result[0].strategy?.kind).toBe('rules');
    expect(result[0].strategy?.amount).toBe('12.3456');
    expect(result.every((item) => !item.settings.optimize)).toBe(true);
    expect(result[0].strategy?.rules).toEqual(source);
    source.entry.conditions[0].window = 2;
    expect(result[0].strategy?.rules?.entry.conditions[0].window).toBe(24);
    result[0].strategy!.rules!.entry.conditions[0].window = 3;
    expect(result[1].strategy?.rules?.entry.conditions[0].window).toBe(24);
  });
  it('rejects subhour cadence, duplicate markets/IDs, missing assets and invalid names', () => {
    const run = (overrides = settings, outputs = [VAL.address], name = 'Rules', id = () => 'id') =>
      buildRuleBatch(overrides, outputs, ruleRecipe('trend'), name, assets, id);
    expect(() => run({ ...settings, intervalBlocks: 1 })).toThrow();
    expect(() => run(settings, [VAL.address, VAL.address])).toThrow();
    expect(() => run(settings, [VAL.address, PSWAP.address])).toThrow();
    expect(() => run(settings, ['unknown'])).toThrow();
    expect(() => run(settings, [], 'Rules')).toThrow();
    expect(() => run(settings, [VAL.address], '  ')).toThrow();
    expect(() => run(settings, [VAL.address], 'a\nname')).toThrow();
  });
});
