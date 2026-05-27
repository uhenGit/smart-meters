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
  replaceTax,
} = require('../db/queries')
const { isValidDate } = require('../handlers/index')

router.use(authMiddleware, adminOnly)

// GET /api/v1/admin/taxes/current
/**
 * @openapi
 * /admin/taxes/current:
 *  get:
 *    tags: [Admin, Taxes]
 *    summary: Get the last active taxes for the user
 *    responses:
 *      200:
 *        description: Last active tax data
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                taxes:
 *                  $ref: '#components/schemas/Tax'
 *      401:
 *        $ref: '#/components/reponses/Unauthorized'
 */
router.get('/taxes/current', async (req, res) => {
  try {
    const taxes = await getLastTaxes(req.user.id)
    res.status(200).json({ data: taxes, error: null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/v1/admin/taxes
/**
 * @openapi
 * /admin/taxes:
 *  post:
 *    tags: [Admin, Taxes]
 *    summary: Lock and update previous tax, create a new one (Use transactions)
 *    security: []
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required: [gas_tax, water_tax, dayelec_tax, nightelec_tax, trash_fixed, water_delivery_fixed]
 *            properties:
 *              gas_tax:
 *                type: number
 *                example: 20
 *              water_tax:
 *                type: number
 *                example: 40
 *              dayelec_tax:
 *                type: number
 *                example: 3.20
 *              nightelec_tax:
 *                type: number
 *                example: 1.60
 *              trash_fixed:
 *                type: number
 *                example: 71.20
 *              water_delivery_fixed:
 *                type: number
 *                example: 41.70
 *    responses:
 *      201:
 *        description: Tax created
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                newTax:
 *                  $ref: '#/components/schemas/Tax'
 *      401:
 *        $ref: '#/components/reponses/Unauthorized'
 *      400:
 *        $ref: '#/components/reponses/InvalidValue'
 */
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
    const newTax = await replaceTax(
      { ...fields, user_id: req.user.id },
      today
    )

    res.status(201).json({ data: newTax, error: null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/v1/admin/indications?start=yyyy-mm-dd&end=yyyy-mm-dd
/**
 * @openapi
 * /admin/indications:
 *  get:
 *    tags: [Admin, Indications]
 *    summary: Get indications list for the provided date range
 *    security: []
 *    responses:
 *      200:
 *        description: Selected indications list
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                  properties: 
 *                    indication:
 *                      $ref: '#/components/schemas/Indication'
 *      400:
 *        $ref: '#/components/reponses/InvalidValue'
 *      401:
 *        $ref: '#/components/reponses/Unauthorized'
 */
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