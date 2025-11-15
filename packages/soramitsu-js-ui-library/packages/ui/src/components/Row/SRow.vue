<script setup lang="ts">
import { computed, provide } from 'vue'

import { usePropTypeFilter } from '@/composables/prop-type-filter'

import { ROW_ALIGN_VALUES, ROW_JUSTIFY_VALUES, type RowAlign, type RowJustify } from './consts'
import { ROW_INJECTION_KEY } from './context'

const props = withDefaults(
  defineProps<{
    gutter?: number
    justify?: RowJustify
    align?: RowAlign
    flex?: boolean
    wrap?: boolean
  }>(),
  {
    gutter: 0,
    justify: 'start',
    align: 'top',
    flex: true,
    wrap: true,
  },
)

defineOptions({ name: 'SRow' })

const filterProp = usePropTypeFilter(props)

const normalizedJustify = filterProp('justify', ROW_JUSTIFY_VALUES, 'start')
const normalizedAlign = filterProp('align', ROW_ALIGN_VALUES, 'top')

const justifyMap: Record<RowJustify, string> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  'space-around': 'space-around',
  'space-between': 'space-between',
}

const alignMap: Record<RowAlign, string> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
}

const gutterRef = computed(() => props.gutter ?? 0)

const style = computed(() => {
  const gutter = props.gutter ?? 0

  const result: Record<string, string | undefined> = {
    '--s-row-gutter': `${gutter}px`,
    marginLeft: gutter ? `${-gutter / 2}px` : undefined,
    marginRight: gutter ? `${-gutter / 2}px` : undefined,
    justifyContent: justifyMap[normalizedJustify.value],
    alignItems: alignMap[normalizedAlign.value],
    flexWrap: props.wrap ? 'wrap' : 'nowrap',
  }

  return result
})

provide(ROW_INJECTION_KEY, { gutter: gutterRef })

const tag = computed(() => 'div')
</script>

<template>
  <component :is="tag" class="s-row" :style="style">
    <slot />
  </component>
</template>

<style lang="scss">
.s-row {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  gap: 0;
}
</style>
