<script setup lang="ts">
import { computed, inject } from 'vue'

import { ROW_INJECTION_KEY } from '../Row/context'

type ResponsiveConfig = Partial<Record<'span' | 'offset' | 'push' | 'pull', number>>
type ResponsiveProp = number | ResponsiveConfig | undefined

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const
type BreakpointKey = (typeof BREAKPOINTS)[number]

const props = withDefaults(
  defineProps<{
    span?: number
    offset?: number
    push?: number
    pull?: number
    xs?: ResponsiveProp
    sm?: ResponsiveProp
    md?: ResponsiveProp
    lg?: ResponsiveProp
    xl?: ResponsiveProp
    tag?: string
  }>(),
  {
    span: 12,
    offset: 0,
    push: 0,
    pull: 0,
    tag: 'div',
  },
)

defineOptions({ name: 'SCol' })

const row = inject(ROW_INJECTION_KEY, null)

const clamp = (value: number) => Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 12)
const isNil = (value: unknown): value is null | undefined => value === null || value === undefined

const toPercent = (value: number) => `${Number(((value / 12) * 100).toFixed(4))}%`

const baseConfig = computed(() => ({
  span: clamp(props.span ?? 12),
  offset: clamp(props.offset ?? 0),
  push: clamp(props.push ?? 0),
  pull: clamp(props.pull ?? 0),
}))

const normalizeResponsive = (value: ResponsiveProp): ResponsiveConfig | null => {
  if (isNil(value)) return null
  if (typeof value === 'number') {
    return { span: clamp(value) }
  }
  const normalized: ResponsiveConfig = {}
  if ('span' in value && !isNil(value.span)) normalized.span = clamp(value.span)
  if ('offset' in value && !isNil(value.offset)) normalized.offset = clamp(value.offset)
  if ('push' in value && !isNil(value.push)) normalized.push = clamp(value.push)
  if ('pull' in value && !isNil(value.pull)) normalized.pull = clamp(value.pull)

  return Object.keys(normalized).length ? normalized : null
}

const responsiveConfigs = computed(() => {
  const result: Partial<Record<BreakpointKey, ResponsiveConfig>> = {}

  for (const key of BREAKPOINTS) {
    const config = normalizeResponsive(props[key])
    if (config) {
      result[key] = config
    }
  }

  return result
})

const gutter = computed(() => row?.gutter.value ?? 0)

const style = computed(() => {
  const base = baseConfig.value
  const map: Record<string, string | undefined> = {
    '--s-col-gutter': `${gutter.value}px`,
    '--s-col-span-width': toPercent(base.span),
    '--s-col-offset': toPercent(base.offset),
    '--s-col-translate': toPercent(base.push - base.pull),
    paddingLeft: gutter.value ? `${gutter.value / 2}px` : undefined,
    paddingRight: gutter.value ? `${gutter.value / 2}px` : undefined,
    display: base.span === 0 ? 'none' : undefined,
  }

  const configs = responsiveConfigs.value
  for (const key of BREAKPOINTS) {
    const config = configs[key]
    if (!config) continue

    if (!isNil(config.span)) map[`--s-col-span-width-${key}`] = toPercent(config.span)
    if (!isNil(config.offset)) map[`--s-col-offset-${key}`] = toPercent(config.offset)

    if (!isNil(config.push) || !isNil(config.pull)) {
      const push = clamp(config.push ?? 0)
      const pull = clamp(config.pull ?? 0)
      map[`--s-col-translate-${key}`] = toPercent(push - pull)
    }
  }

  return map
})

const tag = computed(() => props.tag || 'div')
</script>

<template>
  <component :is="tag" class="s-col" :style="style">
    <slot />
  </component>
</template>

<style lang="scss">
.s-col {
  --s-col-span-width-current: var(--s-col-span-width, 100%);
  --s-col-offset-current: var(--s-col-offset, 0%);
  --s-col-translate-current: var(--s-col-translate, 0%);

  box-sizing: border-box;
  min-height: 1px;
  padding-left: calc(var(--s-col-gutter, 0px) / 2);
  padding-right: calc(var(--s-col-gutter, 0px) / 2);
  flex: 0 0 var(--s-col-span-width-current);
  max-width: var(--s-col-span-width-current);
  margin-left: var(--s-col-offset-current);
  transform: translateX(var(--s-col-translate-current));
  transition: none;
}

@media (min-width: 640px) {
  .s-col {
    --s-col-span-width-current: var(--s-col-span-width-sm, var(--s-col-span-width, 100%));
    --s-col-offset-current: var(--s-col-offset-sm, var(--s-col-offset, 0%));
    --s-col-translate-current: var(--s-col-translate-sm, var(--s-col-translate, 0%));
  }
}

@media (min-width: 1024px) {
  .s-col {
    --s-col-span-width-current: var(--s-col-span-width-md, var(--s-col-span-width-sm, var(--s-col-span-width, 100%)));
    --s-col-offset-current: var(--s-col-offset-md, var(--s-col-offset-sm, var(--s-col-offset, 0%)));
    --s-col-translate-current: var(--s-col-translate-md, var(--s-col-translate-sm, var(--s-col-translate, 0%)));
  }
}

@media (min-width: 1200px) {
  .s-col {
    --s-col-span-width-current: var(
      --s-col-span-width-lg,
      var(--s-col-span-width-md, var(--s-col-span-width-sm, var(--s-col-span-width, 100%)))
    );
    --s-col-offset-current: var(
      --s-col-offset-lg,
      var(--s-col-offset-md, var(--s-col-offset-sm, var(--s-col-offset, 0%)))
    );
    --s-col-translate-current: var(
      --s-col-translate-lg,
      var(--s-col-translate-md, var(--s-col-translate-sm, var(--s-col-translate, 0%)))
    );
  }
}

@media (min-width: 1920px) {
  .s-col {
    --s-col-span-width-current: var(
      --s-col-span-width-xl,
      var(--s-col-span-width-lg, var(--s-col-span-width-md, var(--s-col-span-width-sm, var(--s-col-span-width, 100%))))
    );
    --s-col-offset-current: var(
      --s-col-offset-xl,
      var(--s-col-offset-lg, var(--s-col-offset-md, var(--s-col-offset-sm, var(--s-col-offset, 0%))))
    );
    --s-col-translate-current: var(
      --s-col-translate-xl,
      var(--s-col-translate-lg, var(--s-col-translate-md, var(--s-col-translate-sm, var(--s-col-translate, 0%))))
    );
  }
}
</style>
