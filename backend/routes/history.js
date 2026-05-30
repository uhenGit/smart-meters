const express = require('express')
const router = express.Router()
const { getHistoricalDataFrom } = require('../db/queries')
const { isValidDate } = require('../handlers/index')

// GET /api/v1/history?start=yyyy-mm-dd&end=yyyy-mm-dd
/**
 * @openapi
 * /history:
 *  get:
 *    tags: [History, Indications, Taxes]
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
    const data = await getHistoricalDataFrom({ start, end }, req.user.id)
    res.status(200).json({ data, error: null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router