const express = require('express');
const { getLastTaxes, createApartmentDataTable, createApartmentTaxesTable } = require('../db/queries');
// const { usersList, addUser } = require('../handlers/userToJSON');

const router = express.Router();

router.get('/', async (req, res) => {
  const defaultTaxes = await getLastTaxes();
  // const tables = await usersList();

  res.render(
    'onboarding',
    /* {
      header: 'Welcome to Communal Data Tracker',
      tables,
      defaultTaxes,
      error: null,
    }, */
  );
});

router.post('/set-apartment', async (req, res) => {
  const { apartment } = req.body;
  res.cookie('apartment', apartment, { maxAge: 900000, httpOnly: true });
  res.redirect('/dashboard');
});

router.post('/create-data-table', async (req, res) => {
  const useDefaultTaxes = req.body.useDefaultTaxes;
  let { apartment, hiddenApartment, gas_tax, water_tax, dayelec_tax, nightelec_tax, trash_fixed, water_delivery_fixed } = req.body;
  console.log('request body: ', req.body);

  if (apartment && apartment.trim() === '') {
    const defaultTaxes = await getLastTaxes();

    return res.status(400).render(
      'onboarding',
      {
        header: 'Welcome to Communal Data Tracker',
        tables: [],
        defaultTaxes,
        error: 'Apartment name cannot be empty',
      },
    );
  }

  // apartment = apartment.trim().toLowerCase().replace(/\s+/g, '-');
  /* const taxesName = useDefaultTaxes ? '' : `taxes_${apartment}`;
  const [newApartment, newKommunTable] = await Promise.all([
    addUser({ name: apartment, createdAt: new Date().toISOString(), taxes: taxesName, kommun: `kommun_${apartment}` }),
    createApartmentDataTable(apartment, useDefaultTaxes),
  ]);
  console.log('NEW APARTMENT ADDED: ', newApartment);
  console.log('NEW APARTMENT TABLE CREATED: ', newKommunTable); */

  // createApartmentDataTable(apartment)

  res.json({ res: 'Table for apartment creation is in progress...', useDefaultTaxes });
  
  // res.cookie('apartment', apartment, { maxAge: 900000, httpOnly: true });
  // res.cookie('useDefaultTaxes', useDefaultTaxes === 'on', { maxAge: 900000, httpOnly: true });
  // res.redirect('/dashboard');
});

module.exports = router;