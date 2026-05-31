const express = require('express');
const { getPrevMonthInfo, insertMetricsInfo, updateCurrentMonthMetrics } = require('../db/queries');
const { calculateFinancialResult, parseInputs } = require('../handlers/index');
const { questionList } = require('../boot.js');

const router = express.Router();

/**
 * @openapi
 * /form:
 *  get:
 *    tags: [Form, Indications]
 *    summary: Get last indications record
 *    responses:
 *      200:
 *        description: Last indications data
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                user:
 *                  $ref: '#/components/schemas/Indication'
 *      401:
 *        $ref: '#/components/responses/Unauthorized'
 *      404:
 *        $ref: '#/components/responses/NotFound'    
 */
router.get('/', async (req, res) => {
  const endPeriod = new Date().toLocaleDateString('en-CA');
  const [ prevMonthData, currentMonthData ] = await getPrevMonthInfo(endPeriod, req.user.id);

  // @todo handle as 3xx code with redirect
  if (!prevMonthData) {
    return res.status(404).json({ error: 'Previous month metrics not found' });
  }

  const { gas, water, dayelec, nightelec, heat } = prevMonthData;
  const financeResult = calculateFinancialResult(currentMonthData, prevMonthData);
  const options = {
    data: currentMonthData,
    prevDataToCompare: { gas, water, dayelec, nightelec, heat },
    financeResult,
    error: null,
  }
  res.status(200).json(options);
});

/**
 * @openapi
 * /form/submit:
 *  post:
 *    tags: [Form, Indications]
 *    summary: Create new indication record
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required: [gas, water, dayelec, nightelec]
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
 *      201:
 *        description: Indication created
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
 */
router.post('/submit', async (req, res) => {
  const parsed = parseInputs(req.body, questionList);
  parsed.notes = req.body.notes.trim() || '';

  try {
    const endPeriod = await insertMetricsInfo(parsed, req.user.id);
    const [prevMonthData, currentMonthData] = await getPrevMonthInfo(endPeriod, req.user.id);
    const financeResult = calculateFinancialResult(currentMonthData, prevMonthData);
    const response = { data: currentMonthData, prevData: prevMonthData, financeResult, error: null };

    res.status(201).json(response);
  } catch (err) {
    let errMsg = '';

    if (err.message.includes('duplicate key value violates unique constraint')) {
      errMsg = 'You have already submitted data for this month';
    } else {
      errMsg = err.message;
    }
    res.status(409).json({ data: null, prevData: null, error: errMsg });
  }
});

module.exports = router;