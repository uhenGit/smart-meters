const express = require('express')
const router = express.Router()
const db = require('../db/db')
const { isValidDate } = require('../handlers/index')

// GET /api/v1/statistics?start=yyyy-mm-dd&end=yyyy-mm-dd
/**
 * @openapi
 * /statistics:
 *  get:
 *    tags: [Statistics, Indications, Taxes]
 *    summary: Get indications and the corresponding taxes for the selected period
 *    security: []
 *    responses:
 *      200:
 *        description: A list of indications and taxes as mixed object
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                oneOf:
 *                  - $ref: '#/components/schemas/Indications'
 *                  - $ref: '#/components/schemas/Taxes'
 *      400:
 *        $ref: '#/components/responses/InvalidValue'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
 */
router.get('/', async (req, res) => {
  const { start, end } = req.query

  if (!isValidDate(start) || !isValidDate(end)) {
    return res.status(400).json({ error: 'Invalid date format. Expected yyyy-mm-dd' })
  }
  if (start > end) {
    return res.status(400).json({ error: 'start date must be before end date' })
  }

  try {
    // Fetch one extra month before start to calculate first-row diff
    const query = `
      SELECT
        i.id,
        i.created_at,
        i.gas,
        i.water,
        i.dayelec,
        i.nightelec,
        i.heat,
        i.notes,
        t.gas_tax,
        t.water_tax,
        t.dayelec_tax,
        t.nightelec_tax,
        t.trash_fixed,
        t.water_delivery_fixed,
        t.start_date  AS tax_start,
        t.end_date    AS tax_end
      FROM indications i
      INNER JOIN taxes t ON i.tax_id = t.id
      WHERE i.user_id = $1
        AND i.created_at >= (
          SELECT COALESCE(MAX(created_at), $2::date)
          FROM indications
          WHERE user_id = $1 AND created_at < $2
        )
        AND i.created_at <= $3
      ORDER BY i.created_at ASC
    `

    const rows = await db.manyOrNone(query, [req.user.id, start, end])
    res.status(200).json({ data: rows, error: null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router