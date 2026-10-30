const { Op } = require('../models/country');
const { Alert } = require('../models/alert');
const { buildAlertScopeWhere } = require('./alertScope');
async function notificationScope(user) {
  const scope = await buildAlertScopeWhere(user);
  return {
    include: [{ model: Alert, as: 'alert', attributes: [], required: false, where: scope || undefined }],
    where: { user_id: user.user_id, [Op.or]: [{ alert_id: null }, { '$alert.alert_id$': { [Op.ne]: null } }] }
  };
}
module.exports = { notificationScope };
