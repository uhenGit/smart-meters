const express = require('express');
const {
  updateCurrentMonthMetrics,
  getLastTaxes,
  getHistoricalDataFrom,
  updateTaxClose,
  createTax,
  deleteTaxBy,
  deleteIndicationBy,
} = require('../db/queries.js');
const { parseInputs, getDateRangeFrom } = require('../handlers/index.js');
const { taxList, questionList } = require('../boot.js');

const router = express.Router();

/* router.get('/', (req, res) => {
  res.render('admin', { header: 'Admin page', target: '' });
}); */

router.get('/get-last-taxes', async (req, res) => {
  const lastTaxItem = await getLastTaxes(req.user.id);

  res.status(200).json({ taxes: lastTaxItem });
});

router.post('/action/get-data', async (req, res) => {
  const { action_year, action_month, user_id } = req.body;
  const range = getDateRangeFrom({ start_year: action_year, start_month: action_month, end_year: action_year, end_month: action_month });
  console.log('ADMIN RANGE: ', range);
  
  const [ targetToUpdate ] = await getHistoricalDataFrom(range, user_id);
  res.status(200).json({ metrics: targetToUpdate });
});

// @todo - investigate the method
router.post('/update-metrics', async (req, res) => {
  const endPeriod = new Date().toLocaleDateString('en-CA');
  const parsed = parseInputs(req.body, questionList);

  if (req.body.notes) {
    parsed.notes = req.body.notes.trim();
  }

  try {
    const updatedMetrics = await updateCurrentMonthMetrics(parsed, endPeriod, req.body.user_id);
    // const endPeriod = new Date().toLocaleDateString('en-CA');
    // const [ _, currentMonthData ] = await getPrevMonthInfo(endPeriod, req.user.id, 0);
    // const financeResult = calculateFinancialResult(currentMonthData, prevMonthData, endPeriod);
    // res.render('index', { data: updatedKommun, prevData: null, error: null });
    res.status(200).json({ metrics: updatedMetrics })
    
  } catch (err) {
    res.render('error', { data: null, prevData: null, error: err.message});
  }
});

router.post('/update-tax', async (req, res) => {
  const { id: tax_id } = await getLastTaxes(req.user.id);
  const { id } = req.body;
  // console.log('body id: ', id);
  // console.log('last id: ', tax_id);

  if (tax_id !== id) {
    res.status(400).json({ error: 'Passed id is incorrect' });
  }

  const endPeriod = new Date().toLocaleDateString('en-CA');
  const parsed = parseInputs(req.body, taxList);
  delete parsed.heat;

  try {
    const [ _, newTaxes ] = await Promise.allSettled([updateTaxClose(endPeriod, id), createTax(parsed, endPeriod)]);
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
  const parsed = parseInputs(req.body, taxList);
  parsed.user_id = req.body.user_id;
  delete parsed.heat;

  try {
    const newTaxes = await createTax(parsed, endPeriod);
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

    res.status(200).json({ message: `Deleted ${rows.rowCount} rows from taxes` })
  } catch (err) {
    console.log('DELETE TAX ERROR: ', err);
    next(err)
  }
})

router.delete('/delete-indication/:id', async (req, res, next) => {
  const indication_id = req.params.id;
  try {
    const rows = await deleteIndicationBy(indication_id);

    res.status(200).json({ message: `Delete ${rows.rowCount} rows from indications` });
  } catch (err) {
    console.log('DELETE INDICATION ERROR: ', err);
    next(err);
  }
})

module.exports = router;