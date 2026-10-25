<template>
  <div class="atlas" data-testid="quant-atlas">
    <QuantParallel
      :axes="axes"
      :data="packed?.data ?? null"
      :columns="COLUMNS"
      :rows="packed?.rows ?? 0"
      color-key="second"
      :current="pinned >= 0 ? pinned : selectedRow"
      :strong="packed?.strong ?? null"
      :aria-label="ariaLabel"
      :help="t('bots.quant.atlas.help')"
      :clear-label="t('bots.studio.parallel.clear')"
      :count-label="(shown, total) => t('bots.studio.parallel.count', { shown: number(shown), total: number(total) })"
      :paused="paused"
      @select="pin"
      @hover="hovered = $event ?? -1"
    >
      <template #tooltip="{ row }">
        <strong>{{ entryTitle(row) }}</strong>
        <span v-for="(line, index) in entryRules(row)" :key="index">{{ line }}</span>
        <em>{{ badge(row) }}</em>
      </template>
    </QuantParallel>
    <div v-if="pinnedEntry" class="atlas-pinned" data-testid="quant-atlas-pinned" role="status">
      <div>
        <strong>{{ entryTitle(pinned) }}</strong>
        <span v-for="(line, index) in entryRules(pinned)" :key="index">{{ line }}</span>
        <em>{{ badge(pinned) }}</em>
      </div>
      <RouterLink v-if="studioLink" class="atlas-link" data-testid="quant-atlas-studio" :to="studioLink">
        {{ t('bots.quant.atlas.edit') }} ↗
      </RouterLink>
    </div>
    <p v-else class="atlas-hint">
      {{ t('bots.quant.atlas.pick') }}
      <RouterLink v-if="builderLink" class="atlas-link" data-testid="quant-atlas-builder" :to="builderLink">
        {{ t('bots.studio.title') }} ↗
      </RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { PageNames } from '@/consts/navigation';
import { QUANT_FAMILIES, type QuantAtlasMarket } from '@/features/bot-trading/quant-loop';
import {
  defaultStudioState,
  encodeStudioLink,
  studioCandidate,
  studioStateFromCandidateId,
} from '@/features/bot-trading/quant-studio';
import QuantParallel from './studio/QuantParallel.vue';
import type { ParallelAxis } from './studio/studio-types';
import type { RuleCondition } from '@/features/bot-trading/strategy-rules';

defineOptions({ name: 'QuantAtlasMap' });

/**
 * Every strategy the ready-made search tested in one market, as parallel coordinates from its
 * idea and order size to its results in each half. Brushing narrows the bundle; a pinned line
 * shows its rules in words and opens in the Strategy Studio for editing. Line positions are the
 * fast estimate; this view prints no result numbers.
 */
const props = defineProps<{
  atlas: QuantAtlasMarket | null;
  locale?: string;
  ariaLabel: string;
  paused?: boolean;
}>();

const COLUMNS = ['family', 'amount', 'trades', 'holding', 'maxDrop', 'first', 'second'];

const { t } = useTranslation();
const pinned = ref(-1);
const hovered = ref(-1);

const number = (value: number, digits = 0) =>
  value.toLocaleString(props.locale, { minimumFractionDigits: 0, maximumFractionDigits: digits });
const percent = (fraction: number) => {
  // `|| 0` turns a rounded negative zero into a plain zero.
  const value = Math.round(fraction * 100) || 0;
  return `${value > 0 ? '+' : ''}${number(value)}%`;
};

/** Atlas entries packed as row-major fractions for the parallel view. */
const packed = computed(() => {
  const atlas = props.atlas;
  if (!atlas) return null;
  const rows = atlas.entries.length;
  const data = new Float32Array(rows * COLUMNS.length);
  const strong = new Uint8Array(rows);
  atlas.entries.forEach((entry, row) => {
    data.set(
      [
        QUANT_FAMILIES.indexOf(entry.family),
        Number(entry.amount),
        entry.trades,
        entry.holding / 100,
        entry.drop / 100,
        entry.first / 100,
        entry.second / 100,
      ],
      row * COLUMNS.length
    );
    strong[row] = entry.robust ? 1 : 0;
  });
  return { data, rows, strong };
});
const selectedRow = computed(() => props.atlas?.entries.findIndex((entry) => entry.selected) ?? -1);
const amounts = computed(() => [...new Set(props.atlas?.entries.map((entry) => Number(entry.amount)) ?? [])].sort());

