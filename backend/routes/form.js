const express = require('express');
const { getPrevMonthInfo, insertMetricsInfo, updateCurrentMonthMetrics } = require('../db/queries');
const { calculateFinancialResult, parseInputs } = require('../handlers/index');
const { questionList } = require('../boot.js');

const router = express.Router();

router.get('/', async (req, res) => {
  // console.log('form get: ', req.cookies);
  const endPeriod = new Date().toISOString().split('T')[0];
  const [ prevMonthData, currentMonthData ] = await getPrevMonthInfo(endPeriod);

  if (!prevMonthData) {
    return res.status(404).json({ error: 'Previous month metrics not found' });
  }

  const { gas, water, dayelec, nightelec, heat } = prevMonthData;
  const financeResult = calculateFinancialResult(currentMonthData, prevMonthData);
  const options = {
    data: currentMonthData,
    prevData: null,
    prevDataToCompare: { gas, water, dayelec, nightelec, heat },
    financeResult,
    error: null,
  }
  res.status(200).json(options);
});

/* router.post('/reset', (req, res) => {
  console.log('reset')
  // res.redirect('/')
  res.render('index', { data: null, prevData: null, action: '/admin/update' })
}); */

router.post('/submit', async (req, res) => {
  // const apartment = req.cookies.apartment || 'default';
  const parsedInputs = parseInputs(req.body, questionList);
  parsedInputs.notes = req.body.notes.trim() || '';
  try {
    const endPeriod = await insertMetricsInfo(parsedInputs, req.body.user_id);
    const [prevMonthData, currentMonthData] = await getPrevMonthInfo(endPeriod);
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