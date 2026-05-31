const express = require('express')
const router = express.Router()
const { authMiddleware, adminOnly } = require('../middleware/auth')
const {
  getLastTaxes,
  getHistoricalDataFrom,
  updateCurrentMonthMetrics,
  updateSelectedMetrics,
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
 *                  $ref: '#/components/schemas/Tax'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
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
 *        $ref: '#/components/responses/Unauthorized'
 *      400:
 *        $ref: '#/components/responses/InvalidValue'
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
 *        $ref: '#/components/responses/InvalidValue'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
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
/**
 * @openapi
 * /admin/indications/{id}:
 *  patch:
 *    tags: [Admin, Indications]
 *    summary: Update existed indication
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: uuid of the indication to update
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              gas:
 *                type: number
 *                example: 20
 *              water:
 *                type: number
 *                example: 40
 *              dayelec:
 *                type: number
 *                example: 3.20
 *              nightelec:
 *                type: number
 *                example: 1.60
 *              heat:
 *                type: number
 *                example: 320
 *              notes:
 *                type: string
 *                example: August 2025
 *    responses:
 *      200:
 *        description: Indication updated
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  $ref: '#/components/schemas/Indication'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
 *      400:
 *        $ref: '#/components/responses/InvalidValue'
 *      404:
 *        $ref: '#/components/responses/NotFound'
 */
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
    const result = await updateSelectedMetrics(updates, id, req.user.id)

    if (!result) return res.status(404).json({ error: 'Record not found' })

    res.status(200).json({ data: result, error: null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/v1/admin/indications/:id
/**
 * @openapi
 * /admin/indications/{id}:
 *  delete:
 *    tags: [Admin, Indications]
 *    summary: Delete selected indications record
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: uuid of the indications to delete
 *    responses:
 *      200:
 *        description: Deleted
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                ok:
 *                  type: boolean
 *      400:
 *        $ref: '#/components/responses/FieldsMissing'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
 *      404:
 *        $ref: '#/components/responses/NotFound'
 */
router.delete('/indications/:id', async (req, res) => {
  const { id } = req.params

  if (!id) return res.status(400).json({ error: 'Missing id' })

  try {
    const result = await deleteIndicationBy(id)

    if (result.rowCount === 0) return res.status(404).json({ error: 'Record not found' })

    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router