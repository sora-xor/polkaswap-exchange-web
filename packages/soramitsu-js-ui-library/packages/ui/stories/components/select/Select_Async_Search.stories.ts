import { type SelectOption, SSelect } from '@/lib'
import type { Meta, StoryObj } from '@storybook/vue3'
import { COMMON_ARG_TYPES, COMMON_ARGS, OPTIONS } from './common'
import { delay, usePromise } from '@vue-kakuyaku/core'
import { produce } from 'immer'
import type { Writable } from 'type-fest'

const meta = {
  title: 'select/Select - Async Search',
  component: defineComponent({
    components: { SSelect },
    setup() {
      const { state: options, set } = usePromise<SelectOption[]>()

      function handleSearch(query?: string) {
        const fn = async () => {
          await delay(300 + 1000 * Math.random())

          if (query) {
            const reg = new RegExp(query, 'i')
            return OPTIONS.filter((x) => reg.test(x.label))
          }
          return OPTIONS
        }

        set(fn())
      }

      handleSearch()

      const model = ref(['en', 'jp'])

      return { model, options, handleSearch }
    },
    template: `
      <div class="flex">
        <SSelect
          v-bind="$attrs"
          v-model="model"
          remote-search
          :options="options.fulfilled?.value"
          :loading="options.pending"
          @search="handleSearch"
        />
      </div>
    `,
  }),
  args: produce(COMMON_ARGS as Writable<Partial<typeof COMMON_ARGS>>, (draft) => {
    delete draft.loading
    draft.dropdownSearch = true
  }),
  argTypes: COMMON_ARG_TYPES,
} as Meta

export default meta

type Story = StoryObj<typeof meta>

export const Default = {} as Story
