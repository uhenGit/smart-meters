const express = require('express');
const cookiesParser = require('cookie-parser');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const form = require('./routes/form');
const history = require('./routes/history');
const statistics = require('./routes/statistics');
const admin = require('./routes/admin');
const error = require('./routes/error');
const auth = require('./routes/auth');
const swaggerSpec = require('./swagger');
const { authMiddleware } = require('./middleware/auth');

const PORT = 3000;
const app = express();

// app.use(express.urlencoded({ extended: true }));
app.use(cookiesParser());
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

app.use('/api/v1/auth', auth);
app.use('/api/v1/form', authMiddleware, form);
app.use('/api/v1/history', authMiddleware, history);
app.use('/api/v1/statistics', authMiddleware, statistics);
app.use('/api/v1/admin', authMiddleware, admin);
app.use('/api/v1/error', error);

app.listen(PORT, () => { console.log(`The server is now active at http://localhost:${PORT}`) });
