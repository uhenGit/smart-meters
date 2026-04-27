// const { questionList } = require('../boot.js');

const calculateFinancialResult = function (cV, pV) {
  let sum = 0;
  const sumDetails = {};

  try {
    for (const key in cV) {
      if (['start_date', 'end_date', 'notes', 'id', 'tax_id'].includes(key)) continue;

      const taxItemIdx = key.indexOf('_tax');
      const fixedItemIdx = key.indexOf('_fixed');

      if (taxItemIdx !== -1) {
        const kommunItemName = key.slice(0, taxItemIdx);
        const currentTaxSum = (cV[kommunItemName] - pV[kommunItemName]) * cV[key];
        sum += currentTaxSum;
        sumDetails[kommunItemName] = roundResult(currentTaxSum);
      }

      if (fixedItemIdx !== -1) {
        sum += cV[key];
        sumDetails[key] = cV[key];
      }
    }

    if (cV.heat) { // should be pV.heat
      sumDetails.heat = cV.heat; // should be pV.heat
      sum += cV.heat; // should be pV.heat
    }

    return {
      sum: sum.toFixed(2),
      sumDetails,
    };
  } catch (err) {

  }
}

const parseInputs = function (inputList, questionList) {
  return questionList.reduce((acc, cV) => {
    if (cV.type === 'number') {
      const num = parseFloat(inputList[cV.name].trim());
      acc[cV.name] = isNaN(num) ? null : num;
    }

    acc.heat = inputList.heat ? parseFloat(inputList.heat.trim()) : 0;
    return acc;
  }, {});
}

const roundResult = function(val) {
  return Math.round(val * 100) / 100;
}

const getDateRangeFrom = function({ start_year, start_month, end_year, end_month }) {
  const s_month = parseFloat(start_month) < 10 ? `0${start_month}` : `${start_month}`;
  const e_month = parseFloat(end_month) < 10 ? `0${end_month}` : `${end_month}`;
  const lastMonthDay = new Date(end_year, end_month, 0).getDate();

  return {
    start: `${start_year}-${s_month}-01`,
    end: `${end_year}-${e_month}-${lastMonthDay}`,
  };
}

const handleHistoricalList = (monthDataList) => {
  return monthDataList.map((monthItem, idx) => {
    const { createdat, gas, water, dayelec, nightelec, gas_tax, water_tax, dayelec_tax, nightelec_tax, trash_fixed, water_delivery_fixed } = monthItem;
    const sum = idx === 0
      ? null
      : calculateFinancialResult(monthItem, monthDataList[idx - 1]);
    
    return {
      head: new Date(createdat).toLocaleDateString(),
      kommun: {
        gas,
        water,
        dayelec,
        nightelec,
        heat: 0,
      },
      taxes: {
        gas: gas_tax,
        water: water_tax,
        dayelec: dayelec_tax,
        nightelec: nightelec_tax,
        heat: '-',
      },
      sum,
    };
  }).slice(1);
}

module.exports = {
  calculateFinancialResult,
  parseInputs,
  getDateRangeFrom,
  handleHistoricalList,
};