const express = require('express');
const { UserGroup } = require('../models/user_group');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/groups', authenticateToken, async (req, res) => {
  try {
    const groups = await UserGroup.findAll();
    res.json(groups);
  } catch (error) {
    logger.error('fetch_groups_error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

router.post('/groups', authenticateToken, requireAdmin, auditMiddleware, async (req, res) => {
  try {
    const { group_name, description } = req.body;
    if (!group_name) return res.status(400).json({ error: 'Group name is required' });
    const group = await UserGroup.create({ group_name, description });
    res.status(201).json(group);
  } catch (error) {
    logger.error('create_group_error', { error: error.message });
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.put('/groups/:id', authenticateToken, requireAdmin, auditMiddleware, async (req, res) => {
  try {
    const { group_name, description } = req.body;
    const group = await UserGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    await group.update({ group_name: group_name || group.group_name, description });
    res.json(group);
  } catch (error) {
    logger.error('update_group_error', { error: error.message });
    res.status(500).json({ error: 'Failed to update group' });
  }
});

router.delete('/groups/:id', authenticateToken, requireAdmin, auditMiddleware, async (req, res) => {
  try {
    const group = await UserGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    await group.destroy();
    res.json({ message: 'Group deleted' });
  } catch (error) {
    logger.error('delete_group_error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

module.exports = router;
