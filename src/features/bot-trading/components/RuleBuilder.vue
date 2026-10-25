<template>
  <section class="rule-builder" data-testid="rule-builder" :aria-label="t('bots.rules.title')">
    <div v-if="showRecipes" class="rule-recipes" role="group" :aria-label="t('bots.rules.recipesLabel')">
      <button
        v-for="recipe in RULE_RECIPE_IDS"
        :key="recipe"
        type="button"
        :data-testid="`rule-recipe-${recipe}`"
        :aria-pressed="editing && selectedRecipe === recipe"
        @click="choose(recipe)"
      >
        <span class="rule-recipe-heading">
          <svg viewBox="0 0 48 24" aria-hidden="true"><path :d="glyphs[recipe]" /></svg>
          <strong>{{ t(`bots.rules.recipes.${recipe}.name`) }}</strong>
        </span>
        <span class="rule-recipe-idea">{{ t(`bots.rules.recipes.${recipe}.idea`) }}</span>
      </button>
    </div>
    <slot v-if="!editing" />
    <template v-if="editing">
      <div class="rule-title-row">
        <label
          ><span>{{ t('bots.rules.name') }}</span
          ><input
            :value="name"
            maxlength="80"
            data-testid="rule-name"
            @input="emit('update:name', ($event.target as HTMLInputElement).value)"
        /></label>
        <button type="button" class="rule-share" data-testid="rule-share" :disabled="!valid" @click="share">
          {{ t(copied ? 'bots.rules.copied' : 'bots.rules.share') }} ↗
        </button>
      </div>
      <p v-if="shareFallback" class="rule-share-fallback">
        <span>{{ t('bots.rules.copyLink') }}</span>
        <input :value="shareFallback" readonly :aria-label="t('bots.rules.share')" data-testid="rule-share-fallback" />
      </p>
      <div v-if="selectedRecipe" class="rule-recipe-explanation" data-testid="rule-recipe-explanation">
        <p>{{ t(`bots.rules.recipes.${selectedRecipe}.idea`) }}</p>
        <p>{{ t(`bots.rules.recipes.${selectedRecipe}.risk`) }}</p>
      </div>
      <RuleFlow v-if="valid && showFlow" :rules="modelValue" :active="active" />
      <p v-if="!valid" class="rule-error" role="alert" data-testid="rule-invalid">{{ t('bots.rules.invalid') }}</p>
      <div class="rule-groups">
        <section v-for="side in sides" :key="side" class="rule-group" :data-testid="`rule-group-${side}`">
          <header>
            <h3>{{ t(`bots.rules.${side}`) }}</h3>
            <label v-if="modelValue[side]" class="rule-operator">
              <span>{{ t('bots.rules.match') }}</span>
              <select
                :value="modelValue[side]?.operator"
                :data-testid="`rule-operator-${side}`"
                @change="changeOperator(side, ($event.target as HTMLSelectElement).value)"
              >
                <option value="all">{{ t('bots.rules.all') }}</option>
                <option value="any">{{ t('bots.rules.any') }}</option>
              </select>
            </label>
            <button
              v-if="side === 'exit'"
              class="rule-text-button"
              type="button"
              data-testid="rule-toggle-exit"
              @click="toggleExit"
            >
              {{ t(modelValue.exit ? 'bots.rules.removeExit' : 'bots.rules.addExit') }}
            </button>
          </header>
          <template v-if="modelValue[side]">
            <div
              v-for="(condition, index) in modelValue[side]?.conditions"
              :key="`${side}-${index}`"
              class="rule-condition"
            >
              <div class="rule-condition-fields">
                <label class="rule-condition-kind"
                  ><span>{{ t('bots.rules.condition') }} {{ index + 1 }}</span>
                  <select
                    :value="condition.kind"
                    :data-testid="`rule-kind-${side}-${index}`"
                    @change="changeKind(side, index, ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="kind in RULE_CONDITION_KINDS" :key="kind" :value="kind">
                      {{ t(`bots.rules.conditions.${kind}`) }}
                    </option>
                  </select>
                </label>
                <label
                  ><span>{{ t('bots.rules.direction') }}</span>
                  <select
                    :value="condition.direction"
                    :data-testid="`rule-direction-${side}-${index}`"
                    @change="patch(side, index, { direction: ($event.target as HTMLSelectElement).value })"
                  >
                    <option value="above">{{ t('bots.rules.above') }}</option>
                    <option value="below">{{ t('bots.rules.below') }}</option>
                  </select>
                </label>
                <label
                  ><span>{{ t('bots.rules.hours') }}</span>
                  <input
                    type="number"
                    min="2"
                    max="200"
                    step="1"
                    :value="condition.window"
                    :data-testid="`rule-window-${side}-${index}`"
                    @input="patch(side, index, { window: Number(($event.target as HTMLInputElement).value) })"
                  />
                </label>
                <label v-if="'threshold' in condition" class="rule-condition-value"
                  ><span>{{ t('bots.rules.percent') }}</span>
                  <input
                    :value="condition.threshold"
                    inputmode="decimal"
                    maxlength="16"
                    :data-testid="`rule-threshold-${side}-${index}`"
                    @input="patch(side, index, { threshold: ($event.target as HTMLInputElement).value })"
                  />
                </label>
                <label v-else-if="'percentile' in condition" class="rule-condition-value"
                  ><span>{{ t('bots.rules.percentile') }}</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    :value="condition.percentile"
                    :data-testid="`rule-percentile-${side}-${index}`"
                    @input="patch(side, index, { percentile: Number(($event.target as HTMLInputElement).value) })"
                  />
                </label>
                <span v-else class="rule-empty-field" aria-hidden="true" />
                <button
                  type="button"
                  class="rule-remove"
                  :disabled="modelValue[side]!.conditions.length === 1"
                  :aria-label="t('bots.rules.removeCondition', { number: index + 1 })"
                  :data-testid="`rule-remove-${side}-${index}`"
                  @click="remove(side, index)"
                >
                  ×
                </button>
              </div>
              <p>{{ t(`bots.rules.conditionHelp.${condition.kind}`) }}</p>
            </div>
            <button
              type="button"
              class="rule-text-button rule-add"
              :disabled="modelValue[side]!.conditions.length >= 4"
              :data-testid="`rule-add-${side}`"
              @click="add(side)"
            >
              ＋ {{ t('bots.rules.addCondition') }}
            </button>
          </template>
          <p v-else class="rule-muted">{{ t('bots.rules.noExit') }}</p>
        </section>
      </div>
      <div class="rule-bottom-line">
        <span>{{ t('bots.rules.execution') }}</span
        ><span>{{ t('bots.rules.exitPriority') }}</span>
      </div>
      <section class="rule-method">
        <h3>{{ t('bots.rules.why') }}</h3>
        <p>{{ t('bots.rules.searchWarning') }}</p>
        <p>{{ t('bots.rules.shareHelp') }}</p>
        <a
          href="https://web.archive.org/web/20201020033632/http://ivanidris.net/wordpress/index.php/series/numpy-strategies"
          target="_blank"
          rel="noopener noreferrer"
          >{{ t('bots.rules.sources') }} ↗</a
        >
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { parseStrategyRules, type StrategyRules, type RuleCondition } from '../strategy-rules';
import {
  defaultRuleCondition,
  ruleRecipe,
  ruleShareUrl,
  RULE_RECIPE_IDS,
  RULE_CONDITION_KINDS,
  type RuleRecipeId,
} from '../rule-recipes';
import RuleFlow from './RuleFlow.vue';

