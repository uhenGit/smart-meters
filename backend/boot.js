module.exports = {
  taxes: {
    gas: 7.99,
    water: 31.36,
    dayelec: 4.32,
    nightelec: 2.16,
    trash: 73.14,
    water_delivery: 41.13,
  },

  questionList: [
    { body: 'Enter gas quantity: ', type: 'number', name: 'gas' },
    { body: 'Enter water quantity: ', type: 'number', name: 'water' },
    { body: 'Enter day electricity: ', type: 'number', name: 'dayelec' },
    { body: 'Enter night electricity: ', type: 'number', name: 'nightelec' },
    { body: 'Do you want to add heat? (yes/no): ', type: 'string', name: 'want_heat' },
    { body: 'Enter heat value: ', type: 'number', name: 'heat' },
    { body: 'Enter notes (optional): ', type: 'string', name: 'notes' },
  ],

  taxList: [
    { name: 'gas_tax', body: 'Enter gas tax: ', type: 'number' },
    { name: 'water_tax', body: 'Enter water tax: ', type: 'number' },
    { name: 'dayelec_tax', body: 'Enter day electricity tax: ', type: 'number' },
    { name: 'nightelec_tax', body: 'Enter night electricity tax: ', type: 'number' },
    { name: 'trash_fixed', body: 'Enter trash fixed: ', type: 'number' },
    { name: 'water_delivery_fixed', body: 'Enter water delivery fixed: ', type: 'number' },
  ],
}