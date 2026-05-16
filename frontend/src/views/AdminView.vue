<script setup lang="ts">
import { ref, shallowRef, reactive, computed, onMounted } from 'vue'
import MainHeader from '@/components/MainHeader.vue'
import api from '@/api/axios'
import type { Tax, Indication } from '@/types'

type Tab = 'taxes' | 'indications'
const activeTab = shallowRef<Tab>('taxes')

const currentTax = ref<Tax | null>(null)
const taxLoading = shallowRef(false)
const taxError = shallowRef<string | null>(null)
const taxSubmitting = shallowRef(false)
const taxSuccess = shallowRef(false)

const TAX_FIELDS = [
  { key: 'gas_tax', label: 'Gas' },
  { key: 'water_tax', label: 'Water' },
  { key: 'dayelec_tax', label: 'Electricity (day)' },
  { key: 'nightelec_tax', label: 'Electricity (night)' },
  { key: 'trash_fixed', label: 'Trash (fixed)' },
  { key: 'water_delivery_fixed', label: 'Water delivery (fixed)' },
] as const

type TaxField = typeof TAX_FIELDS[number]['key']

const newTax = reactive<Record<TaxField, number | null>>({
  gas_tax: null,
  water_tax: null,
  dayelec_tax: null,
  nightelec_tax: null,
  trash_fixed: null,
  water_delivery_fixed: null,
})

const isTaxFormValid = computed(() =>
  TAX_FIELDS.every(({ key }) => newTax[key] !== null && Number(newTax[key]) >= 0)
)

const fetchCurrentTax = async () => {
  taxLoading.value = true
  taxError.value = null
  try {
    const { data } = await api.get('/admin/taxes/current')
    currentTax.value = data.data
  } catch (err: any) {
    taxError.value = err.response?.data?.error ?? 'Failed to load taxes'
  } finally {
    taxLoading.value = false
  }
}

const submitNewTax = async () => {
  taxError.value = null
  taxSuccess.value = false
  taxSubmitting.value = true
  try {
    const { data } = await api.post('/admin/taxes', newTax)
    currentTax.value = data.data
    taxSuccess.value = true
    // Reset inputs
    TAX_FIELDS.forEach(({ key }) => { newTax[key] = null })
  } catch (err: any) {
    taxError.value = err.response?.data?.error ?? 'Failed to create tax'
  } finally {
    taxSubmitting.value = false
  }
}

const today = new Date().toISOString().split('T')[0]
const firstOfYear = `${new Date().getFullYear()}-01-01`
const startDate = ref(firstOfYear)
const endDate = ref(today)

const indications = ref<Indication[]>([])
const indLoading = shallowRef(false)
const indError = shallowRef<string | null>(null)
const hasFetched = shallowRef(false)
const editingId = shallowRef<string | null>(null)
const deleteTargetId = shallowRef<string | null>(null)

const isRangeValid = computed(() => startDate.value <= endDate.value)

const editBuffer = reactive<Partial<Indication>>({})

const fetchIndications = async () => {
  if (!isRangeValid.value) return

  indError.value = null
  indLoading.value = true
  hasFetched.value = false
  try {
    const { data } = await api.get('/admin/indications', {
      params: { start: startDate.value, end: endDate.value }
    })
    indications.value = data.data ?? []
    hasFetched.value  = true
  } catch (err: any) {
    indError.value = err.response?.data?.error ?? 'Failed to load records'
  } finally {
    indLoading.value = false
  }
}

