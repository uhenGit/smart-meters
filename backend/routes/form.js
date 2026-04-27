const express = require('express');
const { getPrevMonthInfo, insertKommunInfo, updateCurrentMonthKommuns } = require('../db/queries');
const { calculateFinancialResult, parseInputs } = require('../handlers/index');
const { questionList } = require('../boot.js');

const router = express.Router();

router.get('/', async (req, res) => {
  // console.log('form get: ', req.cookies);
  const apartment = req.cookies?.apartment || 'default';
  
  const endPeriod = new Date().toISOString().split('T')[0];
  const [ prevMonthData, currentMonthData ] = await getPrevMonthInfo(endPeriod, apartment);
  const { gas, water, dayelec, nightelec, heat } = prevMonthData;
  const financeResult = calculateFinancialResult(currentMonthData, prevMonthData);
  const options = {
    data: currentMonthData,
    prevData: null,
    prevDataToCompare: { gas, water, dayelec, nightelec, heat },
    financeResult,
    error: null,
  }
  res.render('index', options);
});

router.post('/reset', (req, res) => {
  console.log('reset')
  // res.redirect('/')
  res.render('index', { data: null, prevData: null, action: '/admin/update' })
});

router.post('/submit', async (req, res) => {
  const apartment = req.cookies.apartment || 'default';
  const parsedInputs = parseInputs(req.body, questionList);
  parsedInputs.notes = req.body.notes || '';
  try {
    const endPeriod = await insertKommunInfo(parsedInputs, apartment);
    const [prevMonthData, currentMonthData] = await getPrevMonthInfo(endPeriod, apartment);
    const financeResult = calculateFinancialResult(currentMonthData, prevMonthData);
    const response = { data: currentMonthData, prevData: prevMonthData, financeResult, error: null };
    res.render('index', response);
    // res.status(200).json(response);
  } catch (err) {
    let errMsg = '';
    if (err.message.includes('duplicate key value violates unique constraint')) {
      errMsg = 'You have already submitted data for this month';
    } else {
      errMsg = err.message;
    }
    // res.redirect('/');
    res.render('error', { data: null, prevData: null, error: errMsg });
    // res.status(500).json({ data: null, prevData: null, error: err.message });
  }
});

module.exports = router;