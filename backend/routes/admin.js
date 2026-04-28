const express = require('express');
const {
  updateCurrentMonthKommuns,
  getLastTaxes,
  getHistoricalDataFrom,
  updateTaxClose,
  createTax,
  deleteTaxBy,
} = require('../db/queries.js');
const { parseInputs, getDateRangeFrom } = require('../handlers/index.js');
const { taxList, questionList } = require('../boot.js');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('admin', { header: 'Admin page', target: '' });
});

router.get('/get-last-taxes', async (req, res) => {
  const lastTaxItem = await getLastTaxes();

  res.status(200).json({ taxes: lastTaxItem });
  // res.render('admin', { header: 'Select target to interact with', target: action });
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

router.post('/update-tax', async (req, res) => {
  const { id: tax_id } = await getLastTaxes();
  const { id } = req.body;
  console.log('body id: ', id);
  console.log('last id: ', tax_id);

  if (tax_id !== id) {
    res.status(400).json({ error: 'Passed id is incorrect' });
  }

  const endPeriod = new Date().toISOString().split('T')[0];
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
  const endPeriod = new Date().toISOString().split('T')[0];
  const parsedInputs = parseInputs(req.body, taxList);
  parsedInputs.user_id = req.body.user_id;
  delete parsedInputs.heat;

  try {
    const newTaxes = await createTax(parsedInputs, endPeriod);
    console.log('new: ', newTaxes);
    
    res.status(200).json(newTaxes);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: err.detail });
    } else {
      res.status(400).json({ error: 'Create taxes error' });
    }
  }
})

router.delete('/delete-tax', async (req, res) => {
  const { tax_id } = req.body;
  try {
    await deleteTaxBy(tax_id);
    res.status(204);
  } catch (err) {
    console.log('DELETE ERROR: ', err);
    
    res.status(400).json({ error: 'Delete tax error' });
  }
})

module.exports = router;