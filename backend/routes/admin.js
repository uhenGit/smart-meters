const express = require('express')
const router = express.Router()
const { authMiddleware, adminOnly } = require('../middleware/auth')
const {
  getLastTaxes,
  updateTaxClose,
  createTax,
  getHistoricalDataFrom,
  updateCurrentMonthMetrics,
  deleteIndicationBy,
} = require('../db/queries')
const { isValidDate } = require('../handlers/index')

router.use(authMiddleware, adminOnly)

// GET /api/v1/admin/taxes/current
router.get('/taxes/current', async (req, res) => {
  try {
    const taxes = await getLastTaxes(req.user.id)
    res.status(200).json({ data: taxes, error: null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/v1/admin/taxes
// Closes previous tax and creates a new one
router.post('/taxes', async (req, res) => {
  const {
    gas_tax, water_tax, dayelec_tax, nightelec_tax,
    trash_fixed, water_delivery_fixed,
  } = req.body

  const fields = { gas_tax, water_tax, dayelec_tax, nightelec_tax, trash_fixed, water_delivery_fixed }

  // Validate — all fields must be positive numbers
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || isNaN(Number(value)) || Number(value) < 0) {
      return res.status(400).json({ error: `Invalid value for field: ${key}` })
    }
  }

  const today = new Date().toLocaleDateString('en-CA')

  try {
    const current = await getLastTaxes()

    // Close previous tax if exists
    if (current) {
      await updateTaxClose(today, current.id)
    }

    const newTax = await createTax(
      { ...fields, user_id: req.user.id },
      today
    )

    res.status(201).json({ data: newTax, error: null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/v1/admin/indications?start=yyyy-mm-dd&end=yyyy-mm-dd
router.get('/indications', async (req, res) => {
  const { start, end } = req.query

  if (!isValidDate(start) || !isValidDate(end)) {
    return res.status(400).json({ error: 'Invalid date format. Expected yyyy-mm-dd' })
  }
  if (start > end) {
    return res.status(400).json({ error: 'start date must be before end date' })
  }

  try {
    const data = await getHistoricalDataFrom({ start, end }, req.user.id)
    res.status(200).json({ data, error: null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/v1/admin/indications/:id
router.patch('/indications/:id', async (req, res) => {
  const { id } = req.params
  const allowed = ['gas', 'water', 'dayelec', 'nightelec', 'heat', 'notes']
  const updates = {}

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  // Validate numeric fields
  const numericFields = ['gas', 'water', 'dayelec', 'nightelec', 'heat']
  for (const key of numericFields) {
    if (updates[key] !== undefined && (isNaN(Number(updates[key])) || Number(updates[key]) < 0)) {
      return res.status(400).json({ error: `Invalid value for field: ${key}` })
    }
  }

  try {
    const fields = Object.keys(updates)
    const values = Object.values(updates)
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
    const query = `UPDATE indications SET ${setClause} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`

    const db = require('../db/db')
    const result = await db.oneOrNone(query, [...values, id, req.user.id])

    if (!result) return res.status(404).json({ error: 'Record not found' })

    res.status(200).json({ data: result, error: null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/v1/admin/indications/:id
router.delete('/indications/:id', async (req, res) => {
  const { id } = req.params

  if (!id) return res.status(400).json({ error: 'Missing id' })

  try {
    const result = await deleteIndicationBy(id)

    if (result.rowCount === 0) return res.status(404).json({ error: 'Record not found' })

    res.res(200).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router