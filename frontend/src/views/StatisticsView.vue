<script setup lang="ts">
import { ref, shallowRef, computed } from 'vue'
import MainHeader from '@/components/MainHeader.vue'
import api from '@/api/axios'
import type { StatisticsRecord, ComputedRow } from '@/types'

const today = new Date().toLocaleDateString('en-CA')
const firstOfYear = `${new Date().getFullYear()}-01-01`

const startDate = ref(firstOfYear)
const endDate = ref(today)

const rawRows = ref<StatisticsRecord[]>([])
const isLoading = shallowRef(false)
const fetchError = shallowRef<string | null>(null)
const hasFetched = shallowRef(false)

const isRangeValid = computed(() => startDate.value <= endDate.value)

const calcCost = (prev: StatisticsRecord, row: StatisticsRecord) => {
  const gas = (row.gas - prev.gas) * row.gas_tax
  const water = (row.water - prev.water) * row.water_tax
  const dayelec = (row.dayelec - prev.dayelec) * row.dayelec_tax
  const nightelec = (row.nightelec - prev.nightelec) * row.nightelec_tax
  const heat = prev.heat && row.heat ? (row.heat - prev.heat) : row.heat          // adjust when heat tax is available
  const trash = row.trash_fixed
  const water_delivery = row.water_delivery_fixed
  const total = gas + water + dayelec + nightelec + heat + trash + water_delivery

  return { gas, water, dayelec, nightelec, heat, trash, water_delivery, total }
}

const taxChanged = (a: StatisticsRecord, b: StatisticsRecord): boolean => {
  return (
    a.gas_tax !== b.gas_tax ||
    a.water_tax !== b.water_tax ||
    a.dayelec_tax !== b.dayelec_tax ||
    a.nightelec_tax !== b.nightelec_tax ||
    a.trash_fixed !== b.trash_fixed ||
    a.water_delivery_fixed !== b.water_delivery_fixed
  )
}

// Build computed rows — first visible row is index 1 (index 0 is the prefetch anchor)
const rows = computed<ComputedRow[]>(() => {
  return rawRows.value.map((row: ComputedRow, idx: number) => {
    const prev = idx > 0 ? rawRows.value[idx - 1] : null
    const prevPrev = idx > 1 ? rawRows.value[idx - 2] : null
    
    const cost = prev
      ? calcCost(prev, row)
      : {
        gas: 0,
        water: 0,
        dayelec: 0,
        nightelec: 0,
        heat: 0,
        total: 0,
        trash: 0,
        water_delivery: 0,
      }

    const diff = prev
      ? {
          gas: row.gas - prev.gas,
          water: row.water - prev.water,
          dayelec: row.dayelec - prev.dayelec,
          nightelec: row.nightelec - prev.nightelec,
          heat: row.heat - prev.heat,
          total: prevPrev ? +(cost.total - calcCost(prevPrev, prev).total).toFixed(2) : cost.total.toFixed(2),
          taxChanged: taxChanged(row, prev),
        }
      : {
          gas: null, water: null, dayelec: null,
          nightelec: null, heat: null, total: null,
          taxChanged: false,
        }

    return { ...row, cost, diff }
  })
})

// Visible rows — hide the prefetch anchor (index 0) if it's before start
const visibleRows = computed(() =>
  rows.value.filter(({ created_at }) => created_at >= startDate.value)
)

