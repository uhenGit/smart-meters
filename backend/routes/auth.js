const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Username and password required' });

    try {
        const user = await db.oneOrNone(
            'SELECT * FROM users WHERE username = $1', [username]
        );

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);

        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.cookie(
          'accessToken',
          token,
          { httpOnly: true, sameSite: 'strict', maxAge: 604800000 },
        );

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
            }
        });
    } catch (err) {
        if (err.errno === -111 || err.code === 'ECONNREFUSED') {
            const errMsg = 'DB connection error';
            console.error(errMsg);
            res.status(500).json({ error: errMsg })
        } else {
            console.error('LOGIN ERROR: ', err);
            res.status(500).json({ error: 'Server error' });
        }
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, first_name, last_name, password } = req.body;

    if (!username || !email || !password) return res.status(400).json({ error: 'Required fields missing' });

    try {
        const hash = await bcrypt.hash(password, 12);
        const user = await db.one(`
            INSERT INTO users (username, email, first_name, last_name, password, role)
            VALUES ($1, $2, $3, $4, $5, 'user')
            RETURNING id, username, email, first_name, last_name, role
        `, [username, email, first_name, last_name, hash]);
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.cookie(
          'accessToken',
          token,
          { httpOnly: true, sameSite: 'strict', maxAge: 60480000 },
        );

        res.status(201).json({ user });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Username or email already taken' });
        }

        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
