const express = require('express');
const { getHistoricalDataFrom } = require('../db/queries.js');
const { getDateRangeFrom, handleHistoricalList } = require('../handlers/index.js');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('history', { header: 'Kommun history' });
});

router.post('/get-data', async (req, res) => {
  const apartment = req.cookies.apartment || 'default';
  const { start, end } = getDateRangeFrom(req.body);

  if (new Date(end) < new Date(start)) {
    res.render('history', { header: 'Error', error: 'End date must be greater than start date' });
    return;
  }
  
  const historicalKommunList = await getHistoricalDataFrom({ start, end }, apartment);
  const processedHistoricalList = handleHistoricalList(historicalKommunList);

  res.render('history', { header: 'Result', result: processedHistoricalList });
});

module.exports = router;