const fetchStatistics = async () => {
  if (!isRangeValid.value) return

  fetchError.value = null
  isLoading.value = true
  hasFetched.value = false

  try {
    const { data } = await api.get('/statistics', {
      params: { start: startDate.value, end: endDate.value }
    })
    rawRows.value = data.data ?? []
    hasFetched.value = true
  } catch (err: any) {
    fetchError.value = err.response?.data?.error ?? 'Failed to load statistics'
  } finally {
    isLoading.value = false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
}

const formatDiff = (val: number | null): string => {
  if (val === null) return '—'
  if (val === 0) return '0'

  return val > 0 ? `+${val}` : `${val}`
}

const diffClass = (val: number | null): string => {
  if (val === null || val === 0) return ''

  return val > 0 ? 'diff--up' : 'diff--down'
}
</script>

<template>
  <div class="statistics-view">
    <main-header />

    <h2 class="statistics-view__title">Statistics</h2>

    <div class="statistics-view__filters flex">
      <div class="field col">
        <label for="stat-start">From</label>
        <input id="stat-start" v-model="startDate" type="date" :max="endDate" />
      </div>
      <div class="field col">
        <label for="stat-end">To</label>
        <input id="stat-end" v-model="endDate" type="date" :min="startDate" :max="today" />
      </div>
      <button
        class="btn btn--primary btn--sm"
        :disabled="!isRangeValid || isLoading"
        @click="fetchStatistics"
      >
        {{ isLoading ? 'Loading...' : 'Load' }}
      </button>
    </div>

    <p v-if="!isRangeValid" class="statistics-view__error">
      Start date must be before end date.
    </p>
    <p v-if="fetchError" class="statistics-view__error">{{ fetchError }}</p>

    <p v-if="hasFetched && visibleRows.length === 0" class="statistics-view__empty">
      No records found for the selected period.
    </p>

    <div v-else-if="visibleRows.length > 0" class="stat-table-wrap">
      <table class="stat-table">
        <thead>
          <tr>
            <th rowspan="2">Month</th>
            <th colspan="5">Consumption</th>
            <th colspan="7">Cost (×rate)</th>
            <th colspan="2">Month diff</th>
            <th rowspan="2">Tax period</th>
          </tr>
          <tr>
            <!-- Consumption -->
            <th>Gas</th>
            <th>Water</th>
            <th>Elec D</th>
            <th>Elec N</th>
            <th>Heat</th>
            <!-- Cost -->
            <th>Gas</th>
            <th>Water</th>
            <th>Elec D</th>
            <th>Elec N</th>
            <th>Trash</th>
            <th>W.del</th>
            <th class="stat-table__total">Total</th>
            <!-- Diff -->
            <th>Consumption</th>
            <th>Cost</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in visibleRows"
            :key="row.id"
            :class="{ 'stat-table__row--tax-changed': row.diff.taxChanged }"
          >
            <td>{{ formatDate(row.created_at) }}</td>

            <!-- Consumption -->
            <td>{{ row.gas }}</td>
            <td>{{ row.water }}</td>
            <td>{{ row.dayelec }}</td>
            <td>{{ row.nightelec }}</td>
            <td>{{ row.heat || '—' }}</td>

            <!-- Cost -->
            <td>{{ row.cost.gas.toFixed(2) }}</td>
            <td>{{ row.cost.water.toFixed(2) }}</td>
            <td>{{ row.cost.dayelec.toFixed(2) }}</td>
            <td>{{ row.cost.nightelec.toFixed(2) }}</td>
            <td>{{ row.cost.trash.toFixed(2) }}</td>
            <td>{{ row.cost.water_delivery.toFixed(2) }}</td>
            <td class="stat-table__total">{{ row.cost.total.toFixed(2) }}</td>

            <!-- Diff -->
            <td>
              <span
                v-if="row.diff.gas !== null"
                class="diff-group"
              >
                <span :class="diffClass(row.diff.gas)">g:{{ formatDiff(row.diff.gas) }}</span>
                <span :class="diffClass(row.diff.water)">w:{{ formatDiff(row.diff.water) }}</span>
                <span :class="diffClass(row.diff.dayelec)">ed:{{ formatDiff(row.diff.dayelec) }}</span>
                <span :class="diffClass(row.diff.nightelec)">en:{{ formatDiff(row.diff.nightelec) }}</span>
              </span>
              <span v-else>—</span>
            </td>
            <td>
              <span :class="diffClass(row.diff.total)">
                {{ formatDiff(row.diff.total) }}
              </span>
            </td>

            <!-- Tax period -->
            <td class="stat-table__tax-period">
              <span v-if="row.diff.taxChanged" class="tax-badge tax-badge--changed" title="Tax rates changed">
                ↑ changed
              </span>
              {{ formatDate(row.tax_start) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else-if="!hasFetched" class="statistics-view__empty">
      Select a date range and press Load.
    </p>
  </div>
</template>

<style scoped lang="scss">
.statistics-view {
  max-width: 56rem;
  margin: 0 auto;
  padding: 2rem 1rem;

  &__title   { margin-bottom: 1.5rem; }

  &__filters {
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;

      label { font-size: 0.875rem; font-weight: 500; }

      input[type='date'] {
        padding: 0.375rem 0.5rem;
        border: 1px solid var(--border);
        border-radius: 0.375rem;
        font-size: 0.9375rem;
      }
    }
  }

  &__error {
    color: var(--danger);
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
  &__empty {
    color: var(--gray-32);
    text-align: center;
    margin-top: 3rem;
  }
}

.stat-table-wrap { overflow-x: auto; }

.stat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  white-space: nowrap;

  th, td {
    padding: 0.5rem 0.625rem;
    border: 1px solid #e5e7eb;
    text-align: right;
  }

  th {
    font-weight: 600;
    text-align: center;
  }

  td:first-child, th:first-child {
    text-align: left;
  }

  &__total {
    font-weight: 600;
    background: #f0fdf4;
  }

  &__row--tax-changed {
    background: #fffbeb;
  }

  &__tax-period {
    color: #6b7280;
  }

  // tbody tr:hover { background: #f8fafc; }
}

.diff-group {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.8125rem;
}

.diff {
  &--up   { color: var(--danger); }   // higher consumption = bad
  &--down { color: var(--green-5); }   // lower consumption = good
}

.tax-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  margin-right: 0.25rem;

  &--changed {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
  }
}
</style>