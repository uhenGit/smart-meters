<script setup lang="ts">
import { ref, shallowRef, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import type { Indication, FinanceResult } from '@/types'

const router = useRouter()
const auth = useAuthStore()

type PrevData = Pick<Indication, 'gas' | 'water' | 'dayelec' | 'nightelec' | 'heat'>

const prevData = ref<PrevData | null>(null)
const financeResult = ref<FinanceResult | null>(null)
const isLoading = shallowRef(true)
const fetchError = shallowRef<string | null>(null)
const isSubmitting = shallowRef(false)
const submitError = shallowRef<string | null>(null)
const submitted = shallowRef(false)
const heatEnabled = shallowRef(false)

const form = reactive({
  gas: null as number | null,
  water: null as number | null,
  dayelec: null as number | null,
  nightelec: null as number | null,
  heat: null as number | null,
  notes: '',
})

// Live diff: new - prev, null if either side is missing
const diff = computed(() => ({
  gas: calcDiff('gas'),
  water: calcDiff('water'),
  dayelec: calcDiff('dayelec'),
  nightelec: calcDiff('nightelec'),
  heat: calcDiff('heat'),
}))

const isFormValid = computed(() =>
  form.gas !== null &&
  form.water !== null &&
  form.dayelec !== null &&
  form.nightelec !== null &&
  (!heatEnabled.value || form.heat !== null)
)

const calcDiff = (field: keyof PrevData): number | null => {
  const current = form[field as keyof typeof form]
  const prev    = prevData.value?.[field]

  if (current === null || !current || prev === undefined || prev === null) return null

  return (current as number) - prev
}

const formatDiff = (value: number | null): string => {
  if (value === null) return '—'

  return value > 0 ? `+${value}` : `${value}`
}

const diffClass = (value: number | null): string => {
  if (value === null) return ''
  if (value > 0) return 'readings-table__cell--positive'
  if (value < 0) return 'readings-table__cell--negative'

  return ''
}

const handleSubmit = async () => {
  submitError.value = null
  isSubmitting.value = true

  try {
    const payload = {
      ...form,
      heat: heatEnabled.value ? form.heat : 0,
    }
    const { data } = await api.post('/form/submit', payload)
    financeResult.value = data.financeResult
    submitted.value = true
  } catch (err: any) {
    submitError.value = err.response?.data?.error ?? 'Submission failed'
  } finally {
    isSubmitting.value = false
  }
}

const handleLogout = async () => {
  await auth.logout()
  router.push({ name: 'login' })
}

onMounted(async () => {
  try {
    const { data } = await api.get('/form')
    prevData.value    = data.prevDataToCompare
    financeResult.value = data.financeResult
  } catch (err: any) {
    fetchError.value = err.response?.data?.error ?? 'Failed to load data'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="form-view">
    <header class="form-view__header flex">
      <h1>Meter readings</h1>
      <button
        class="btn btn--outline"
        @click="handleLogout"
      >
      Logout
    </button>
    </header>

    <div v-if="isLoading" class="form-view__state">Loading...</div>
    <div v-else-if="fetchError" class="form-view__state form-view__state--error">{{ fetchError }}</div>

    <template v-else>
      <div class="readings-table">
        <div class="readings-table__row readings-table__row--header">
          <div class="readings-table__cell start">Service</div>
          <div class="readings-table__cell">Previous</div>
          <div class="readings-table__cell">Current</div>
          <div class="readings-table__cell end">Difference</div>
        </div>

        <div class="readings-table__row">
          <div class="readings-table__cell readings-table__cell--label start">Gas</div>
          <div class="readings-table__cell">{{ prevData?.gas ?? '—' }}</div>
          <div class="readings-table__cell">
            <input
              v-model.number="form.gas"
              class="readings-table__input w-100"
              type="number"
              min="0"
              :disabled="submitted"
            />
          </div>
          <div
            class="readings-table__cell end"
            :class="diffClass(diff.gas)"
          >
            {{ formatDiff(diff.gas) }}
          </div>
        </div>

        <div class="readings-table__row">
          <div class="readings-table__cell readings-table__cell--label start">Water</div>
          <div class="readings-table__cell">{{ prevData?.water ?? '—' }}</div>
          <div class="readings-table__cell">
            <input
              v-model.number="form.water"
              class="readings-table__input w-100"
              type="number"
              min="0"
              :disabled="submitted"
            />
          </div>
          <div
            class="readings-table__cell end"
            :class="diffClass(diff.water)"
          >
            {{ formatDiff(diff.water) }}
          </div>
        </div>

        <div class="readings-table__row">
          <div class="readings-table__cell readings-table__cell--label start">Electricity (day)</div>
          <div class="readings-table__cell">{{ prevData?.dayelec ?? '—' }}</div>
          <div class="readings-table__cell">
            <input
              v-model.number="form.dayelec"
              class="readings-table__input w-100"
              type="number"
              min="0"
              :disabled="submitted"
            />
          </div>
          <div
            class="readings-table__cell end"
            :class="diffClass(diff.dayelec)"
          >
            {{ formatDiff(diff.dayelec) }}
          </div>
        </div>

        <div class="readings-table__row">
          <div class="readings-table__cell readings-table__cell--label start">Electricity (night)</div>
          <div class="readings-table__cell">{{ prevData?.nightelec ?? '—' }}</div>
          <div class="readings-table__cell">
            <input
              v-model.number="form.nightelec"
              class="readings-table__input w-100"
              type="number"
              min="0"
              :disabled="submitted"
            />
          </div>
          <div
            class="readings-table__cell end"
            :class="diffClass(diff.nightelec)"
          >
            {{ formatDiff(diff.nightelec) }}
          </div>
        </div>

        <div class="readings-table__row readings-table__row--heat-toggle">
          <label class="flex">
            <input
              v-model="heatEnabled"
              type="checkbox"
              :disabled="submitted"
            />
            <span>Include heating</span>
          </label>
        </div>

        <Transition name="heat">
          <div
            v-show="heatEnabled"
            class="readings-table__row"
          >
            <div class="readings-table__cell readings-table__cell--label start">Heat</div>
            <div class="readings-table__cell">{{ prevData?.heat ?? '—' }}</div>
            <div class="readings-table__cell">
              <input
                v-model.number="form.heat"
                class="readings-table__input w-100"
                type="number"
                min="0"
                :disabled="submitted"
              />
            </div>
            <div
              class="readings-table__cell end"
              :class="diffClass(diff.heat)"
            >
              {{ formatDiff(diff.heat) }}
            </div>
          </div>
        </Transition>

        <div class="readings-table__row readings-table__row--notes">
          <div class="readings-table__cell readings-table__cell--label start">Notes</div>
          <div class="readings-table__cell readings-table__cell--notes-input end" style="">
            <textarea
              v-model="form.notes"
              class="readings-table__input notes"
              rows="2"
              placeholder="Optional notes..."
              :disabled="submitted"
            />
          </div>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="financeResult" class="finance-result">
          <h2>Estimated cost</h2>
          <div class="finance-result__grid">
            <span>Gas</span><span>{{ financeResult.gas }}</span>
            <span>Water</span><span>{{ financeResult.water }}</span>
            <span>Electricity (day)</span><span>{{ financeResult.dayelec }}</span>
            <span>Electricity (night)</span><span>{{ financeResult.nightelec }}</span>
            <span v-if="heatEnabled">Heat</span><span v-if="heatEnabled">{{ financeResult.heat }}</span>
            <span>Trash (fixed)</span><span>{{ financeResult.trash_fixed }}</span>
            <span>Water delivery (fixed)</span><span>{{ financeResult.water_delivery_fixed }}</span>
            <strong>Total</strong><strong>{{ financeResult.total }}</strong>
          </div>
        </div>
      </Transition>

      <div class="form-view__actions flex">
        <p v-if="submitError" class="form-view__error">{{ submitError }}</p>
        <button
          v-if="!submitted"
          class="btn btn--primary"
          :disabled="!isFormValid || isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? 'Saving...' : 'Submit' }}
        </button>
        <p v-else class="form-view__success">Readings submitted successfully.</p>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.form-view {
  max-width: 56rem;
  margin: 0 auto;
  padding: 2rem 1rem;

  &__header {
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  &__state {
    text-align: center;
    padding: 3rem 0;
    color: #6b7280;

    &--error { color: #dc2626; }
  }

  &__actions {
    margin-top: 1.5rem;
    justify-content: flex-end;
    align-items: center;
    gap: 1rem;
  }

  &__error   { color: #dc2626; font-size: 0.875rem; }
  &__success { color: #16a34a; font-size: 0.875rem; }
}

.readings-table {
  overflow-x: auto;

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    border-bottom: 1px solid #e5e7eb;
    min-height: 3.5rem;

    &--header {
      font-weight: 600;
      background: #f9fafb;
    }

    &--heat-toggle {
      grid-template-columns: 1fr;
      padding: 0.75rem 0.5rem;
      align-items: center;

      label {
        gap: .5rem;
        cursor: pointer;
      }
    }

    &--notes {
      grid-template-columns: 1fr 3fr;
    }
  }

  &__cell {
    padding: 0.75rem 0.5rem;
    font-size: 0.9375rem;
    justify-content: center;
    display: flex;

    &--label    { font-weight: 500; }
    &--positive { color: #16a34a; }
    &--negative { color: #dc2626; }

    &--notes-input {
      grid-column: 2 / -1;
    }
  }

  .start {
    justify-content: start;
    align-items: center;
    padding-inline-start: 1rem;
  }

  .end {
    justify-content: end;
    padding-inline-end: 1rem;

    .notes {
      width: 90%;
      resize: none;
    }
  }

  &__input {
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.9375rem;

    &:disabled { opacity: 0.6; }

    &[type='number'] {
      appearance: textfield;
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button { display: none; }
    }
  }
}

.finance-result {
  margin-top: 2rem;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #f9fafb;

  h2 { margin: 0 0 1rem; font-size: 1.125rem; }

  &__grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.375rem 2rem;
    font-size: 0.9375rem;
  }
}

.heat-enter-active,
.heat-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.heat-enter-from,
.heat-leave-to     { opacity: 0; transform: translateY(-0.375rem); }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }
</style>