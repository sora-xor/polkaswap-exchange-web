<script setup lang="ts">
import {
  IconArrowsChevronRightXs24,
  IconArrowsChevronLeftXs24,
  IconChevronsLeft16,
  IconChevronsRight16,
} from '@/components/icons'
import { not } from '@vueuse/math'
import { SDropdown } from '@/components'
import { usePassiveModel } from '@/composables/passive-model'

const PAGINATION_MAX_PAGES_SELECTABLE = 7
const PAGINATION_JUMP_SIZE = PAGINATION_MAX_PAGES_SELECTABLE - 2
const PAGINATION_BREAKPOINT_WIDTH = 480

type PaginationJumpValues = number | 'jumpNext' | 'jumpPrev'

const props = withDefaults(
  defineProps<{
    /**
     * total item count
     * */
    total?: number
    /**
     * item count of each page, two-way bound
     * */
    pageSize?: number | null
    /**
     * current page number, two-way bound
     * */
    currentPage?: number
    /**
     * options of item count per page
     * */
    pageSizes?: number[]
    /**
     * text shown near sizes dropdown
     * */
    sizesLabel?: string
  }>(),
  {
    total: 0,
    pageSize: null,
    currentPage: 1,
    pageSizes: () => [10, 50, 100],
    sizesLabel: 'Rows per page',
  },
)
/* eslint-disable @typescript-eslint/unified-signatures */
const emit = defineEmits<{
  (event: 'click:prev', value: number): void
  (event: 'click:next', value: number): void
}>()

const currentModel = defineModel<number>('currentPage', { default: 1 })
const current = usePassiveModel(currentModel)
const sizeModel = defineModel<number | null>('pageSize', { default: null })
const size = usePassiveModel(sizeModel)
const numericSize = computed({
  get: () => {
    return size.value ?? (props.pageSizes[0] || 10)
  },
  set: (value: null | number) => {
    size.value = value
  },
})

const sizeOptions = computed(() => props.pageSizes.map((size) => ({ label: String(size), value: size })))

const pagesNum = eagerComputed(() => Math.max(1, Math.ceil(props.total / numericSize.value)))
const isCurrentFirst = eagerComputed(() => current.value === 1)
const isCurrentLast = eagerComputed(() => current.value === pagesNum.value)
const isAbleJumpPrev = eagerComputed(() => current.value >= PAGINATION_JUMP_SIZE)
const isAbleJumpNext = eagerComputed(() => current.value <= pagesNum.value - PAGINATION_JUMP_SIZE + 1)
const shouldShowControls = eagerComputed(() => pagesNum.value > PAGINATION_MAX_PAGES_SELECTABLE)
const firstItemNum = eagerComputed(() => (current.value - 1) * numericSize.value + 1)
const lastItemNum = eagerComputed(() => Math.min(props.total, current.value * numericSize.value))

const isJumpPrevButtonHovered = ref(false)
whenever(not(isAbleJumpPrev), () => {
  isJumpPrevButtonHovered.value = false
})
const isJumpNextButtonHovered = ref(false)
whenever(not(isAbleJumpNext), () => {
  isJumpNextButtonHovered.value = false
})

const pagination = ref(null)
const paginationContainerWidth = ref(0)
useResizeObserver(pagination, (entries) => {
  setTimeout(() => {
    paginationContainerWidth.value = entries[0].contentRect.width
  })
})

const paginationLeftPanel = ref(null)
const paginationLeftPanelWidth = ref(0)
useResizeObserver(paginationLeftPanel, (entries) => {
  setTimeout(() => {
    paginationLeftPanelWidth.value = entries[0].contentRect.width
  })
})

const paginationRightPanel = ref(null)
const paginationRightPanelWidth = ref(0)
useResizeObserver(paginationRightPanel, (entries) => {
  setTimeout(() => {
    paginationRightPanelWidth.value = entries[0].contentRect.width
  })
})

const shouldWrap = computed(() => {
  return (
    paginationContainerWidth.value < paginationLeftPanelWidth.value + paginationRightPanelWidth.value ||
    paginationContainerWidth.value <= PAGINATION_BREAKPOINT_WIDTH
  )
})

watch(pagesNum, () => {
  if (pagesNum.value < current.value) {
    current.value = pagesNum.value
  }
})

function toggleJumpButtonHover(page: PaginationJumpValues, value: boolean) {
  if (page === 'jumpNext') {
    isJumpNextButtonHovered.value = value
  }

  if (page === 'jumpPrev') {
    isJumpPrevButtonHovered.value = value
  }
}

const pageButtons = computed(() => {
  const res: PaginationJumpValues[] = []

  for (let i = 1; i <= pagesNum.value; i++) {
    if (shouldShowControls.value && i === pagesNum.value && isAbleJumpNext.value) {
      res.push('jumpNext')
    }

    if (isPageVisible(i)) {
      res.push(i)
    }

    if (shouldShowControls.value && i === 1 && isAbleJumpPrev.value) {
      res.push('jumpPrev')
    }
  }

  return res
})

