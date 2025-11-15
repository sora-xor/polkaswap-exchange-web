import { STable, STableColumn } from '@/lib'
import type { Meta } from '@storybook/vue3'

const meta = {
  component: defineComponent({
    components: {
      STable,
      STableColumn,
    },
    setup() {
      const data = [
        { prop1: '21', prop2: 'a12', date: 1424631694418, prop4: 'c12' },
        { prop1: '12', prop2: 'a421', date: 1224382694418, prop4: 'c21' },
        { prop1: '31', prop2: 'a2', date: 1524682614418, prop4: 'c2' },
        { prop1: '13', prop2: 'a32', date: 1654642633318, prop4: 'c32' },
      ]

      return {
        // args,
        currentData: ref(data),
        data: ref(data),
        altData: ref([
          { prop1: '21', prop2: 'b12', date: 1424331994418, prop4: 'g12' },
          { prop1: 'q12', prop2: 'b421', date: 1223389694418, prop4: 'g21' },
          { prop1: 'q31', prop2: 'b2', date: 1524632694418, prop4: 'g2' },
          { prop1: 'q13', prop2: 'b32', date: 1654342933318, prop4: 'g32' },
        ]),
        formatter: (_row: any, _column: any, x: number) => new Date(x).toLocaleDateString(),
        selectable: (_row: any, index: number) => !!(index % 2),
        sortOrders: ['descending', 'ascending', null],
        expandRowKeys: ref(['q21']),
        showHeader: ref(true),
      }
    },
    template: `
      <button class="mr-4 shadow rounded-xl px-8px py-4px" @click="showHeader = !showHeader">Toggle header</button>
      <button class="mr-4 shadow rounded-xl px-8px py-4px" @click="currentData = data">Set main data</button>
      <button class="mr-4 shadow rounded-xl px-8px py-4px" @click="currentData = altData">Set alt data</button>
      <button class="mr-4 shadow rounded-xl px-8px py-4px" @click="currentData = []">Remove data</button>
  
      <s-table
        class="mt-24px"
        :data="currentData"
        :show-header="showHeader"
        highlight-current-row
        row-key="prop1"
      >
        <template #append>
          Appended slot content starts here (has no default styles).
          <br>Not obvious features shown here:
          <br>- prop1 = 21 is common value for both datasets and prop1 is row key, so it reserves selection (reserve-selection column prop)
          <br>- even rows set as not selectable
          <br>- prop1 column has custom sort, prop2 and date default, but date column has alternative sort order
          <br>- prop1 column has tooltip for cell content and so ellipsis overflow
          <br>- prop1, prop2 and prop4 have min-widths (100px, 200px, 50px) and date has fixed width (120px)
        </template>
        <s-table-column type="selection" :selectable="selectable" reserve-selection />
        <s-table-column
          prop="prop1"
          label="Prop 1"
          min-width="100"
          show-overflow-tooltip
          class-name="td-class"
          label-class-name="header-class"
          sortable="custom"
        >
          <template #default="{ row, column, rowIndex }">
            Row #{{ rowIndex }}: {{ row.prop1 }} - custom
          </template>
          
          <template #header="{ column, columnIndex }">
            {{ column.label }} - custom
          </template>
        </s-table-column>
  
        <s-table-column
          prop="prop2"
          label="Prop 2"
          min-width="200"
          header-align="center"
          align="right"
          sortable
        />
        <s-table-column
          prop="date"
          label="Date"
          width="120"
          align="right"
          :formatter="formatter"
          header-align="center"
          :sort-orders="sortOrders"
          sortable
        />
        <s-table-column
          prop="prop4"
          label="Prop 4"
          min-width="50"
          align="center"
          header-align="right"
        />
        <s-table-column type="expand">
          <template #default="{ row, column, rowIndex }">
            Expand slot for row #{{ rowIndex }}, where raw date field is {{ row.date }}
          </template>
        </s-table-column>
        <s-table-column type="details" />
      </s-table>
    `,
  }),
} as Meta

export default meta

export const Comprehensive = {}
