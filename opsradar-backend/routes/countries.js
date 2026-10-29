const express = require('express');
const { Country } = require('../models/country');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/countries', authenticateToken, async (req, res) => {
  try {
    const countries = await Country.findAll({ order: [['country_name', 'ASC']] });
    res.json(countries);
  } catch (error) {
    logger.error('fetch_countries_error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

router.post('/countries', authenticateToken, requireAdmin, auditMiddleware, async (req, res) => {
  try {
    const { country_code, country_name } = req.body;
    if (!country_code || !country_name) {
      return res.status(400).json({ error: 'country_code and country_name are required' });
    }
    const country = await Country.create({
      country_code: String(country_code).toUpperCase().slice(0, 2),
      country_name
    });
    res.status(201).json(country);
  } catch (error) {
    logger.error('create_country_error', { error: error.message });
    res.status(500).json({ error: 'Failed to create country' });
  }
});

router.put('/countries/:id', authenticateToken, requireAdmin, auditMiddleware, async (req, res) => {
  try {
    const country = await Country.findByPk(req.params.id);
    if (!country) return res.status(404).json({ error: 'Country not found' });
    const { country_code, country_name } = req.body;
    await country.update({
      country_code: country_code
        ? String(country_code).toUpperCase().slice(0, 2)
        : country.country_code,
      country_name: country_name || country.country_name
    });
    res.json(country);
  } catch (error) {
    logger.error('update_country_error', { error: error.message });
    res.status(500).json({ error: 'Failed to update country' });
  }
});

router.delete('/countries/:id', authenticateToken, requireAdmin, auditMiddleware, async (req, res) => {
  try {
    const country = await Country.findByPk(req.params.id);
    if (!country) return res.status(404).json({ error: 'Country not found' });
    await country.destroy();
    res.json({ message: 'Country deleted' });
  } catch (error) {
    logger.error('delete_country_error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete country' });
  }
});

module.exports = router;
