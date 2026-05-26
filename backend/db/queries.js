const db = require('./db');

/**
 * 
 * @param {String} currentDataPeriod - Postgres date format 'yyyy-mm-dd'
 * @param {Number} shift - shift for the search period start (use 1 if you need a current month as a start and 0 if you need a prev month)
 * @returns {Object} - date range
 */
function getPrevDataPeriodFrom(currentDataPeriod, shift = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const prevMonthNumber = now.getMonth() + shift;
  // const dayOfMonth = now.getDate();
  // const currentISODate = now.toISOString().split('T')[0];
  const prevMonthString = prevMonthNumber < 10
    ? `0${prevMonthNumber}`
    : `${prevMonthNumber}`;

  if (prevMonthString === '00') {
    return {
      start: `${year - 1}-12-01`,
      end: currentDataPeriod,
    }
  }

  return {
    start: `${year}-${prevMonthString}-01`,
    end: currentDataPeriod,
  }

  // return currentDataPeriod.replace(/-(..)-/, prevMonthString);
}

/**
 * DB instance contains custom function truncate_to_month to avoid duplication data in the same month
 * @param {Object} param0 - object with communal data and notes
 * @param {String} user_id
 * @returns {String} - formatted date
 */
async function insertMetricsInfo(
  { gas, water, dayelec, nightelec, heat=0, notes='' },
  user_id,
) {
  try {
    return await db.tx(async t => {
      // Step 1: lock the current tax row inside the transaction
      const tax = await t.oneOrNone(`
        SELECT id FROM taxes
        WHERE start_date = end_date
        AND user_id = $1
        FOR UPDATE
      `, [user_id])

      if (!tax) {
        throw new Error('No active tax record found. Please create taxes first.')
      }

      // Step 2: insert indication using the locked tax id
      const { to_char: result } = await t.one(`
        INSERT INTO indications
          (gas, water, dayelec, nightelec, heat, notes, user_id, tax_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING TO_CHAR(created_at, 'yyyy-mm-dd')
      `, [gas, water, dayelec, nightelec, heat, notes, user_id, tax.id])

      // return date formatted to { to_char: 'yyyy-mm-dd' }
      return result
    })
  } catch (err) {
    const error = `SAVE DATA ERROR: ${err.message}`;
    console.error(error);
    throw new Error(error);
  }
}

/**
 * 
 * @param {String} currentDataPeriod - date to string like 'yyyy-mm-dd'
 * @param {Number} shift - shift for the search period start (1 is for using the current month, and 0 is for the prev month)
 * @returns {Object} - DB query result or null
 */
async function getPrevMonthInfo(currentDataPeriod, user_id, shift = 0) {
  // @todo investigate shift param
  const { start, end } = getPrevDataPeriodFrom(currentDataPeriod, shift);
  
	try {
		const query = `
			SELECT 
        indications.*,
        taxes.gas_tax, taxes.water_tax, taxes.dayelec_tax,
        taxes.nightelec_tax, taxes.trash_fixed, taxes.water_delivery_fixed
      FROM indications
      INNER JOIN taxes ON indications.tax_id = taxes.id
      WHERE indications.user_id = $1 AND created_at >= $2 AND created_at <= $3
      ORDER BY created_at
		`;

    return db.manyOrNone(query, [user_id, start, end]);
    
	} catch (err) {
    const error = `GET PREV INFO ERROR: ${err}`;
		console.error(error);
    throw new Error(error);
	}
}

/**
 * 
 * @param {Object} data - parsed request body values
 * @param {String} period - date to string like 'yyyy-mm-dd'
 * @param {String} user_id
 * @returns {Object} - update result
 */
async function updateCurrentMonthMetrics(data, period, user_id) {
  // @todo refactor update values to a separate function
  const { start, end } = getPrevDataPeriodFrom(period, 1);
  const actualUpdates = Object.keys(data)
    .filter((fieldName) => data[fieldName]);
  const actualValuesToUpdate = actualUpdates.map((field) => (data[field]));
  const actualFieldsToUpdate = actualUpdates
    .map((field, idx) => (`${field} = $${idx + 1}`));
  const clauseString = `user_id = ${user_id} AND created_at >= $${actualFieldsToUpdate.length + 1} AND created_at <= $${actualFieldsToUpdate.length + 2}`;
  const queryString = actualFieldsToUpdate.join(', ');

  try {
    const query = `
      UPDATE indications
      SET ${queryString}
      WHERE ${clauseString}
      RETURNING *;
    `;

    return db.one(query, [...actualValuesToUpdate, start, end]);
    
  } catch (err) {
    const error = `UPDATE INFO ERROR: ${err}`;
    console.error(error);
    throw new Error(error);
  }

}

async function getLastTaxes(user_id) {
  try {
    const query = `SELECT * FROM taxes WHERE start_date = end_date AND user_id = $1`;
    return db.oneOrNone(query, [user_id]);
  } catch (err) {
    const error = `GET TAXES ERROR ${err}`;
    console.error(error);
    throw new Error(error);
  }
}

/**
 * DB instance contains custom function truncate_to_month to avoid duplication data in the same month
 * @param {Object} param0 - object with communal data and notes
 * @param {string} user_id
 * @returns {string} - formatted data
 */
async function getHistoricalDataFrom({ start, end }, user_id) {

  try {
    const query = `
      SELECT * FROM indications
      INNER JOIN taxes ON indications.tax_id = taxes.id
      WHERE indications.user_id = $1 AND created_at >= $2 AND created_at <= $3
    `;
    return db.manyOrNone(query, [user_id, start, end]);
  } catch (err) {
    const error = `GET HISTORICAL DATA ERROR: ${err}`;
    console.log(error);
    throw new Error(error);
  }
}

