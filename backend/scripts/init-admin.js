const bcrypt = require('bcrypt');
const db = require('../db/db');

async function initAdmin() {
    const username = 'admin';
    const email = 'bob.devv11@gmail.com';
    const firstName = 'Admin';
    const lastName = '';
    const plainPassword = 'pass_to_change';
    const role = 'admin';

    const hash = await bcrypt.hash(plainPassword, 12);

    await db.none(`
        INSERT INTO users (username, email, first_name, last_name, password, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (username) DO NOTHING
    `, [username, email, firstName, lastName, hash, role]);

    console.log('Admin user created (or already exists)');
    process.exit(0);
}

initAdmin().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