const axes = computed<ParallelAxis[]>(() => [
  {
    key: 'family',
    label: t('bots.studio.outcomes.idea'),
    format: (value) => t(`bots.quant.families.${QUANT_FAMILIES[Math.round(value)] ?? 'reversion'}`),
    categories: QUANT_FAMILIES.map((family, index) => ({ value: index, label: t(`bots.quant.families.${family}`) })),
  },
  {
    key: 'amount',
    label: t('bots.studio.params.amount'),
    format: (value) => t('bots.studio.units.xor', { value: number(value) }),
    categories: amounts.value.map((value) => ({ value, label: t('bots.studio.units.xor', { value: number(value) }) })),
  },
  { key: 'trades', label: t('bots.studio.outcomes.trades'), format: (value) => number(value), floor: 0, baseline: 0 },
  {
    key: 'holding',
    label: t('bots.studio.outcomes.holding'),
    format: (value) => `${number(Math.round(value * 100))}%`,
    floor: 0,
    baseline: 0,
    ceil: 1,
  },
  {
    key: 'maxDrop',
    label: t('bots.studio.outcomes.maxDrop'),
    format: (value) => percent(-value),
    floor: 0,
    baseline: 0,
    ceil: 1,
    invert: true,
  },
  { key: 'first', label: t('bots.studio.outcomes.first'), format: percent, floor: -1 },
  { key: 'second', label: t('bots.studio.outcomes.second'), format: percent, floor: -1 },
]);

const entry = (row: number) => (row >= 0 ? props.atlas?.entries[row] : undefined);
const pinnedEntry = computed(() => entry(pinned.value));

function leafText(leaf: RuleCondition): string {
  const side = leaf.direction === 'above' ? 'Above' : 'Below';
  if (leaf.kind === 'breakout') return t(`bots.quant.rule.breakout${side}`, { window: leaf.window });
  if (leaf.kind !== 'deviation' && leaf.kind !== 'momentum') return leaf.kind;
  const value = Number(leaf.threshold);
  return t(`bots.quant.rule.${leaf.kind}${side}`, { window: leaf.window, value: `${value > 0 ? '+' : ''}${value}` });
}
function entryTitle(row: number): string {
  const item = entry(row);
  return item
    ? `${t(`bots.quant.families.${item.family}`)} · ${t('bots.studio.units.xor', { value: item.amount })}`
    : '';
}
/** The rules in words: buy conditions, then sell conditions. */
function entryRules(row: number): string[] {
  const item = entry(row);
  const state = item && studioStateFromCandidateId(item.id);
  if (!state) return [];
  const rules = studioCandidate(state).rules;
  return [
    `${t('bots.quant.rule.buy', { amount: item.amount })} ${rules.entry.conditions.map(leafText).join(' · ')}`,
    ...(rules.exit?.conditions.length
      ? [`${t('bots.quant.rule.sell')} ${rules.exit.conditions.map(leafText).join(' · ')}`]
      : []),
  ];
}
function badge(row: number): string {
  const item = entry(row);
  if (!item) return '';
  if (item.selected) return t('bots.quant.atlas.used');
  return t(item.robust ? 'bots.quant.atlas.passed' : 'bots.quant.atlas.rejected');
}
function pin(row: number): void {
  pinned.value = pinned.value === row ? -1 : row;
}
/** Open the Strategy Studio on this market, starting from the bot's own strategy when there is one. */
const builderLink = computed(() => {
  if (!props.atlas) return null;
  const used = props.atlas.entries.find((item) => item.selected);
  const state = (used && studioStateFromCandidateId(used.id)) || defaultStudioState('dip');
  return {
    name: PageNames.Bots,
    params: { section: 'discover' },
    query: { studio: encodeStudioLink(props.atlas.market, state) },
  };
});
const studioLink = computed(() => {
  const item = pinnedEntry.value;
  const state = item && studioStateFromCandidateId(item.id);
  if (!item || !state || !props.atlas) return null;
  return {
    name: PageNames.Bots,
    params: { section: 'discover' },
    query: { studio: encodeStudioLink(props.atlas.market, state) },
  };
});

// A different market starts unpinned.
watch(
  () => props.atlas?.market,
  () => {
    pinned.value = -1;
    hovered.value = -1;
  }
);
</script>

<style scoped lang="scss">
.atlas {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.atlas-pinned {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 13px;
  background: color-mix(in srgb, var(--s-color-theme-accent, #f8087b) 6%, transparent);
  div {
    display: grid;
    gap: 2px;
  }
  span {
    color: var(--s-color-base-content-secondary, #6e6168);
  }
  em {
    font-style: normal;
    font-size: 12px;
    color: var(--s-color-base-content-tertiary, #796971);
  }
}
.atlas-link {
  font-weight: 700;
  color: var(--s-color-action-text, #ab0555);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 3px solid var(--s-color-focus-ring, #ab0555);
    outline-offset: 2px;
  }
}
.atlas-hint {
  margin: 0;
  font-size: 12px;
  color: var(--s-color-base-content-tertiary, #796971);
}
:deep(.parallel-tooltip) {
  span {
    color: var(--s-color-base-content-secondary, #6e6168);
  }
  em {
    font-style: normal;
    font-size: 11px;
    color: var(--s-color-base-content-tertiary, #796971);
  }
}
</style>
