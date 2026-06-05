<script setup lang="ts">
import { ref, shallowRef, reactive, computed, onMounted } from 'vue'
import MainHeader from '../components/MainHeader.vue'
import api from '../api/axios'
import { useAuthStore } from '../stores/auth.ts'
import type { Tax, Indication } from '../types'

type Tab = 'taxes' | 'indications' | 'users'
const authStore = useAuthStore()
const activeTab = shallowRef<Tab>('taxes')

const currentTax = ref<Tax | null>(null)
const taxLoading = shallowRef(false)
const taxError = shallowRef<string | null>(null)
const taxSubmitting = shallowRef(false)
const taxSuccess = shallowRef(false)
const users = ref<any[]>([])
const newUser = reactive({ username: '', email: '', first_name: '', last_name: '' })
const inviteUrl = shallowRef<string | null>(null)
const userCreating = shallowRef(false)
const copied = shallowRef(false)

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

const fullInviteUrl = computed(() =>
  inviteUrl.value ? `${window.location.origin}${inviteUrl.value}` : ''
)

const fetchUsers = async () => {
  try {
    const { data } = await api.get('/admin/users')
    users.value = data.data ?? []
  } catch (err: any) {
    console.error(err)
  }
}

const createUser = async () => {
  userCreating.value = true
  inviteUrl.value    = null

  try {
    const { data } = await api.post('/admin/users', newUser)
    inviteUrl.value = data.inviteUrl
    Object.assign(newUser, { username: '', email: '', first_name: '', last_name: '' })
    await fetchUsers()
  } catch (err: any) {
    console.error(err.response?.data?.error)
  } finally {
    userCreating.value = false
  }
}

const deleteUser = async (id: string) => {
  if (id === authStore.user?.id) return

  try {
    await api.delete(`/admin/users/${id}`)
    users.value = users.value.filter(u => u.id !== id)
  } catch (err: any) {
    console.error(err)
  }
}

