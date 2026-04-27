const express = require('express');
const {
  updateCurrentMonthKommuns,
  getLastTaxes,
  getHistoricalDataFrom,
  updateTaxClose,
  createTax,
} = require('../db/queries.js');
const { parseInputs, getDateRangeFrom } = require('../handlers/index.js');
const { taxList, questionList } = require('../boot.js');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('admin', { header: 'Admin page', target: '' });
});

router.get('/action', async (req, res) => {
  const { action } = req.query;
  
  if (action === 'taxes') {
    const lastTaxItem = await getLastTaxes();
    // console.log('TAX: ', lastTaxItem);
    res.render('admin', { header: 'The last taxes data', target: action, lastTaxItem });

    return;
  }

  res.render('admin', { header: 'Select target to interact with', target: action });
});

router.post('/action/get-data', async (req, res) => {
  const apartment = req.cookies.apartment || 'default';
  const { action_year, action_month, action } = req.body;
  const range = getDateRangeFrom({ start_year: action_year, start_month: action_month, end_year: action_year, end_month: action_month });
  console.log('ADMIN RANGE: ', range);
  
  const [ targetToUpdate ] = await getHistoricalDataFrom(range, apartment);
  res.render('admin', { formData: targetToUpdate, header: 'Insert new data', target: action });
});

router.post('/update-kommun', async (req, res) => {
  const apartment = req.cookies.apartment || 'default';
  const endPeriod = new Date().toISOString().split('T')[0];
  const parsedInputs = parseInputs(req.body, questionList);

  if (req.body.notes) {
    parsedInputs.notes = req.body.notes.trim();
  }

  try {
    const updatedKommun = await updateCurrentMonthKommuns(parsedInputs, endPeriod, apartment);
    // const endPeriod = new Date().toISOString().split('T')[0];
    // const [ _, currentMonthData ] = await getPrevMonthInfo(endPeriod, 0);
    // const financeResult = calculateFinancialResult(currentMonthData, prevMonthData, endPeriod);
    res.render('index', { data: updatedKommun, prevData: null, error: null });
    
  } catch (err) {
    res.render('error', { data: null, prevData: null, error: err.message});
  }
});

router.post('/update-taxes', async (req, res) => {
  const { id } = req.body;
  const endPeriod = new Date().toISOString().split('T')[0];
  const parsedInputs = parseInputs(req.body, taxList);
  delete parsedInputs.heat;

  try {
    const [ _, newTaxes ] = await Promise.all([updateTaxClose(endPeriod, id), createTax(parsedInputs, endPeriod)]);
    // console.log('UPDATED TAXES: ', updatedTaxes);
    // console.log('NEW TAXES: ', newTaxes);
    res.render('admin', { header: 'Taxes updated', target: 'taxes', lastTaxItem: newTaxes });
  } catch (err) {
    console.log('ERROR: ', err);
    
    res.render('error', { data: null, prevData: null, error: err.message});
  }
});

module.exports = router;