<script setup lang="ts">
import { ref, shallowRef, computed } from 'vue'
import MainHeader from '@/components/MainHeader.vue'
import api from '@/api/axios'
import type { Indication, Tax } from '@/types'

type HistoryRecord = Indication & Pick<Tax,
  'gas_tax' | 'water_tax' | 'dayelec_tax' |
  'nightelec_tax' | 'trash_fixed' | 'water_delivery_fixed'
>

const today = new Date().toISOString().split('T')[0]
const firstOfYear = `${new Date().getFullYear()}-01-01`

const startDate = ref(firstOfYear)
const endDate = ref(today)

const isRangeValid = computed(() => startDate.value <= endDate.value)

const records = ref<HistoryRecord[]>([])
const isLoading = shallowRef(false)
const fetchError = shallowRef<string | null>(null)
const hasFetched = shallowRef(false)

async function fetchHistory() {
  if (!isRangeValid.value) return

  fetchError.value = null
  isLoading.value = true
  hasFetched.value = false

  try {
    const { data } = await api.get('/history', {
      params: { start: startDate.value, end: endDate.value }
    })
    records.value    = data.data ?? []
    hasFetched.value = true
  } catch (err: any) {
    fetchError.value = err.response?.data?.error ?? 'Failed to load history'
  } finally {
    isLoading.value = false
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}
</script>

<template>
  <div class="history-view">
    <main-header />

    <h2 class="history-view__title">History</h2>

    <div class="history-view__filters flex">
      <div class="field col">
        <label for="start-date">From</label>
        <input
          id="start-date"
          v-model="startDate"
          type="date"
          :max="endDate"
        />
      </div>

      <div class="field col">
        <label for="end-date">To</label>
        <input
          id="end-date"
          v-model="endDate"
          type="date"
          :min="startDate"
          :max="today"
        />
      </div>

      <button
        class="btn btn--primary btn--sm history-view__fetch-btn"
        :disabled="!isRangeValid || isLoading"
        @click="fetchHistory"
      >
        {{ isLoading ? 'Loading...' : 'Load' }}
      </button>
    </div>

    <p v-if="!isRangeValid" class="history-view__error">
      Start date must be before end date.
    </p>

    <p v-if="fetchError" class="history-view__error">{{ fetchError }}</p>

    <p
      v-else-if="hasFetched && records.length === 0"
      class="history-view__empty"
    >
      No records found for the selected period.
    </p>

    <div v-else-if="records.length > 0" class="table history-table">
      <div class="history-table__row history-table__row--header">
        <div class="history-table__cell start">Date</div>
        <div class="history-table__cell">Gas</div>
        <div class="history-table__cell">Water</div>
        <div class="history-table__cell">Elec (day)</div>
        <div class="history-table__cell">Elec (night)</div>
        <div class="history-table__cell">Heat</div>
        <div class="history-table__cell history-table__cell--notes">Notes</div>
      </div>

      <div
        v-for="record in records"
        :key="record.id"
        class="history-table__row"
      >
        <div class="history-table__cell start">{{ formatDate(record.created_at) }}</div>
        <div class="history-table__cell">{{ record.gas }}</div>
        <div class="history-table__cell">{{ record.water }}</div>
        <div class="history-table__cell">{{ record.dayelec }}</div>
        <div class="history-table__cell">{{ record.nightelec }}</div>
        <div class="history-table__cell">{{ record.heat || '—' }}</div>
        <div class="history-table__cell history-table__cell--notes">
          {{ record.notes || '—' }}
        </div>
      </div>
    </div>

    <p v-else class="history-view__empty">
      Select a date range and press Load.
    </p>
  </div>
</template>

<style scoped lang="scss">
.history-view {
  max-width: 56rem;
  margin: 0 auto;
  padding: 2rem 1rem;

  &__title  {
    margin-bottom: 1.5rem;
  }

  &__filters {
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;

      label { font-size: 0.875rem; font-weight: 500; }

      input[type='date'] {
        padding: 0.375rem 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.9375rem;
      }
    }
  }

  &__fetch-btn {
    align-self: flex-end;
  }

  &__error { color: var(--danger); font-size: 0.875rem; margin-bottom: 1rem; }
  &__empty { color: var(--gray-32); font-size: 0.9375rem; margin-top: 2rem; text-align: center; }
}

.history-table {
  overflow-x: auto;

  &__row {
    display: grid;
    grid-template-columns: 8rem repeat(5, 1fr) 2fr;
    border-bottom: 1px solid #e5e7eb;
    min-height: 3rem;

    &--header {
      font-weight: 600;
      background: #f9fafb;
    }
  }

  &__cell {
    padding: 0.75rem 0.5rem;
    font-size: 0.9375rem;
    display: flex;
    align-items: center;
    justify-content: center;

    &--notes {
      color: #6b7280;
      font-size: 0.875rem;
      justify-content: end;
      padding-inline-end: 1rem;
    }
  }

  .start {
    justify-content: start;
    align-items: center;
    padding-inline-start: 1rem;
  }
}
</style>