const copyInvite = async () => {
  if (!fullInviteUrl.value) return

  await navigator.clipboard.writeText(fullInviteUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

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

    const idx = indications.value.findIndex((r: Indication) => r.id === indicationId)

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
    indications.value = indications.value.filter((r: Indication) => r.id !== id)
  } catch (err: any) {
    indError.value = err.response?.data?.error ?? 'Failed to delete record'
  } finally {
    deleteTargetId.value = null
  }
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

onMounted(() => {
  // @todo use Promise.allSettled
  fetchCurrentTax()
  fetchUsers()
})
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
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'users' }"
        @click="activeTab = 'users'"
      >
        Users
      </button>
    </div>

    <div
      v-show="activeTab === 'taxes'"
      class="admin-view__section"
    >
      <div v-if="taxLoading" class="admin-view__state">Loading...</div>
      <div v-else-if="taxError" class="admin-view__state admin-view__state--error">{{ taxError }}</div>

      <template v-else>
        <div class="tax-table">
          <div class="tax-table__row tax-table__row--header">
            <div class="tax-table__cell start">Service</div>
            <div class="tax-table__cell">Current rate</div>
            <div class="tax-table__cell end">New rate</div>
          </div>

          <div
            v-for="field in TAX_FIELDS"
            :key="field.key"
            class="tax-table__row"
          >
            <div class="tax-table__cell tax-table__cell--label start">{{ field.label }}</div>
            <div class="tax-table__cell">
              {{ currentTax ? currentTax[field.key] : '—' }}
            </div>
            <div class="tax-table__cell end">
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
            class="btn btn--primary btn--sm"
            :disabled="!isTaxFormValid || taxSubmitting"
            @click="submitNewTax"
          >
            {{ taxSubmitting ? 'Saving...' : 'Apply new rates' }}
          </button>
        </div>
      </template>
    </div>

    <div
      v-show="activeTab === 'indications'"
      class="admin-view__section"
    >

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
          <div class="ind-table__cell start">Date</div>
          <div class="ind-table__cell">Gas</div>
          <div class="ind-table__cell">Water</div>
          <div class="ind-table__cell">Elec (day)</div>
          <div class="ind-table__cell">Elec (night)</div>
          <div class="ind-table__cell">Heat</div>
          <div class="ind-table__cell">Notes</div>
          <div class="ind-table__cell end">Actions</div>
        </div>

        <template v-for="record in indications" :key="record.id">
          <!-- View row -->
          <div v-if="editingId !== record.id" class="ind-table__row">
            <div class="ind-table__cell start">{{ formatDate(record.created_at) }}</div>
            <div class="ind-table__cell">{{ record.gas }}</div>
            <div class="ind-table__cell">{{ record.water }}</div>
            <div class="ind-table__cell">{{ record.dayelec }}</div>
            <div class="ind-table__cell">{{ record.nightelec }}</div>
            <div class="ind-table__cell">{{ record.heat || '—' }}</div>
            <div class="ind-table__cell ind-table__cell--notes truncate">{{ record.notes || '—' }}</div>
            <div class="ind-table__cell ind-table__cell--actions flex end">
              <button
                class="btn btn--outline btn--xs"
                @click="startEdit(record)"
              >
                Edit
              </button>
              <button
                class="btn btn--danger btn--xs"
                @click="deleteTargetId = record.id"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Edit row -->
          <div v-else class="ind-table__row ind-table__row--editing">
            <div class="ind-table__cell start">{{ formatDate(record.created_at) }}</div>
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
            <div class="ind-table__cell end">
              <input
                v-model="editBuffer.notes"
                type="text"
                class="ind-table__input w-100"
              />
            </div>
            <div class="ind-table__cell ind-table__cell--actions flex">
              <button
                class="btn btn--primary btn--xs"
                @click="saveEdit(record.id)"
              >
                Save
              </button>
              <button
                class="btn btn--outline btn--xs"
                @click="cancelEdit"
              >
                Cancel
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div
      v-show="activeTab === 'users'"
      class="admin-view__section"
    >
      <div class="flex col user-form">
        <h3>Create new user</h3>
        <div class="flex field-wrap">
          <div class="flex col field">
            <label>Username</label>
            <input
              v-model="newUser.username"
              type="text"
              placeholder="john_doe"
            />
          </div>
          <div class="flex col field">
            <label>Email</label>
            <input
              v-model="newUser.email"
              type="email"
              placeholder="john@example.com"
            />
          </div>
          <div class="flex col field">
            <label>First name</label>
            <input
              v-model="newUser.first_name"
              type="text"
            />
          </div>
          <div class="flex col field">
            <label>Last name</label>
            <input
              v-model="newUser.last_name"
              type="text"
            />
          </div>
        </div>

        <div class="flex action-create">
          <button
            class="btn btn--xs btn--primary"
            :disabled="!newUser.username || !newUser.email || userCreating"
            @click="createUser"
          >
            {{ userCreating ? 'Creating...' : 'Create & get invite link' }}
          </button>
        </div>

        <!-- Invite URL display -->
        <div v-if="inviteUrl" class="invite-box">
          <p>Share this link with the user:</p>
          <div class="invite-box__url flex">
            <code>{{ fullInviteUrl }}</code>
            <button class="btn btn--xs btn--outline" @click="copyInvite">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <p class="invite-box__note">This link is single-use and expires once the account is activated.</p>
        </div>
      </div>

      <!-- Users list -->
      <div
        v-if="users.length > 0"
        class="users-table"
      >
        <div class="users-table__row users-table__row--header">
          <div class="users-table__cell start">Username</div>
          <div class="users-table__cell">Email</div>
          <div class="users-table__cell">Role</div>
          <div class="users-table__cell">Status</div>
          <div class="users-table__cell end">Actions</div>
        </div>
        <div
          v-for="user in users"
          :key="user.id"
          class="users-table__row"
        >
          <div class="users-table__cell start">{{ user.username }}</div>
          <div class="users-table__cell">{{ user.email }}</div>
          <div class="users-table__cell">{{ user.role }}</div>
          <div class="users-table__cell">
            <span :class="user.is_active ? 'status--active' : 'status--pending'">
              {{ user.is_active ? 'Active' : 'Pending' }}
            </span>
          </div>
          <div class="users-table__cell end">
            <button
              class="btn btn--xs btn--danger"
              :disabled="user.id === authStore.user?.id"
              @click="deleteUser(user.id)"
            >
              Delete
            </button>
          </div>
        </div>
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
                class="btn btn--outline btn--sm"
                @click="deleteTargetId = null"
              >
                Cancel
              </button>
              <button
                class="btn btn--danger btn--sm"
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

  &__title   {
    margin-bottom: 1.5rem;
  }

  &__tabs {
    gap: 0.25rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid #e5e7eb;
  }

  &__section {
    .user-form {
      gap: 1rem;
    }

    .field-wrap {
      gap: 1rem;
      flex-wrap: wrap;
    }

    .field {
      gap: .75rem;

      input {
        padding: .375rem;
        border-radius: .25rem;
        outline: none;
        border: none;
      }
    }
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

.action-create {
  justify-content: flex-end;
  margin-top: 1rem;
}

.tab-btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 0.9375rem;
  cursor: pointer;
  margin-bottom: -2px;
  color: var(--text);
  transition: color 0.15s, border-color 0.15s;

  &--active {
    color: var(--info);
    border-bottom-color: var(--info);
    font-weight: 600;
  }

  &:hover:not(.tab-btn--active) { color: #374151; }
}

%table-row {
  display: grid;
  border-bottom: 1px solid var(--border);
  min-height: 3rem;

  .start {
    justify-content: start;
  }

  .end {
    justify-content: end;
    padding-inline-end: .5rem;
  }
}

%table-cell {
  padding: 0.75rem 0.5rem;
  font-size: .9375rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

%table-input {
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;

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

    &--header {
      font-weight: 600; background: #f9fafb;

      .end {
        padding-inline-end: 1.5rem;
      }
    }
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

    &--header  {
      font-weight: 600; background: #f9fafb;

      .end {
        padding-inline-end: .75rem;
      }
    }
    &--editing { background: #eff6ff; }
  }

  &__cell {
    width: 6.5rem;

    @extend %table-cell;

    &--notes   { color: #6b7280; font-size: 0.875rem; }
    &--actions { gap: 0.375rem; }
  }

  &__input { @extend %table-input; }
}

.invite-box {
  margin-top: 1rem;
  padding: 1rem;
  background: #f0fdf4;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.875rem;

  p { margin: 0 0 0.5rem; }

  &__url {
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;

    code {
      font-size: 0.8125rem;
      word-break: break-all;
      flex: 1;
    }
  }

  &__note { color: var(--text); margin-top: 0.5rem !important; }
}

.status {
  &--active  { color: var(--green-5); font-weight: 600; }
  &--pending { color: var(--warning); font-weight: 600; }
}

.users-table {
  margin-top: 2rem;

  &__row {
    @extend %table-row;
    grid-template-columns: 1fr 2fr 1fr 1fr 6rem;
    &--header { font-weight: 600; background: #f9fafb; }
  }
  &__cell { @extend %table-cell; }
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