/** Optional recipe discovery and editor. The default slot hosts the selected basic strategy when not editing. */
const props = withDefaults(
  defineProps<{
    modelValue: StrategyRules;
    name: string;
    active?: boolean;
    editing?: boolean;
    showRecipes?: boolean;
    /** Disable when the parent displays the selected animation beside its primary action. */
    showFlow?: boolean;
  }>(),
  { active: true, editing: true, showRecipes: true, showFlow: true }
);
const emit = defineEmits<{
  'update:modelValue': [rules: StrategyRules];
  'update:name': [name: string];
  activate: [];
}>();
const { t } = useTranslation();
const sides = ['entry', 'exit'] as const;
type Side = (typeof sides)[number];
const copied = ref(false);
const shareFallback = ref('');
const glyphs: Record<RuleRecipeId, string> = {
  spring: 'M2 12H7L10 3L15 21L20 3L25 21L30 3L35 21L38 12H46',
  persistent: 'M2 22L9 18L15 19L22 13L28 14L35 7L40 8L46 2',
  range: 'M2 12L8 5L16 19L24 5L32 19L40 5L46 12M2 3H46M2 21H46',
  rebound: 'M2 18L11 6L20 9L27 16L34 14L40 7L46 3M11 5H46',
  expansion: 'M2 12L8 10L14 13L20 11L26 12L33 7L39 9L46 2',
  trend: 'M2 21L12 16L21 18L31 9L38 11L46 3M2 22L46 8',
  breakout: 'M2 14L10 10L19 17L28 12L35 14L46 2M2 9H46',
  dip: 'M2 6L13 9L22 18L31 11L39 13L46 4M2 12H46',
  quiet: 'M2 12L10 10L18 12L25 11L31 12L38 7L46 2M2 7H32M2 16H32',
};
const valid = computed(() => {
  try {
    parseStrategyRules(props.modelValue);
    return true;
  } catch {
    return false;
  }
});
const selectedRecipe = computed(() =>
  RULE_RECIPE_IDS.find((id) => JSON.stringify(ruleRecipe(id)) === JSON.stringify(props.modelValue))
);

