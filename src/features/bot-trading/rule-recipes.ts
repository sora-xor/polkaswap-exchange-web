import { createPlaygroundBot } from './playground';
import { createResearchBot, type ResearchSettings } from './research';
import { parseStrategyRules, type RuleCondition, type StrategyRules } from './strategy-rules';
import type { BotAsset } from './types';
import type { ExperimentDefinition } from './experiments';

export type RuleRecipeId =
  | 'trend'
  | 'breakout'
  | 'dip'
  | 'quiet'
  | 'spring'
  | 'persistent'
  | 'range'
  | 'rebound'
  | 'expansion';
export const RULE_RECIPE_IDS: readonly RuleRecipeId[] = [
  'spring',
  'trend',
  'breakout',
  'dip',
  'quiet',
  'persistent',
  'range',
  'rebound',
  'expansion',
];
export const RULE_CONDITION_KINDS: readonly RuleCondition['kind'][] = [
  'trend',
  'momentum',
  'breakout',
  'deviation',
  'return-quantile',
  'mad',
  'restoring',
  'efficiency',
  'rsi',
  'drawdown',
];

/** Untuned educational starting points; none is a claim about future performance. */
const recipes: Record<RuleRecipeId, StrategyRules> = {
  spring: {
    version: 1,
    entry: {
      operator: 'all',
      conditions: [
        { kind: 'restoring', window: 48, direction: 'above', threshold: '0' },
        { kind: 'restoring', window: 48, direction: 'below', threshold: '100' },
        { kind: 'deviation', window: 48, direction: 'below', threshold: '-2' },
        { kind: 'momentum', window: 2, direction: 'above', threshold: '0' },
      ],
    },
    exit: {
      operator: 'any',
      conditions: [
        { kind: 'deviation', window: 48, direction: 'above', threshold: '0' },
        { kind: 'drawdown', window: 48, direction: 'below', threshold: '-8' },
      ],
    },
  },
  persistent: {
    version: 1,
    entry: {
      operator: 'all',
      conditions: [
        { kind: 'trend', window: 72, direction: 'above' },
        { kind: 'momentum', window: 24, direction: 'above', threshold: '1' },
        { kind: 'efficiency', window: 24, direction: 'above', threshold: '40' },
      ],
    },
    exit: {
      operator: 'any',
      conditions: [
        { kind: 'trend', window: 48, direction: 'below' },
        { kind: 'efficiency', window: 24, direction: 'below', threshold: '20' },
      ],
    },
  },
  range: {
    version: 1,
    entry: {
      operator: 'all',
      conditions: [
        { kind: 'efficiency', window: 48, direction: 'below', threshold: '25' },
        { kind: 'rsi', window: 14, direction: 'below', threshold: '35' },
        { kind: 'deviation', window: 24, direction: 'below', threshold: '-1' },
      ],
    },
    exit: {
      operator: 'any',
      conditions: [
        { kind: 'rsi', window: 14, direction: 'above', threshold: '60' },
        { kind: 'drawdown', window: 48, direction: 'below', threshold: '-8' },
      ],
    },
  },
  rebound: {
    version: 1,
    entry: {
      operator: 'all',
      conditions: [
        { kind: 'trend', window: 120, direction: 'above' },
        { kind: 'drawdown', window: 48, direction: 'below', threshold: '-2' },
        { kind: 'drawdown', window: 48, direction: 'above', threshold: '-8' },
        { kind: 'momentum', window: 2, direction: 'above', threshold: '0' },
      ],
    },
    exit: {
      operator: 'any',
      conditions: [
        { kind: 'rsi', window: 14, direction: 'above', threshold: '70' },
        { kind: 'trend', window: 120, direction: 'below' },
      ],
    },
  },
  expansion: {
    version: 1,
    entry: {
      operator: 'all',
      conditions: [
        { kind: 'breakout', window: 24, direction: 'above' },
        { kind: 'mad', window: 48, direction: 'below', threshold: '0.5' },
        { kind: 'efficiency', window: 12, direction: 'above', threshold: '35' },
      ],
    },
    exit: {
      operator: 'any',
      conditions: [
        { kind: 'breakout', window: 12, direction: 'below' },
        { kind: 'rsi', window: 14, direction: 'above', threshold: '80' },
      ],
    },
  },
  trend: {
    version: 1,
    entry: {
      operator: 'all',
      conditions: [
        { kind: 'trend', window: 48, direction: 'above' },
        { kind: 'momentum', window: 24, direction: 'above', threshold: '1' },
      ],
    },
    exit: {
      operator: 'any',
      conditions: [
        { kind: 'trend', window: 48, direction: 'below' },
        { kind: 'momentum', window: 24, direction: 'below', threshold: '0' },
      ],
    },
  },
  breakout: {
    version: 1,
    entry: {
      operator: 'all',
      conditions: [
        { kind: 'breakout', window: 48, direction: 'above' },
        { kind: 'trend', window: 120, direction: 'above' },
      ],
    },
    exit: {
      operator: 'any',
      conditions: [
        { kind: 'breakout', window: 24, direction: 'below' },
        { kind: 'trend', window: 48, direction: 'below' },
      ],
    },
  },
  dip: {
    version: 1,
    entry: {
      operator: 'all',
      conditions: [
        { kind: 'return-quantile', window: 48, direction: 'below', percentile: 20 },
        { kind: 'trend', window: 120, direction: 'above' },
      ],
    },
    exit: {
      operator: 'any',
      conditions: [
        { kind: 'deviation', window: 24, direction: 'above', threshold: '1' },
        { kind: 'trend', window: 120, direction: 'below' },
      ],
    },
  },
  quiet: {
    version: 1,
    entry: {
      operator: 'all',
      conditions: [
        { kind: 'breakout', window: 24, direction: 'above' },
        { kind: 'mad', window: 48, direction: 'below', threshold: '0.5' },
      ],
    },
    exit: {
      operator: 'any',
      conditions: [
        { kind: 'breakout', window: 12, direction: 'below' },
        { kind: 'momentum', window: 24, direction: 'below', threshold: '0' },
      ],
    },
  },
};

