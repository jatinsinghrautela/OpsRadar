const express = require('express');
const { AccessRequest } = require('../models/access_request');
const { User } = require('../models/user');
const { UserGroup } = require('../models/user_group');
const { Server } = require('../models/server');
const { UserGroupMembership } = require('../models/user_group_membership');
const { UserPermission } = require('../models/user_permission');
const { AuditLog } = require('../models/audit_log');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

async function enrichRows(rows) {
  const groupIds = rows.filter((r) => r.resource_type === 'group').map((r) => r.resource_id);
  const serverIds = rows.filter((r) => r.resource_type === 'server').map((r) => r.resource_id);
  const [groups, servers] = await Promise.all([
    groupIds.length ? UserGroup.findAll({ where: { group_id: groupIds } }) : [],
    serverIds.length ? Server.findAll({ where: { server_id: serverIds } }) : []
  ]);
  const groupMap = new Map(groups.map((g) => [g.group_id, g.group_name]));
  const serverMap = new Map(servers.map((s) => [s.server_id, s.server_name]));

  return rows.map((r) => {
    const json = r.toJSON();
    return {
      ...json,
      resource_name:
        r.resource_type === 'group'
          ? groupMap.get(r.resource_id) || `group#${r.resource_id}`
          : serverMap.get(r.resource_id) || `server#${r.resource_id}`
    };
  });
}

router.post('/access-requests', authenticateToken, async (req, res) => {
  try {
    const { resource_type, resource_id, notes } = req.body;
    if (!['group', 'server'].includes(resource_type)) {
      return res.status(400).json({ error: 'resource_type must be group or server' });
    }
    const rid = Number(resource_id);
    if (!Number.isFinite(rid)) {
      return res.status(400).json({ error: 'resource_id is required' });
    }

    if (resource_type === 'group') {
      const group = await UserGroup.findByPk(rid);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      const existingMember = await UserGroupMembership.findOne({
        where: { user_id: req.user.user_id, group_id: rid }
      });
      if (existingMember) {
        return res.status(400).json({ error: 'Already a member of this group' });
      }
    } else {
      const server = await Server.findByPk(rid);
      if (!server) return res.status(404).json({ error: 'Server not found' });
      const existingPerm = await UserPermission.findOne({
        where: {
          user_id: req.user.user_id,
          server_id: rid,
          can_view: true
        }
      });
      if (existingPerm) {
        return res.status(400).json({ error: 'Already have view access to this server' });
      }
    }

    const pending = await AccessRequest.findOne({
      where: {
        user_id: req.user.user_id,
        resource_type,
        resource_id: rid,
        status: 'pending'
      }
    });
    if (pending) {
      return res.status(400).json({ error: 'A pending request already exists for this resource' });
    }

    const row = await AccessRequest.create({
      user_id: req.user.user_id,
      resource_type,
      resource_id: rid,
      status: 'pending',
      notes: notes || null
    });
    await AuditLog.create({
      user_id: req.user.user_id,
      action: 'access_requested',
      details: { request_id: row.request_id, resource_type, resource_id: rid }
    });
    res.status(201).json(row);
  } catch (error) {
    logger.error('access_request_create_error', { error: error.message });
    res.status(500).json({ error: 'Failed to submit access request' });
  }
});

router.get('/access-requests', authenticateToken, async (req, res) => {
  try {
    const where = req.user.is_admin ? {} : { user_id: req.user.user_id };
    const rows = await AccessRequest.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'username', 'email'] },
        { model: User, as: 'handler', attributes: ['user_id', 'username'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(await enrichRows(rows));
  } catch (error) {
    logger.error('access_request_list_error', { error: error.message });
    res.status(500).json({ error: 'Failed to list access requests' });
  }
});

router.post('/access-requests/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const request = await AccessRequest.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    if (request.resource_type === 'group') {
      const exists = await UserGroupMembership.findOne({
        where: { user_id: request.user_id, group_id: request.resource_id }
      });
      if (!exists) {
        await UserGroupMembership.create({
          user_id: request.user_id,
          group_id: request.resource_id
        });
      }
    } else {
      const exists = await UserPermission.findOne({
        where: {
          user_id: request.user_id,
          server_id: request.resource_id,
          can_view: true
        }
      });
      if (!exists) {
        await UserPermission.create({
          user_id: request.user_id,
          country_id: null,
          app_id: null,
          group_id: null,
          server_id: request.resource_id,
          can_view: true
        });
      }
    }

    await request.update({
      status: 'approved',
      handled_by: req.user.user_id,
      notes: req.body?.notes || request.notes
    });
    await AuditLog.create({
      user_id: req.user.user_id,
      action: 'access_approved',
      details: {
        request_id: request.request_id,
        target_user_id: request.user_id,
        resource_type: request.resource_type,
        resource_id: request.resource_id
      }
    });
    logger.info('access_approved', { request_id: request.request_id });
    res.json({ message: 'Access approved', request });
  } catch (error) {
    logger.error('access_approve_error', { error: error.message });
    res.status(500).json({ error: 'Failed to approve access request' });
  }
});

router.post('/access-requests/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const request = await AccessRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }
    await request.update({
      status: 'rejected',
      handled_by: req.user.user_id,
      notes: req.body?.notes || request.notes
    });
    await AuditLog.create({
      user_id: req.user.user_id,
      action: 'access_rejected',
      details: { request_id: request.request_id }
    });
    res.json({ message: 'Request rejected' });
  } catch (error) {
    logger.error('access_reject_error', { error: error.message });
    res.status(500).json({ error: 'Failed to reject access request' });
  }
});

module.exports = router;