const startEdit = (record: Indication): void => {
  editingId.value = record.id
  Object.assign(editBuffer, {
    gas: record.gas,
    water: record.water,
    dayelec: record.dayelec,
    nightelec: record.nightelec,
    heat: record.heat,
    notes: record.notes,
  })
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async (indicationId: string) => {
  indError.value = null
  try {
    const { data } = await api.patch(`/admin/indications/${indicationId}`, editBuffer)

    const idx = indications.value.findIndex(({ id }) => id === indicationId)

    if (idx !== -1) indications.value[idx] = data.data

    editingId.value = null
  } catch (err: any) {
    indError.value = err.response?.data?.error ?? 'Failed to update record'
  }
}

const confirmDelete = async (id: string) => {
  indError.value = null
  try {
    await api.delete(`/admin/indications/${id}`)
    indications.value = indications.value.filter(r => r.id !== id)
    deleteTargetId.value = null
  } catch (err: any) {
    indError.value = err.response?.data?.error ?? 'Failed to delete record'
  }
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

onMounted(fetchCurrentTax)
</script>

<template>
  <div class="admin-view">
    <main-header />

    <h2 class="admin-view__title">Admin panel</h2>
    <div class="admin-view__tabs flex">
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'taxes' }"
        @click="activeTab = 'taxes'"
      >
        Taxes
      </button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'indications' }"
        @click="activeTab = 'indications'"
      >
        Meter readings
      </button>
    </div>

    <div v-if="activeTab === 'taxes'" class="admin-view__section">
      <div v-if="taxLoading" class="admin-view__state">Loading...</div>
      <div v-else-if="taxError" class="admin-view__state admin-view__state--error">{{ taxError }}</div>

      <template v-else>
        <div class="tax-table">
          <div class="tax-table__row tax-table__row--header">
            <div class="tax-table__cell">Service</div>
            <div class="tax-table__cell">Current rate</div>
            <div class="tax-table__cell">New rate</div>
          </div>

          <div
            v-for="field in TAX_FIELDS"
            :key="field.key"
            class="tax-table__row"
          >
            <div class="tax-table__cell tax-table__cell--label">{{ field.label }}</div>
            <div class="tax-table__cell">
              {{ currentTax ? currentTax[field.key] : '—' }}
            </div>
            <div class="tax-table__cell">
              <input
                v-model.number="newTax[field.key]"
                class="tax-table__input w-100"
                type="number"
                min="0"
                step="0.01"
                :placeholder="`New ${field.label.toLowerCase()} rate`"
              />
            </div>
          </div>
        </div>

        <div class="admin-view__actions flex">
          <p v-if="taxSuccess" class="admin-view__success">
            New tax rates saved successfully.
          </p>
          <button
            class="btn btn--primary"
            :disabled="!isTaxFormValid || taxSubmitting"
            @click="submitNewTax"
          >
            {{ taxSubmitting ? 'Saving...' : 'Apply new rates' }}
          </button>
        </div>
      </template>
    </div>

    <div v-else class="admin-view__section">

      <div class="admin-view__filters flex">
        <label class="field col">
          From
          <input
            v-model="startDate"
            type="date"
            :max="endDate"
          />
        </label>
        <label class="field col">
          To
          <input
            v-model="endDate"
            type="date"
            :min="startDate"
            :max="today"
          />
        </label>
        <button
          class="btn btn--primary btn--sm"
          :disabled="!isRangeValid || indLoading"
          @click="fetchIndications"
        >
          {{ indLoading ? 'Loading...' : 'Load' }}
        </button>
      </div>

      <p
        v-if="indError"
        class="admin-view__state admin-view__state--error"
      >
        {{ indError }}
      </p>

      <p
        v-if="hasFetched && indications.length === 0"
        class="admin-view__state"
      >
        No records found for the selected period.
      </p>

      <div v-else-if="indications.length > 0" class="ind-table">
        <div class="ind-table__row ind-table__row--header">
          <div class="ind-table__cell">Date</div>
          <div class="ind-table__cell">Gas</div>
          <div class="ind-table__cell">Water</div>
          <div class="ind-table__cell">Elec (day)</div>
          <div class="ind-table__cell">Elec (night)</div>
          <div class="ind-table__cell">Heat</div>
          <div class="ind-table__cell">Notes</div>
          <div class="ind-table__cell">Actions</div>
        </div>

        <template v-for="record in indications" :key="record.id">
          <!-- View row -->
          <div v-if="editingId !== record.id" class="ind-table__row">
            <div class="ind-table__cell">{{ formatDate(record.created_at) }}</div>
            <div class="ind-table__cell">{{ record.gas }}</div>
            <div class="ind-table__cell">{{ record.water }}</div>
            <div class="ind-table__cell">{{ record.dayelec }}</div>
            <div class="ind-table__cell">{{ record.nightelec }}</div>
            <div class="ind-table__cell">{{ record.heat || '—' }}</div>
            <div class="ind-table__cell ind-table__cell--notes">{{ record.notes || '—' }}</div>
            <div class="ind-table__cell ind-table__cell--actions flex">
              <button class="btn btn--sm btn--outline" @click="startEdit(record)">Edit</button>
              <button class="btn btn--sm btn--danger" @click="deleteTargetId = record.id">Delete</button>
            </div>
          </div>

          <!-- Edit row -->
          <div v-else class="ind-table__row ind-table__row--editing">
            <div class="ind-table__cell">{{ formatDate(record.created_at) }}</div>
            <div class="ind-table__cell">
              <input
                v-model.number="editBuffer.gas"
                type="number"
                min="0"
                class="ind-table__input w-100"
              />
            </div>
            <div class="ind-table__cell">
              <input
                v-model.number="editBuffer.water"
                type="number"
                min="0"
                class="ind-table__input w-100"
              />
            </div>
            <div class="ind-table__cell">
              <input
                v-model.number="editBuffer.dayelec"
                type="number"
                min="0"
                class="ind-table__input w-100"
              />
            </div>
            <div class="ind-table__cell">
              <input
                v-model.number="editBuffer.nightelec"
                type="number"
                min="0"
                class="ind-table__input w-100"
              />
            </div>
            <div class="ind-table__cell">
              <input
                v-model.number="editBuffer.heat"
                type="number"
                min="0"
                class="ind-table__input w-100"
              />
            </div>
            <div class="ind-table__cell">
              <input
                v-model="editBuffer.notes"
                type="text"
                class="ind-table__input w-100"
              />
            </div>
            <div class="ind-table__cell ind-table__cell--actions flex">
              <button
                class="btn btn--sm btn--primary"
                @click="saveEdit(record.id)"
              >
                Save
              </button>
              <button
                class="btn btn--sm btn--outline"
                @click="cancelEdit"
              >
                Cancel
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <teleport to="body">
      <Transition name="fade">
        <div
          v-if="deleteTargetId"
          class="modal-overlay"
          @click.self="deleteTargetId = null"
        >
          <div class="modal">
            <p class="modal__text">Are you sure you want to delete this record? This action cannot be undone.</p>
            <div class="modal__actions flex">
              <button
                class="btn btn--outline"
                @click="deleteTargetId = null"
              >
                Cancel
              </button>
              <button
                class="btn btn--danger"
                @click="confirmDelete(deleteTargetId!)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </teleport>
  </div>