function isPageVisible(page: number) {
  return (
    !shouldShowControls.value ||
    current.value === page ||
    page === 1 ||
    page === pagesNum.value ||
    (!isAbleJumpNext.value && page >= pagesNum.value - PAGINATION_JUMP_SIZE) ||
    (!isAbleJumpPrev.value && page <= PAGINATION_JUMP_SIZE + 1) ||
    (isAbleJumpNext.value && isAbleJumpPrev.value && Math.abs(current.value - page) < PAGINATION_JUMP_SIZE / 2)
  )
}

function handleJumpClick(value: PaginationJumpValues) {
  if (value === 'jumpNext') {
    if (isAbleJumpNext.value) {
      current.value = Math.min(pagesNum.value, current.value + PAGINATION_JUMP_SIZE)
    }

    return
  }

  if (value === 'jumpPrev') {
    if (isAbleJumpPrev.value) {
      current.value = Math.max(1, current.value - PAGINATION_JUMP_SIZE)
    }

    return
  }

  current.value = value
}

function handleNextClick() {
  if (isCurrentLast.value) {
    return
  }

  const newPage = current.value + 1
  emit('click:next', newPage)
  current.value = newPage
}

function handlePrevClick() {
  if (isCurrentFirst.value) {
    return
  }

  const newPage = current.value - 1
  emit('click:prev', newPage)
  current.value = newPage
}
</script>

<template>
  <div ref="pagination" class="s-pagination flex flex-wrap justify-between flex-row-reverse" data-testid="pagination">
    <div
      class="order-last flex"
      :class="{
        'basis-full justify-center mt-16px': shouldWrap,
      }"
    >
      <div ref="paginationLeftPanel" class="flex">
        <div class="s-pagination__sizes whitespace-nowrap mr-24px flex items-center">
          <div class="s-pagination__sizes-label sora-tpg-p4 mr-8px">
            {{ sizesLabel }}
          </div>
          <SDropdown v-model="numericSize" size="sm" :options="sizeOptions" />
        </div>

        <div
          class="s-pagination__count whitespace-nowrap sora-tpg-p4 flex items-center"
          data-testid="pagination-progress"
        >
          <slot name="progress" v-bind="{ firstItemNum, lastItemNum, total }">
            {{ firstItemNum }}—{{ lastItemNum }} of {{ total }}
          </slot>
        </div>
      </div>
    </div>

    <div
      class="order-first flex"
      :class="{
        'basis-full justify-center': shouldWrap,
      }"
    >
      <div ref="paginationRightPanel" class="flex">
        <div class="s-pagination__pages flex items-center">
          <template v-for="pageButton in pageButtons" :key="pageButton">
            <button
              class="s-pagination__button flex justify-center min-w-24px sora-tpg-h7"
              :class="{
                's-pagination__button_active': current === pageButton,
                'ml-4px': Number(pageButton) > 1,
              }"
              data-testid="page-button"
              @click="handleJumpClick(pageButton)"
              @mouseenter="toggleJumpButtonHover(pageButton, true)"
              @mouseleave="toggleJumpButtonHover(pageButton, false)"
              @focus="toggleJumpButtonHover(pageButton, true)"
              @blur="toggleJumpButtonHover(pageButton, false)"
            >
              <template v-if="pageButton === 'jumpPrev'">
                <IconChevronsLeft16 v-if="isJumpPrevButtonHovered" class="s-pagination__button-icon" />
                <template v-else> … </template>
              </template>
              <template v-else-if="pageButton === 'jumpNext'">
                <IconChevronsRight16 v-if="isJumpNextButtonHovered" class="s-pagination__button-icon" />
                <template v-else> … </template>
              </template>
              <template v-else>
                {{ pageButton }}
              </template>
            </button>
          </template>
        </div>

        <div
          v-if="shouldShowControls"
          class="s-pagination__arrows flex items-center ml-16px"
          data-testid="pagination-controls"
        >
          <button
            class="s-pagination__button w-24px h-24px mr-8px"
            :class="{
              's-pagination__button_disabled': isCurrentFirst,
            }"
            data-testid="prev-button"
            @click="handlePrevClick"
          >
            <IconArrowsChevronLeftXs24 class="s-pagination__button-icon" />
          </button>
          <button
            class="s-pagination__button w-24px h-24px"
            :class="{
              's-pagination__button_disabled': isCurrentLast,
            }"
            data-testid="next-button"
            @click="handleNextClick"
          >
            <IconArrowsChevronRightXs24 class="s-pagination__button-icon" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use '@/theme';

.s-pagination {
  &__button {
    cursor: pointer;
    color: theme.token-as-var('sys.color.content-primary');

    &_active {
      color: theme.token-as-var('sys.color.primary-pressed');
    }

    &_disabled {
      color: theme.token-as-var('sys.color.on-disabled');
      cursor: default;
    }

    &:not(&_disabled):hover {
      color: theme.token-as-var('sys.color.primary-hover');
    }
  }

  &__button-icon {
    fill: currentColor;
  }

  &__count {
    color: theme.token-as-var('sys.color.content-tertiary');
  }

  &__sizes-label {
    color: theme.token-as-var('sys.color.content-tertiary');
  }
}
</style>
