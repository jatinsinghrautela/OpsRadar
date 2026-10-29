const express = require('express');
const { sequelize } = require('../models/country');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'up' });
  } catch (error) {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

module.exports = router;
