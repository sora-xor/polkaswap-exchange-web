import { SPagination } from '@/lib'
import type { Meta } from '@storybook/vue3'

export default {
  component: SPagination,
  args: {
    total: 143,
    pageSize: 30,
    pageSizes: [10, 30, 50],
  },
} as Meta<typeof SPagination>

export const Default = {}