/** Emit a detached tree, including temporarily invalid input for visible form validation. */
function edit(change: (copy: StrategyRules) => void): void {
  const copy: StrategyRules = {
    version: 1,
    entry: {
      ...props.modelValue.entry,
      conditions: props.modelValue.entry.conditions.map((condition) => ({ ...condition })),
    },
    exit: props.modelValue.exit
      ? {
          ...props.modelValue.exit,
          conditions: props.modelValue.exit.conditions.map((condition) => ({ ...condition })),
        }
      : null,
  };
  change(copy);
  copied.value = false;
  shareFallback.value = '';
  emit('update:modelValue', copy);
}
/** Load a detached recipe, then ask the parent to select it without launching an experiment. */
function choose(recipe: RuleRecipeId): void {
  emit('update:modelValue', ruleRecipe(recipe));
  emit('update:name', t(`bots.rules.recipes.${recipe}.name`));
  copied.value = false;
  shareFallback.value = '';
  emit('activate');
}
/** Replace all variant-specific fields when selecting a different condition type. */
function changeKind(side: Side, index: number, kind: string): void {
  if (!RULE_CONDITION_KINDS.includes(kind as RuleCondition['kind'])) return;
  edit((copy) => {
    copy[side]!.conditions[index] = defaultRuleCondition(kind as RuleCondition['kind']);
  });
}
/** Preserve input text until the shared parser accepts the whole draft. */
function patch(side: Side, index: number, values: Record<string, string | number>): void {
  edit((copy) => {
    copy[side]!.conditions[index] = { ...copy[side]!.conditions[index], ...values } as RuleCondition;
  });
}
/** Group operators are explicit; there is no implicit precedence or hidden nesting. */
function changeOperator(side: Side, value: string): void {
  if (value !== 'all' && value !== 'any') return;
  edit((copy) => {
    copy[side]!.operator = value;
  });
}
/** Keep expressions bounded to four conditions per group. */
function add(side: Side): void {
  if (!props.modelValue[side] || props.modelValue[side]!.conditions.length >= 4) return;
  edit((copy) => {
    copy[side]!.conditions.push(defaultRuleCondition('momentum'));
  });
}
/** An enabled group always has at least one condition. */
function remove(side: Side, index: number): void {
  if (!props.modelValue[side] || props.modelValue[side]!.conditions.length <= 1) return;
  edit((copy) => {
    copy[side]!.conditions.splice(index, 1);
  });
}
/** A missing exit means accumulation; selling then requires a manual action. */
function toggleExit(): void {
  edit((copy) => {
    copy.exit = copy.exit ? null : { operator: 'any', conditions: [{ kind: 'trend', direction: 'below', window: 48 }] };
  });
}
/** The copied URL contains signal conditions only; clipboard failure exposes a selectable link. */
async function share(): Promise<void> {
  if (!valid.value) return;
  const url = ruleShareUrl(props.modelValue, window.location.href);
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
  } catch {
    shareFallback.value = url;
  }
}
</script>

