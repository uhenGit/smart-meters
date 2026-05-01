const express = require('express');
const {
  updateCurrentMonthMetrics,
  getLastTaxes,
  getHistoricalDataFrom,
  updateTaxClose,
  createTax,
  deleteTaxBy,
} = require('../db/queries.js');
const { parseInputs, getDateRangeFrom } = require('../handlers/index.js');
const { taxList, questionList } = require('../boot.js');

const router = express.Router();

/* router.get('/', (req, res) => {
  res.render('admin', { header: 'Admin page', target: '' });
}); */

router.get('/get-last-taxes', async (req, res) => {
  const lastTaxItem = await getLastTaxes();

  res.status(200).json({ taxes: lastTaxItem });
  // res.render('admin', { header: 'Select target to interact with', target: action });
});

router.post('/action/get-data', async (req, res) => {
  const { action_year, action_month, user_id } = req.body;
  const range = getDateRangeFrom({ start_year: action_year, start_month: action_month, end_year: action_year, end_month: action_month });
  console.log('ADMIN RANGE: ', range);
  
  const [ targetToUpdate ] = await getHistoricalDataFrom(range, user_id);
  // res.render('admin', { formData: targetToUpdate, header: 'Insert new data', target: action });
  res.status(200).json({ metrics: targetToUpdate });
});

// @todo - investigate the method
router.post('/update-metrics', async (req, res) => {
  // const apartment = req.cookies.apartment || 'default';
  const endPeriod = new Date().toLocaleDateString('en-CA');
  const parsedInputs = parseInputs(req.body, questionList);

  if (req.body.notes) {
    parsedInputs.notes = req.body.notes.trim();
  }

  try {
    const updatedMetrics = await updateCurrentMonthMetrics(parsedInputs, endPeriod, req.body.user_id);
    // const endPeriod = new Date().toLocaleDateString('en-CA');
    // const [ _, currentMonthData ] = await getPrevMonthInfo(endPeriod, 0);
    // const financeResult = calculateFinancialResult(currentMonthData, prevMonthData, endPeriod);
    // res.render('index', { data: updatedKommun, prevData: null, error: null });
    res.status(200).json({ metrics: updatedMetrics })
    
  } catch (err) {
    res.render('error', { data: null, prevData: null, error: err.message});
  }
});

router.post('/update-tax', async (req, res) => {
  const { id: tax_id } = await getLastTaxes();
  const { id } = req.body;
  console.log('body id: ', id);
  console.log('last id: ', tax_id);

  if (tax_id !== id) {
    res.status(400).json({ error: 'Passed id is incorrect' });
  }

  const endPeriod = new Date().toLocaleDateString('en-CA');
  const parsedInputs = parseInputs(req.body, taxList);
  delete parsedInputs.heat;

  try {
    const [ _, newTaxes ] = await Promise.allSettled([updateTaxClose(endPeriod, id), createTax(parsedInputs, endPeriod)]);
    // console.log('UPDATED TAXES: ', updatedTaxes);
    // console.log('NEW TAXES: ', newTaxes);
    res.status(200).json(newTaxes);
  } catch (err) {
    console.log('ERROR: ', err);
    res.status(400).json({ error: 'Update and create taxes error' });
  }
});

router.post('/create-tax', async (req, res) => {
  const endPeriod = new Date().toLocaleDateString('en-CA');
  const parsedInputs = parseInputs(req.body, taxList);
  parsedInputs.user_id = req.body.user_id;
  delete parsedInputs.heat;

  try {
    const newTaxes = await createTax(parsedInputs, endPeriod);
    console.log('new: ', newTaxes);
    
    res.status(201).json(newTaxes);
  } catch (err) {
    // Duplicated start_date field detected (should be unique, so try the next day)))
    if (err.code === '23505') {
      res.status(409).json({ error: err.detail });
    } else {
      res.status(400).json({ error: 'Create taxes error' });
    }
  }
})

router.delete('/delete-tax/:id', async (req, res, next) => {
  const tax_id = req.params.id;
  try {
    const rows = await deleteTaxBy(tax_id);
    
    if (rows.rowCount === 0) {
      return res.status(404).json({ error: 'Tax not found' });
    }

    res.status(200).json({ message: 'Tax deleted successfully' })
  } catch (err) {
    console.log('DELETE ERROR: ', err);
    next(err)
  }
})

module.exports = router;