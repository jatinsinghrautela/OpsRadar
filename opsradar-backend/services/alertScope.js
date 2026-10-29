const { Op } = require('../models/country');
const { UserPermission } = require('../models/user_permission');
const { UserGroupMembership } = require('../models/user_group_membership');

/**
 * Build a Sequelize `where` for alerts visible to the user.
 * Admins: null (no filter — see all).
 * Others: group membership OR matching can_view permissions
 * (null permission dimensions = wildcard).
 */
async function buildAlertScopeWhere(user) {
  if (user?.is_admin) {
    return null;
  }

  const userId = user.user_id;
  const [memberships, permissions] = await Promise.all([
    UserGroupMembership.findAll({ where: { user_id: userId }, attributes: ['group_id'] }),
    UserPermission.findAll({ where: { user_id: userId, can_view: true } })
  ]);

  const orConditions = [];

  const groupIds = memberships.map((m) => m.group_id).filter(Boolean);
  if (groupIds.length) {
    orConditions.push({ group_id: { [Op.in]: groupIds } });
  }

  for (const p of permissions) {
    const andParts = [];
    if (p.country_id != null) andParts.push({ country_id: p.country_id });
    if (p.app_id != null) andParts.push({ app_id: p.app_id });
    if (p.group_id != null) andParts.push({ group_id: p.group_id });
    if (p.server_id != null) andParts.push({ server_id: p.server_id });
    // All-null permission would mean "everything" — treat as no-op wildcard row
    if (andParts.length === 0) {
      orConditions.push({ alert_id: { [Op.ne]: null } });
    } else {
      orConditions.push({ [Op.and]: andParts });
    }
  }

  if (orConditions.length === 0) {
    // Secure default: no grants → no alerts
    return { alert_id: { [Op.in]: [] } };
  }

  return { [Op.or]: orConditions };
}

module.exports = { buildAlertScopeWhere };