/** Return a detached recipe so editing one study cannot change another. */
export function ruleRecipe(id: RuleRecipeId): StrategyRules {
  if (!Object.hasOwn(recipes, id)) throw new Error('bots.errors.config');
  return parseStrategyRules(recipes[id]);
}

/** Each ingredient starts with a bounded, editable condition in the same hourly observation clock. */
export function defaultRuleCondition(kind: RuleCondition['kind']): RuleCondition {
  switch (kind) {
    case 'trend':
    case 'breakout':
      return { kind, window: 24, direction: 'above' };
    case 'momentum':
      return { kind, window: 24, direction: 'above', threshold: '1' };
    case 'deviation':
      return { kind, window: 24, direction: 'below', threshold: '-2' };
    case 'mad':
      return { kind, window: 48, direction: 'below', threshold: '0.5' };
    case 'return-quantile':
      return { kind, window: 48, direction: 'below', percentile: 20 };
    case 'restoring':
      return { kind, window: 48, direction: 'above', threshold: '0' };
    case 'efficiency':
      return { kind, window: 24, direction: 'above', threshold: '40' };
    case 'rsi':
      return { kind, window: 14, direction: 'below', threshold: '35' };
    case 'drawdown':
      return { kind, window: 48, direction: 'below', threshold: '-2' };
    default:
      throw new Error('bots.errors.config');
  }
}

/** Freeze exact rule studies; comparisons never silently search rule parameters or borrow test results. */
export function buildRuleBatch(
  settings: ResearchSettings,
  outputs: string[],
  rules: StrategyRules,
  name: string,
  assets: BotAsset[],
  id: () => string
): ExperimentDefinition[] {
  if (
    !outputs.length ||
    outputs.length > 4 ||
    new Set(outputs).size !== outputs.length ||
    !name.trim() ||
    name.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(name)
  )
    throw new Error('bots.errors.config');
  const canonical = parseStrategyRules(rules);
  const definitions = outputs.map((assetOutAddress): ExperimentDefinition => {
    const exact: ResearchSettings = { ...settings, assetOutAddress, preset: 'dca', optimize: false };
    const base = createPlaygroundBot(exact, assets);
    if (base.strategy.intervalMs < 3_600_000) throw new Error('bots.errors.config');
    const strategy = { ...base.strategy, kind: 'rules' as const, rules: parseStrategyRules(canonical), prompt: '' };
    createResearchBot(exact, assets, Date.now(), strategy);
    return { id: id(), name: name.trim(), settings: exact, strategy };
  });
  if (
    definitions.some((entry) => !/^[\w-]{1,100}$/.test(entry.id)) ||
    new Set(definitions.map((entry) => entry.id)).size !== definitions.length
  )
    throw new Error('bots.errors.config');
  return definitions;
}

/** Share public signal conditions only. Opening this payload never starts research or grants trading authority. */
export function encodeRuleShare(rules: StrategyRules): string {
  return btoa(JSON.stringify(parseStrategyRules(rules)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Reject malformed, oversized and unknown-version links before mounting a draft. */
export function decodeRuleShare(value: unknown): StrategyRules | null {
  if (typeof value !== 'string' || value.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    return parseStrategyRules(JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/'))));
  } catch {
    return null;
  }
}

/** Retain a static IPFS deployment prefix while dropping unrelated URL/account/provider state. */
export function ruleShareUrl(rules: StrategyRules, base: string): string {
  const url = new URL(base);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    throw new Error('bots.errors.config');
  url.search = '';
  url.hash = `/bots/lab?rules=${encodeRuleShare(rules)}`;
  return url.href;
}