/**
 * @param {String} user_id
 * @returns
* */
async function getLastIndicationRecord(user_id) {
  try {
    const query = `SELECT * FROM indications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`;
    const res = await db.oneOrNone(query, [user_id]);
    console.log('LAST: ', res);

    return res;
  } catch (err) {
    console.log('LAST ERR: ', err);
  }
}

/***
 * Using the transactions to handle lock previuos taxes and create a new one.
 * Create new taxes from the users unput, start_date should be equal to end_date.
 * @param {Object} taxData - users input and id
 * @param {String} period - current date
 * @returns {Object} - new tax
 */
async function replaceTax(taxData, period) {
  const {
    gas_tax, water_tax, dayelec_tax, nightelec_tax,
    trash_fixed, water_delivery_fixed, user_id,
  } = taxData

  try {
    return await db.tx(async t => {
      // Step 1: close the current active tax if one exists
      const current = await t.oneOrNone(`
        SELECT id FROM taxes
        WHERE start_date = end_date
        AND user_id = $1
        FOR UPDATE
      `, [user_id])

      if (current) {
        await t.one(`
          UPDATE taxes SET end_date = $1
          WHERE id = $2
          RETURNING *
        `, [period, current.id])
      }

      // Step 2: create the new tax — rolls back the UPDATE above if this fails
      const newTax = await t.one(`
        INSERT INTO taxes
          (start_date, end_date, gas_tax, water_tax, dayelec_tax,
           nightelec_tax, trash_fixed, water_delivery_fixed, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [period, period, gas_tax, water_tax, dayelec_tax,
          nightelec_tax, trash_fixed, water_delivery_fixed, user_id])

      return newTax
    })
  } catch (err) {
    const error = `REPLACE TAX ERROR: ${err.message}`
    console.error(error)
    throw new Error(error)
  }
}

/* async function updateTaxClose(closeDate, id) {
  try {
    const query = `UPDATE taxes SET end_date = $1 WHERE id = $2 RETURNING *;`;
    return db.one(query, [closeDate, id]);
  } catch (err) {
    const error = `UPDATE TAXES ERROR: ${err}`;
    console.error(error);
    throw new Error(error);
  }
} */

/***
 * Create new taxes from the users unput, start_date should be equal to end_date.
 * @param {Object} data - users input and id
 * @param {String} period - current date  
 */
/* async function createTax(data, period) {
  const { gas_tax, water_tax, dayelec_tax, nightelec_tax, trash_fixed, water_delivery_fixed, user_id } = data;
  try {
    const query = `
      INSERT INTO taxes (start_date, end_date, gas_tax, water_tax, dayelec_tax, nightelec_tax, trash_fixed, water_delivery_fixed, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    return db.one(query, [period, period, gas_tax, water_tax, dayelec_tax, nightelec_tax, trash_fixed, water_delivery_fixed, user_id]);
  } catch (err) {
    const error = `CREATE TAXES ERROR: ${err}`;
    console.error(error);
    throw new Error(error);
  }
} */

/* async function getHistoricalTaxesFrom({ start, end }) {
  try {
    const query = `
      SELECT * FROM taxes WHERE start_date >= $1 AND end_date <= $2
    `;
    const result = await db.manyOrNone(query, [start, end]);
    console.log('HIST TAXES: ', result);
    return result;
    
  } catch (err) {
    const error = `GET HISTORICAL TAXES ERROR: ${err}`;
    console.log(error);
    throw new Error(error);
  }
} */

async function createApartmentDataTable(apartment, useDefaultTaxes = false) {
  // @todo add a JSON file handler to update with new apartment
  const tableName = `kommun_${apartment}`;
  const taxesTableName = useDefaultTaxes ? 'taxes' : `taxes_${apartment}`;
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        gas INT NOT NULL,
        water INT NOT NULL,
        dayelec INT NOT NULL,
        nightelec INT NOT NULL,
        heat INT DEFAULT 0,
        notes VARCHAR(255),
        created_at DATE NOT NULL DEFAULT CURRENT_DATE,
        updated_at DATE NOT NULL DEFAULT CURRENT_DATE,
        user_id uuid references users(id),
        tax_id uuid REFERENCES ${taxesTableName}(id) ON DELETE SET NULL
      );
    `;
    return db.none(query);
  } catch (err) {
    const error = `CREATE APARTMENT DATA TABLE ERROR: ${err}`;
    console.error(error);
    throw new Error(error);
  }
}

async function createApartmentTaxesTable(apartment) {
  const tableName = `taxes_${apartment}`;
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        end_date DATE NOT NULL DEFAULT CURRENT_DATE,
        gas_tax float(2),
        water_tax float(2),
        dayelec_tax float(2),
        nightelec_tax float(2),
        trash_fixed float(2),
        water_delivery_fixed float(2),
        user_id uuid references users(id)
      );
    `;

    return db.none(query);
  } catch (err) {
    const error = `CREATE APARTMENT TAXES TABLE ERROR: ${err}`;
    console.error(error);
    throw new Error(error);
  }
}

async function deleteTaxBy(id) {
  const query = `DELETE FROM taxes WHERE id = $1;`;

  return db.result(query, [id]);
}

async function deleteIndicationBy(id) {
  const query = `DELETE FROM indications WHERE id = $1;`;

  return db.result(query, [id]);
}

module.exports = {
  insertMetricsInfo,
  getPrevMonthInfo,
  updateCurrentMonthMetrics,
  getLastTaxes,
  getHistoricalDataFrom,
  updateTaxClose,
  createTax,
  deleteTaxBy,
  deleteIndicationBy,
  createApartmentDataTable,
  createApartmentTaxesTable,
  getLastIndicationRecord,
  replaceTax,
};
