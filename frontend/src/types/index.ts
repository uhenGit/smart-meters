export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'user'
}

export interface Indication {
  id: string
  gas: number
  water: number
  dayelec: number
  nightelec: number
  heat: number
  notes: string
  created_at: string
  tax_id: string
  user_id: string
}

export interface Tax {
  id: string
  start_date: string
  end_date: string
  gas_tax: number
  water_tax: number
  dayelec_tax: number
  nightelec_tax: number
  trash_fixed: number
  water_delivery_fixed: number
  user_id: string
}

export interface FinanceResult {
  gas: number
  water: number
  dayelec: number
  nightelec: number
  heat: number
  trash_fixed: number
  water_delivery_fixed: number
  total: number
}

export interface FormResponse {
  data: Indication & Tax | null
  prevDataToCompare: Pick<Indication, 'gas' | 'water' | 'dayelec' | 'nightelec' | 'heat'> | null
  financeResult: FinanceResult | null
  error: string | null
}

export interface StatisticsRecord {
  id: string
  created_at: string
  gas: number
  water: number
  dayelec: number
  nightelec: number
  heat: number
  notes: string
  gas_tax: number
  water_tax: number
  dayelec_tax: number
  nightelec_tax: number
  trash_fixed: number
  water_delivery_fixed: number
  tax_start: string
  tax_end: string
}

export interface ComputedRow extends StatisticsRecord {
  cost: {
    gas: number
    water: number
    dayelec: number
    nightelec: number
    heat: number
    trash: number
    water_delivery: number
    total: number
  }
  diff: {
    gas: number | null
    water: number | null
    dayelec: number | null
    nightelec: number | null
    heat: number | null
    total: number | null
    taxChanged: boolean
  }
}