</template>

<style scoped lang="scss">
.admin-view {
  max-width: 56rem;
  margin: 0 auto;
  padding: 2rem 1rem;

  &__title   { margin-bottom: 1.5rem; }

  &__tabs {
    gap: 0.25rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid #e5e7eb;
  }

  &__section { }

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

  &__actions {
    margin-top: 1.5rem;
    justify-content: flex-end;
    align-items: center;
    gap: 1rem;
  }

  &__state {
    text-align: center;
    padding: 3rem 0;
    color: #6b7280;
    &--error { color: #dc2626; }
  }

  &__success { color: #16a34a; font-size: 0.875rem; }
}

.tab-btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 0.9375rem;
  cursor: pointer;
  margin-bottom: -2px;
  color: #6b7280;
  transition: color 0.15s, border-color 0.15s;

  &--active {
    color: #2563eb;
    border-bottom-color: #2563eb;
    font-weight: 600;
  }

  &:hover:not(.tab-btn--active) { color: #374151; }
}

%table-row {
  display: grid;
  border-bottom: 1px solid #e5e7eb;
  min-height: 3rem;
}

%table-cell {
  padding: 0.75rem 0.5rem;
  font-size: 0.9375rem;
  display: flex;
  align-items: center;
}

%table-input {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;

  &[type='number'] {
    appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button { display: none; }
  }
}

// Tax table
.tax-table {
  overflow-x: auto;

  &__row {
    @extend %table-row;
    grid-template-columns: 2fr 1fr 1fr;

    &--header { font-weight: 600; background: #f9fafb; }
  }

  &__cell {
    @extend %table-cell;
    &--label { font-weight: 500; }
  }

  &__input { @extend %table-input; }
}

// Indications table
.ind-table {
  overflow-x: auto;

  &__row {
    @extend %table-row;
    grid-template-columns: 7rem repeat(5, 1fr) 2fr 7rem;

    &--header  { font-weight: 600; background: #f9fafb; }
    &--editing { background: #eff6ff; }
  }

  &__cell {
    @extend %table-cell;

    &--notes   { color: #6b7280; font-size: 0.875rem; }
    &--actions { gap: 0.375rem; }
  }

  &__input { @extend %table-input; }
}

// Modal
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 0.5rem;
  padding: 2rem;
  max-width: 24rem;
  width: 90%;

  &__text {
    margin: 0 0 1.5rem; line-height: 1.5;
  }

  &__actions {
    justify-content: flex-end; gap: 0.75rem;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>