<style scoped lang="scss">
.rule-builder {
  min-width: 0;
  color: var(--s-color-base-content-primary);
}
.rule-recipes {
  display: grid;
  grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
  gap: 10px;
  margin-bottom: 20px;
}
.rule-recipes button {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  min-width: 0;
  padding: 16px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--s-color-base-background);
  box-shadow:
    4px 4px 10px var(--s-shadow-color-dark),
    -3px -3px 8px var(--s-shadow-color-light-dark);
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  text-align: start;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}
.rule-recipe-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1.4;
}
.rule-recipe-heading strong {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.rule-recipe-idea {
  font-size: 12px;
  line-height: 1.55;
  color: var(--s-color-base-content-secondary, inherit);
  overflow-wrap: anywhere;
}
.rule-recipe-explanation {
  margin: 18px 0;
  max-width: 90ch;
  font-size: 13px;
  line-height: 1.6;
}
.rule-recipe-explanation p {
  margin: 8px 0;
}
.rule-recipe-explanation p + p {
  color: var(--s-color-base-content-secondary, inherit);
}
.rule-recipes button:hover {
  transform: translateY(-2px);
  border-color: var(--s-color-theme-accent);
}
.rule-recipes button:active {
  transform: translateY(1px);
}
.rule-recipes button[aria-pressed='true'] {
  border-color: var(--s-color-theme-accent);
  background: var(--s-color-base-background);
  box-shadow:
    inset 3px 3px 7px var(--s-shadow-color-dark),
    inset -2px -2px 6px var(--s-shadow-color-light-dark);
}
.rule-recipes button[aria-pressed='true'] svg {
  color: var(--s-color-theme-accent);
  opacity: 1;
}
.rule-recipes svg {
  width: 40px;
  height: 23px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  opacity: 0.7;
  flex-shrink: 0;
}
.rule-title-row {
  display: flex;
  align-items: end;
  gap: 16px;
  justify-content: space-between;
}
.rule-title-row label {
  flex: 1;
  max-width: 380px;
}
.rule-builder label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.rule-builder label > span {
  font-size: 11px;
  opacity: 0.72;
}
.rule-builder input,
.rule-builder select {
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 7px 9px;
  color: inherit;
  background: var(--s-color-base-background);
  border: 1px solid var(--s-color-base-border-primary);
  border-radius: 6px;
  box-shadow:
    inset 2px 2px 5px var(--s-shadow-color-dark),
    inset -2px -2px 5px var(--s-shadow-color-light-dark);
  font: inherit;
  font-size: 13px;
}
.rule-builder button:focus-visible,
.rule-builder input:focus-visible,
.rule-builder select:focus-visible {
  outline: 2px solid var(--s-color-theme-accent);
  outline-offset: 3px;
}
.rule-builder button:disabled {
  opacity: 0.35;
  cursor: default;
}
.rule-share,
.rule-text-button,
.rule-remove {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.rule-share {
  min-height: 38px;
  font-size: 13px;
  white-space: nowrap;
}
.rule-share-fallback {
  font-size: 12px;
}
.rule-groups {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin-top: 16px;
}
.rule-group {
  border-top: 1px solid var(--s-color-base-border-primary);
  padding-top: 14px;
  min-width: 0;
}
.rule-group header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
}
.rule-group h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  text-transform: none;
}
.rule-builder .rule-operator {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.rule-operator select {
  width: 86px;
  height: 32px;
}
.rule-group header .rule-text-button {
  margin-left: auto;
  font-size: 12px;
}
.rule-condition {
  margin-bottom: 12px;
  border-inline-start: 2px solid var(--s-color-base-border-primary);
  padding-inline-start: 12px;
  transition: border-color 180ms ease;
}
.rule-condition:focus-within {
  border-inline-start-color: var(--s-color-theme-accent);
}
.rule-condition-fields {
  display: grid;
  grid-template-columns: #{'minmax(150px, 1.5fr) minmax(85px, 0.8fr) minmax(65px, 0.6fr) minmax(75px, 0.7fr)'} 28px;
  gap: 10px;
  align-items: end;
}
.rule-condition p {
  font-size: 11px;
  line-height: 1.45;
  opacity: 0.72;
  margin: 5px 0 0;
}
.rule-remove {
  height: 38px;
  font-size: 22px;
  opacity: 0.65;
}
.rule-add {
  padding: 5px 0;
  font-size: 12px;
}
.rule-bottom-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin-top: 18px;
  font-size: 11px;
  opacity: 0.75;
}
.rule-method {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.6;
}
.rule-method h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
}
.rule-method p {
  max-width: 75ch;
  opacity: 0.8;
}
.rule-method a {
  color: inherit;
}
.rule-error {
  padding: 12px 0;
  font-size: 13px;
  color: var(--s-color-status-error);
}
.rule-muted {
  font-size: 12px;
  opacity: 0.7;
}
@media (max-width: 900px) {
  .rule-recipes {
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
  }
}
@media (max-width: 600px) {
  .rule-recipes {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .rule-recipes button {
    padding: 14px;
  }
  .rule-condition-fields {
    grid-template-columns: #{'minmax(0, 1fr) minmax(0, 1fr)'} 28px;
    gap: 8px;
  }
  .rule-condition-kind {
    grid-column: 1 / 3;
  }
  .rule-condition-value {
    grid-column: 1 / -1;
  }
  .rule-remove {
    grid-column: 3;
    grid-row: 1;
  }
  .rule-empty-field {
    display: none;
  }
  .rule-title-row {
    gap: 8px;
  }
  .rule-group header {
    gap: 10px;
  }
  .rule-builder .rule-operator > span {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rule-recipes button,
  .rule-condition {
    transition: none;
  }
  .rule-recipes button:hover,
  .rule-recipes button:active {
    transform: none;
  }
}
</style>
